// i got the formuals from this site
// https://mbrenndoerfer.com/writing/bm25-search-algorithm-elasticsearch-implementation#putting-it-all-together-the-complete-formula

import { BM25Params } from "@/types/bm25.js";

export function getBM25({
    avgDocLen,
    b,
    df,
    docLen,
    k1,
    tf,
    totalDocs,
}: BM25Params) {
    return getIdf(totalDocs, df) * getTf(tf, k1, docLen, avgDocLen, b);
}

function getIdf(N: number, df: number) {
    const up = N - df + 0.5;
    const down = df + 0.5;
    return Math.log(up / down);
}

// k1 is saturation parameter
// which means bigger tf doesn't matter that much so if tf is 10 => 10, but if tf 100 => 20 or something

function getTf(tf: number, k1: number, D: number, avgD: number, b: number) {
    const up = tf * (k1 + 1);
    const down = tf + k1 * lengthNormalization(D, avgD, b);
    return up / down;
}

// b is a length normalization parameter
// which means that bigger docs in length get dimishing returns so bigger don't always win
// ranges between 0 and 1, where 0 is no normalization and 1 is full normalization
function lengthNormalization(docLen: number, avgDocLen: number, b: number) {
    return 1 - b + b * (docLen / avgDocLen);
}
