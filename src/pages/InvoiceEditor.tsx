import { useState } from 'react';
import { ClientForm } from '../components/ClientForm';
import { InvoiceDocument } from '../components/InvoiceDocument';
import { Modal } from '../components/Modal';
import { Field, PageHeader, TaxBadge } from '../components/ui';
import { CURRENCIES, type Currency, type Invoice, type LineItem } from '../lib/types';
import { computeTotals, formatInvoiceNumber, fyCode, nextSeq, sequenceConflicts, stateLabel } from '../lib/gst';
import { longDate, money, todayIso, uid } from '../lib/format';
import { go } from '../lib/router';
import { useStore } from '../lib/store';

interface Props {
  id?: string;
  from?: string;
}

export function InvoiceEditor({ id, from }: Props) {
  const store = useStore();
  const { company, clients, invoices, clientById } = store;
  const existing = id ? invoices.find((i) => i.id === id) : undefined;

  const [draft, setDraft] = useState<Invoice>(() => {
    if (existing) return existing;
    const source = from ? invoices.find((i) => i.id === from) : undefined;
    const date = todayIso();
    const blankItem = (): LineItem => ({ id: uid(), description: '', hsn: company.defaultHsn, quantity: 1, rate: 0 });
    return {
      id: uid(),
      seq: 0,
      number: '',
      date,
      clientId: source?.clientId ?? '',
      title: source?.title ?? '',
      currency: source?.currency ?? 'INR',
      items: source ? source.items.map((it) => ({ ...it, id: uid() })) : [blankItem()],
      taxRate: source?.taxRate ?? company.defaultTaxRate,
      tdsRate: source?.tdsRate ?? company.defaultTdsRate,
      notes: source?.notes ?? '',
      createdAt: new Date().toISOString(),
    };
  });
  const [tried, setTried] = useState(false);
  const [addingClient, setAddingClient] = useState(false);

  // A new invoice takes the next number in its financial year; an edited one keeps
  // its number unless its date moves into another financial year.
  const others = invoices.filter((i) => i.id !== draft.id);
  const keepNumber = existing && fyCode(existing.date) === fyCode(draft.date);
  const seq = keepNumber ? existing.seq : nextSeq(others, draft.date);
  const number = keepNumber ? existing.number : formatInvoiceNumber(company, draft.date, seq);
  const preview: Invoice = { ...draft, seq, number };

  const client = clientById(draft.clientId);
  const totals = computeTotals(preview, company, client);
  const conflicts = draft.date ? sequenceConflicts(invoices, preview) : [];

  const set = (patch: Partial<Invoice>) => setDraft((d) => ({ ...d, ...patch }));
  const setItem = (itemId: string, patch: Partial<LineItem>) =>
    setDraft((d) => ({ ...d, items: d.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) }));

  const errors = {
    client: !draft.clientId,
    title: !draft.title.trim(),
    date: !draft.date,
    items: draft.items.length === 0 || draft.items.some((it) => !it.description.trim() || !(it.quantity > 0)),
  };
  const valid = !Object.values(errors).some(Boolean);

  const save = () => {
    setTried(true);
    if (!valid) return;
    store.saveInvoice({ ...preview, title: draft.title.trim() });
    go(`/invoices/${draft.id}`);
  };

  return (
    <>
      <PageHeader
        title={existing ? `Edit ${existing.number}` : 'New invoice'}
        subtitle={
          <>
            Invoice number <span className="mono strong">{number}</span>
            {existing ? '' : ' will be assigned when you save.'}
          </>
        }
        actions={
          <>
            <button className="btn btn-ghost" onClick={() => history.back()}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={save}>
              {existing ? 'Save changes' : 'Create invoice'}
            </button>
          </>
        }
      />

      <div className="editor">
        <div className="editor-form">
          <section className="card">
            <h2 className="card-title">Details</h2>
            <div className="grid-2">
              <Field
                label="Client"
                hint={
                  client ? (
                    <>
                      {client.gstin || 'Unregistered'} · {stateLabel(client.stateCode)}
                    </>
                  ) : (
                    <button type="button" className="link" onClick={() => setAddingClient(true)}>
                      + Add a new client
                    </button>
                  )
                }
              >
                <select
                  className={`input${tried && errors.client ? ' invalid' : ''}`}
                  value={draft.clientId}
                  onChange={(e) => (e.target.value === '__new' ? setAddingClient(true) : set({ clientId: e.target.value }))}
                >
                  <option value="">Select client…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.name !== c.billingName ? ` — ${c.billingName}` : ''}
                    </option>
                  ))}
                  <option value="__new">+ Add a new client…</option>
                </select>
              </Field>
              <Field label="Invoice name" hint="Shown in the register, e.g. Fridge Magnets B">
                <input
                  className={`input${tried && errors.title ? ' invalid' : ''}`}
                  value={draft.title}
                  onChange={(e) => set({ title: e.target.value })}
                  placeholder="Digital Marketing Service - Nov 2026"
                />
              </Field>
              <Field label="Invoice date" hint={draft.date ? longDate(draft.date) : undefined}>
                <input
                  type="date"
                  className={`input${tried && errors.date ? ' invalid' : ''}`}
                  value={draft.date}
                  onChange={(e) => set({ date: e.target.value })}
                />
              </Field>
              <Field label="Currency" hint={draft.currency !== 'INR' ? 'Treated as export of services: zero-rated under LUT.' : undefined}>
                <select className="input" value={draft.currency} onChange={(e) => set({ currency: e.target.value as Currency })}>
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>
            {conflicts.length > 0 && (
              <div className="alert">
                <strong>Number out of date order.</strong> GST rules expect invoice numbers to follow invoice dates.{' '}
                {conflicts
                  .slice(0, 3)
                  .map((c) => `${c.number} is dated ${longDate(c.date)}`)
                  .join('; ')}
                .
              </div>
            )}
          </section>

          <section className="card">
            <h2 className="card-title">Line items</h2>
            <div className="items">
              <div className="items-head">
                <span>Description</span>
                <span>HSN / SAC</span>
                <span className="num">Qty</span>
                <span className="num">Rate</span>
                <span className="num">Amount</span>
                <span />
              </div>
              {draft.items.map((it) => {
                const bad = tried && (!it.description.trim() || !(it.quantity > 0));
                return (
                  <div className="items-row" key={it.id}>
                    <input
                      className={`input${bad && !it.description.trim() ? ' invalid' : ''}`}
                      placeholder="Description"
                      value={it.description}
                      onChange={(e) => setItem(it.id, { description: e.target.value })}
                      aria-label="Description"
                    />
                    <input
                      className="input mono"
                      value={it.hsn}
                      onChange={(e) => setItem(it.id, { hsn: e.target.value })}
                      aria-label="HSN or SAC"
                    />
                    <input
                      className={`input num${bad && !(it.quantity > 0) ? ' invalid' : ''}`}
                      type="number"
                      min={0}
                      step="any"
                      value={it.quantity}
                      onChange={(e) => setItem(it.id, { quantity: Number(e.target.value) })}
                      aria-label="Quantity"
                    />
                    <input
                      className="input num"
                      type="number"
                      min={0}
                      step="any"
                      value={it.rate}
                      onChange={(e) => setItem(it.id, { rate: Number(e.target.value) })}
                      aria-label="Rate"
                    />
                    <span className="num items-amount">{money((it.quantity || 0) * (it.rate || 0), draft.currency)}</span>
                    <button
                      className="btn btn-ghost icon"
                      disabled={draft.items.length === 1}
                      onClick={() => set({ items: draft.items.filter((x) => x.id !== it.id) })}
                      aria-label="Remove line"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              className="btn btn-ghost"
              onClick={() =>
                set({ items: [...draft.items, { id: uid(), description: '', hsn: company.defaultHsn, quantity: 1, rate: 0 }] })
              }
            >
              + Add line
            </button>
          </section>

          <section className="card">
            <h2 className="card-title">Tax &amp; notes</h2>
            <div className="grid-2">
              <Field label="GST rate (%)" hint={<TaxBadge mode={totals.mode} />}>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="any"
                  value={draft.taxRate}
                  onChange={(e) => set({ taxRate: Number(e.target.value) })}
                />
              </Field>
              <Field label="TDS the client deducts (%)" hint="Not printed. Used for the After TDS column.">
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="any"
                  value={draft.tdsRate}
                  onChange={(e) => set({ tdsRate: Number(e.target.value) })}
                />
              </Field>
              <Field label="Note on invoice" hint="Optional, printed under the thank-you line" wide>
                <textarea className="input" rows={2} value={draft.notes} onChange={(e) => set({ notes: e.target.value })} />
              </Field>
            </div>
            <dl className="summary">
              <dt>Taxable value</dt>
              <dd>{money(totals.subtotal, draft.currency)}</dd>
              {totals.mode === 'intra' && (
                <>
                  <dt>CGST + SGST</dt>
                  <dd>{money(totals.tax, draft.currency)}</dd>
                </>
              )}
              {totals.mode === 'inter' && (
                <>
                  <dt>IGST</dt>
                  <dd>{money(totals.tax, draft.currency)}</dd>
                </>
              )}
              <dt className="strong">Invoice amount</dt>
              <dd className="strong">{money(totals.total, draft.currency)}</dd>
              <dt>TDS ({draft.tdsRate}%)</dt>
              <dd>− {money(totals.tds, draft.currency)}</dd>
              <dt>Expected after TDS</dt>
              <dd>{money(totals.receivable, draft.currency)}</dd>
            </dl>
          </section>

          {tried && !valid && <div className="alert alert-error">Fill in the highlighted fields to save the invoice.</div>}
        </div>

        <aside className="editor-preview">
          <div className="preview-label">Live preview</div>
          <div className="preview-scale">
            <InvoiceDocument invoice={preview} client={client} company={company} />
          </div>
        </aside>
      </div>

      {addingClient && (
        <Modal title="New client" onClose={() => setAddingClient(false)}>
          <ClientForm
            onCancel={() => setAddingClient(false)}
            onSave={(c) => {
              store.saveClient(c);
              set({ clientId: c.id });
              setAddingClient(false);
            }}
          />
        </Modal>
      )}
    </>
  );
}
