import { InvoiceDocument } from '../components/InvoiceDocument';
import { Empty, TaxBadge } from '../components/ui';
import { computeTotals } from '../lib/gst';
import { money } from '../lib/format';
import { go } from '../lib/router';
import { useStore } from '../lib/store';

export function InvoiceView({ id }: { id: string }) {
  const { invoices, company, clientById, deleteInvoice } = useStore();
  const invoice = invoices.find((i) => i.id === id);
  if (!invoice) {
    return (
      <Empty title="Invoice not found">
        <a className="link" href="#/invoices">
          Back to the register
        </a>
      </Empty>
    );
  }
  const client = clientById(invoice.clientId);
  const t = computeTotals(invoice, company, client);

  const print = () => {
    const previous = document.title;
    document.title = `${invoice.number} ${client?.name ?? ''} ${invoice.title}`.trim();
    window.print();
    document.title = previous;
  };

  return (
    <>
      <div className="view-bar no-print">
        <a className="link" href="#/invoices">
          ← Register
        </a>
        <div className="view-meta">
          <span className="mono strong">{invoice.number}</span>
          <TaxBadge mode={t.mode} />
          <span className="muted">
            TDS {money(t.tds, invoice.currency)} · After TDS {money(t.receivable, invoice.currency)}
          </span>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-ghost danger"
            onClick={() => {
              if (confirm(`Delete invoice ${invoice.number}? This can't be undone.`)) {
                deleteInvoice(invoice.id);
                go('/invoices');
              }
            }}
          >
            Delete
          </button>
          <button className="btn" onClick={() => go(`/invoices/new?from=${invoice.id}`)}>
            Duplicate
          </button>
          <button className="btn" onClick={() => go(`/invoices/${invoice.id}/edit`)}>
            Edit
          </button>
          <button className="btn btn-primary" onClick={print}>
            Download PDF
          </button>
        </div>
      </div>
      <div className="doc-stage">
        <InvoiceDocument invoice={invoice} client={client} company={company} />
      </div>
    </>
  );
}
