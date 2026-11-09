import { computeTotals } from './gst';
import { longDate, monthLabel } from './format';
import type { Client, Company, Invoice } from './types';

/**
 * Exports the register in the same column layout as LI_<Mon>_<Year>.xlsx,
 * with the GST split and TDS added as extra columns.
 */
export async function exportRegister(
  invoices: Invoice[],
  clients: Client[],
  company: Company,
  monthKey: string | null,
): Promise<void> {
  const XLSX = await import('xlsx');
  const byId = new Map(clients.map((c) => [c.id, c]));

  const rows = invoices.map((inv, idx) => {
    const client = byId.get(inv.clientId);
    const t = computeTotals(inv, company, client);
    const [y, m] = inv.date.split('-').map(Number);
    return {
      'Sl. No.': idx + 1,
      Year: y,
      Month: new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' }),
      Client: client?.name ?? '',
      GSTIN: client?.gstin || 'NA',
      'Invoice Name': inv.title,
      'Invoice Number': inv.number,
      'Invoice Date': longDate(inv.date),
      Currency: inv.currency,
      'Invoice Amount': t.total,
      'Original Currency': t.subtotal,
      GST: t.tax,
      CGST: t.cgst,
      SGST: t.sgst,
      IGST: t.igst,
      TDS: t.tds,
      'After TDS': t.receivable,
    };
  });

  const sum = (k: keyof (typeof rows)[number]) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
  const totals: Record<string, string | number> = { 'Invoice Date': 'Total' };
  for (const k of ['Invoice Amount', 'Original Currency', 'GST', 'CGST', 'SGST', 'IGST', 'TDS', 'After TDS'] as const) {
    totals[k] = Math.round(sum(k) * 100) / 100;
  }

  const sheet = XLSX.utils.json_to_sheet([...rows, {}, totals]);
  sheet['!cols'] = [6, 6, 6, 22, 18, 36, 16, 18, 9, 15, 17, 12, 12, 12, 12, 12, 14].map((wch) => ({ wch }));

  const name = monthKey ? `${monthLabel(monthKey, 'short')} Invoices` : 'All Invoices';
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, name.slice(0, 31));
  const file = monthKey ? `LI_${monthLabel(monthKey, 'short').replace(' ', '_')}.xlsx` : 'LI_All_Invoices.xlsx';
  XLSX.writeFile(book, file);
}
