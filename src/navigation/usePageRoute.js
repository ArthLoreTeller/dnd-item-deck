import { useEffect, useState } from 'react';
import { resolvePageHash } from './routes.js';
export function usePageRoute() {
  const [page, setPage] = useState(() => resolvePageHash(window.location.hash));
  useEffect(() => {
    const change = () => { setPage(resolvePageHash(window.location.hash)); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  return { page, navigate: name => { window.location.hash = `/${name}`; } };
}
