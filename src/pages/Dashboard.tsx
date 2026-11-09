import { useMemo, useState, type CSSProperties } from 'react';
import { Climb, Nest } from '../components/Brand';
import { Empty, TaxBadge } from '../components/ui';
import { computeTotals } from '../lib/gst';
import { money, monthKey, monthLabel, shortDate, todayIso } from '../lib/format';
import { useCountUp, useCycle } from '../lib/motion';
import { go } from '../lib/router';
import { useStore } from '../lib/store';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function Count({ value, className }: { value: number; className?: string }) {
  const v = useCountUp(value);
  return <span className={className}>{money(v)}</span>;
}

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
    .sort((a, b) => b.date.localeCompare(a.date) || b.seq - a.seq)
    .map((inv) => ({ inv, client: clientById(inv.clientId), t: computeTotals(inv, company, clientById(inv.clientId)) }));

  const inr = rows.filter((r) => r.inv.currency === 'INR');
  const sum = (f: (r: (typeof rows)[number]) => number) => inr.reduce((s, r) => s + f(r), 0);
  const total = sum((r) => r.t.total);
  const gst = sum((r) => r.t.tax);
  const cgst = sum((r) => r.t.cgst);
  const sgst = sum((r) => r.t.sgst);
  const igst = sum((r) => r.t.igst);
  const tds = sum((r) => r.t.tds);
  const net = sum((r) => r.t.receivable);
  const clients = new Set(rows.map((r) => r.inv.clientId)).size;
  const foreign = rows.length - inr.length;
  const monthName = monthLabel(month).split(' ')[0];

  const lines = rows.length
    ? [
        `${rows.length} invoice${rows.length === 1 ? '' : 's'} across ${clients} client${clients === 1 ? '' : 's'}.`,
        `${money(gst)} GST, split and filed-ready.`,
        `${money(net)} lands after TDS.`,
      ]
    : ['Nothing latched yet this month.', 'Start with a client.', 'Numbers and GST take care of themselves.'];
  const lineIdx = useCycle(lines.length, 3200);

  const split = [
    { key: 'CGST', value: cgst, cls: 'seg-cgst' },
    { key: 'SGST', value: sgst, cls: 'seg-sgst' },
    { key: 'IGST', value: igst, cls: 'seg-igst' },
  ];

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="hero-intro">
            {greeting()} · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="display hero-title">
            <Count value={total} />
            <br />
            latched in {monthName}.
          </h1>
          <p className="hero-cycle" aria-live="polite">
            {lines.map((l, i) => (
              <span key={l} className={i === lineIdx ? 'on' : ''}>
                {l}
              </span>
            ))}
          </p>
          <div className="hero-actions">
            <button className="btn btn-mint btn-lg" onClick={() => go('/invoices/new')}>
              New invoice
            </button>
            <select className="input input-dark" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month">
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Climb width={900} height={420} className="hero-climb" animate key={month} />
      </section>

      <div className="stats">
        {[
          { label: 'Taxable value', value: sum((r) => r.t.subtotal), hint: 'Before GST' },
          { label: 'GST collected', value: gst, hint: `${money(cgst + sgst)} CGST+SGST · ${money(igst)} IGST` },
          { label: 'TDS to be deducted', value: tds, hint: 'Claim it back on your return' },
          { label: 'Expected in bank', value: net, hint: 'Invoice amount − TDS' },
        ].map((s, i) => (
          <div className="stat" key={s.label} style={{ '--i': i } as CSSProperties}>
            <div className="stat-label">{s.label}</div>
            <Count value={s.value} className="stat-value" />
            <div className="stat-hint">{s.hint}</div>
          </div>
        ))}
      </div>
      {foreign > 0 && <p className="note">{foreign} foreign-currency invoice(s) are left out of the INR totals.</p>}

      <div className="dash-grid">
        <section className="card">
          <div className="card-head">
            <div>
              <p className="intro-text">This month</p>
              <h2 className="h2">Recently latched</h2>
            </div>
            <a className="link" href="#/invoices">
              Open register →
            </a>
          </div>
          {rows.length === 0 ? (
            <Empty title="A clean slate.">
              <button className="btn btn-primary" onClick={() => go('/invoices/new')}>
                Latch the first invoice
              </button>
            </Empty>
          ) : (
            <ul className="feed">
              {rows.map(({ inv, client, t }, i) => (
                <li key={inv.id} style={{ '--i': i } as CSSProperties}>
                  <button className="feed-item" onClick={() => go(`/invoices/${inv.id}`)}>
                    <span className="feed-mark">{(client?.name ?? '?').slice(0, 2).toUpperCase()}</span>
                    <span className="feed-body">
                      <strong>{inv.title}</strong>
                      <span className="muted">
                        {client?.name} · <span className="mono">{inv.number}</span> · {shortDate(inv.date)}
                      </span>
                    </span>
                    <TaxBadge mode={t.mode} />
                    <span className="feed-amount">{money(t.total, inv.currency)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card tax-card">
          <p className="intro-text">GST mix</p>
          <h2 className="h2">Where the tax goes</h2>
          <div className="segbar" role="img" aria-label={`CGST ${money(cgst)}, SGST ${money(sgst)}, IGST ${money(igst)}`}>
            {split.map((s) =>
              s.value > 0 ? <span key={s.key} className={s.cls} style={{ flexGrow: s.value }} title={`${s.key} ${money(s.value)}`} /> : null,
            )}
            {gst === 0 && <span className="seg-empty" style={{ flexGrow: 1 }} />}
          </div>
          <dl className="legend">
            {split.map((s) => (
              <div key={s.key}>
                <dt>
                  <i className={s.cls} />
                  {s.key}
                </dt>
                <dd>{money(s.value)}</dd>
              </div>
            ))}
          </dl>
          <Nest size={120} className="tax-nest" />
          <p className="tax-foot">
            <kbd>⌘</kbd>
            <kbd>K</kbd> to find any invoice or client.
          </p>
        </section>
      </div>
    </>
  );
}
