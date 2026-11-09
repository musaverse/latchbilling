import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { LatchSymbol, Nest } from '../components/Brand';
import { ClientForm } from '../components/ClientForm';
import { InvoiceDocument, type DocFocus } from '../components/InvoiceDocument';
import { Modal } from '../components/Modal';
import { Portal } from '../components/Portal';
import { TaxBadge } from '../components/ui';
import { CURRENCIES, type Client, type Currency, type Invoice, type LineItem } from '../lib/types';
import {
  STATES,
  computeTotals,
  formatInvoiceNumber,
  fyCode,
  nextSeq,
  sequenceConflicts,
  taxMode,
  type TaxMode,
} from '../lib/gst';
import { longDate, money, shortDate, todayIso, uid } from '../lib/format';
import { useCountUp } from '../lib/motion';
import { go } from '../lib/router';
import { useStore } from '../lib/store';

const STAGES: { key: DocFocus; label: string; intro: string; title: string }[] = [
  { key: 'client', label: 'Client', intro: 'Step one', title: 'Who are we billing?' },
  { key: 'items', label: 'Work', intro: 'Step two', title: 'What did we deliver?' },
  { key: 'totals', label: 'Tax', intro: 'Step three', title: 'The tax works itself out.' },
  { key: 'all', label: 'Latch', intro: 'Last step', title: 'Ready to latch.' },
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_RE = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})\b/g;

/**
 * Moves month references in text by the gap between the old and new invoice dates,
 * so "Digital Marketing Service - Oct 2026" billed on 1 Nov becomes "- Nov 2026" on 1 Dec.
 */
function rollMonths(text: string, fromIso: string, toIso: string): string {
  const [fy, fm] = fromIso.split('-').map(Number);
  const [ty, tm] = toIso.split('-').map(Number);
  const shift = (ty - fy) * 12 + (tm - fm);
  if (!shift) return text;
  return text.replace(MONTH_RE, (_, name: string, year: string) => {
    const idx = MONTHS.findIndex((m) => m.toLowerCase().startsWith(name.slice(0, 3).toLowerCase()));
    const total = Number(year) * 12 + idx + shift;
    const m = MONTHS[total % 12];
    return `${name.length <= 4 ? m.slice(0, 3) : m} ${Math.floor(total / 12)}`;
  });
}

interface Props {
  id?: string;
  from?: string;
  clientId?: string;
}

export function Composer({ id, from, clientId }: Props) {
  const store = useStore();
  const { company, clients, invoices, clientById } = store;
  const existing = id ? invoices.find((i) => i.id === id) : undefined;

  const [draft, setDraft] = useState<Invoice>(() => {
    if (existing) return existing;
    const source = from ? invoices.find((i) => i.id === from) : undefined;
    const date = todayIso();
    return {
      id: uid(),
      seq: 0,
      number: '',
      date,
      clientId: source?.clientId ?? (clientId && clients.some((c) => c.id === clientId) ? clientId : ''),
      title: source ? rollMonths(source.title, source.date, date) : '',
      currency: source?.currency ?? 'INR',
      items: source
        ? source.items.map((it) => ({ ...it, id: uid(), description: rollMonths(it.description, source.date, date) }))
        : [{ id: uid(), description: '', hsn: company.defaultHsn, quantity: 1, rate: 0 }],
      taxRate: source?.taxRate ?? company.defaultTaxRate,
      tdsRate: source?.tdsRate ?? company.defaultTdsRate,
      notes: source?.notes ?? '',
      createdAt: new Date().toISOString(),
    };
  });

  const [stage, setStage] = useState(() => (existing ? 3 : from ? 1 : draft.clientId ? 1 : 0));
  const [dir, setDir] = useState<1 | -1>(1);
  const [tried, setTried] = useState<boolean[]>([false, false, false, false]);
  const [addingClient, setAddingClient] = useState(false);
  const [latching, setLatching] = useState<string | null>(null);

  const others = invoices.filter((i) => i.id !== draft.id);
  const keepNumber = existing && fyCode(existing.date) === fyCode(draft.date);
  const seq = keepNumber ? existing.seq : nextSeq(others, draft.date || todayIso());
  const number = keepNumber ? existing.number : formatInvoiceNumber(company, draft.date || todayIso(), seq);
  const preview: Invoice = { ...draft, seq, number };
  const client = clientById(draft.clientId);
  const totals = computeTotals(preview, company, client);
  const conflicts = draft.date ? sequenceConflicts(invoices, preview) : [];

  const set = (patch: Partial<Invoice>) => setDraft((d) => ({ ...d, ...patch }));
  const setItem = (itemId: string, patch: Partial<LineItem>) =>
    setDraft((d) => ({ ...d, items: d.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) }));

  const stageValid = [
    !!draft.clientId,
    !!draft.title.trim() && !!draft.date && draft.items.length > 0 && draft.items.every((it) => it.description.trim() && it.quantity > 0),
    draft.taxRate >= 0 && draft.tdsRate >= 0,
    true,
  ];
  const reachable = (i: number) => !!existing || stageValid.slice(0, i).every(Boolean);

  const goTo = (i: number) => {
    if (i === stage || !reachable(i)) return;
    setDir(i > stage ? 1 : -1);
    setStage(i);
  };
  const next = () => {
    if (!stageValid[stage]) {
      setTried((t) => t.map((v, i) => (i === stage ? true : v)));
      return;
    }
    if (stage < 3) goTo(stage + 1);
  };

  const commit = () => {
    if (!stageValid.every(Boolean)) return;
    store.saveInvoice({ ...preview, title: draft.title.trim() });
    try {
      sessionStorage.setItem('latchbilling.justLatched', draft.id);
    } catch {
      /* ignore */
    }
    setLatching(number);
    setTimeout(() => go(`/invoices/${draft.id}`), 2100);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (e.key !== 'Enter' || e.shiftKey || t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON' || t.tagName === 'SELECT') return;
    e.preventDefault();
    if (stage < 3) next();
  };

  const s = STAGES[stage];
  const mode = taxMode(draft, company, client);

  return (
    <div className="composer">
      <div className="composer-left">
        <StageRail stage={stage} reachable={reachable} onPick={goTo} />

        <div className="stage" key={stage} data-dir={dir} onKeyDown={onKeyDown}>
          <p className="intro-text">{s.intro}</p>
          <h1 className="display">{s.title}</h1>

          {stage === 0 && (
            <ClientStage
              clients={clients}
              invoices={invoices}
              selected={draft.clientId}
              onPick={(cid) => {
                set({ clientId: cid });
                setDir(1);
                setTimeout(() => setStage(1), 380);
              }}
              onAdd={() => setAddingClient(true)}
              error={tried[0] && !draft.clientId}
            />
          )}

          {stage === 1 && (
            <WorkStage
              draft={draft}
              client={client}
              invoices={invoices}
              tried={tried[1]}
              set={set}
              setItem={setItem}
              defaultHsn={company.defaultHsn}
            />
          )}

          {stage === 2 && (
            <TaxStage
              mode={mode}
              companyState={company.stateCode}
              client={client}
              draft={draft}
              set={set}
              totals={totals}
            />
          )}

          {stage === 3 && (
            <ReviewStage
              preview={preview}
              client={client}
              totals={totals}
              conflicts={conflicts}
              existing={!!existing}
              onEdit={goTo}
              onCommit={commit}
            />
          )}

          {stage < 3 && (
            <div className="stage-nav">
              {stage > 0 ? (
                <button className="btn btn-ghost" onClick={() => goTo(stage - 1)}>
                  ← Back
                </button>
              ) : (
                <button className="btn btn-ghost" onClick={() => history.back()}>
                  Cancel
                </button>
              )}
              <span className="stage-hint">
                Press <kbd>Enter</kbd> to continue
              </span>
              <button className="btn btn-primary btn-lg" onClick={next}>
                Continue →
              </button>
            </div>
          )}
        </div>
      </div>

      <aside className="composer-right" aria-label="Invoice preview">
        <div className="preview-head">
          <span className="intro-text">Live paper</span>
          <span className="mono preview-number">{number}</span>
        </div>
        <div className="preview-scale">
          <InvoiceDocument invoice={preview} client={client} company={company} focus={s.key} />
        </div>
      </aside>

      {addingClient && (
        <Modal title="New client" onClose={() => setAddingClient(false)}>
          <ClientForm
            onCancel={() => setAddingClient(false)}
            onSave={(c) => {
              store.saveClient(c);
              set({ clientId: c.id });
              setAddingClient(false);
              setDir(1);
              setStage(1);
            }}
          />
        </Modal>
      )}

      {latching && <LatchMoment number={latching} existing={!!existing} />}
    </div>
  );
}

/* ---------- Stage rail: four nodes joined by the brand line ---------- */

function StageRail({ stage, reachable, onPick }: { stage: number; reachable: (i: number) => boolean; onPick: (i: number) => void }) {
  return (
    <nav className="rail" aria-label="Invoice steps">
      <div className="rail-track">
        <div className="rail-fill" style={{ width: `${(stage / (STAGES.length - 1)) * 100}%` }} />
      </div>
      {STAGES.map((st, i) => (
        <button
          key={st.key}
          className={`rail-node${i === stage ? ' current' : ''}${i < stage ? ' done' : ''}`}
          disabled={!reachable(i)}
          onClick={() => onPick(i)}
          aria-current={i === stage ? 'step' : undefined}
        >
          <span className="rail-dot">{i < stage ? '✓' : `0${i + 1}`}</span>
          <span className="rail-label">{st.label}</span>
        </button>
      ))}
    </nav>
  );
}

/* ---------- 01 Client ---------- */

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function ClientStage({
  clients,
  invoices,
  selected,
  onPick,
  onAdd,
  error,
}: {
  clients: Client[];
  invoices: Invoice[];
  selected: string;
  onPick: (id: string) => void;
  onAdd: () => void;
  error: boolean;
}) {
  const { company } = useStore();
  const [q, setQ] = useState('');
  const last = (cid: string) => invoices.filter((i) => i.clientId === cid).sort((a, b) => b.date.localeCompare(a.date))[0];
  const list = clients
    .filter((c) => !q || `${c.name} ${c.billingName} ${c.gstin}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (last(b.id)?.date ?? '').localeCompare(last(a.id)?.date ?? ''));

  return (
    <>
      <p className="stage-lede">Pick a client. Their address, GSTIN and place of supply fill in on the paper.</p>
      {clients.length > 6 && (
        <input className="input input-lg" placeholder="Find a client…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      )}
      <div className={`tiles${error ? ' tiles-error' : ''}`}>
        {list.map((c, i) => {
          const l = last(c.id);
          return (
            <button
              key={c.id}
              className={`tile${selected === c.id ? ' selected' : ''}`}
              style={{ '--i': i } as CSSProperties}
              onClick={() => onPick(c.id)}
            >
              <span className="tile-mark">{initials(c.name)}</span>
              <span className="tile-body">
                <strong>{c.name}</strong>
                <span className="tile-sub">{c.billingName !== c.name ? c.billingName : STATES[c.stateCode] ?? '—'}</span>
                <span className="tile-meta">
                  <TaxBadge mode={taxMode({ currency: 'INR' }, company, c)} />
                  {l && <span>Last: {shortDate(l.date)}</span>}
                </span>
              </span>
              <span className="tile-check" aria-hidden>
                <LatchSymbol size={18} />
              </span>
            </button>
          );
        })}
        <button className="tile tile-add" style={{ '--i': list.length } as CSSProperties} onClick={onAdd}>
          <span className="tile-mark">+</span>
          <span className="tile-body">
            <strong>New client</strong>
            <span className="tile-sub">Add once, bill forever</span>
          </span>
        </button>
      </div>
      {error && <p className="error">Choose who this invoice is for.</p>}
    </>
  );
}

/* ---------- 02 Work ---------- */

function WorkStage({
  draft,
  client,
  invoices,
  tried,
  set,
  setItem,
  defaultHsn,
}: {
  draft: Invoice;
  client?: Client;
  invoices: Invoice[];
  tried: boolean;
  set: (p: Partial<Invoice>) => void;
  setItem: (id: string, p: Partial<LineItem>) => void;
  defaultHsn: string;
}) {
  const past = useMemo(
    () =>
      invoices
        .filter((i) => i.clientId === draft.clientId && i.id !== draft.id)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 3),
    [invoices, draft.clientId, draft.id],
  );
  const firstInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!draft.title) firstInput.current?.focus();
    // focus once on entering the stage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const repeat = (src: Invoice) =>
    set({
      title: rollMonths(src.title, src.date, draft.date),
      items: src.items.map((it) => ({ ...it, id: uid(), description: rollMonths(it.description, src.date, draft.date) })),
      taxRate: src.taxRate,
      tdsRate: src.tdsRate,
      currency: src.currency,
    });

  return (
    <>
      {past.length > 0 && (
        <div className="suggest">
          <span className="suggest-label">Latched before for {client?.name}</span>
          <div className="chips">
            {past.map((p) => (
              <button key={p.id} className="chip" onClick={() => repeat(p)} title="Repeat this invoice with the month moved forward">
                <span aria-hidden>↻</span> {rollMonths(p.title, p.date, draft.date)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="work-grid">
        <label className="field field-wide">
          <span className="field-label">Invoice name</span>
          <input
            ref={firstInput}
            className={`input input-lg${tried && !draft.title.trim() ? ' invalid' : ''}`}
            value={draft.title}
            placeholder="Digital Marketing Service - Nov 2026"
            onChange={(e) => set({ title: e.target.value })}
          />
          <span className="field-hint">How it appears in the register.</span>
        </label>
        <label className="field">
          <span className="field-label">Invoice date</span>
          <input
            type="date"
            className={`input input-lg${tried && !draft.date ? ' invalid' : ''}`}
            value={draft.date}
            onChange={(e) => set({ date: e.target.value })}
          />
          <span className="field-hint">{draft.date ? longDate(draft.date) : ' '}</span>
        </label>
      </div>

      <div className="items">
        <div className="items-head">
          <span>Description</span>
          <span>HSN / SAC</span>
          <span className="num">Qty</span>
          <span className="num">Rate</span>
          <span className="num">Amount</span>
          <span />
        </div>
        {draft.items.map((it, idx) => {
          const badDesc = tried && !it.description.trim();
          const badQty = tried && !(it.quantity > 0);
          return (
            <div className="items-row" key={it.id} style={{ '--i': idx } as CSSProperties}>
              <input
                className={`input${badDesc ? ' invalid' : ''}`}
                placeholder="What was delivered"
                value={it.description}
                onChange={(e) => setItem(it.id, { description: e.target.value })}
                aria-label="Description"
              />
              <input className="input mono" value={it.hsn} onChange={(e) => setItem(it.id, { hsn: e.target.value })} aria-label="HSN or SAC" />
              <input
                className={`input num${badQty ? ' invalid' : ''}`}
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
        <button
          className="add-line"
          onClick={() => set({ items: [...draft.items, { id: uid(), description: '', hsn: defaultHsn, quantity: 1, rate: 0 }] })}
        >
          + Add another line
        </button>
      </div>
      {tried && <p className="error">Give the invoice a name, and every line a description and quantity.</p>}
    </>
  );
}

/* ---------- 03 Tax ---------- */

function TaxRoute({ mode, from, to, toName }: { mode: TaxMode; from: string; to: string; toName: string }) {
  // Same state: a level line. Other state: the line climbs at 57°. Export: it leaves the frame.
  const d =
    mode === 'intra'
      ? 'M40 80H480'
      : mode === 'inter'
        ? 'M40 104H200Q216 104 225 91L262 34Q271 22 287 22H480'
        : 'M40 104H200Q216 104 225 91L262 34Q271 22 287 22H560';
  const endY = mode === 'intra' ? 80 : 22;
  return (
    <div className={`route route-${mode}`}>
      <svg viewBox="0 0 520 126" aria-hidden key={mode}>
        <path className="route-line" d={d} pathLength={1} />
        <circle className="route-node" cx="40" cy={mode === 'intra' ? 80 : 104} r="9" />
        {mode !== 'export' && <circle className="route-node end" cx="480" cy={endY} r="9" />}
      </svg>
      <span className="route-from" style={{ top: mode === 'intra' ? 96 : 120 }}>
        {from}
        <small>You</small>
      </span>
      <span className="route-to" style={{ top: mode === 'intra' ? 96 : 38 }}>
        {to}
        <small>{toName}</small>
      </span>
    </div>
  );
}

function Amount({ value, currency, className }: { value: number; currency: Currency; className?: string }) {
  const v = useCountUp(value, 700);
  return <span className={className}>{money(v, currency)}</span>;
}

function TaxStage({
  mode,
  companyState,
  client,
  draft,
  set,
  totals,
}: {
  mode: TaxMode;
  companyState: string;
  client?: Client;
  draft: Invoice;
  set: (p: Partial<Invoice>) => void;
  totals: ReturnType<typeof computeTotals>;
}) {
  const explain: Record<TaxMode, ReactNode> = {
    intra: (
      <>
        Same state, so GST splits into <strong>CGST {draft.taxRate / 2}%</strong> and <strong>SGST {draft.taxRate / 2}%</strong>.
      </>
    ),
    inter: (
      <>
        Different states, so it's one <strong>IGST {draft.taxRate}%</strong>.
      </>
    ),
    export: (
      <>
        Billed in {draft.currency}: an export of services, <strong>zero-rated under LUT</strong>.
      </>
    ),
  };
  const toLabel = mode === 'export' ? 'Outside India' : (STATES[client?.stateCode ?? ''] ?? '—');
  return (
    <>
      <TaxRoute mode={mode} from={STATES[companyState] ?? companyState} to={toLabel} toName={client?.name ?? ''} />
      <p className="stage-lede tax-explain">{explain[mode]}</p>

      <div className="tax-grid">
        <div className="field">
          <span className="field-label">GST rate</span>
          <div className="segmented">
            {[0, 5, 12, 18, 28].map((r) => (
              <button key={r} className={draft.taxRate === r ? 'on' : ''} onClick={() => set({ taxRate: r })}>
                {r}%
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field-label">TDS the client deducts</span>
          <div className="segmented">
            {[0, 1, 2, 10].map((r) => (
              <button key={r} className={draft.tdsRate === r ? 'on' : ''} onClick={() => set({ tdsRate: r })}>
                {r}%
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          <span className="field-label">Currency</span>
          <select className="input" value={draft.currency} onChange={(e) => set({ currency: e.target.value as Currency })}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      <dl className="ledger">
        <dt>Taxable value</dt>
        <dd>
          <Amount value={totals.subtotal} currency={draft.currency} />
        </dd>
        {mode === 'intra' && (
          <>
            <dt>CGST {draft.taxRate / 2}%</dt>
            <dd>
              <Amount value={totals.cgst} currency={draft.currency} />
            </dd>
            <dt>SGST {draft.taxRate / 2}%</dt>
            <dd>
              <Amount value={totals.sgst} currency={draft.currency} />
            </dd>
          </>
        )}
        {mode === 'inter' && (
          <>
            <dt>IGST {draft.taxRate}%</dt>
            <dd>
              <Amount value={totals.igst} currency={draft.currency} />
            </dd>
          </>
        )}
        <dt className="ledger-total">Invoice amount</dt>
        <dd className="ledger-total">
          <Amount value={totals.total} currency={draft.currency} />
        </dd>
        <dt>TDS {draft.tdsRate}%</dt>
        <dd>
          − <Amount value={totals.tds} currency={draft.currency} />
        </dd>
        <dt className="ledger-net">Lands in the bank</dt>
        <dd className="ledger-net">
          <Amount value={totals.receivable} currency={draft.currency} />
        </dd>
      </dl>

      <label className="field">
        <span className="field-label">Note on invoice (optional)</span>
        <textarea className="input" rows={2} value={draft.notes} onChange={(e) => set({ notes: e.target.value })} />
      </label>
    </>
  );
}

/* ---------- 04 Review & latch ---------- */

function ReviewStage({
  preview,
  client,
  totals,
  conflicts,
  existing,
  onEdit,
  onCommit,
}: {
  preview: Invoice;
  client?: Client;
  totals: ReturnType<typeof computeTotals>;
  conflicts: Invoice[];
  existing: boolean;
  onEdit: (i: number) => void;
  onCommit: () => void;
}) {
  const total = useCountUp(totals.total, 1000);
  const rows: [string, ReactNode, number][] = [
    ['Client', client ? `${client.name}${client.billingName !== client.name ? ` · ${client.billingName}` : ''}` : '—', 0],
    ['Invoice', preview.title || '—', 1],
    ['Date', longDate(preview.date), 1],
    ['Lines', `${preview.items.length} item${preview.items.length === 1 ? '' : 's'}`, 1],
    ['Tax', <TaxBadge key="t" mode={totals.mode} />, 2],
    ['After TDS', money(totals.receivable, preview.currency), 2],
  ];
  return (
    <>
      <div className="review-total">
        <span className="intro-text">Invoice {preview.number}</span>
        <span className="review-amount">{money(total, preview.currency)}</span>
      </div>
      <dl className="review">
        {rows.map(([k, v, step]) => (
          <div key={k} className="review-row">
            <dt>{k}</dt>
            <dd>{v}</dd>
            <button className="link" onClick={() => onEdit(step)}>
              Change
            </button>
          </div>
        ))}
      </dl>
      {conflicts.length > 0 && (
        <div className="alert">
          <strong>Number out of date order.</strong> GST expects numbers to follow dates:{' '}
          {conflicts
            .slice(0, 3)
            .map((c) => `${c.number} is dated ${longDate(c.date)}`)
            .join('; ')}
          .
        </div>
      )}
      <div className="stage-nav">
        <button className="btn btn-ghost" onClick={() => onEdit(2)}>
          ← Back
        </button>
        <HoldToLatch onLatch={onCommit} label={existing ? 'Hold to save changes' : 'Hold to latch invoice'} />
      </div>
    </>
  );
}

/** Press and hold: the line fills, the symbol closes, the invoice latches. Enter or Space latches straight away. */
function HoldToLatch({ onLatch, label }: { onLatch: () => void; label: string }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number>(0);
  const done = useRef(false);

  const start = () => {
    if (done.current) return;
    setHolding(true);
    timer.current = window.setTimeout(() => {
      done.current = true;
      onLatch();
    }, 900);
  };
  const cancel = () => {
    if (done.current) return;
    setHolding(false);
    clearTimeout(timer.current);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      className={`hold${holding ? ' holding' : ''}`}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !done.current) {
          e.preventDefault();
          done.current = true;
          setHolding(true);
          onLatch();
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="hold-fill" aria-hidden />
      <LatchSymbol size={22} animate={holding} />
      <span>{label}</span>
    </button>
  );
}

function LatchMoment({ number, existing }: { number: string; existing: boolean }) {
  return (
    <Portal>
    <div className="latch-moment" role="status" aria-live="polite">
      <Nest size={640} colors={['#333A32', '#B1F7BB']} rings={8} className="latch-nest" animate />
      <div className="latch-center">
        <LatchSymbol size={120} color="#B1F7BB" animate />
        <div className="latch-number mono">
          {number.split('').map((ch, i) => (
            <span key={i} style={{ animationDelay: `${600 + i * 35}ms` }}>
              {ch}
            </span>
          ))}
        </div>
        <h2 className="display">{existing ? 'Saved. Still latched.' : 'Latched.'}</h2>
      </div>
    </div>
    </Portal>
  );
}
