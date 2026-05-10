"use client";

import { useEffect, useState } from "react";

/**
 * Smoothly animates an integer from 0 (or `from`) up to `target`. Uses
 * an ease-out cubic curve for a punchier "count up" feel than linear.
 * Restarts whenever `target` changes.
 */
export function useCountUp(
  target: number,
  durationMs = 900,
  from = 0,
): number {
  const [value, setValue] = useState(from);

  // Animation drives `setValue` from inside the effect by design — there is
  // no external store to subscribe to here. The eslint rule encourages
  // useSyncExternalStore for derived data, but for a one-shot RAF-driven
  // count-up the effect is the correct shape.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === "undefined") {
      setValue(target);
      return;
    }
    if (target === from) {
      setValue(target);
      return;
    }

    let raf = 0;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = Math.min(1, (now - start) / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (elapsed < 1) {
        raf = requestAnimationFrame(tick);
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, from]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return value;
}
