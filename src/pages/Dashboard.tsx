import { useMemo, useState } from 'react';
import { PageHeader, Stat, TaxBadge, Empty } from '../components/ui';
import { computeTotals } from '../lib/gst';
import { money, monthKey, monthLabel, shortDate, todayIso } from '../lib/format';
import { go } from '../lib/router';
import { useStore } from '../lib/store';

export function Dashboard() {
  const { invoices, company, clientById } = useStore();

  const months = useMemo(() => {
    const set = new Set(invoices.map((i) => monthKey(i.date)));
    set.add(monthKey(todayIso()));
    return [...set].sort().reverse();
  }, [invoices]);
  const [month, setMonth] = useState(months[0]);

  const rows = invoices
    .filter((i) => monthKey(i.date) === month)
    .sort((a, b) => a.seq - b.seq)
    .map((inv) => ({ inv, client: clientById(inv.clientId), t: computeTotals(inv, company, clientById(inv.clientId)) }));

  const inr = rows.filter((r) => r.inv.currency === 'INR');
  const sum = (f: (r: (typeof rows)[number]) => number) => inr.reduce((s, r) => s + f(r), 0);
  const foreign = rows.length - inr.length;

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="Billing at a glance for the selected month."
        actions={
          <>
            <select className="input" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month">
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={() => go('/invoices/new')}>
              New invoice
            </button>
          </>
        }
      />

      <div className="stats">
        <Stat label="Invoiced (incl. GST)" value={money(sum((r) => r.t.total))} hint={`${rows.length} invoice${rows.length === 1 ? '' : 's'}`} />
        <Stat label="Taxable value" value={money(sum((r) => r.t.subtotal))} hint="Before GST" />
        <Stat
          label="GST collected"
          value={money(sum((r) => r.t.tax))}
          hint={`CGST ${money(sum((r) => r.t.cgst))} · SGST ${money(sum((r) => r.t.sgst))} · IGST ${money(sum((r) => r.t.igst))}`}
        />
        <Stat label="Expected after TDS" value={money(sum((r) => r.t.receivable))} hint={`TDS ${money(sum((r) => r.t.tds))}`} />
      </div>
      {foreign > 0 && <p className="note">{foreign} foreign-currency invoice(s) are not included in the INR totals.</p>}

      <section className="card">
        <div className="card-head">
          <h2>{monthLabel(month)} invoices</h2>
          <a className="link" href="#/invoices">
            Open register →
          </a>
        </div>
        {rows.length === 0 ? (
          <Empty title="No invoices this month">
            <button className="btn" onClick={() => go('/invoices/new')}>
              Create the first one
            </button>
          </Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Client</th>
                  <th>Invoice name</th>
                  <th>Date</th>
                  <th>Tax</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ inv, client, t }) => (
                  <tr key={inv.id} className="clickable" onClick={() => go(`/invoices/${inv.id}`)}>
                    <td className="mono">{inv.number}</td>
                    <td>{client?.name ?? '—'}</td>
                    <td className="truncate">{inv.title}</td>
                    <td>{shortDate(inv.date)}</td>
                    <td>
                      <TaxBadge mode={t.mode} />
                    </td>
                    <td className="num">{money(t.total, inv.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
