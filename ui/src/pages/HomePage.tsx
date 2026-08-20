/* === HomePage === */
import { useState } from 'react';
import SearchBar from '../components/SearchBar';
import styles from './HomePage.module.css';

interface Props {
  onSearch: (query: string) => void;
}

const SUGGESTIONS = [
  'ULTRAKILL V1',
  'gabriel second coming',
  'paradiso lore',
  'minos prime',
  'cyber grind',
];

export default function HomePage({ onSearch }: Props) {
  const [query, setQuery] = useState('');

  return (
    <main className={styles.page}>
      {/* Floating orbs background */}
      <div className={styles.orb1} aria-hidden="true" />
      <div className={styles.orb2} aria-hidden="true" />

      <div className={styles.content}>
        {/* Logo */}
        <div className={styles.logoWrap}>
          <span className={styles.logo}>
            <span className={styles.logoG}>G</span>
            <span className={styles.logoA}>a</span>
            <span className={styles.logoZ}>z</span>
            <span className={styles.logoO}>o</span>
            <span className={styles.logoO2}>o</span>
            <span className={styles.logoG2}>g</span>
            <span className={styles.logoL}>l</span>
            <span className={styles.logoE}>e</span>
          </span>
          <p className={styles.tagline}>
            A personal search engine · BM25 + Vector embeddings
          </p>
        </div>

        {/* Search bar */}
        <div className={styles.searchWrap}>
          <SearchBar
            value={query}
            onChange={setQuery}
            onSubmit={onSearch}
            autoFocus
          />
        </div>

        {/* Quick suggestions */}
        <div className={styles.suggestions} role="list" aria-label="Search suggestions">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              role="listitem"
              className={styles.suggestion}
              onClick={() => onSearch(s)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              {s}
            </button>
          ))}
        </div>

        {/* Info chips */}
        <div className={styles.chips} aria-label="Search engine stats">
          <span className={styles.chip}>🕷️ Web crawler</span>
          <span className={styles.chip}>📊 BM25 ranking</span>
          <span className={styles.chip}>🔮 Vector search</span>
          <span className={styles.chip}>⚡ RRF fusion</span>
        </div>
      </div>
    </main>
  );
}
