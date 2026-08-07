export type BM25Params = {
    b: number;
    k1: number;
    avgDocLen: number;
    totalDocs: number;
    docLen: number;
    df: number;
    tf: number;
};
