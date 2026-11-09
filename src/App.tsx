import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LatchSymbol, Lines } from './components/Brand';
import { CommandBar } from './components/CommandBar';
import { Intro } from './components/Intro';
import { go, useRoute, type Route } from './lib/router';
import { useStore } from './lib/store';
import { Clients } from './pages/Clients';
import { Composer } from './pages/Composer';
import { Dashboard } from './pages/Dashboard';
import { Invoices } from './pages/Invoices';
import { InvoiceView } from './pages/InvoiceView';
import { Settings } from './pages/Settings';

const NAV: { href: string; label: string; match: Route['page'][]; icon: string }[] = [
  { href: '#/', label: 'Overview', match: ['dashboard'], icon: 'M3 15h5l2.5-5 3 8 2.5-5H21' },
  { href: '#/invoices', label: 'Invoices', match: ['invoices', 'invoice'], icon: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5' },
  { href: '#/invoices/new', label: 'New invoice', match: ['invoice-new', 'invoice-edit'], icon: 'M12 5v14M5 12h14' },
  { href: '#/clients', label: 'Clients', match: ['clients'], icon: 'M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 20v-1a4 4 0 0 0-3-3.87M15 4.13a3.5 3.5 0 0 1 0 6.75' },
  { href: '#/settings', label: 'Settings', match: ['settings'], icon: 'M4 7h10M18 7h2M4 17h2M10 17h10M16 4v6M8 14v6' },
];

function Page({ route }: { route: Route }) {
  switch (route.page) {
    case 'invoices':
      return <Invoices />;
    case 'invoice-new':
      return <Composer key={`new-${route.from ?? ''}-${route.client ?? ''}`} from={route.from} clientId={route.client} />;
    case 'invoice':
      return <InvoiceView id={route.id} />;
    case 'invoice-edit':
      return <Composer key={`edit-${route.id}`} id={route.id} />;
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
  const [askOpen, setAskOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const [pill, setPill] = useState<{ top: number; height: number; left: number; width: number } | null>(null);

  // The active marker slides between items rather than jumping.
  useLayoutEffect(() => {
    const measure = () => {
      const el = navRef.current?.querySelector<HTMLElement>('a.active');
      setPill(el ? { top: el.offsetTop, height: el.offsetHeight, left: el.offsetLeft, width: el.offsetWidth } : null);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [route.page]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setAskOpen((o) => !o);
      } else if (!typing && e.key === '/') {
        e.preventDefault();
        setAskOpen(true);
      } else if (!typing && !e.metaKey && !e.ctrlKey && e.key.toLowerCase() === 'n' && !document.querySelector('.modal, .cmd')) {
        go('/invoices/new');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const routeKey = route.page + ('id' in route ? route.id : '');

  return (
    <div className="shell">
      <Intro />
      <aside className="sidebar no-print">
        <a className="brand" href="#/">
          <LatchSymbol size={30} color="#B1F7BB" className="brand-symbol" />
          <span>
            <strong>Latch Billing</strong>
            <small>{company.name.replace(' Private Limited', '')}</small>
          </span>
        </a>

        <button className="ask" onClick={() => setAskOpen(true)}>
          <svg viewBox="0 0 24 24" aria-hidden>
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4 4" />
          </svg>
          <span>Ask Latch…</span>
          <kbd>⌘K</kbd>
        </button>

        <nav ref={navRef}>
          {pill && <span className="nav-pill" style={{ transform: `translate(${pill.left}px, ${pill.top}px)`, height: pill.height, width: pill.width }} />}
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
          <Lines width={240} height={90} count={4} stroke={5} colors={['#B1F7BB', '#4b5a4a']} at={0.05} className="sidebar-lines" />
          <span className="mono">{company.gstin}</span>
          <span>Prototype · saved in this browser</span>
        </div>
      </aside>

      <main className="main">
        <div className="page" key={routeKey}>
          <Page route={route} />
        </div>
      </main>

      <CommandBar open={askOpen} onClose={() => setAskOpen(false)} />
    </div>
  );
}
