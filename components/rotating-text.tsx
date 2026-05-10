"use client";

import { useEffect, useState } from "react";

/**
 * Cycles through `phrases` with a fade-up animation on each change.
 * Used for "AI scorer is..." progress messages so the wait feels earned.
 */
export function RotatingText({
  phrases,
  intervalMs = 800,
  className = "",
}: {
  phrases: string[];
  intervalMs?: number;
  className?: string;
}) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (phrases.length <= 1) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % phrases.length);
    }, intervalMs);
    return () => clearInterval(t);
  }, [phrases, intervalMs]);

  return (
    <span
      key={idx}
      className={`inline-block animate-[rep-fade-up_0.45s_ease-out] ${className}`}
    >
      {phrases[idx]}
    </span>
  );
}
