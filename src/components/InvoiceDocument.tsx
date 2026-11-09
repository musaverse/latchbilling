import { computeTotals, stateLabel } from '../lib/gst';
import { longDate, plainNumber } from '../lib/format';
import { amountInWords } from '../lib/words';
import type { Client, Company, Invoice } from '../lib/types';

interface Props {
  invoice: Invoice;
  client?: Client;
  company: Company;
}

/** The printable tax invoice, laid out like the current Excel template. */
export function InvoiceDocument({ invoice, client, company }: Props) {
  const t = computeTotals(invoice, company, client);
  const rate = invoice.taxRate;
  const cur = invoice.currency;
  const fmt = (n: number) => (cur === 'INR' ? `₹${plainNumber(n)}` : `${cur} ${plainNumber(n)}`);

  return (
    <article className="doc">
      <header className="doc-head">
        <div className="doc-from">
          <div className="doc-logo" aria-hidden>
            L
          </div>
          <h2>{company.name}</h2>
          <p>{company.address}</p>
          <p>
            {company.email && <>email: {company.email}</>}
            {company.website && <><br />website: {company.website}</>}
          </p>
        </div>
        <div className="doc-title">
          <h1>Tax Invoice</h1>
          <dl>
            <dt>Invoice No.</dt>
            <dd className="mono">{invoice.number || '—'}</dd>
            <dt>Date</dt>
            <dd>{longDate(invoice.date)}</dd>
            <dt>GSTIN</dt>
            <dd className="mono">{company.gstin}</dd>
          </dl>
        </div>
      </header>

      <section className="doc-parties">
        <div>
          <div className="doc-label">Bill To</div>
          <strong>{client?.billingName || 'Select a client'}</strong>
          <p>{client?.address}</p>
        </div>
        <dl>
          <dt>Invoice Date</dt>
          <dd>{longDate(invoice.date)}</dd>
          <dt>Customer GSTIN</dt>
          <dd className="mono">{client?.gstin || 'Unregistered'}</dd>
          <dt>Place of Supply</dt>
          <dd>{client ? stateLabel(client.stateCode) : '—'}</dd>
        </dl>
      </section>

      <table className="doc-items">
        <thead>
          <tr>
            <th className="num">SL No.</th>
            <th>Description</th>
            <th>HSN / SAC</th>
            <th className="num">Quantity</th>
            <th className="num">Rate</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((it, i) => (
            <tr key={it.id}>
              <td className="num">{i + 1}</td>
              <td>{it.description || <span className="muted">Description</span>}</td>
              <td className="mono">{it.hsn}</td>
              <td className="num">{it.quantity}</td>
              <td className="num">{plainNumber(it.rate)}</td>
              <td className="num">{plainNumber((it.quantity || 0) * (it.rate || 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="doc-summary">
        <div className="doc-thanks">
          <p>{company.footerNote}</p>
          {invoice.notes && <p className="doc-notes">{invoice.notes}</p>}
          {t.mode === 'export' && (
            <p className="doc-notes">Supply meant for export under LUT without payment of IGST.</p>
          )}
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
      <p className="doc-words">
        <span className="doc-label">Amount in words</span>
        {amountInWords(t.total, cur)}
      </p>

      <footer className="doc-foot">
        <div>
          <div className="doc-label">Payment Details</div>
          <dl className="doc-bank">
            <dt>Name of the Bank</dt>
            <dd>{company.bank.bankName}</dd>
            <dt>Branch Address</dt>
            <dd>{company.bank.branch}</dd>
            <dt>Account Number</dt>
            <dd className="mono">{company.bank.accountNumber}</dd>
            <dt>Account Type</dt>
            <dd>{company.bank.accountType}</dd>
            <dt>Name of the Account</dt>
            <dd>{company.bank.accountName}</dd>
            <dt>Swift Code</dt>
            <dd className="mono">{company.bank.swift}</dd>
            <dt>IFSC Code</dt>
            <dd className="mono">{company.bank.ifsc}</dd>
          </dl>
        </div>
        <div className="doc-sign">
          <div className="doc-sign-for">For {company.name}</div>
          <div className="doc-sign-line">{company.signatory}</div>
        </div>
      </footer>
    </article>
  );
}
