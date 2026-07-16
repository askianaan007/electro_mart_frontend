'use client';

import { useEffect, useRef, useState } from 'react';

const EASE = (t: number) => 1 - Math.pow(1 - t, 3);

/** Animates a number from 0 to `value` whenever `value` changes. */
export function useCountUp(value: number, durationMs = 900) {
  const [display, setDisplay] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const from = 0;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      setDisplay(from + (value - from) * EASE(progress));
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      }
    }

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [value, durationMs]);

  return display;
}
