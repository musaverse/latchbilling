import { useMemo, useState, type CSSProperties } from 'react';
import { Empty, PageHeader, TaxBadge } from '../components/ui';
import { exportRegister } from '../lib/exportXlsx';
import { computeTotals, sequenceConflicts } from '../lib/gst';
import { money, monthKey, monthLabel, shortDate } from '../lib/format';
import { go } from '../lib/router';
import { useStore } from '../lib/store';

/** The invoice register: the web version of LI_<Mon>_<Year>.xlsx. */
export function Invoices() {
  const { invoices, clients, company, clientById } = useStore();
  const months = useMemo(() => [...new Set(invoices.map((i) => monthKey(i.date)))].sort().reverse(), [invoices]);
  const [month, setMonth] = useState<string>(months[0] ?? 'all');
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const list = invoices
    .filter((i) => month === 'all' || monthKey(i.date) === month)
    .filter((i) => {
      if (!q) return true;
      const c = clientById(i.clientId);
      return [i.number, i.title, c?.name, c?.billingName, c?.gstin].some((v) => v?.toLowerCase().includes(q));
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.seq - b.seq);

  const rows = list.map((inv) => {
    const client = clientById(inv.clientId);
    return { inv, client, t: computeTotals(inv, company, client), outOfOrder: sequenceConflicts(invoices, inv).length > 0 };
  });
  const inr = rows.filter((r) => r.inv.currency === 'INR');
  const total = (k: 'subtotal' | 'tax' | 'total' | 'tds' | 'receivable') => inr.reduce((s, r) => s + r.t[k], 0);

  return (
    <>
      <PageHeader
        intro="Register"
        title="Every invoice, latched in order."
        subtitle="GST and TDS are worked out for you. Export gives the same columns as your monthly Excel."
        actions={
          <>
            <button
              className="btn"
              disabled={list.length === 0}
              onClick={() => exportRegister(list, clients, company, month === 'all' ? null : month)}
            >
              Export to Excel
            </button>
            <button className="btn btn-primary" onClick={() => go('/invoices/new')}>
              New invoice
            </button>
          </>
        }
      />

      <div className="toolbar">
        <select className="input" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month">
          <option value="all">All months</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
        <input
          className="input input-search"
          placeholder="Search number, client, GSTIN…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {rows.length > 0 && (
        <section className="reg-mobile" aria-label="Invoices">
          <div className="reg-sum">
            <div>
              <small>Invoiced</small>
              <strong>{money(total('total'))}</strong>
            </div>
            <div>
              <small>GST</small>
              <span>{money(total('tax'))}</span>
            </div>
            <div>
              <small>After TDS</small>
              <span>{money(total('receivable'))}</span>
            </div>
          </div>
          <ul className="reg-cards">
            {rows.map(({ inv, client, t, outOfOrder }, i) => (
              <li key={inv.id} style={{ '--i': i } as CSSProperties}>
                <button className="reg-card" onClick={() => go(`/invoices/${inv.id}`)}>
                  <span className="reg-top">
                    <span className="mono">
                      {inv.number}
                      {outOfOrder && (
                        <span className="flag" title="Out of date order">
                          !
                        </span>
                      )}
                    </span>
                    <TaxBadge mode={t.mode} />
                  </span>
                  <span className="reg-mid">
                    <span className="reg-names">
                      <strong>{inv.title}</strong>
                      <span>
                        {client?.name ?? '—'} · {shortDate(inv.date)}
                      </span>
                    </span>
                    <span className="reg-amount">{money(t.total, inv.currency)}</span>
                  </span>
                  <span className="reg-foot">
                    <span>GST {money(t.tax, inv.currency)}</span>
                    <span>TDS {money(t.tds, inv.currency)}</span>
                    <span>Lands {money(t.receivable, inv.currency)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card card-flush reg-table">
        {rows.length === 0 ? (
          <Empty title="Nothing latched here yet." />
        ) : (
          <div className="table-wrap">
            <table className="table table-dense">
              <thead>
                <tr>
                  <th>Invoice number</th>
                  <th>Date</th>
                  <th>Client / GSTIN</th>
                  <th>Invoice name</th>
                  <th>Tax</th>
                  <th className="num">Taxable</th>
                  <th className="num">GST</th>
                  <th className="num">Invoice amount</th>
                  <th className="num">TDS</th>
                  <th className="num">After TDS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ inv, client, t, outOfOrder }, i) => (
                  <tr
                    key={inv.id}
                    className="clickable row-in"
                    style={{ '--i': i } as CSSProperties}
                    onClick={() => go(`/invoices/${inv.id}`)}
                  >
                    <td className="mono">
                      {inv.number}
                      {outOfOrder && (
                        <span className="flag" title="Number is out of date order with another invoice this financial year">
                          !
                        </span>
                      )}
                    </td>
                    <td>{shortDate(inv.date)}</td>
                    <td>
                      {client?.name ?? '—'}
                      <div className="mono small muted">{client?.gstin || 'Unregistered'}</div>
                    </td>
                    <td className="truncate" title={inv.title}>
                      {inv.title}
                    </td>
                    <td>
                      <TaxBadge mode={t.mode} />
                    </td>
                    <td className="num">{money(t.subtotal, inv.currency)}</td>
                    <td className="num">{money(t.tax, inv.currency)}</td>
                    <td className="num strong">{money(t.total, inv.currency)}</td>
                    <td className="num">{money(t.tds, inv.currency)}</td>
                    <td className="num">{money(t.receivable, inv.currency)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5}>Total (INR, {inr.length} invoices)</td>
                  <td className="num">{money(total('subtotal'))}</td>
                  <td className="num">{money(total('tax'))}</td>
                  <td className="num strong">{money(total('total'))}</td>
                  <td className="num">{money(total('tds'))}</td>
                  <td className="num">{money(total('receivable'))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
      <p className="note">
        After TDS = invoice amount − TDS ({company.defaultTdsRate}% of the taxable value by default): the amount the client
        actually transfers.
      </p>
    </>
  );
}
