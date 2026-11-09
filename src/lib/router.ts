import { useEffect, useState } from 'react';

export type Route =
  | { page: 'dashboard' }
  | { page: 'invoices' }
  | { page: 'invoice-new'; from?: string; client?: string }
  | { page: 'invoice'; id: string }
  | { page: 'invoice-edit'; id: string }
  | { page: 'clients' }
  | { page: 'settings' };

function parse(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean);
  const params = new URLSearchParams(query);
  if (parts[0] === 'invoices') {
    if (parts[1] === 'new') return { page: 'invoice-new', from: params.get('from') ?? undefined, client: params.get('client') ?? undefined };
    if (parts[1] && parts[2] === 'edit') return { page: 'invoice-edit', id: parts[1] };
    if (parts[1]) return { page: 'invoice', id: parts[1] };
    return { page: 'invoices' };
  }
  if (parts[0] === 'clients') return { page: 'clients' };
  if (parts[0] === 'settings') return { page: 'settings' };
  return { page: 'dashboard' };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parse(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function go(path: string): void {
  window.location.hash = path;
}
