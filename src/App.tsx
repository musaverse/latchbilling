import { useRoute, type Route } from './lib/router';
import { useStore } from './lib/store';
import { Clients } from './pages/Clients';
import { Dashboard } from './pages/Dashboard';
import { InvoiceEditor } from './pages/InvoiceEditor';
import { Invoices } from './pages/Invoices';
import { InvoiceView } from './pages/InvoiceView';
import { Settings } from './pages/Settings';

const NAV: { href: string; label: string; match: Route['page'][]; icon: string }[] = [
  { href: '#/', label: 'Overview', match: ['dashboard'], icon: 'M3 12h4l3-8 4 16 3-8h4' },
  { href: '#/invoices', label: 'Invoices', match: ['invoices', 'invoice', 'invoice-edit'], icon: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7' },
  { href: '#/invoices/new', label: 'New invoice', match: ['invoice-new'], icon: 'M12 5v14M5 12h14' },
  { href: '#/clients', label: 'Clients', match: ['clients'], icon: 'M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 20v-1a4 4 0 0 0-3-3.87M15 4.13a3.5 3.5 0 0 1 0 6.75' },
  { href: '#/settings', label: 'Settings', match: ['settings'], icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z' },
];

function Page({ route }: { route: Route }) {
  switch (route.page) {
    case 'invoices':
      return <Invoices />;
    case 'invoice-new':
      return <InvoiceEditor key={`new-${route.from ?? ''}`} from={route.from} />;
    case 'invoice':
      return <InvoiceView id={route.id} />;
    case 'invoice-edit':
      return <InvoiceEditor key={`edit-${route.id}`} id={route.id} />;
    case 'clients':
      return <Clients />;
    case 'settings':
      return <Settings />;
    default:
      return <Dashboard />;
  }
}

export function App() {
  const route = useRoute();
  const { company } = useStore();

  return (
    <div className="shell">
      <aside className="sidebar no-print">
        <a className="brand" href="#/">
          <span className="brand-mark">L</span>
          <span>
            <strong>Latch Billing</strong>
            <small>{company.name.replace(' Private Limited', '')}</small>
          </span>
        </a>
        <nav>
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className={n.match.includes(route.page) ? 'active' : ''}>
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d={n.icon} />
              </svg>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="mono">{company.gstin}</span>
          <span>Prototype · data saved in this browser</span>
        </div>
      </aside>
      <main className="main">
        <Page route={route} />
      </main>
    </div>
  );
}
