import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths, so the build works at any address
  // (GitHub Pages serves it from /latchbilling/).
  base: './',
});
