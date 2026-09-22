/* === Types shared across UI === */

export interface SearchResult {
    id: number;
    url: string;
    heading: string;
    title: string;
    type: "bm25" | "embedding" | "both";
    bm25Score?: number;
    terms?: { term: string; tf: number; df: number }[];
}

export interface ImageResult {
    id: number;
    url: string;
    altText: string;
}

export interface PaginationInfo {
    totalResults: number;
    page: number;
    pageSize: number;
}

export interface SearchResponse {
    corrected: boolean;
    q: string[];
    durations: {
        totalTime: number;
    };
    pagination?: PaginationInfo;
    results: SearchResult[];
}

export interface ImagesResponse {
    totalTime: number;
    images: ImageResult[];
}

export type SearchView = "web" | "images";
