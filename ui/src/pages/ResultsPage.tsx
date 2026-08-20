/* === ResultsPage === */
import { useState, useEffect, useCallback } from "react";
import type { SearchResponse, ImagesResponse, SearchView } from "../types";
import SearchBar from "../components/SearchBar";
import ResultCard from "../components/ResultCard";
import ImageCard from "../components/ImageCard";
import styles from "./ResultsPage.module.css";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

interface Props {
    initialQuery: string;
    onHome: () => void;
}

type Status = "idle" | "loading" | "error" | "success";

export default function ResultsPage({ initialQuery, onHome }: Props) {
    const [query, setQuery] = useState(initialQuery);
    const [view, setView] = useState<SearchView>("web");
    const [status, setStatus] = useState<Status>("idle");
    const [webData, setWebData] = useState<SearchResponse | null>(null);
    const [imgData, setImgData] = useState<ImagesResponse | null>(null);
    const [error, setError] = useState<string>("");

    const fetchWeb = useCallback(async (q: string) => {
        setStatus("loading");
        setError("");
        try {
            const res = await fetch(
                `${API_BASE}/search?q=${encodeURIComponent(q)}`,
            );
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || `Error ${res.status}`);
            }
            const data: SearchResponse = await res.json();
            setWebData(data);
            setStatus("success");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Something went wrong",
            );
            setStatus("error");
        }
    }, []);

    const fetchImages = useCallback(async (q: string) => {
        setStatus("loading");
        setError("");
        try {
            const res = await fetch(
                `${API_BASE}/images?q=${encodeURIComponent(q)}`,
            );
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || `Error ${res.status}`);
            }
            const data: ImagesResponse = await res.json();
            setImgData(data);
            setStatus("success");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Something went wrong",
            );
            setStatus("error");
        }
    }, []);

    // Run search on mount and when query/view changes
    useEffect(() => {
        if (view === "web") {
            fetchWeb(query);
        } else {
            fetchImages(query);
        }
    }, [query, view, fetchWeb, fetchImages]);

    const handleSearch = (q: string) => {
        setQuery(q);
        setWebData(null);
        setImgData(null);
    };

    const handleViewChange = (v: SearchView) => {
        setView(v);
        setWebData(null);
        setImgData(null);
    };

    return (
        <div className={styles.page}>
            {/* Header */}
            <header className={styles.header}>
                <button
                    className={styles.logo}
                    onClick={onHome}
                    aria-label="Go to Gazoogle home"
                >
                    Gz
                </button>

                <div className={styles.searchWrap}>
                    <SearchBar
                        value={query}
                        onChange={setQuery}
                        onSubmit={handleSearch}
                        compact
                    />
                </div>
            </header>

            {/* Tabs */}
            <nav className={styles.tabs} aria-label="Search type">
                <button
                    id="tab-web"
                    className={`${styles.tab} ${view === "web" ? styles.tabActive : ""}`}
                    onClick={() => handleViewChange("web")}
                    aria-pressed={view === "web"}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    Web
                </button>
                <button
                    id="tab-images"
                    className={`${styles.tab} ${view === "images" ? styles.tabActive : ""}`}
                    onClick={() => handleViewChange("images")}
                    aria-pressed={view === "images"}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                    </svg>
                    Images
                </button>
            </nav>

            {/* Content */}
            <main className={styles.main}>
                {/* Loading state */}
                {status === "loading" && (
                    <div
                        className={styles.loadingWrap}
                        aria-live="polite"
                        aria-label="Loading results"
                    >
                        <div className={styles.spinner} aria-hidden="true" />
                        <p className={styles.loadingText}>Searching…</p>
                        {/* Skeleton cards */}
                        <div className={styles.skeletons}>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div
                                    key={i}
                                    className={styles.skeleton}
                                    style={{ animationDelay: `${i * 100}ms` }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Error state */}
                {status === "error" && (
                    <div className={styles.errorWrap} role="alert">
                        <div className={styles.errorIcon} aria-hidden="true">
                            ⚠️
                        </div>
                        <h2 className={styles.errorTitle}>
                            Something went wrong
                        </h2>
                        <p className={styles.errorMsg}>{error}</p>
                        <button
                            className={styles.retryBtn}
                            onClick={() =>
                                view === "web"
                                    ? fetchWeb(query)
                                    : fetchImages(query)
                            }
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* Web results */}
                {status === "success" && view === "web" && webData && (
                    <section aria-label="Web search results">
                        {/* Correction notice */}
                        {webData.corrected && (
                            <div
                                className={styles.correctionBanner}
                                role="status"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                Showing results for{" "}
                                <strong>{webData.q.join(" ")}</strong>
                            </div>
                        )}

                        <p className={styles.resultCount}>
                            {webData.results.length} result
                            {webData.results.length !== 1 ? "s" : ""}
                        </p>

                        <div className={styles.resultsList}>
                            {webData.results.map((r, i) => (
                                <ResultCard key={r.id} result={r} index={i} />
                            ))}
                        </div>

                        {webData.results.length === 0 && (
                            <div className={styles.emptyState}>
                                <p
                                    className={styles.emptyIcon}
                                    aria-hidden="true"
                                >
                                    🔍
                                </p>
                                <h2>No results found</h2>
                                <p>Try a different search term.</p>
                            </div>
                        )}
                    </section>
                )}

                {/* Image results */}
                {status === "success" && view === "images" && imgData && (
                    <section aria-label="Image search results">
                        <p className={styles.resultCount}>
                            {imgData.images.length} image
                            {imgData.images.length !== 1 ? "s" : ""}
                        </p>

                        <div className={styles.imageGrid}>
                            {imgData.images.map((img, i) => (
                                <ImageCard key={img.id} image={img} index={i} />
                            ))}
                        </div>

                        {imgData.images.length === 0 && (
                            <div className={styles.emptyState}>
                                <p
                                    className={styles.emptyIcon}
                                    aria-hidden="true"
                                >
                                    🖼️
                                </p>
                                <h2>No images found</h2>
                                <p>Try a different search term.</p>
                            </div>
                        )}
                    </section>
                )}
            </main>
        </div>
    );
}
