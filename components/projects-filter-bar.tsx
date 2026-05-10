"use client";

import {
  TYPE_FILTERS,
  SORT_OPTIONS,
  type ProjectTypeFilter,
  type SortKey,
} from "@/lib/indie-pool/projects";

interface FilterBarProps {
  search: string;
  setSearch: (s: string) => void;
  typeFilter: ProjectTypeFilter;
  setTypeFilter: (t: ProjectTypeFilter) => void;
  sortBy: SortKey;
  setSortBy: (s: SortKey) => void;
  resultCount: number;
  totalCount: number;
}

export function ProjectsFilterBar({
  search,
  setSearch,
  typeFilter,
  setTypeFilter,
  sortBy,
  setSortBy,
  resultCount,
  totalCount,
}: FilterBarProps) {
  return (
    <div className="border border-white/5 bg-rep-card">
      <div className="flex flex-col md:flex-row gap-0 md:divide-x divide-white/5 divide-y md:divide-y-0">
        {/* Search */}
        <div className="flex-1 min-w-0 flex items-center px-4 py-3 gap-3">
          <SearchIcon className="size-4 text-rep-muted shrink-0" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects, studios, descriptions…"
            className="flex-1 min-w-0 bg-transparent text-sm placeholder:text-rep-muted focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-rep-muted hover:text-rep-fg transition-colors"
            >
              clear
            </button>
          )}
        </div>

        {/* Type filter */}
        <div className="md:w-52">
          <Select
            label="type"
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as ProjectTypeFilter)}
            options={TYPE_FILTERS}
          />
        </div>

        {/* Sort */}
        <div className="md:w-56">
          <Select
            label="sort"
            value={sortBy}
            onChange={(v) => setSortBy(v as SortKey)}
            options={SORT_OPTIONS}
          />
        </div>
      </div>

      {/* Result count */}
      <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-rep-muted">
        <span>
          showing <span className="text-rep-fg tabular-nums">{resultCount}</span>{" "}
          of <span className="tabular-nums">{totalCount}</span> projects
        </span>
        <span className="hidden sm:inline">indie-pool · devnet</span>
      </div>
    </div>
  );
}

function Select<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: readonly { value: T; label: string }[];
}) {
  return (
    <label className="flex items-center px-4 py-3 gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-rep-muted shrink-0">
        {label}
      </span>
      <div className="relative flex-1 min-w-0">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="w-full appearance-none bg-transparent text-sm pr-6 focus:outline-none cursor-pointer"
        >
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className="bg-rep-card text-rep-fg"
            >
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="size-3 absolute right-0 top-1/2 -translate-y-1/2 text-rep-muted pointer-events-none" />
      </div>
    </label>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden="true"
    >
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.5 10.5 3 3" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden="true"
    >
      <path d="m3 4.5 3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
