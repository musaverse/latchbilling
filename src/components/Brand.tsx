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
  const r = step * 2.2;
  const fills = ramp(colors[0], colors[1], bands);
  const x0 = width * at;
  const dx = (yLow - yHigh) / TAN57;

  const band = (i: number) => {
    const lo = yLow + i * step;
    const hi = yHigh + i * step;
    const xs = x0 + i * step * 0.35;
    return [
      `M0 ${height}V${lo}H${xs - r}`,
      `Q${xs} ${lo} ${xs + r * COS57} ${lo - r * SIN57}`,
      `L${xs + dx - r * COS57} ${hi + r * SIN57}`,
      `Q${xs + dx} ${hi} ${xs + dx + r} ${hi}`,
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
  const gap = stroke * 2;
  const total = gap * (count - 1);
  const top = (height - total) * 0.18;
  const bottom = height - (height - total) * 0.18 - total;
  const drop = bottom - top;
  const dx = drop / TAN57;
  const r = stroke * 2.4;
  const palette = typeof colors === 'string' ? Array(count).fill(colors) : ramp(colors[0], colors[1], count);

  const line = (i: number) => {
    const y1 = top + i * gap;
    const y2 = y1 + drop;
    const xs = width * at + i * gap * 0.32;
    return [
      `M-10 ${y1}H${xs - r}`,
      `Q${xs} ${y1} ${xs + r * COS57} ${y1 + r * SIN57}`,
      `L${xs + dx - r * COS57} ${y2 - r * SIN57}`,
      `Q${xs + dx} ${y2} ${xs + dx + r} ${y2}`,
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
