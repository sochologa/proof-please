"use client";

import { APPROVAL_THRESHOLD } from "@/lib/indie-pool/types";
import { useCountUp } from "@/lib/use-count-up";

/**
 * Circular progress ring for a 0-100 score. Animates the displayed number
 * (count up) and the stroke (dasharray transition) in sync over ~900ms.
 * Used on the score reveal moment of the submit flow and on the dashboard.
 */

export function ScoreRing({
  score,
  size = 128,
  label = "score",
  animate = true,
}: {
  score: number;
  size?: number;
  label?: string;
  animate?: boolean;
}) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));

  const animatedScore = useCountUp(animate ? clamped : clamped, 900);
  const display = animate ? animatedScore : clamped;
  const dash = (display / 100) * circ;

  const colorClass =
    score >= 80
      ? "text-rep-success"
      : score >= APPROVAL_THRESHOLD
      ? "text-rep-cyan"
      : "text-rep-danger";

  return (
    <div
      className="relative inline-flex shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeOpacity={0.1}
          strokeWidth={stroke}
          fill="none"
          className="text-rep-fg"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          className={colorClass}
          style={{ filter: `drop-shadow(0 0 6px currentColor)` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div
            className={`text-4xl font-semibold tabular-nums ${colorClass}`}
            style={{ textShadow: "0 0 12px currentColor" }}
          >
            {display}
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-rep-muted mt-0.5">
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}
