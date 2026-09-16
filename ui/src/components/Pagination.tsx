import styles from './Pagination.module.css';

interface Props {
  currentPage: number;
  pageSize?: number;
  total?: number;
  hasMore?: boolean;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  pageSize = 10,
  total,
  hasMore,
  onPageChange,
}: Props) {
  let totalPages = 1;
  if (total !== undefined) {
    totalPages = Math.max(1, Math.ceil(total / pageSize));
  } else if (hasMore) {
    totalPages = Math.max(currentPage + 1, 10);
  } else {
    totalPages = currentPage;
  }

  // If there's only 1 page and no more pages, don't show pagination
  if (totalPages <= 1) {
    return null;
  }

  const MAX_VISIBLE_PAGES = 10;
  let startPage = 1;
  let endPage = totalPages;

  if (totalPages > MAX_VISIBLE_PAGES) {
    startPage = Math.max(1, currentPage - 5);
    endPage = Math.min(totalPages, startPage + MAX_VISIBLE_PAGES - 1);
    if (endPage - startPage + 1 < MAX_VISIBLE_PAGES) {
      startPage = Math.max(1, endPage - MAX_VISIBLE_PAGES + 1);
    }
  }

  const pages: number[] = [];
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages || (total === undefined && hasMore);

  return (
    <nav className={styles.pagination} aria-label="Search results pagination">
      <div className={styles.wrapper}>
        {/* Previous button */}
        {hasPrev ? (
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => onPageChange(currentPage - 1)}
            aria-label="Previous page"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Previous</span>
          </button>
        ) : (
          <div style={{ width: 24 }} />
        )}

        {/* Word track: g a z [o...] g l e */}
        <div className={styles.wordTrack}>
          {/* Prefix */}
          <div className={styles.prefix} aria-hidden="true">
            <span className={styles.letterG}>g</span>
            <span className={styles.letterA}>a</span>
            <span className={styles.letterZ}>z</span>
          </div>

          {/* O letters corresponding to pages */}
          <div className={styles.pagesTrack}>
            {pages.map((p) => {
              const isActive = p === currentPage;
              return (
                <button
                  key={p}
                  type="button"
                  className={`${styles.pageItem} ${isActive ? styles.activePage : ''}`}
                  onClick={() => {
                    if (!isActive) onPageChange(p);
                  }}
                  disabled={isActive}
                  aria-label={`Page ${p}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className={`${styles.letterO} ${isActive ? styles.activeO : ''}`}>
                    o
                  </span>
                  <span className={styles.pageNum}>{p}</span>
                </button>
              );
            })}
          </div>

          {/* Suffix */}
          <div className={styles.suffix} aria-hidden="true">
            <span className={styles.letterG2}>g</span>
            <span className={styles.letterL}>l</span>
            <span className={styles.letterE}>e</span>
          </div>
        </div>

        {/* Next button */}
        {hasNext ? (
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => onPageChange(currentPage + 1)}
            aria-label="Next page"
          >
            <span>Next</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ) : (
          <div style={{ width: 24 }} />
        )}
      </div>
    </nav>
  );
}
