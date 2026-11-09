import { useEffect, useState } from 'react';
import { SYMBOL_PATHS } from './Brand';
import { prefersReducedMotion } from '../lib/motion';

const KEY = 'latchbilling.intro';
/** The lower loop, drawn from its bar end so the entering line flows straight into it. */
const LOWER_FROM_BAR = 'M140.2 101L217.4 219.8A72 72 0 1 1 93.4 225.2';

/**
 * Opening sequence, after the "Li latched" film: a mint line enters from the edge,
 * turns at 57°, threads through the symbol and leaves; then the line of copy lands.
 * Plays once per browser session. Click or press any key to skip.
 */
export function Intro() {
  const [state, setState] = useState<'play' | 'leave' | 'done'>(() => {
    try {
      if (prefersReducedMotion() || sessionStorage.getItem(KEY)) return 'done';
    } catch {
      return 'done';
    }
    return 'play';
  });

  useEffect(() => {
    if (state !== 'play') return;
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    const leave = setTimeout(() => setState('leave'), 3300);
    const skip = () => setState('leave');
    window.addEventListener('keydown', skip, { once: true });
    return () => {
      clearTimeout(leave);
      window.removeEventListener('keydown', skip);
    };
  }, [state]);

  useEffect(() => {
    if (state !== 'leave') return;
    const t = setTimeout(() => setState('done'), 750);
    return () => clearTimeout(t);
  }, [state]);

  if (state === 'done') return null;

  // Symbol placed at (900, 300) on a 1600 × 900 stage, scaled 0.62.
  const s = 0.62;
  const tx = 900;
  const ty = 300;
  // Both lines run at the latch angle (57°) so they continue the symbol's bars.
  const k = 1 / Math.tan((57 * Math.PI) / 180);
  const c = Math.cos((57 * Math.PI) / 180);
  const sn = Math.sin((57 * Math.PI) / 180);
  const r = 34;
  const bx = tx + 140.2 * s;
  const by = ty + 101 * s;
  const top = 210;
  const cx1 = bx - (by - top) * k;
  const enter = `M-20 ${top}H${cx1 - r}Q${cx1} ${top} ${cx1 + r * c} ${top + r * sn}L${bx} ${by}`;
  const ax = tx + 168 * s;
  const ay = ty + 254 * s;
  const bottom = 665;
  const cx2 = ax + (bottom - ay) * k;
  const leave = `M${ax} ${ay}L${cx2 - r * c} ${bottom - r * sn}Q${cx2} ${bottom} ${cx2 + r} ${bottom}H1640`;

  return (
    <div className={`intro ${state}`} onClick={() => setState('leave')} role="presentation">
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="intro-stage" aria-hidden>
        <path className="intro-line in" d={enter} pathLength={1} />
        <g transform={`translate(${tx} ${ty}) scale(${s})`} className="intro-symbol">
          <path d={LOWER_FROM_BAR} pathLength={1} style={{ animationDelay: '1.0s' }} />
          <path d={SYMBOL_PATHS.upper} pathLength={1} style={{ animationDelay: '1.2s' }} />
          <path d={SYMBOL_PATHS.lock} pathLength={1} style={{ animationDelay: '1.4s' }} />
        </g>
        <path className="intro-line out" d={leave} pathLength={1} />
      </svg>
      <div className="intro-copy">
        <h1>
          <span>Endless ideas.</span>
          <span>Latched.</span>
        </h1>
        <p>Latch Billing</p>
      </div>
      <span className="intro-skip">Click to skip</span>
    </div>
  );
}
