import { useState } from 'react';
import HomePage from './pages/HomePage';
import ResultsPage from './pages/ResultsPage';
import GraphPage from './pages/GraphPage';

type AppView = 'home' | 'results' | 'graph';

export default function App() {
  const [view, setView] = useState<AppView>('home');
  const [query, setQuery] = useState('');
  const [graphPage, setGraphPage] = useState<{id: number, title: string, url: string} | null>(null);

  const handleSearch = (q: string) => {
    setQuery(q);
    setView('results');
  };

  const handleHome = () => {
    setView('home');
  };

  const handleOpenGraph = (pageId: number, title: string, url: string) => {
    setGraphPage({ id: pageId, title, url });
    setView('graph');
  };

  const handleBackToResults = () => {
    setView('results');
  };

  return (
    <>
      {view === 'home' && <HomePage onSearch={handleSearch} />}
      
      {(view === 'results' || view === 'graph') && (
        <div style={{ display: view === 'results' ? 'block' : 'none' }}>
          <ResultsPage
            initialQuery={query}
            onSearch={setQuery}
            onHome={handleHome}
            onOpenGraph={handleOpenGraph}
          />
        </div>
      )}

      {view === 'graph' && graphPage !== null && (
        <GraphPage 
          pageId={graphPage.id}
          pageTitle={graphPage.title}
          pageUrl={graphPage.url}
          onBack={handleBackToResults} 
        />
      )}
    </>
  );
}
