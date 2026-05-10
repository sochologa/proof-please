"use client";

/**
 * Single project card on /projects.
 *
 * Flat / sharp aesthetic per brief — no gradients, no glow, sharp borders,
 * solid surface fills. The procedural art block at the top is the only
 * visual variation between cards; everything else is dense data.
 */
import Link from "next/link";
import type { Project } from "@/lib/indie-pool/projects";
import { TYPE_COLOR } from "@/lib/indie-pool/projects";
import { CONTRIBUTION_TYPES } from "@/lib/indie-pool/types";
import { ProjectArt } from "./project-art";

export function ProjectCard({
  project,
  onSubmit,
}: {
  project: Project;
  onSubmit: (p: Project) => void;
}) {
  const typeMeta = CONTRIBUTION_TYPES.find((t) => t.value === project.primaryType);
  const accentVar = `var(--color-${TYPE_COLOR[project.primaryType]})`;
  const progressPct = Math.round(project.milestoneProgress * 100);

  return (
    <article className="flex flex-col bg-rep-card border border-white/5 hover:border-white/15 transition-colors">
      <ProjectArt project={project} />

      <div className="flex flex-1 flex-col gap-4 p-5">
        <header className="flex items-start gap-3">
          <span
            className="mt-1 size-2 shrink-0"
            style={{ backgroundColor: accentVar }}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold tracking-tight leading-snug">
              {project.name}
            </h3>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-rep-muted mt-1">
              {project.studio}
            </p>
          </div>
        </header>

        <p className="text-sm text-rep-muted leading-relaxed line-clamp-2 min-h-[2.6em]">
          {project.description}
        </p>

        {/* Type badge + min score */}
        <div className="flex items-center justify-between gap-3">
          <span
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] px-2 py-1 border"
            style={{
              color: accentVar,
              borderColor: accentVar,
              backgroundColor: `color-mix(in srgb, ${accentVar} 8%, transparent)`,
            }}
          >
            <span>{typeMeta?.icon ?? "·"}</span>
            <span>{typeMeta?.label ?? project.primaryType}</span>
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-rep-muted">
            min. score{" "}
            <span className="text-rep-fg">{project.minScoreThreshold}</span>
          </span>
        </div>

        {/* Stats grid — escrow + contributors */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-rep-muted mb-1">
              escrow
            </p>
            <p className="text-lg font-semibold font-mono tabular-nums">
              {project.escrowSol}{" "}
              <span className="text-rep-muted text-xs font-sans">SOL</span>
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-rep-muted mb-1">
              contributors
            </p>
            <p className="text-lg font-semibold font-mono tabular-nums">
              {project.contributorCount}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-rep-muted">
              milestones
            </p>
            <p className="font-mono text-xs tabular-nums">{progressPct}%</p>
          </div>
          <div className="h-1 bg-white/5 overflow-hidden">
            <div
              className="h-full transition-[width] duration-700"
              style={{
                width: `${progressPct}%`,
                backgroundColor: accentVar,
              }}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
          <Link
            href="/pool"
            className="text-center px-3 py-2.5 border border-white/15 hover:border-rep-fg text-sm transition-colors"
          >
            View details
          </Link>
          <button
            onClick={() => onSubmit(project)}
            className="px-3 py-2.5 bg-rep-cyan text-black text-sm font-medium hover:bg-rep-cyan/85 transition-colors"
          >
            Submit contribution
          </button>
        </div>
      </div>
    </article>
  );
}
