/**
 * Mock projects shown on /projects.
 *
 * The /projects page is browse-only — these projects don't have
 * corresponding on-chain escrow accounts in the MVP. The submit
 * flow does call into lib/indie-pool/client.ts so contributions
 * still flow into /dashboard's history correctly.
 */
import type { ContributionType } from "./types";

export interface Project {
  id: string;
  /** URL-safe slug for future /projects/[slug] dynamic routes. */
  slug: string;
  name: string;
  /** One-line pitch shown on the card. */
  description: string;
  /** Drives the type badge color and the project art generator. */
  primaryType: ContributionType;
  /** Total SOL locked in the project's escrow PDA (mocked). */
  escrowSol: number;
  /** Contributors who have already submitted to this project (mocked). */
  contributorCount: number;
  /** Minimum reputation score required to submit. */
  minScoreThreshold: number;
  /** Aggregate milestone progress, 0-1. */
  milestoneProgress: number;
  /** Studio name for context. */
  studio: string;
  /** ISO date string; "newer" sort uses creation order in this list. */
  postedAt: string;
}

/**
 * Type → color CSS variable name. Used for badges, art accents,
 * and progress bars on /projects. Pink + amber are added to the
 * theme in globals.css to support this mapping.
 */
export const TYPE_COLOR: Record<ContributionType, string> = {
  code: "rep-cyan",
  art: "rep-purple",
  "3d": "rep-purple",
  music: "rep-pink",
  writing: "rep-amber",
  testing: "rep-success",
};

/**
 * Filter UI groups Art + 3D into one option per the design brief.
 * The filter logic in /projects expands "art" to also match "3d".
 */
export type ProjectTypeFilter =
  | "all"
  | "code"
  | "art-3d"
  | "music"
  | "writing"
  | "testing";

export const TYPE_FILTERS: { value: ProjectTypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "code", label: "Code" },
  { value: "art-3d", label: "Art / 3D" },
  { value: "music", label: "Music" },
  { value: "writing", label: "Writing" },
  { value: "testing", label: "Testing" },
];

export function projectMatchesTypeFilter(
  p: Project,
  filter: ProjectTypeFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "art-3d") return p.primaryType === "art" || p.primaryType === "3d";
  return p.primaryType === filter;
}

export type SortKey = "newest" | "highest_reward" | "most_contributors";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "highest_reward", label: "Highest Reward" },
  { value: "most_contributors", label: "Most Contributors" },
];

export function sortProjects(projects: Project[], by: SortKey): Project[] {
  const sorted = [...projects];
  switch (by) {
    case "newest":
      return sorted.sort(
        (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
      );
    case "highest_reward":
      return sorted.sort((a, b) => b.escrowSol - a.escrowSol);
    case "most_contributors":
      return sorted.sort((a, b) => b.contributorCount - a.contributorCount);
  }
}

export const PROJECTS: Project[] = [
  {
    id: "p_pixel_forge",
    slug: "pixel-forge-rpg",
    name: "Pixel Forge RPG",
    description:
      "Top-down dungeon crawler with procedural biomes and hand-drawn pixel art.",
    primaryType: "art",
    escrowSol: 12.0,
    contributorCount: 7,
    minScoreThreshold: 70,
    milestoneProgress: 0.42,
    studio: "Forge & Spell Studios",
    postedAt: "2026-04-30",
  },
  {
    id: "p_subterranean",
    slug: "subterranean",
    name: "Subterranean",
    description:
      "Atmospheric horror in an abandoned arcology. Looking for ambient soundscape composers.",
    primaryType: "music",
    escrowSol: 4.5,
    contributorCount: 3,
    minScoreThreshold: 75,
    milestoneProgress: 0.18,
    studio: "Long Shadow Games",
    postedAt: "2026-05-06",
  },
  {
    id: "p_echoes_atlantis",
    slug: "echoes-of-atlantis",
    name: "Echoes of Atlantis",
    description:
      "Underwater exploration RPG. Need writers for environmental storytelling and dialogue.",
    primaryType: "writing",
    escrowSol: 6.0,
    contributorCount: 5,
    minScoreThreshold: 65,
    milestoneProgress: 0.55,
    studio: "Bathysphere Collective",
    postedAt: "2026-05-02",
  },
  {
    id: "p_solar_flare",
    slug: "solar-flare-shaders",
    name: "Solar Flare Shaders",
    description:
      "Open-source GLSL shader pack for sci-fi indies. Plasma, parallax stars, holographic UI.",
    primaryType: "code",
    escrowSol: 8.0,
    contributorCount: 4,
    minScoreThreshold: 72,
    milestoneProgress: 0.31,
    studio: "Helios Open Engine",
    postedAt: "2026-05-08",
  },
  {
    id: "p_cyberpunk_cube",
    slug: "cyberpunk-cube",
    name: "Cyberpunk Cube",
    description:
      "Modular 3D environment kit. Buildings, signage, neon clutter for cyberpunk indies.",
    primaryType: "3d",
    escrowSol: 9.5,
    contributorCount: 6,
    minScoreThreshold: 68,
    milestoneProgress: 0.73,
    studio: "Cube Foundry",
    postedAt: "2026-04-25",
  },
  {
    id: "p_bug_hunters",
    slug: "bug-hunters-anonymous",
    name: "Bug Hunters Anonymous",
    description:
      "Pre-launch QA pool for an upcoming roguelike. Reproducible bug reports earn rewards.",
    primaryType: "testing",
    escrowSol: 3.0,
    contributorCount: 11,
    minScoreThreshold: 60,
    milestoneProgress: 0.66,
    studio: "Crit-Hit Indie",
    postedAt: "2026-05-09",
  },
  {
    id: "p_neon_brawler",
    slug: "neon-brawler",
    name: "Neon Brawler",
    description:
      "1v1 fighting game with combo trees driven by behavior-tree AI. Combat AI engineers wanted.",
    primaryType: "code",
    escrowSol: 7.0,
    contributorCount: 2,
    minScoreThreshold: 80,
    milestoneProgress: 0.12,
    studio: "Static Shock Studios",
    postedAt: "2026-05-09",
  },
  {
    id: "p_twilight_atelier",
    slug: "twilight-atelier",
    name: "Twilight Atelier",
    description:
      "Otome visual novel set in 1920s Paris. Character portraits and CG illustration commissions.",
    primaryType: "art",
    escrowSol: 5.5,
    contributorCount: 4,
    minScoreThreshold: 70,
    milestoneProgress: 0.48,
    studio: "Velvet Arc",
    postedAt: "2026-04-28",
  },
  {
    id: "p_lullabies_void",
    slug: "lullabies-for-the-void",
    name: "Lullabies for the Void",
    description:
      "Cosmic horror walking sim. Looking for orchestral and choral compositions for key scenes.",
    primaryType: "music",
    escrowSol: 4.0,
    contributorCount: 2,
    minScoreThreshold: 78,
    milestoneProgress: 0.05,
    studio: "Nightside Recordings",
    postedAt: "2026-05-07",
  },
];
