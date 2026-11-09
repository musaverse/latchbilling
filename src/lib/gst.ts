import type { Client, Company, Invoice } from './types';

export const STATES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
  '96': 'Outside India',
};

export const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;

export function isValidGstin(gstin: string): boolean {
  return GSTIN_PATTERN.test(gstin.trim().toUpperCase());
}

export function stateFromGstin(gstin: string): string {
  const g = gstin.trim().toUpperCase();
  return isValidGstin(g) ? g.slice(0, 2) : '';
}

export function stateLabel(code: string): string {
  return code ? `${STATES[code] ?? 'Unknown'} (${code})` : '—';
}

/** Indian financial year code for a date: 2026-11-07 → "2627". */
export function fyCode(isoDate: string): string {
  const [y, m] = isoDate.split('-').map(Number);
  const start = m >= 4 ? y : y - 1;
  const two = (n: number) => String(n % 100).padStart(2, '0');
  return `${two(start)}${two(start + 1)}`;
}

export function formatInvoiceNumber(company: Company, isoDate: string, seq: number): string {
  return `${fyCode(isoDate)}${company.numberPrefix}${String(seq).padStart(company.numberDigits, '0')}`;
}

export function nextSeq(invoices: Invoice[], isoDate: string): number {
  const fy = fyCode(isoDate);
  return invoices.filter((i) => fyCode(i.date) === fy).reduce((max, i) => Math.max(max, i.seq), 0) + 1;
}

/**
 * GST requires invoice numbers to run in date order within a year.
 * Returns the invoices that break that order relative to this one.
 */
export function sequenceConflicts(invoices: Invoice[], draft: Pick<Invoice, 'id' | 'seq' | 'date'>): Invoice[] {
  const fy = fyCode(draft.date);
  return invoices.filter(
    (i) =>
      i.id !== draft.id &&
      fyCode(i.date) === fy &&
      ((i.seq < draft.seq && i.date > draft.date) || (i.seq > draft.seq && i.date < draft.date)),
  );
}

export type TaxMode = 'intra' | 'inter' | 'export';

export interface Totals {
  mode: TaxMode;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
  total: number;
  tds: number;
  /** What the client actually pays after deducting TDS. */
  receivable: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function taxMode(invoice: Pick<Invoice, 'currency'>, company: Company, client?: Client): TaxMode {
  if (invoice.currency !== 'INR' || client?.stateCode === '96') return 'export';
  if (client?.stateCode && client.stateCode !== company.stateCode) return 'inter';
  return 'intra';
}

export function computeTotals(
  invoice: Pick<Invoice, 'items' | 'taxRate' | 'tdsRate' | 'currency'>,
  company: Company,
  client?: Client,
): Totals {
  const mode = taxMode(invoice, company, client);
  const subtotal = round2(invoice.items.reduce((s, it) => s + (it.quantity || 0) * (it.rate || 0), 0));
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  if (mode === 'intra') {
    cgst = round2((subtotal * invoice.taxRate) / 200);
    sgst = cgst;
  } else if (mode === 'inter') {
    igst = round2((subtotal * invoice.taxRate) / 100);
  }
  const tax = round2(cgst + sgst + igst);
  const total = round2(subtotal + tax);
  const tds = round2((subtotal * invoice.tdsRate) / 100);
  return { mode, subtotal, cgst, sgst, igst, tax, total, tds, receivable: round2(total - tds) };
}

export const TAX_MODE_LABEL: Record<TaxMode, string> = {
  intra: 'CGST + SGST',
  inter: 'IGST',
  export: 'Zero-rated',
};
