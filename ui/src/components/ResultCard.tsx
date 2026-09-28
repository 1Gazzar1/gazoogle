/* === ResultCard component === */
import type { SearchResult } from "../types";
import styles from "./ResultCard.module.css";

interface Props {
    result: SearchResult;
    index: number;
    onOpenGraph?: (id: number, title: string, url: string) => void;
}

function getDomain(url: string) {
    try {
        return new URL(url).hostname.replace("www.", "");
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

export default function ResultCard({ result, index, onOpenGraph }: Props) {
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
                <span
                    className={`${styles.badge} ${styles[`badge_${result.type}`]}`}
                >
                    {
                        {
                            bm25: "BM25",
                            embedding: "Vector",
                            both: "Both",
                        }[result.type]
                    }
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

            {/* URL breadcrumb & Graph button */}
            <div className={styles.urlRow}>
                <p className={styles.url}>{result.url}</p>
                {onOpenGraph && (
                    <button
                        className={styles.graphBtn}
                        onClick={() =>
                            onOpenGraph(
                                result.id,
                                result.title || domain,
                                result.url,
                            )
                        }
                        aria-label="View page graph"
                        title="View page graph"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                        >
                            <circle cx="18" cy="5" r="3"></circle>
                            <circle cx="6" cy="12" r="3"></circle>
                            <circle cx="18" cy="19" r="3"></circle>
                            <line
                                x1="8.59"
                                y1="13.51"
                                x2="15.42"
                                y2="17.49"
                            ></line>
                            <line
                                x1="15.41"
                                y1="6.51"
                                x2="8.59"
                                y2="10.49"
                            ></line>
                        </svg>
                        Graph
                    </button>
                )}
            </div>

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

            {(result.bm25Score !== undefined ||
                result.backlinkCount !== undefined ||
                result.backlinkBoost !== undefined ||
                result.rrfScore !== undefined ||
                result.relevanceBoost !== undefined ||
                result.finalScore !== undefined) && (
                <div className={styles.scoreInfo} aria-label="Ranking details">
                    {(result.bm25Score !== undefined ||
                        result.rrfScore !== undefined ||
                        result.finalScore !== undefined) && (
                        <div className={styles.scoreLine}>
                            <span className={styles.scoreLabel}>Scores:</span>
                            {result.bm25Score !== undefined && (
                                <span>
                                    BM25 score{" "}
                                    <strong>
                                        {result.bm25Score.toFixed(3)}
                                    </strong>
                                </span>
                            )}
                            {result.rrfScore !== undefined && (
                                <span>
                                    RRF score{" "}
                                    <strong>
                                        {result.rrfScore.toFixed(5)}
                                    </strong>
                                </span>
                            )}
                            {result.finalScore !== undefined && (
                                <span>
                                    Final score{" "}
                                    <strong>
                                        {result.finalScore.toFixed(5)}
                                    </strong>
                                </span>
                            )}
                        </div>
                    )}
                    {(result.backlinkCount !== undefined ||
                        result.backlinkBoost !== undefined ||
                        result.relevanceBoost !== undefined) && (
                        <div className={styles.scoreLine}>
                            <span className={styles.scoreLabel}>Boosts:</span>
                            {(result.backlinkCount !== undefined ||
                                result.backlinkBoost !== undefined) && (
                                <span>
                                    Backlinks{" "}
                                    <strong>{result.backlinkCount ?? 0}</strong>
                                </span>
                            )}
                            {result.backlinkBoost !== undefined && (
                                <span>
                                    Backlink boost{" "}
                                    <strong>
                                        {result.backlinkBoost.toFixed(2)}x
                                    </strong>
                                </span>
                            )}
                            {result.relevanceBoost !== undefined && (
                                <span>
                                    Relevance boost{" "}
                                    <strong>
                                        {result.relevanceBoost.toFixed(2)}x
                                    </strong>
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}
        </article>
    );
}
