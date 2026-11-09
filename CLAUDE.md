# Latch Billing — notes for Claude

GST invoicing web app for Latch Infinity Private Limited (Bengaluru, GSTIN 29AAFCL7230F1ZI). It replaces two Excel files: a per-invoice template and a monthly invoice register (`LI_<Mon>_<Year>.xlsx`). Read `README.md` for the feature list and business rules.

## Status

- **Front-end prototype.** All data lives in the browser's localStorage (`src/lib/store.tsx`, key `latchbilling.v1`), seeded from `src/lib/seed.ts`.
- **No backend yet.** A database comes next; swapping `store.tsx` for API calls should be the only change the pages need.
- **Live demo:** https://musaverse.github.io/latchbilling/
  - Deployed by `.github/workflows/deploy.yml` on every push to `main`.
  - The demo is public. Keep fictional clients and placeholder bank details in `seed.ts`; never commit the real SBI account or real client data.

## Commands

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build; must pass before pushing
```

No test suite yet. Verify UI changes in a browser at desktop (1440×900) and phone widths (iPhone 13, iPhone SE). On phones, check that the page never scrolls sideways.

## Stack and layout

- React 19, TypeScript and Vite. No router or UI library.
- Hash routes live in `src/lib/router.ts`; `vite.config.ts` uses `base: './'` for GitHub Pages.
- `src/lib/`: types, GST rules (`gst.ts`), amount in words (`words.ts`), formatting, Excel export, motion hooks.
- `src/components/`:
  - `Brand.tsx`: symbol, lines, climb and nest SVG devices.
  - `InvoiceDocument.tsx`: the A4 paper.
  - `FitPaper.tsx`: scales the paper to its container.
  - `Intro.tsx`, `CommandBar.tsx` (⌘K), `Portal.tsx`.
- `src/pages/`: Dashboard, Invoices (register), InvoiceView, Composer (the four-step new/edit invoice flow), Clients, Settings.
- All styles are in `src/styles.css`. The phone layout lives in the `@media (max-width: 900px)` block.

## Brand rules (Latch Infinity Brand Lookbook, Edition 01, 2026)

- **Colour:**
  - Deep `#333A32` and Mint `#B1F7BB` are the core.
  - Ice (`#2E3542` / `#B4E2FF`) and Lilac (`#37323F` / `#D8CCFF`) are expressions. Today they are used for IGST and export badges.
- **Type:** Archivo, with headlines at `font-stretch: 125%` (Archivo Wide). Headlines are regular weight, never bold, with a small grey intro above them.
- **Geometry:**
  - Every graphic device uses one stroke weight and the 57° latch angle.
  - Parallel lines and bands keep equal spacing on the diagonal. `Brand.tsx` computes true offsets with concentric arcs; keep that if you touch it.
- **Motion:**
  - Entrance animations must end on `transform: none` and `filter: none`. Otherwise `position: fixed` bars inside the page stop being fixed.
  - Respect `prefers-reduced-motion`.

## Business rules (see `src/lib/gst.ts`)

- **Invoice number:** `<FY><prefix><seq>`, e.g. `2627INLI00036`. The running number restarts every April.
- **GST type:** compare the client's state code (first two digits of the GSTIN) with the company's (29):
  - Same state: CGST + SGST, half the rate each.
  - Different state: IGST.
  - Non-INR invoices: zero-rated export (LUT).
- **TDS:** a percentage of the taxable value. It is not printed on the invoice. "After TDS" = invoice amount − TDS.

## Open items

- **Database and login** (multi-user, shared data).
- **GST rate options:** currently 0/5/12/18/28%. The Sept 2025 reform moved most items to 5% and 18% (with 40% for luxury/sin goods). The user still has to confirm whether to change the options to 0/5/18/40.
- **TDS default per client:** proposed (2% under the contracts rules vs 10% for professional fees); confirm with the user's CA.
- **Payment tracking:** paid or pending, TDS actually deducted.
- **Server PDF and emailing invoices.**
- **Brand colours:** the user's brand colour screenshot and a spacing screenshot never arrived. Ask for them again before changing colours.
