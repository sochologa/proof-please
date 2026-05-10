"use client";

import { useMemo, useState } from "react";
import { Nav } from "@/components/nav";
import { ProjectCard } from "@/components/project-card";
import { ProjectsFilterBar } from "@/components/projects-filter-bar";
import { SubmitSlideover } from "@/components/submit-slideover";
import {
  PROJECTS,
  projectMatchesTypeFilter,
  sortProjects,
  type Project,
  type ProjectTypeFilter,
  type SortKey,
} from "@/lib/indie-pool/projects";

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ProjectTypeFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = PROJECTS.filter((p) => {
      if (!projectMatchesTypeFilter(p, typeFilter)) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.studio.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    });
    return sortProjects(list, sortBy);
  }, [search, typeFilter, sortBy]);

  return (
    <main className="flex flex-1 flex-col">
      <Nav />

      <section className="flex-1 px-4 sm:px-6 py-10 sm:py-14">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Page header */}
          <header className="space-y-3">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-rep-cyan">
              projects · open escrows
            </p>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                Browse open contributions
              </h1>
              <p className="text-sm text-rep-muted max-w-md leading-relaxed">
                Indie studios with funded escrows looking for verified
                contributors. Pick a project, submit work, get AI-scored,
                earn REP.
              </p>
            </div>
          </header>

          {/* Filter bar */}
          <ProjectsFilterBar
            search={search}
            setSearch={setSearch}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            resultCount={filtered.length}
            totalCount={PROJECTS.length}
          />

          {/* Grid */}
          {filtered.length === 0 ? (
            <EmptyState onReset={() => {
              setSearch("");
              setTypeFilter("all");
            }} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onSubmit={setActiveProject}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Slide-over submit panel — keyed by project id so React unmounts
       * the panel between projects, giving each open a fresh form state. */}
      <SubmitSlideover
        key={activeProject?.id ?? "closed"}
        project={activeProject}
        onClose={() => setActiveProject(null)}
      />
    </main>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="border border-dashed border-white/10 bg-rep-card/30 px-6 py-14 text-center space-y-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-rep-muted">
        no matches
      </p>
      <h3 className="text-base font-medium">
        No projects match your filters
      </h3>
      <p className="text-sm text-rep-muted max-w-sm mx-auto leading-relaxed">
        Try widening the type filter or clearing the search query.
      </p>
      <button
        onClick={onReset}
        className="mt-2 px-4 py-2 border border-white/15 hover:border-rep-fg text-sm transition-colors"
      >
        Reset filters
      </button>
    </div>
  );
}
