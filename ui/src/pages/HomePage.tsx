/* === HomePage === */
import { useState } from "react";
import SearchBar from "../components/SearchBar";
import styles from "./HomePage.module.css";

interface Props {
    onSearch: (query: string) => void;
}

export default function HomePage({ onSearch }: Props) {
    const [query, setQuery] = useState("");

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

                <nav className={styles.socialLinks} aria-label="Project links">
                    <a
                        className={styles.socialLink}
                        href="https://github.com/1Gazzar1/gazoogle"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Gazoogle on GitHub"
                        title="Gazoogle on GitHub"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden="true"
                        >
                            <path d="M12 2C6.48 2 2 6.58 2 12.24c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.49 0-.24-.01-1.04-.01-1.89-2.78.62-3.37-1.22-3.37-1.22-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.07 1.53 1.07.9 1.58 2.35 1.12 2.92.86.09-.67.35-1.12.64-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.2 9.2 0 0 1 12 7.01c.85 0 1.7.12 2.49.36 1.9-1.33 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.35 4.8-4.58 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.8 0 .27.18.59.69.49A10.25 10.25 0 0 0 22 12.24C22 6.58 17.52 2 12 2Z" />
                        </svg>
                    </a>
                    <a
                        className={styles.socialLink}
                        href="https://www.linkedin.com/in/mohamed-el-gazzar/"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Mohamed El Gazzar on LinkedIn"
                        title="Mohamed El Gazzar on LinkedIn"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden="true"
                        >
                            <path d="M5.17 3.5A2.17 2.17 0 1 1 5.17 7.84 2.17 2.17 0 0 1 5.17 3.5ZM3.3 9.5h3.74V21H3.3V9.5Zm5.99 0h3.59v1.57h.05c.5-.95 1.72-1.95 3.55-1.95 3.8 0 4.5 2.5 4.5 5.76V21h-3.74v-5.43c0-1.3-.03-2.97-1.81-2.97-1.81 0-2.09 1.42-2.09 2.88V21H9.29V9.5Z" />
                        </svg>
                    </a>
                </nav>
            </div>
        </main>
    );
}
