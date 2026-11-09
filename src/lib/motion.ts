import { useEffect, useRef, useState } from 'react';

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Animates a number towards `value` with an ease-out curve. */
export function useCountUp(value: number, duration = 900): number {
  const [shown, setShown] = useState(prefersReducedMotion() ? value : 0);
  const from = useRef(shown);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      const v = a + (value - a) * eased;
      from.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return shown;
}

/** Cycles through `count` items every `interval` ms. */
export function useCycle(count: number, interval = 2800): number {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (count < 2 || prefersReducedMotion()) return;
    const t = setInterval(() => setI((n) => (n + 1) % count), interval);
    return () => clearInterval(t);
  }, [count, interval]);
  return count ? i % count : 0;
}
