/**
 * Procedural SVG art for project cards.
 *
 * Each contribution type gets its own visual treatment, themed by the
 * type's accent color. The pattern is seeded by the project id so the
 * same project always renders the same image (deterministic for SSR).
 *
 * Per the /projects design brief: flat, sharp, no gradients, no glow —
 * just solid blocks of color on the dark base. The art uses two opacity
 * tiers (primary = full, ghost = low) for visual depth without softening.
 */
import type { ContributionType } from "@/lib/indie-pool/types";
import type { Project } from "@/lib/indie-pool/projects";

interface Cell {
  x: number;
  y: number;
  w: number;
  h: number;
  /** "primary" (full opacity) or "ghost" (low opacity). */
  tier: "primary" | "ghost";
}

const COLS = 20;
const ROWS = 10;
const CELL = 9;
const GAP = 1;

const COLOR_VAR: Record<ContributionType, string> = {
  code: "var(--color-rep-cyan)",
  art: "var(--color-rep-purple)",
  "3d": "var(--color-rep-purple)",
  music: "var(--color-rep-pink)",
  writing: "var(--color-rep-amber)",
  testing: "var(--color-rep-success)",
};

function fnv1a(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function px(c: number, r: number): { x: number; y: number; w: number; h: number } {
  return { x: c * (CELL + GAP), y: r * (CELL + GAP), w: CELL, h: CELL };
}

/** Vertical streams — like falling terminal output. */
function generateCode(rng: () => number): Cell[] {
  const cells: Cell[] = [];
  for (let c = 0; c < COLS; c++) {
    const streamStart = Math.floor(rng() * ROWS);
    const streamLen = 2 + Math.floor(rng() * 5);
    for (let r = 0; r < ROWS; r++) {
      const inStream = r >= streamStart && r < streamStart + streamLen;
      if (inStream) cells.push({ ...px(c, r), tier: "primary" });
      else if (rng() < 0.08) cells.push({ ...px(c, r), tier: "ghost" });
    }
  }
  return cells;
}

/** Organic clusters around 3-5 random centers — painterly. */
function generateArt(rng: () => number): Cell[] {
  const cells: Cell[] = [];
  const numCenters = 3 + Math.floor(rng() * 3);
  const centers = Array.from({ length: numCenters }, () => ({
    cx: rng() * COLS,
    cy: rng() * ROWS,
    rad: 1.8 + rng() * 2.6,
  }));
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const minDist = Math.min(
        ...centers.map(({ cx, cy, rad }) => Math.hypot(c - cx, r - cy) / rad),
      );
      const intensity = 1 - Math.min(1, minDist);
      if (intensity > 0.55) cells.push({ ...px(c, r), tier: "primary" });
      else if (intensity > 0.2 && rng() < 0.45)
        cells.push({ ...px(c, r), tier: "ghost" });
    }
  }
  return cells;
}

/** Wireframe lattice + sparse vertices — geometric. */
function generate3D(rng: () => number): Cell[] {
  const cells: Cell[] = [];
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const onDiag = Math.abs(r - c * 0.5) < 0.6;
      const onAntiDiag = Math.abs(r - (ROWS - 1 - c * 0.5)) < 0.6;
      const onEdge = c === 0 || r === 0 || c === COLS - 1 || r === ROWS - 1;
      if (onDiag || onAntiDiag || onEdge) cells.push({ ...px(c, r), tier: "primary" });
      else if (rng() < 0.04) cells.push({ ...px(c, r), tier: "ghost" });
    }
  }
  return cells;
}

/** EQ bars — vertical from bottom, varying heights. */
function generateMusic(rng: () => number): Cell[] {
  const cells: Cell[] = [];
  for (let c = 0; c < COLS; c++) {
    const height = 2 + Math.floor(rng() * (ROWS - 2));
    const top = ROWS - height;
    for (let r = top; r < ROWS; r++) {
      const tier: Cell["tier"] = r < top + 1 ? "ghost" : "primary";
      cells.push({ ...px(c, r), tier });
    }
  }
  return cells;
}

/** Text-row pattern — rows of variable-length "words" with spacing. */
function generateWriting(rng: () => number): Cell[] {
  const cells: Cell[] = [];
  let row = 0;
  while (row < ROWS) {
    let col = 1 + Math.floor(rng() * 2);
    while (col < COLS - 1) {
      const wordLen = 2 + Math.floor(rng() * 5);
      const end = Math.min(col + wordLen, COLS - 1);
      for (let c = col; c < end; c++) cells.push({ ...px(c, row), tier: "primary" });
      col = end + 1 + Math.floor(rng() * 2);
    }
    row += 2;
  }
  return cells;
}

/** Diagonal grid with sparse hits — checkered test matrix. */
function generateTesting(rng: () => number): Cell[] {
  const cells: Cell[] = [];
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if ((c + r) % 3 === 0) cells.push({ ...px(c, r), tier: "primary" });
      else if (rng() < 0.05) cells.push({ ...px(c, r), tier: "ghost" });
    }
  }
  return cells;
}

const GENERATORS: Record<ContributionType, (rng: () => number) => Cell[]> = {
  code: generateCode,
  art: generateArt,
  "3d": generate3D,
  music: generateMusic,
  writing: generateWriting,
  testing: generateTesting,
};

export function ProjectArt({
  project,
  className = "",
}: {
  project: Project;
  className?: string;
}) {
  const seed = fnv1a(project.id);
  const rng = mulberry32(seed);
  const cells = GENERATORS[project.primaryType](rng);
  const color = COLOR_VAR[project.primaryType];

  return (
    <div
      className={`relative aspect-[2/1] w-full overflow-hidden bg-rep-bg ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox={`0 0 ${COLS * (CELL + GAP)} ${ROWS * (CELL + GAP)}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        shapeRendering="crispEdges"
      >
        {cells.map((cell, i) => (
          <rect
            key={i}
            x={cell.x}
            y={cell.y}
            width={cell.w}
            height={cell.h}
            fill={color}
            opacity={cell.tier === "primary" ? 0.88 : 0.18}
          />
        ))}
      </svg>
      {/* Type label, top-right corner. Mono, small, low-key. */}
      <span
        className="absolute top-3 right-3 font-mono text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 bg-rep-bg/85 border border-white/10 text-rep-fg"
        style={{ color }}
      >
        {project.primaryType === "3d" ? "3D" : project.primaryType}
      </span>
    </div>
  );
}
