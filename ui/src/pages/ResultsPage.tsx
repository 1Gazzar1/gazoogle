/* === ResultsPage === */
import { useState, useEffect, useCallback } from "react";
import type { SearchResponse, ImagesResponse, SearchView } from "../types";
import SearchBar from "../components/SearchBar";
import ResultCard from "../components/ResultCard";
import ImageCard from "../components/ImageCard";
import Pagination from "../components/Pagination";
import styles from "./ResultsPage.module.css";

const API_BASE = "/api";

interface Props {
    initialQuery: string;
    initialPage?: number;
    initialView?: SearchView;
    onSearch: (q: string, page?: number) => void;
    onPageChange: (page: number) => void;
    onViewChange?: (v: SearchView) => void;
    onHome: () => void;
    onOpenGraph: (pageId: number, title: string, url: string) => void;
}

type Status = "idle" | "loading" | "error" | "success";

export default function ResultsPage({
    initialQuery,
    initialPage = 1,
    initialView = "web",
    onSearch,
    onPageChange,
    onViewChange,
    onHome,
    onOpenGraph,
}: Props) {
    const [query, setQuery] = useState(initialQuery);
    const [view, setView] = useState<SearchView>(initialView);
    const [status, setStatus] = useState<Status>("idle");
    const [webData, setWebData] = useState<SearchResponse | null>(null);
    const [imgData, setImgData] = useState<ImagesResponse | null>(null);
    const [error, setError] = useState<string>("");

    // Sync state when props change (from URL back/forward navigation)
    useEffect(() => {
        setQuery(initialQuery);
    }, [initialQuery]);

    useEffect(() => {
        setView(initialView);
    }, [initialView]);

    const fetchWeb = useCallback(async (q: string, page: number = 1) => {
        if (!q.trim()) return;
        setStatus("loading");
        setError("");
        try {
            const res = await fetch(
                `${API_BASE}/search?q=${encodeURIComponent(q)}&page=${page}&pageSize=10`,
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
        if (!q.trim()) return;
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
        } catch {
            // Images are complementary in web view, don't fail entire page
        }
    }, []);

    // Run search whenever query, page, or view changes from props
    useEffect(() => {
        if (!initialQuery.trim()) return;
        if (view === "web") {
            fetchWeb(initialQuery, initialPage);
            fetchImages(initialQuery);
        } else {
            setStatus("loading");
            setError("");
            fetch(`${API_BASE}/images?q=${encodeURIComponent(initialQuery)}`)
                .then(async (res) => {
                    if (!res.ok)
                        throw new Error(
                            (await res.text()) || `Error ${res.status}`,
                        );
                    return res.json();
                })
                .then((data: ImagesResponse) => {
                    setImgData(data);
                    setStatus("success");
                })
                .catch((err) => {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Failed to load images",
                    );
                    setStatus("error");
                });
        }
    }, [initialQuery, initialPage, view, fetchWeb, fetchImages]);

    const handleSearch = (newQ: string) => {
        const trimmed = newQ.trim();
        if (!trimmed) return;
        setQuery(trimmed);

        // If query and page are identical, force refresh
        if (trimmed === initialQuery && initialPage === 1) {
            if (view === "web") {
                fetchWeb(trimmed, 1);
                fetchImages(trimmed);
            } else {
                fetchImages(trimmed);
            }
        } else {
            onSearch(trimmed, 1);
        }
    };

    const handleViewChange = (v: SearchView) => {
        setView(v);
        onViewChange?.(v);
    };

    const handlePageChange = (newPage: number) => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        onPageChange(newPage);
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
                    <img
                        src="/my-logo.png"
                        alt="Gz"
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            borderRadius: "inherit",
                            imageRendering: "pixelated",
                        }}
                    />
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
                                    ? (fetchWeb(initialQuery, initialPage),
                                      fetchImages(initialQuery))
                                    : fetchImages(initialQuery)
                            }
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* Web results */}
                {status === "success" && view === "web" && webData && (
                    <div className={styles.webLayout}>
                        <section
                            aria-label="Web search results"
                            className={styles.webResults}
                        >
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
                                        <line
                                            x1="12"
                                            y1="16"
                                            x2="12.01"
                                            y2="16"
                                        />
                                    </svg>
                                    Showing results for{" "}
                                    <strong>{webData.q.join(" ")}</strong>
                                </div>
                            )}

                            <p className={styles.resultCount}>
                                {webData.pagination
                                    ? `About ${webData.pagination.totalResults} result${webData.pagination.totalResults !== 1 ? "s" : ""}`
                                    : `${webData.results.length} result${webData.results.length !== 1 ? "s" : ""}`}
                                <span className={styles.serverTime}>
                                    Server: {webData.durations.totalTime} ms
                                </span>
                            </p>

                            <div className={styles.resultsList}>
                                {webData.results.map((r, i) => (
                                    <ResultCard
                                        key={r.id}
                                        result={r}
                                        index={i}
                                        onOpenGraph={onOpenGraph}
                                    />
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

                            {/* Classic Gazoogle Pagination */}
                            {webData.results.length > 0 && (
                                <Pagination
                                    currentPage={initialPage}
                                    pageSize={
                                        webData.pagination?.pageSize ?? 10
                                    }
                                    total={webData.pagination?.totalResults}
                                    hasMore={
                                        webData.results.length ===
                                        (webData.pagination?.pageSize ?? 10)
                                    }
                                    onPageChange={handlePageChange}
                                />
                            )}
                        </section>

                        {imgData && imgData.images.length > 0 && (
                            <aside
                                className={styles.webImages}
                                aria-label="Top images"
                            >
                                <h3>Images</h3>
                                <div className={styles.webImageGrid}>
                                    {imgData.images
                                        .slice(0, 5)
                                        .map((img, i) => (
                                            <ImageCard
                                                key={img.id}
                                                image={img}
                                                index={i}
                                            />
                                        ))}
                                </div>
                            </aside>
                        )}
                    </div>
                )}

                {/* Image results */}
                {status === "success" && view === "images" && imgData && (
                    <section aria-label="Image search results">
                        <p className={styles.resultCount}>
                            {imgData.images.length} image
                            {imgData.images.length !== 1 ? "s" : ""}
                            <span className={styles.serverTime}>
                                Server: {imgData.totalTime} ms
                            </span>
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
