"use client";

import { useEffect, useState } from "react";

/**
 * On mount, briefly cycles random characters at each position before
 * resolving to the real text. Gives the cyberpunk landing a subtle
 * "decode in progress" feel without looking hokey.
 *
 * Pure cosmetic — text content is the real string from frame one for
 * accessibility (screen readers see the final value).
 */
const GLITCH_CHARS = "▓▒░█▌▐│┤├┬┴┼─━┃┏┓┗┛";

export function GlitchText({
  text,
  className = "",
  durationMs = 700,
}: {
  text: string;
  className?: string;
  durationMs?: number;
}) {
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const start = performance.now();
    let raf = 0;

    function tick(now: number) {
      const elapsed = now - start;
      if (elapsed >= durationMs) {
        setDisplay(text);
        return;
      }
      const progress = elapsed / durationMs;
      // Reveal characters left-to-right; mid-revealed chars glitch.
      const revealCount = Math.floor(text.length * progress * 1.4);
      const out = text
        .split("")
        .map((ch, i) => {
          if (i < revealCount) return ch;
          if (ch === " " || ch === "\n") return ch;
          return GLITCH_CHARS[
            Math.floor(Math.random() * GLITCH_CHARS.length)
          ];
        })
        .join("");
      setDisplay(out);
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, durationMs]);

  return (
    <span aria-label={text} className={className}>
      {display}
    </span>
  );
}
