import { englishStopWords } from "@/constants/stopWords.js";

export function cleanQuery(q: string) {
    // 1. Convert to lowercase and replace all non-alphanumeric chars with spaces upfront
    const cleaned = q.toLowerCase().replace(/[^a-zA-Z0-9]+/g, " ");

    // 2. Split by spaces, filter empty/short words, and filter stop words
    return cleaned
        .split(" ")
        .filter((word) => word.length >= 2 && !englishStopWords.has(word));
}
