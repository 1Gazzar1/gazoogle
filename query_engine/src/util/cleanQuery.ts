import { englishStopWords } from "@/constants/stopWords.js";

export function cleanQuery(q: string) {
    // 1. Convert to lowercase and replace all non-alphanumeric chars with spaces upfront
    const cleaned = q.toLowerCase().replace(/[^a-zA-Z0-9]+/g, " ");

    // 2. Split by spaces, filter empty/short words, and filter stop words
    return cleaned
        .split(" ")
        .filter((word) => word.length >= 2 && !englishStopWords.has(word));
}
// it's basically the same function as above but doesn't remove stop words.
// its purpose is to clean the query, spell correct then pass the whole correct sentenece
// to the vector search, that way the vector doesn't take the raw query
export function normalizeQuery(q: string) {
    const cleaned = q.toLowerCase().replace(/[^a-zA-Z0-9]+/g, " ");
    return cleaned.split(" ");
}
    