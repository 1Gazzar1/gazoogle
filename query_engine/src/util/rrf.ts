import type { BM25Page, EmbeddingPage, Page, PageType } from "@/types/page.js";

export type RRFPage = Omit<Page, "type"> & {
    rrfScore: number;
    type: PageType | "both";
};

export function rrf(
    bm25Results: BM25Page[],
    embeddingResults: EmbeddingPage[],
) {
    const k = 60;

    // map to dedup
    const map = new Map<number, RRFPage>();
    bm25Results.forEach((page, index) => {
        // this is the first loop so it won't combine anything
        map.set(page.id, {
            ...page,
            rrfScore: 1 / (index + k),
        });
    });

    embeddingResults.forEach((page, index) => {
        const rrfPage = map.get(page.id);
        // here is the combining logic, if a page was already here
        if (rrfPage) {
            map.set(page.id, {
                ...rrfPage, // to keep terms list
                type: "both",
                rrfScore: 1 / (index + k) + rrfPage.rrfScore,
            });
            return;
        }
        // if it wasn't there then just add it
        map.set(page.id, {
            ...page,
            rrfScore: 1 / (index + k),
        });
    });

    // now we sort
    const result = [...map.values()].sort((a, b) => b.rrfScore - a.rrfScore);

    return result;
}
