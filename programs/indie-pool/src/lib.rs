//! Indie Pool — on-chain contribution + reputation program.
//!
//! See ../../../CLAUDE.md and ../../../paper please.docx for the full spec.
//!
//! Trust model: a single off-chain oracle keypair signs `verify_contribution`.
//! The oracle pubkey lives in `OracleState` and is checked via Anchor's
//! `has_one = oracle` constraint. Every other instruction is callable by
//! anyone who pays rent.
//!
//! Reputation token: a Token-2022 mint with the NonTransferable extension.
//! Mint authority is a program-derived PDA (`[b"mint_authority"]`), so only
//! this program can issue REP. The mint is created during `initialize_oracle`
//! via raw CPIs in the instruction body. anchor-spl 0.32 has NonTransferable
//! support in codegen but its parser does NOT accept
//! `extensions::non_transferable` (verified in
//! `anchor-syn-0.32.1/src/parser/accounts/constraints.rs`), so we
//! (1) `system_program::create_account` with extension-aware size,
//! (2) `non_transferable_mint_initialize`, then
//! (3) `initialize_mint2`. Order matters — extensions must be initialized
//! before the base mint.
//!
//! After your first `anchor build`, run `anchor keys sync` — that rewrites
//! `declare_id!` below AND the placeholders in Anchor.toml with the real
//! program pubkey.

use anchor_lang::prelude::*;
use anchor_lang::system_program::{create_account, CreateAccount};
use anchor_spl::{
    associated_token::AssociatedToken,
    token_2022::{initialize_mint2, spl_token_2022, InitializeMint2, Token2022},
    token_interface::{
        mint_to, non_transferable_mint_initialize, Mint, MintTo,
        NonTransferableMintInitialize, TokenAccount,
    },
};

declare_id!("EvgHfdx5xyTNoPnaHwDtySdAtMUYGcMz9nwCiwMLi9sn");

// --- Sizing constants. Loosen carefully; bigger accounts = more rent. ---
pub const MAX_PROJECT_ID: usize = 64;
pub const MAX_TYPE: usize = 32;
pub const MAX_IPFS_HASH: usize = 128;
pub const MAX_DESCRIPTION: usize = 512;
pub const APPROVAL_THRESHOLD: u8 = 60;

#[program]
pub mod indie_pool {
    use super::*;

    /// One-shot init by the deployer. Stores the oracle pubkey and the REP
    /// mint, and creates the mint as a Token-2022 NonTransferable mint with a
    /// PDA mint authority. Idempotent guard: PDA seed `[b"oracle"]` so a
    /// second call fails with `account already in use`.
    pub fn initialize_oracle(
        ctx: Context<InitializeOracle>,
        oracle_pubkey: Pubkey,
    ) -> Result<()> {
        // --- Manually create + init the Token-2022 REP mint with NonTransferable. ---
        // anchor-spl 0.32's declarative `extensions::non_transferable` doesn't
        // parse, so we drive create_account → non_transferable_mint_initialize
        // → initialize_mint2 ourselves. Order is enforced by Token-2022:
        // extensions must be initialized BEFORE the base mint.
        let space = spl_token_2022::extension::ExtensionType::try_calculate_account_len::<
            spl_token_2022::state::Mint,
        >(&[spl_token_2022::extension::ExtensionType::NonTransferable])?;
        let lamports = Rent::get()?.minimum_balance(space);

        let rep_mint_bump = ctx.bumps.rep_mint;
        let rep_mint_seeds: &[&[&[u8]]] = &[&[b"rep_mint", &[rep_mint_bump]]];

        create_account(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                CreateAccount {
                    from: ctx.accounts.admin.to_account_info(),
                    to: ctx.accounts.rep_mint.to_account_info(),
                },
                rep_mint_seeds,
            ),
            lamports,
            space as u64,
            &ctx.accounts.token_program.key(),
        )?;

        non_transferable_mint_initialize(CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            NonTransferableMintInitialize {
                token_program_id: ctx.accounts.token_program.to_account_info(),
                mint: ctx.accounts.rep_mint.to_account_info(),
            },
        ))?;

        initialize_mint2(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                InitializeMint2 {
                    mint: ctx.accounts.rep_mint.to_account_info(),
                },
            ),
            0,                                    // decimals
            &ctx.accounts.mint_authority.key(),   // mint authority = PDA
            None,                                 // no freeze authority
        )?;

        // --- Now record the oracle state. ---
        let state = &mut ctx.accounts.oracle_state;
        state.admin = ctx.accounts.admin.key();
        state.oracle = oracle_pubkey;
        state.rep_mint = ctx.accounts.rep_mint.key();
        state.total_contributions = 0;
        state.bump = ctx.bumps.oracle_state;
        state.mint_authority_bump = ctx.bumps.mint_authority;
        Ok(())
    }

    /// Contributor opens a new contribution PDA. `nonce` lets the same
    /// contributor submit multiple times (the frontend uses `Date.now()`).
    pub fn submit_contribution(
        ctx: Context<SubmitContribution>,
        nonce: u64,
        project_id: String,
        contribution_type: String,
        ipfs_hash: String,
        description: String,
    ) -> Result<()> {
        require!(project_id.len() <= MAX_PROJECT_ID, IndiePoolError::FieldTooLong);
        require!(contribution_type.len() <= MAX_TYPE, IndiePoolError::FieldTooLong);
        require!(ipfs_hash.len() <= MAX_IPFS_HASH, IndiePoolError::FieldTooLong);
        require!(description.len() <= MAX_DESCRIPTION, IndiePoolError::FieldTooLong);

        let c = &mut ctx.accounts.contribution;
        c.contributor = ctx.accounts.contributor.key();
        c.nonce = nonce;
        c.project_id = project_id;
        c.contribution_type = contribution_type;
        c.ipfs_hash = ipfs_hash;
        c.description = description;
        c.status = ContributionStatus::Pending;
        c.score = 0;
        c.reasoning_hash = [0u8; 32];
        c.submitted_at = Clock::get()?.unix_timestamp;
        c.verified_at = 0;
        c.minted = false;
        c.bump = ctx.bumps.contribution;

        let oracle = &mut ctx.accounts.oracle_state;
        oracle.total_contributions = oracle.total_contributions.saturating_add(1);

        emit!(ContributionSubmitted {
            contribution: c.key(),
            contributor: c.contributor,
            nonce,
        });
        Ok(())
    }

    /// Oracle-only: writes the AI score and flips status. The signer-equality
    /// check is enforced by `has_one = oracle` on `OracleState`.
    pub fn verify_contribution(
        ctx: Context<VerifyContribution>,
        score: u8,
        reasoning_hash: [u8; 32],
    ) -> Result<()> {
        require!(score <= 100, IndiePoolError::InvalidScore);

        let c = &mut ctx.accounts.contribution;
        require!(
            matches!(c.status, ContributionStatus::Pending),
            IndiePoolError::AlreadyVerified
        );

        c.score = score;
        c.reasoning_hash = reasoning_hash;
        c.status = if score >= APPROVAL_THRESHOLD {
            ContributionStatus::Verified
        } else {
            ContributionStatus::Rejected
        };
        c.verified_at = Clock::get()?.unix_timestamp;

        emit!(ContributionVerified {
            contribution: c.key(),
            score,
            approved: score >= APPROVAL_THRESHOLD,
        });
        Ok(())
    }

    /// Anyone can settle the mint after verification (callable by contributor
    /// or by the oracle service). Mints `score` REP into the contributor's
    /// associated token account on the NonTransferable mint.
    pub fn mint_reputation(ctx: Context<MintReputation>) -> Result<()> {
        // 1) Validate + snapshot. Scoped block ends the immutable borrow
        //    so we can reborrow `contribution` mutably below.
        let (score, contributor, contribution_key) = {
            let c = &ctx.accounts.contribution;
            require!(
                matches!(c.status, ContributionStatus::Verified),
                IndiePoolError::NotVerified
            );
            require!(!c.minted, IndiePoolError::AlreadyMinted);
            (c.score, c.contributor, c.key())
        };

        // 2) CPI: mint `score` REP via the PDA mint authority.
        let bump = ctx.accounts.oracle_state.mint_authority_bump;
        let signer_seeds: &[&[&[u8]]] = &[&[b"mint_authority", &[bump]]];
        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.rep_mint.to_account_info(),
                    to: ctx.accounts.contributor_token_account.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
                signer_seeds,
            ),
            score as u64,
        )?;

        // 3) Persist `minted = true` so this contribution can't be re-minted.
        ctx.accounts.contribution.minted = true;

        emit!(ReputationMinted {
            contribution: contribution_key,
            contributor,
            amount: score as u64,
        });
        Ok(())
    }
}

// ============================================================================
// Account contexts
// ============================================================================

#[derive(Accounts)]
pub struct InitializeOracle<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + OracleState::INIT_SPACE,
        seeds = [b"oracle"],
        bump,
    )]
    pub oracle_state: Account<'info, OracleState>,

    /// CHECK: REP mint PDA. Initialized in the instruction body as a
    /// Token-2022 mint with the NonTransferable extension and decimals = 0
    /// (whole-number reputation points). Anchor's declarative `init` can't
    /// express NonTransferable in 0.32 (parser limitation), so we create
    /// the account + init extension + init mint manually. Other instructions
    /// re-bind this PDA as `InterfaceAccount<'info, Mint>` for type safety.
    #[account(
        mut,
        seeds = [b"rep_mint"],
        bump,
    )]
    pub rep_mint: UncheckedAccount<'info>,

    /// CHECK: PDA used as the mint authority for `rep_mint`.
    #[account(
        seeds = [b"mint_authority"],
        bump,
    )]
    pub mint_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(nonce: u64)]
pub struct SubmitContribution<'info> {
    #[account(mut)]
    pub contributor: Signer<'info>,

    #[account(
        mut,
        seeds = [b"oracle"],
        bump = oracle_state.bump,
    )]
    pub oracle_state: Account<'info, OracleState>,

    #[account(
        init,
        payer = contributor,
        space = 8 + Contribution::INIT_SPACE,
        seeds = [b"contribution", contributor.key().as_ref(), &nonce.to_le_bytes()],
        bump,
    )]
    pub contribution: Account<'info, Contribution>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyContribution<'info> {
    /// Must equal `oracle_state.oracle`. Enforced by `has_one`.
    pub oracle_signer: Signer<'info>,

    #[account(
        seeds = [b"oracle"],
        bump = oracle_state.bump,
        has_one = oracle @ IndiePoolError::UnauthorizedOracle,
    )]
    pub oracle_state: Account<'info, OracleState>,

    /// CHECK: This is just the oracle pubkey for the has_one check.
    pub oracle: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
            b"contribution",
            contribution.contributor.as_ref(),
            &contribution.nonce.to_le_bytes(),
        ],
        bump = contribution.bump,
    )]
    pub contribution: Account<'info, Contribution>,
}

#[derive(Accounts)]
pub struct MintReputation<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [b"oracle"],
        bump = oracle_state.bump,
    )]
    pub oracle_state: Account<'info, OracleState>,

    #[account(
        mut,
        seeds = [
            b"contribution",
            contribution.contributor.as_ref(),
            &contribution.nonce.to_le_bytes(),
        ],
        bump = contribution.bump,
    )]
    pub contribution: Account<'info, Contribution>,

    /// CHECK: The contributor's wallet — destination owner for the ATA.
    /// Validated indirectly via `contribution.contributor`.
    #[account(address = contribution.contributor)]
    pub contributor: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"rep_mint"],
        bump,
        mint::token_program = token_program,
    )]
    pub rep_mint: InterfaceAccount<'info, Mint>,

    /// CHECK: PDA mint authority, signs via seeds.
    #[account(seeds = [b"mint_authority"], bump = oracle_state.mint_authority_bump)]
    pub mint_authority: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = rep_mint,
        associated_token::authority = contributor,
        associated_token::token_program = token_program,
    )]
    pub contributor_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

// ============================================================================
// State
// ============================================================================

#[account]
#[derive(InitSpace)]
pub struct OracleState {
    pub admin: Pubkey,
    pub oracle: Pubkey,
    pub rep_mint: Pubkey,
    pub total_contributions: u64,
    pub bump: u8,
    pub mint_authority_bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Contribution {
    pub contributor: Pubkey,
    pub nonce: u64,
    #[max_len(MAX_PROJECT_ID)]
    pub project_id: String,
    #[max_len(MAX_TYPE)]
    pub contribution_type: String,
    #[max_len(MAX_IPFS_HASH)]
    pub ipfs_hash: String,
    #[max_len(MAX_DESCRIPTION)]
    pub description: String,
    pub status: ContributionStatus,
    pub score: u8,
    pub reasoning_hash: [u8; 32],
    pub submitted_at: i64,
    pub verified_at: i64,
    pub minted: bool,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum ContributionStatus {
    Pending,
    Verified,
    Rejected,
}

// ============================================================================
// Events
// ============================================================================

#[event]
pub struct ContributionSubmitted {
    pub contribution: Pubkey,
    pub contributor: Pubkey,
    pub nonce: u64,
}

#[event]
pub struct ContributionVerified {
    pub contribution: Pubkey,
    pub score: u8,
    pub approved: bool,
}

#[event]
pub struct ReputationMinted {
    pub contribution: Pubkey,
    pub contributor: Pubkey,
    pub amount: u64,
}

// ============================================================================
// Errors
// ============================================================================

#[error_code]
pub enum IndiePoolError {
    #[msg("Submitted field exceeds maximum length")]
    FieldTooLong,
    #[msg("Score must be between 0 and 100")]
    InvalidScore,
    #[msg("Contribution already verified")]
    AlreadyVerified,
    #[msg("Contribution must be verified before minting")]
    NotVerified,
    #[msg("Reputation already minted for this contribution")]
    AlreadyMinted,
    #[msg("Signer is not the registered oracle")]
    UnauthorizedOracle,
}
