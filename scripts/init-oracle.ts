/**
 * One-shot devnet bootstrap for the indie-pool program.
 *
 * Run AFTER `anchor deploy --provider.cluster devnet`.
 *
 *   pnpm init:oracle
 *   # or, equivalently:
 *   pnpm dlx tsx scripts/init-oracle.ts
 *
 * What this does:
 *   1. Loads the admin (deployer) wallet from $ANCHOR_WALLET or ~/.config/solana/id.json
 *   2. Loads the oracle keypair: $ORACLE_KEYPAIR_JSON  →  ./oracle-keypair.json  →  generates new
 *   3. Calls initialize_oracle(oraclePubkey) — creates OracleState PDA + REP mint with NonTransferable
 *   4. Persists oracle-keypair.json (gitignored) and prints the .env block to paste into Vercel
 *
 * Idempotent: if OracleState already exists on-chain, prints the existing state and exits 0.
 * Won't double-init or trash anything.
 */
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import type { IndiePool } from "../target/types/indie_pool";

const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const ADMIN_KEYPAIR_PATH =
  process.env.ANCHOR_WALLET ?? path.join(os.homedir(), ".config/solana/id.json");
const ORACLE_KEYPAIR_FILE = path.resolve(process.cwd(), "oracle-keypair.json");
const IDL_PATH = path.resolve(process.cwd(), "target/idl/indie_pool.json");

function loadKeypairFile(p: string): Keypair {
  const raw = fs.readFileSync(p, "utf8");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
}

function loadOrCreateOracle(): { kp: Keypair; source: string } {
  if (process.env.ORACLE_KEYPAIR_JSON) {
    const arr = JSON.parse(process.env.ORACLE_KEYPAIR_JSON);
    return {
      kp: Keypair.fromSecretKey(Uint8Array.from(arr)),
      source: "$ORACLE_KEYPAIR_JSON",
    };
  }
  if (fs.existsSync(ORACLE_KEYPAIR_FILE)) {
    return { kp: loadKeypairFile(ORACLE_KEYPAIR_FILE), source: ORACLE_KEYPAIR_FILE };
  }
  const kp = Keypair.generate();
  fs.writeFileSync(
    ORACLE_KEYPAIR_FILE,
    JSON.stringify(Array.from(kp.secretKey)),
    { mode: 0o600 },
  );
  return { kp, source: `${ORACLE_KEYPAIR_FILE} (newly generated)` };
}

async function main() {
  if (!fs.existsSync(IDL_PATH)) {
    throw new Error(`IDL not found at ${IDL_PATH}. Run \`anchor build\` first.`);
  }

  const connection = new Connection(RPC_URL, "confirmed");
  const adminKp = loadKeypairFile(ADMIN_KEYPAIR_PATH);
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(adminKp),
    { commitment: "confirmed" },
  );
  anchor.setProvider(provider);

  const idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf8"));
  const program = new Program(idl, provider) as Program<IndiePool>;
  const programId = program.programId;

  const { kp: oracleKp, source: oracleSource } = loadOrCreateOracle();

  const [oracleStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("oracle")],
    programId,
  );
  const [repMintPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("rep_mint")],
    programId,
  );
  const [mintAuthorityPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint_authority")],
    programId,
  );

  console.log("");
  console.log("=== Indie Pool — devnet bootstrap ===");
  console.log("RPC                :", RPC_URL);
  console.log("Program ID         :", programId.toBase58());
  console.log("Admin (deployer)   :", adminKp.publicKey.toBase58());
  console.log("Oracle source      :", oracleSource);
  console.log("Oracle pubkey      :", oracleKp.publicKey.toBase58());
  console.log("OracleState PDA    :", oracleStatePda.toBase58());
  console.log("REP mint PDA       :", repMintPda.toBase58());
  console.log("Mint authority PDA :", mintAuthorityPda.toBase58());
  console.log("");

  // Idempotency: if OracleState already on-chain, just report and exit.
  const existing = await connection.getAccountInfo(oracleStatePda);
  if (existing !== null) {
    const state = await program.account.oracleState.fetch(oracleStatePda);
    console.log("⚠  OracleState already initialized — skipping.");
    console.log("   admin           :", state.admin.toBase58());
    console.log("   oracle          :", state.oracle.toBase58());
    console.log("   rep_mint        :", state.repMint.toBase58());
    console.log("   total_contribs  :", state.totalContributions.toString());
    if (state.oracle.toBase58() !== oracleKp.publicKey.toBase58()) {
      console.log("");
      console.log("   ⚠  The on-chain oracle DIFFERS from the local keypair.");
      console.log("       On-chain wins; the local oracle keypair is unused.");
      console.log("       To rotate, redeploy the program (gives a new program ID + fresh state).");
    }
    return;
  }

  console.log("→ Sending initialize_oracle …");
  const sig = await program.methods
    .initializeOracle(oracleKp.publicKey)
    .accounts({
      admin: adminKp.publicKey,
      oracleState: oracleStatePda,
      repMint: repMintPda,
      mintAuthority: mintAuthorityPda,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    } as any)
    .rpc();

  console.log("✓ Tx               :", sig);
  console.log(
    "  Explorer         : https://explorer.solana.com/tx/" + sig + "?cluster=devnet",
  );

  const state = await program.account.oracleState.fetch(oracleStatePda);
  console.log("✓ OracleState written");
  console.log("  admin            :", state.admin.toBase58());
  console.log("  oracle           :", state.oracle.toBase58());
  console.log("  rep_mint         :", state.repMint.toBase58());

  console.log("");
  console.log("=== Paste into .env.local AND Vercel project env ===");
  console.log(`NEXT_PUBLIC_PROGRAM_ID=${programId.toBase58()}`);
  console.log(`ORACLE_KEYPAIR_JSON=[${Array.from(oracleKp.secretKey).join(",")}]`);
  console.log("");
  console.log(
    "Reminder: NEXT_PUBLIC_* is sent to the browser; ORACLE_KEYPAIR_JSON is server-only.",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
