import { useState, type CSSProperties } from 'react';
import { ClientForm } from '../components/ClientForm';
import { Modal } from '../components/Modal';
import { Empty, PageHeader, TaxBadge } from '../components/ui';
import { computeTotals, stateLabel, taxMode } from '../lib/gst';
import { money } from '../lib/format';
import { go } from '../lib/router';
import { useStore } from '../lib/store';
import type { Client } from '../lib/types';

export function Clients() {
  const { clients, invoices, company, saveClient, deleteClient } = useStore();
  const [editing, setEditing] = useState<Client | 'new' | null>(null);

  const billed = (id: string) =>
    invoices
      .filter((i) => i.clientId === id && i.currency === 'INR')
      .reduce((s, i) => s + computeTotals(i, company, clients.find((c) => c.id === id)).total, 0);

  return (
    <>
      <PageHeader
        intro="Clients"
        title="Saved once. Billed forever."
        subtitle="The client's state decides whether GST is CGST + SGST or IGST."
        actions={
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            New client
          </button>
        }
      />

      {clients.length === 0 ? (
        <Empty title="No clients yet" />
      ) : (
        <div className="client-grid">
          {clients.map((c) => {
            const count = invoices.filter((i) => i.clientId === c.id).length;
            return (
              <article className="card client" key={c.id} style={{ '--i': clients.indexOf(c) } as CSSProperties}>
                <div className="client-head">
                  <span className="feed-mark">{c.name.slice(0, 2).toUpperCase()}</span>
                  <div className="client-names">
                    <h2>{c.name}</h2>
                    {c.billingName !== c.name && <div className="muted">{c.billingName}</div>}
                  </div>
                  <TaxBadge mode={taxMode({ currency: 'INR' }, company, c)} />
                </div>
                <p className="client-address">{c.address || <span className="muted">No address</span>}</p>
                <dl className="kv">
                  <dt>GSTIN</dt>
                  <dd className="mono">{c.gstin || 'Unregistered'}</dd>
                  <dt>State</dt>
                  <dd>{stateLabel(c.stateCode)}</dd>
                  <dt>Invoices</dt>
                  <dd>
                    {count} · {money(billed(c.id))}
                  </dd>
                </dl>
                <div className="client-actions">
                  <button className="btn btn-ghost" onClick={() => go(`/invoices/new?client=${c.id}`)}>
                    Bill {c.name}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setEditing(c)}>
                    Edit
                  </button>
                  <button
                    className="btn btn-ghost danger"
                    onClick={() => {
                      if (!confirm(`Delete ${c.name}?`)) return;
                      if (!deleteClient(c.id)) alert(`${c.name} has invoices, so it can't be deleted.`);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'New client' : `Edit ${editing.name}`} onClose={() => setEditing(null)}>
          <ClientForm
            initial={editing === 'new' ? undefined : editing}
            onCancel={() => setEditing(null)}
            onSave={(c) => {
              saveClient(c);
              setEditing(null);
            }}
          />
        </Modal>
      )}
    </>
  );
}
