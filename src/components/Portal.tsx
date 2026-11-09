import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

/** Renders overlays on <body>, outside the animated page, so fixed positioning covers the viewport. */
export function Portal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body);
}
