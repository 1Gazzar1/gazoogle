import { useState, useEffect, useCallback } from 'react';
import HomePage from './pages/HomePage';
import ResultsPage from './pages/ResultsPage';
import GraphPage from './pages/GraphPage';
import type { SearchView } from './types';

type Route =
  | { view: 'home' }
  | { view: 'results'; query: string; page: number; tab: SearchView }
  | { view: 'links'; pageId: number; title?: string; url?: string };

function parseRoute(): Route {
  const path = window.location.pathname;
  const search = window.location.search;
  const params = new URLSearchParams(search);

  // Check /links/:id or /graph/:id
  const linksMatch = path.match(/^\/(?:links|graph)\/(\d+)/);
  if (linksMatch) {
    return {
      view: 'links',
      pageId: parseInt(linksMatch[1], 10),
      title: params.get('title') || undefined,
      url: params.get('url') || undefined,
    };
  }

  // Check /links?id=... or /graph?id=...
  if ((path === '/links' || path === '/graph') && params.has('id')) {
    return {
      view: 'links',
      pageId: parseInt(params.get('id')!, 10),
      title: params.get('title') || undefined,
      url: params.get('url') || undefined,
    };
  }

  // Check /search, /results, or / with ?q=...
  if (path === '/search' || path === '/results' || params.has('q')) {
    const q = params.get('q') || '';
    if (q) {
      const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);
      const tab = params.get('tab') === 'images' ? 'images' : 'web';
      return {
        view: 'results',
        query: q,
        page,
        tab,
      };
    }
  }

  return { view: 'home' };
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseRoute);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseRoute());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToSearch = useCallback((query: string, page = 1, tab: SearchView = 'web') => {
    const params = new URLSearchParams();
    params.set('q', query);
    params.set('page', String(page));
    if (tab === 'images') {
      params.set('tab', 'images');
    }
    const newUrl = `/search?${params.toString()}`;
    window.history.pushState(null, '', newUrl);
    setRoute({ view: 'results', query, page, tab });
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    if (route.view === 'results') {
      navigateToSearch(route.query, newPage, route.tab);
    }
  }, [route, navigateToSearch]);

  const handleViewChange = useCallback((newTab: SearchView) => {
    if (route.view === 'results') {
      navigateToSearch(route.query, route.page, newTab);
    }
  }, [route, navigateToSearch]);

  const navigateToLinks = useCallback((pageId: number, title?: string, url?: string) => {
    const params = new URLSearchParams();
    if (title) params.set('title', title);
    if (url) params.set('url', url);
    const qs = params.toString();
    const newUrl = `/links/${pageId}${qs ? `?${qs}` : ''}`;
    window.history.pushState(null, '', newUrl);
    setRoute({ view: 'links', pageId, title, url });
  }, []);

  const navigateToHome = useCallback(() => {
    window.history.pushState(null, '', '/');
    setRoute({ view: 'home' });
  }, []);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigateToHome();
    }
  }, [navigateToHome]);

  return (
    <>
      {route.view === 'home' && (
        <HomePage onSearch={(q) => navigateToSearch(q, 1, 'web')} />
      )}

      {route.view === 'results' && (
        <ResultsPage
          initialQuery={route.query}
          initialPage={route.page}
          initialView={route.tab}
          onSearch={(q, page = 1) => navigateToSearch(q, page, route.tab)}
          onPageChange={handlePageChange}
          onViewChange={handleViewChange}
          onHome={navigateToHome}
          onOpenGraph={navigateToLinks}
        />
      )}

      {route.view === 'links' && (
        <GraphPage
          pageId={route.pageId}
          pageTitle={route.title}
          pageUrl={route.url}
          onBack={handleBack}
        />
      )}
    </>
  );
}
