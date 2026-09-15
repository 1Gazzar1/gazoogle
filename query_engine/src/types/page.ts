export interface BasePage {
    id: number;
    backlinkCount?: number;
}

export interface EmbeddingPage extends BasePage {
    type: "embedding";
}

export interface BM25Page extends BasePage {
    type: "bm25";
    bm25Score: number;
    terms: Term[];
}

// Discriminated union of all page variants
export type Page = BM25Page | EmbeddingPage;

// Automatically derived as "bm25" | "embedding"
export type PageType = Page["type"];

export interface Term {
    term: string;
    tf: number;
    df: number;
}
