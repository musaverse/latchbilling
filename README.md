# Latch Billing

GST invoicing and invoice register for Latch Infinity Private Limited. It replaces the two Excel files used today:

| Today (Excel) | In Latch Billing |
| --- | --- |
| One workbook per invoice (e.g. `KIS_Fridge_Magnets_B.xlsx`) | **New invoice**: pick a client, add line items, download a PDF |
| Monthly register (e.g. `LI_Nov_2026.xlsx`) | **Invoices**: filled in automatically, filter by month, **Export to Excel** in the same columns |
| Client address and GSTIN retyped each time | **Clients**: saved once |
| Company and bank details in the template | **Settings** |

> **Status: front-end prototype.** Data is saved in the browser (localStorage) and starts with the Nov 2026 sample invoices. A database comes next. Swapping `src/lib/store.tsx` for API calls is the only change the pages need.

## Run it

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

```bash
npm run build   # type-check and build to dist/
```

## Business rules

- **Invoice number**: `<FY><prefix><running number>`, e.g. `2627INLI00036`.
  - FY `2627` covers 1 Apr 2026 to 31 Mar 2027.
  - The running number continues within the FY and restarts at 1 the next April.
  - The prefix and number of digits are set in Settings.
- **GST** follows place of supply (the client's state) against the company's state (Karnataka, 29):
  - **Same state**: CGST + SGST, half the rate each (9% + 9%).
  - **Other state**: IGST at the full rate (18%).
  - **Foreign currency or client outside India**: zero-rated export under LUT.
- **TDS** defaults to 10% of the taxable value (excluding GST).
  - **After TDS** = invoice amount − TDS, which is what the client actually transfers.
  - Example: KIS ₹23,000 + ₹4,140 IGST = ₹27,140 − ₹2,300 TDS = ₹24,840.
- **Amount in words** uses the Indian system (lakh, crore), e.g. "Rupees Twenty-Seven Thousand One Hundred and Forty Only."
- **Date order**: GST expects invoice numbers to follow invoice dates. The editor warns about out-of-order numbers and the register flags them with **!**.

## Project layout

```
src/
  lib/       types, GST and numbering rules, amount in words, storage, Excel export
  components/InvoiceDocument.tsx   the printable A4 tax invoice
  pages/     Overview, Invoices (register), Invoice view and editor, Clients, Settings
```

## Next steps

- Database and login, so data is shared across people and devices
- Payment tracking: paid or pending, TDS actually deducted, TDS certificates
- Server-side PDF generation and emailing invoices to clients
- Credit notes and GSTR-1 export
