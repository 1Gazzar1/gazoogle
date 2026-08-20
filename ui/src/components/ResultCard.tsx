/* === ResultCard component === */
import type { SearchResult } from '../types';
import styles from './ResultCard.module.css';

interface Props {
  result: SearchResult;
  index: number;
}

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function getFavicon(url: string) {
  try {
    const { origin } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${origin}&sz=32`;
  } catch {
    return null;
  }
}

export default function ResultCard({ result, index }: Props) {
  const domain = getDomain(result.url);
  const favicon = getFavicon(result.url);

  return (
    <article
      className={styles.card}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Site metadata row */}
      <div className={styles.meta}>
        {favicon && (
          <img
            src={favicon}
            alt=""
            className={styles.favicon}
            width="16"
            height="16"
            loading="lazy"
          />
        )}
        <span className={styles.domain}>{domain}</span>
        <span className={`${styles.badge} ${styles[`badge_${result.type}`]}`}>
          {{
            bm25: 'BM25',
            embedding: 'Vector',
            both: 'Both',
          }[result.type]}
        </span>
      </div>

      {/* Title */}
      <h2 className={styles.title}>
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          {result.title || domain}
        </a>
      </h2>

      {/* URL breadcrumb */}
      <p className={styles.url}>{result.url}</p>

      {/* Heading / snippet */}
      {result.heading && (
        <p className={styles.snippet}>{result.heading}</p>
      )}

      {/* Matched terms */}
      {result.terms && result.terms.length > 0 && (
        <div className={styles.terms} aria-label="Matched terms">
          {result.terms.slice(0, 6).map((t) => (
            <span key={t.term} className={styles.term}>
              {t.term}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
