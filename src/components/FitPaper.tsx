import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

const A4_WIDTH = 794;

/** Scales the A4 invoice paper down to whatever width it is given: a phone, the composer column, or a full page. */
export function FitPaper({ children, max = 1 }: { children: ReactNode; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(max);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = (w: number) => setZoom(Math.min(max, w / A4_WIDTH));
    fit(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => fit(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [max]);

  return (
    <div ref={ref} className="fit-paper">
      <div className="fit-paper-inner" style={{ zoom }}>
        {children}
      </div>
    </div>
  );
}
