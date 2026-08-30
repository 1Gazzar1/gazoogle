/* === HomePage === */
import { useState } from 'react';
import SearchBar from '../components/SearchBar';
import styles from './HomePage.module.css';

interface Props {
  onSearch: (query: string) => void;
}


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
          <img
            src="/my-logo.png"
            alt="Gazoogle mascot"
            className={styles.logoImage}
          />
          <span className={styles.logo}>
            <span className={styles.logoG}>g</span>
            <span className={styles.logoA}>a</span>
            <span className={styles.logoZ}>z</span>
            <span className={styles.logoO}>o</span>
            <span className={styles.logoO2}>o</span>
            <span className={styles.logoG2}>g</span>
            <span className={styles.logoL}>l</span>
            <span className={styles.logoE}>e</span>
          </span>
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

      </div>
    </main>
  );
}
