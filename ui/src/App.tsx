import { useState } from 'react';
import HomePage from './pages/HomePage';
import ResultsPage from './pages/ResultsPage';

type AppView = 'home' | 'results';

export default function App() {
  const [view, setView] = useState<AppView>('home');
  const [query, setQuery] = useState('');

  const handleSearch = (q: string) => {
    setQuery(q);
    setView('results');
  };

  const handleHome = () => {
    setView('home');
  };

  if (view === 'results') {
    return (
      <ResultsPage
        key={query}
        initialQuery={query}
        onHome={handleHome}
      />
    );
  }

  return <HomePage onSearch={handleSearch} />;
}
