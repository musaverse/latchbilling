import { useEffect, useState } from 'react';
import { LatchSymbol } from '../components/Brand';
import { InvoiceDocument } from '../components/InvoiceDocument';
import { Portal } from '../components/Portal';
import { Empty, TaxBadge } from '../components/ui';
import { computeTotals } from '../lib/gst';
import { money } from '../lib/format';
import { go } from '../lib/router';
import { useStore } from '../lib/store';

export function InvoiceView({ id }: { id: string }) {
  const { invoices, company, clientById, deleteInvoice } = useStore();
  const invoice = invoices.find((i) => i.id === id);
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('latchbilling.justLatched') === id) {
        sessionStorage.removeItem('latchbilling.justLatched');
        setFresh(true);
        const t = setTimeout(() => setFresh(false), 4200);
        return () => clearTimeout(t);
      }
    } catch {
      /* ignore */
    }
  }, [id]);

  if (!invoice) {
    return (
      <Empty title="This invoice isn't here.">
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
      {fresh && (
        <Portal>
        <div className="toast no-print" role="status">
          <LatchSymbol size={22} color="#B1F7BB" animate />
          <span>
            <strong>{invoice.number}</strong> is latched and in the register.
          </span>
        </div>
        </Portal>
      )}
      <div className="view-bar no-print">
        <a className="link" href="#/invoices">
          ← Register
        </a>
        <div className="view-meta">
          <span className="mono strong">{invoice.number}</span>
          <TaxBadge mode={t.mode} />
          <span className="muted">
            {client?.name} · TDS {money(t.tds, invoice.currency)} · lands {money(t.receivable, invoice.currency)}
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
          <button className="btn" onClick={() => go(`/invoices/new?from=${invoice.id}`)} title="Same client and lines, month moved forward">
            Repeat
          </button>
          <button className="btn" onClick={() => go(`/invoices/${invoice.id}/edit`)}>
            Edit
          </button>
          <button className="btn btn-primary" onClick={print}>
            Download PDF
          </button>
        </div>
      </div>
      <div className={`doc-stage${fresh ? ' doc-arrive' : ''}`}>
        <InvoiceDocument invoice={invoice} client={client} company={company} />
      </div>
    </>
  );
}
