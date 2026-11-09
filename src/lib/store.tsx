import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { seedData } from './seed';
import type { AppData, Client, Company, Invoice } from './types';

/**
 * Prototype storage: everything lives in this browser's localStorage.
 * Swap this module for API calls when the database is added.
 */
const KEY = 'latchbilling.v1';

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw) as AppData;
      const seed = seedData();
      return { ...data, company: { ...seed.company, ...data.company, bank: { ...seed.company.bank, ...data.company?.bank } } };
    }
  } catch {
    /* fall through to sample data */
  }
  return seedData();
}

interface Store extends AppData {
  saveInvoice: (invoice: Invoice) => void;
  deleteInvoice: (id: string) => void;
  saveClient: (client: Client) => void;
  deleteClient: (id: string) => boolean;
  saveCompany: (company: Company) => void;
  resetSampleData: () => void;
  clientById: (id: string) => Client | undefined;
}

const StoreContext = createContext<Store | null>(null);

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const next = list.slice();
  next[i] = item;
  return next;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* storage unavailable: keep working in memory */
    }
  }, [data]);

  const clientById = useCallback((id: string) => data.clients.find((c) => c.id === id), [data.clients]);

  const store = useMemo<Store>(
    () => ({
      ...data,
      clientById,
      saveInvoice: (invoice) => setData((d) => ({ ...d, invoices: upsert(d.invoices, invoice) })),
      deleteInvoice: (id) => setData((d) => ({ ...d, invoices: d.invoices.filter((i) => i.id !== id) })),
      saveClient: (client) => setData((d) => ({ ...d, clients: upsert(d.clients, client) })),
      deleteClient: (id) => {
        if (data.invoices.some((i) => i.clientId === id)) return false;
        setData((d) => ({ ...d, clients: d.clients.filter((c) => c.id !== id) }));
        return true;
      },
      saveCompany: (company) => setData((d) => ({ ...d, company })),
      resetSampleData: () => setData(seedData()),
    }),
    [data, clientById],
  );

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}
