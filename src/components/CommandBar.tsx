import { useEffect, useMemo, useRef, useState } from 'react';
import { computeTotals } from '../lib/gst';
import { money, shortDate } from '../lib/format';
import { go } from '../lib/router';
import { useStore } from '../lib/store';
import { Portal } from './Portal';

interface Item {
  id: string;
  group: 'Actions' | 'Invoices' | 'Clients';
  label: string;
  hint?: string;
  keywords: string;
  run: () => void;
}

/** "Ask Latch": one box to jump anywhere. Opens with ⌘K / Ctrl K or "/". */
export function CommandBar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { invoices, clients, company, clientById } = useStore();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      setTimeout(() => input.current?.focus(), 10);
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const actions: Item[] = [
      { id: 'a-new', group: 'Actions', label: 'Create a new invoice', hint: 'N', keywords: 'new invoice create bill', run: () => go('/invoices/new') },
      { id: 'a-reg', group: 'Actions', label: 'Open the invoice register', keywords: 'register invoices list excel export month', run: () => go('/invoices') },
      { id: 'a-cli', group: 'Actions', label: 'Manage clients', keywords: 'clients customers gstin add', run: () => go('/clients') },
      { id: 'a-set', group: 'Actions', label: 'Company & bank settings', keywords: 'settings bank company gstin numbering', run: () => go('/settings') },
      { id: 'a-home', group: 'Actions', label: 'Go to overview', keywords: 'home overview dashboard', run: () => go('/') },
    ];
    const inv: Item[] = [...invoices]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((i) => {
        const c = clientById(i.clientId);
        return {
          id: i.id,
          group: 'Invoices',
          label: `${i.number} · ${i.title}`,
          hint: `${c?.name ?? ''} · ${shortDate(i.date)} · ${money(computeTotals(i, company, c).total, i.currency)}`,
          keywords: `${i.number} ${i.title} ${c?.name} ${c?.billingName}`.toLowerCase(),
          run: () => go(`/invoices/${i.id}`),
        };
      });
    const cl: Item[] = clients.map((c) => ({
      id: c.id,
      group: 'Clients',
      label: `Bill ${c.name}`,
      hint: c.billingName !== c.name ? c.billingName : c.gstin || 'Unregistered',
      keywords: `${c.name} ${c.billingName} ${c.gstin}`.toLowerCase(),
      run: () => go(`/invoices/new?client=${c.id}`),
    }));
    return [...actions, ...inv, ...cl];
  }, [invoices, clients, company, clientById]);

  const term = q.trim().toLowerCase();
  const results = term
    ? items.filter((i) => term.split(/\s+/).every((w) => (i.keywords + ' ' + i.label.toLowerCase()).includes(w))).slice(0, 12)
    : [...items.filter((i) => i.group === 'Actions'), ...items.filter((i) => i.group === 'Invoices').slice(0, 4)];

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const choose = (item?: Item) => {
    if (!item) return;
    onClose();
    item.run();
  };

  let lastGroup = '';
  return (
    <Portal>
    <div className="cmd-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cmd" role="dialog" aria-modal="true" aria-label="Ask Latch">
        <div className="cmd-input">
          <svg viewBox="0 0 24 24" aria-hidden>
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4 4" />
          </svg>
          <input
            ref={input}
            value={q}
            placeholder="Ask Latch: search invoices, clients, or jump to…"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(results.length - 1, a + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === 'Enter') {
                choose(results[active]);
              } else if (e.key === 'Escape') {
                onClose();
              }
            }}
            aria-label="Search"
          />
          <kbd>esc</kbd>
        </div>
        <div className="cmd-list" ref={listRef}>
          {results.length === 0 && <div className="cmd-empty">Nothing latched to “{q}” yet.</div>}
          {results.map((item, i) => {
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            return (
              <div key={item.id}>
                {header && <div className="cmd-group">{header}</div>}
                <button
                  className="cmd-item"
                  data-active={i === active}
                  onMouseMove={() => setActive(i)}
                  onClick={() => choose(item)}
                >
                  <span className="cmd-label">{item.label}</span>
                  {item.hint && <span className="cmd-hint">{item.hint}</span>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </Portal>
  );
}
