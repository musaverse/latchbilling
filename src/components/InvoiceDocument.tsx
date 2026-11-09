import { LatchSymbol, Lines } from './Brand';
import { computeTotals, stateLabel } from '../lib/gst';
import { longDate, plainNumber } from '../lib/format';
import { amountInWords } from '../lib/words';
import type { Client, Company, Invoice } from '../lib/types';

export type DocFocus = 'client' | 'items' | 'totals' | 'all';

interface Props {
  invoice: Invoice;
  client?: Client;
  company: Company;
  /** In the composer, the part of the paper being worked on is lifted forward. */
  focus?: DocFocus;
}

/** The printable tax invoice, on Latch Infinity stationery. */
export function InvoiceDocument({ invoice, client, company, focus }: Props) {
  const t = computeTotals(invoice, company, client);
  const rate = invoice.taxRate;
  const cur = invoice.currency;
  const fmt = (n: number) => (cur === 'INR' ? `₹${plainNumber(n)}` : `${cur} ${plainNumber(n)}`);

  return (
    <article className={`doc${focus ? ` doc-focus-${focus}` : ''}`}>
      <header className="doc-head">
        <div className="doc-from">
          <div className="doc-company">{company.name}</div>
          <p>{company.address}</p>
          <p>
            {[company.email, company.website].filter(Boolean).join('  ·  ')}
            <br />
            GSTIN <span className="mono">{company.gstin}</span>
          </p>
        </div>
        <LatchSymbol size={46} color="#111311" title="Latch Infinity" />
      </header>

      <div className="doc-titlebar">
        <h1>Tax Invoice</h1>
        <dl>
          <div>
            <dt>Invoice No.</dt>
            <dd className="mono">{invoice.number || '—'}</dd>
          </div>
          <div>
            <dt>Invoice Date</dt>
            <dd>{longDate(invoice.date)}</dd>
          </div>
        </dl>
      </div>

      <section className="doc-parties doc-zone-client">
        <div>
          <div className="doc-label">Bill To</div>
          <strong>{client?.billingName || 'Your client'}</strong>
          <p>{client?.address || 'Pick a client to fill this in.'}</p>
        </div>
        <dl>
          <dt>Customer GSTIN</dt>
          <dd className="mono">{client ? client.gstin || 'Unregistered' : '—'}</dd>
          <dt>Place of Supply</dt>
          <dd>{client ? stateLabel(client.stateCode) : '—'}</dd>
        </dl>
      </section>

      <table className="doc-items doc-zone-items">
        <thead>
          <tr>
            <th className="num">SL</th>
            <th>Description</th>
            <th>HSN / SAC</th>
            <th className="num">Qty</th>
            <th className="num">Rate</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((it, i) => (
            <tr key={it.id}>
              <td className="num">{String(i + 1).padStart(2, '0')}</td>
              <td>{it.description || <span className="doc-ghost">Description</span>}</td>
              <td className="mono">{it.hsn}</td>
              <td className="num">{it.quantity}</td>
              <td className="num">{plainNumber(it.rate)}</td>
              <td className="num">{plainNumber((it.quantity || 0) * (it.rate || 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="doc-summary doc-zone-totals">
        <div className="doc-thanks">
          <p>{company.footerNote}</p>
          {invoice.notes && <p className="doc-notes">{invoice.notes}</p>}
          {t.mode === 'export' && <p className="doc-notes">Supply meant for export under LUT without payment of IGST.</p>}
        </div>
        <dl className="doc-totals">
          <dt>Subtotal</dt>
          <dd>{fmt(t.subtotal)}</dd>
          {t.mode === 'intra' && (
            <>
              <dt>CGST @ {rate / 2}%</dt>
              <dd>{fmt(t.cgst)}</dd>
              <dt>SGST @ {rate / 2}%</dt>
              <dd>{fmt(t.sgst)}</dd>
            </>
          )}
          {t.mode === 'inter' && (
            <>
              <dt>IGST @ {rate}%</dt>
              <dd>{fmt(t.igst)}</dd>
            </>
          )}
          {t.mode === 'export' && (
            <>
              <dt>IGST (zero-rated)</dt>
              <dd>{fmt(0)}</dd>
            </>
          )}
          <dt className="grand">Total</dt>
          <dd className="grand">{fmt(t.total)}</dd>
        </dl>
      </section>
      <p className="doc-words doc-zone-totals">
        <span className="doc-label">Amount in words</span>
        {amountInWords(t.total, cur)}
      </p>

      <footer className="doc-foot">
        <div>
          <div className="doc-label">Payment Details</div>
          <dl className="doc-bank">
            <dt>Bank</dt>
            <dd>{company.bank.bankName}</dd>
            <dt>Branch</dt>
            <dd>{company.bank.branch}</dd>
            <dt>Account No.</dt>
            <dd className="mono">{company.bank.accountNumber}</dd>
            <dt>Account Type</dt>
            <dd>{company.bank.accountType}</dd>
            <dt>Account Name</dt>
            <dd>{company.bank.accountName}</dd>
            <dt>IFSC</dt>
            <dd className="mono">{company.bank.ifsc}</dd>
            <dt>SWIFT</dt>
            <dd className="mono">{company.bank.swift}</dd>
          </dl>
        </div>
        <div className="doc-sign">
          <div className="doc-sign-for">For {company.name}</div>
          <div className="doc-sign-line">{company.signatory}</div>
        </div>
      </footer>

      <div className="doc-band" aria-hidden>
        <Lines width={794} height={70} count={3} stroke={5} at={0.12} />
        <span>{company.website}</span>
      </div>
    </article>
  );
}
