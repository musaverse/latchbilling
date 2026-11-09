import type { CSSProperties } from 'react';

/**
 * Latch Infinity brand devices, rebuilt from the Brand Lookbook (Edition 01, 2026).
 * Every device uses one stroke weight and the 57° latch angle.
 */

export const DEEP = '#333A32';
export const MINT = '#B1F7BB';
export const ICE = ['#2E3542', '#B4E2FF'] as const;
export const LILAC = ['#37323F', '#D8CCFF'] as const;

const TAN57 = Math.tan((57 * Math.PI) / 180);
const COS57 = Math.cos((57 * Math.PI) / 180);
const SIN57 = Math.sin((57 * Math.PI) / 180);
/** Corner tangent length per unit radius for a 57° turn. */
const HALF57 = Math.tan((28.5 * Math.PI) / 180);
/** Horizontal shift that keeps a parallel copy one unit away on the 57° diagonal as well as on the flats. */
const SHIFT57 = (1 - COS57) / SIN57;

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Equal steps from the deep colour to the light colour, as on the lookbook swatches. */
export function ramp(from: string, to: string, steps: number): string[] {
  const a = hex(from);
  const b = hex(to);
  return Array.from({ length: steps }, (_, i) => {
    const t = steps === 1 ? 1 : i / (steps - 1);
    return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * t)).join(',')})`;
  });
}

/* ---------- The symbol ---------- */

/** Stroke paths traced from the lookbook: the lock (U) and two mirrored loops with 57° bars. */
export const SYMBOL_PATHS = {
  lock: 'M54 135H23.5V258A133 133 0 0 0 289.5 258V135H259',
  upper: 'M220.6 128.8A72 72 0 1 0 96.6 134.2L168 254',
  lower: 'M93.4 225.2A72 72 0 1 0 217.4 219.8L140.2 101',
};
export const SYMBOL_VIEWBOX = '8 4 298 410';

interface SymbolProps {
  size?: number;
  color?: string;
  className?: string;
  /** Draws the strokes in: upper loop, lower loop, then the lock. */
  animate?: boolean;
  style?: CSSProperties;
  title?: string;
}

export function LatchSymbol({ size = 28, color = 'currentColor', className, animate, style, title }: SymbolProps) {
  return (
    <svg
      viewBox={SYMBOL_VIEWBOX}
      width={(size * 298) / 410}
      height={size}
      className={`latch-symbol${animate ? ' draw' : ''}${className ? ` ${className}` : ''}`}
      style={style}
      fill="none"
      stroke={color}
      strokeWidth={28}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path d={SYMBOL_PATHS.upper} pathLength={1} style={{ '--d': '0ms' } as CSSProperties} />
      <path d={SYMBOL_PATHS.lower} pathLength={1} style={{ '--d': '180ms' } as CSSProperties} />
      <path d={SYMBOL_PATHS.lock} pathLength={1} style={{ '--d': '360ms' } as CSSProperties} />
    </svg>
  );
}

export function Wordmark({ color = 'currentColor', size = 28 }: { color?: string; size?: number }) {
  return (
    <span className="wordmark" style={{ color, fontSize: size * 0.42 }}>
      <LatchSymbol size={size} color={color} />
      <span>
        Latch
        <br />
        Infinity
      </span>
    </span>
  );
}

/* ---------- 03 The climb: stacked bands rising at 57° ---------- */

interface ClimbProps {
  width?: number;
  height?: number;
  colors?: [string, string];
  bands?: number;
  /** Where the rise starts, as a fraction of the width. */
  at?: number;
  className?: string;
  animate?: boolean;
}

export function Climb({ width = 800, height = 300, colors = [DEEP, MINT], bands = 9, at = 0.42, className, animate }: ClimbProps) {
  const step = height / (bands + 6);
  const yHigh = step;
  const yLow = height * 0.55;
  const fills = ramp(colors[0], colors[1], bands);
  const x0 = width * at;
  const dx = (yLow - yHigh) / TAN57;
  // Lower corner: later bands sit outside it, so their radius grows.
  // Upper corner: later bands sit inside it, so their radius shrinks.
  const rLow = step * 1.5;
  const rHigh = step * (bands + 1.5);

  const band = (i: number) => {
    const d = i * step;
    const lo = yLow + d;
    const hi = yHigh + d;
    const xs = x0 + d * SHIFT57;
    const xh = xs + dx;
    const r1 = rLow + d;
    const r2 = rHigh - d;
    const t1 = r1 * HALF57;
    const t2 = r2 * HALF57;
    return [
      `M0 ${height}V${lo}H${xs - t1}`,
      `A${r1} ${r1} 0 0 0 ${xs + t1 * COS57} ${lo - t1 * SIN57}`,
      `L${xh - t2 * COS57} ${hi + t2 * SIN57}`,
      `A${r2} ${r2} 0 0 1 ${xh + t2} ${hi}`,
      `H${width}V${height}Z`,
    ].join('');
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMaxYMax slice"
      className={`device climb${animate ? ' animate' : ''}${className ? ` ${className}` : ''}`}
      aria-hidden
    >
      {fills.map((f, i) => (
        <path key={i} d={band(i)} fill={f} style={{ '--i': i } as CSSProperties} />
      ))}
    </svg>
  );
}

/* ---------- 01 The lines: parallel strokes that drop at 57° ---------- */

interface LinesProps {
  width?: number;
  height?: number;
  count?: number;
  stroke?: number;
  colors?: [string, string] | string;
  at?: number;
  className?: string;
  animate?: boolean;
}

export function Lines({ width = 800, height = 300, count = 5, stroke = 14, colors = DEEP, at = 0.3, className, animate }: LinesProps) {
  // Equal spacing, always: the gap between strokes equals the stroke, on the flats and on the 57° drop.
  const gap = stroke * 2;
  const total = gap * (count - 1);
  const top = (height - total) * 0.18;
  const bottom = height - (height - total) * 0.18 - total;
  const drop = bottom - top;
  const dx = drop / TAN57;
  // Upper corner: later lines sit inside it. Lower corner: later lines sit outside it.
  const rTop = stroke * 1.5 + total;
  const rBottom = stroke * 1.5;
  const palette = typeof colors === 'string' ? Array(count).fill(colors) : ramp(colors[0], colors[1], count);

  const line = (i: number) => {
    const d = i * gap;
    const y1 = top + d;
    const y2 = y1 + drop;
    const xs = width * at - d * SHIFT57;
    const xb = xs + dx;
    const r1 = rTop - d;
    const r2 = rBottom + d;
    const t1 = r1 * HALF57;
    const t2 = r2 * HALF57;
    return [
      `M-10 ${y1}H${xs - t1}`,
      `A${r1} ${r1} 0 0 1 ${xs + t1 * COS57} ${y1 + t1 * SIN57}`,
      `L${xb - t2 * COS57} ${y2 - t2 * SIN57}`,
      `A${r2} ${r2} 0 0 0 ${xb + t2} ${y2}`,
      `H${width + 10}`,
    ].join('');
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      className={`device lines${animate ? ' animate' : ''}${className ? ` ${className}` : ''}`}
      fill="none"
      aria-hidden
    >
      {palette.map((c, i) => (
        <path key={i} d={line(i)} stroke={c} strokeWidth={stroke} pathLength={1} style={{ '--i': i } as CSSProperties} />
      ))}
    </svg>
  );
}

/* ---------- 04 The nest: arches nested on the lock's centre ---------- */

export function Nest({
  size = 220,
  colors = [DEEP, MINT],
  rings = 7,
  className,
  animate,
}: {
  size?: number;
  colors?: [string, string];
  rings?: number;
  className?: string;
  animate?: boolean;
}) {
  const fills = ramp(colors[1], colors[0], rings);
  const w = 200;
  const step = w / 2 / (rings + 1);
  const arch = (i: number) => {
    const half = w / 2 - i * step;
    const top = i * step * 0.6;
    const cx = w / 2;
    const cy = top + half * 0.55;
    return `M${cx - half} ${top}H${cx + half}V${cy}A${half} ${half} 0 0 1 ${cx - half} ${cy}Z`;
  };
  return (
    <svg viewBox="0 0 200 190" width={size} height={(size * 190) / 200} className={`device nest${animate ? ' animate' : ''}${className ? ` ${className}` : ''}`} aria-hidden>
      {fills.map((f, i) => (
        <path key={i} d={arch(i)} fill={f} style={{ '--i': i } as CSSProperties} />
      ))}
    </svg>
  );
}
