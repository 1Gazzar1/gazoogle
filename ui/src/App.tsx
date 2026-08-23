import { useState } from 'react';
import HomePage from './pages/HomePage';
import ResultsPage from './pages/ResultsPage';
import GraphPage from './pages/GraphPage';

type AppView = 'home' | 'results' | 'graph';

export default function App() {
  const [view, setView] = useState<AppView>('home');
  const [query, setQuery] = useState('');
  const [graphPageId, setGraphPageId] = useState<number | null>(null);

  const handleSearch = (q: string) => {
    setQuery(q);
    setView('results');
  };

  const handleHome = () => {
    setView('home');
  };

  const handleOpenGraph = (pageId: number) => {
    setGraphPageId(pageId);
    setView('graph');
  };

  const handleBackToResults = () => {
    setView('results');
  };

  if (view === 'results') {
    return (
      <ResultsPage
        key={query}
        initialQuery={query}
        onHome={handleHome}
        onOpenGraph={handleOpenGraph}
      />
    );
  }

  if (view === 'graph' && graphPageId !== null) {
    return (
      <GraphPage 
        pageId={graphPageId} 
        onBack={handleBackToResults} 
      />
    );
  }

  return <HomePage onSearch={handleSearch} />;
}
