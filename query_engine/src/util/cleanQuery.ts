import { englishStopWords } from "@/constants/stopWords.js";

export function cleanQuery(q: string) {
    // tokenize
    const trimmed = q.trim();
    const _tokens = trimmed.split(" ");
    const tokens: string[] = [];
    for (const token of _tokens) {
        if (token.trim() == "") {
            continue;
        }
        tokens.push(token);
    }

    const regex = new RegExp("[^a-zA-Z0-9]+");

    const finalTokens: string[] = [];
    for (let raw of tokens) {
        raw = raw.toLowerCase();

        const words = raw.replaceAll(regex, " ");
        for (let word of words) {
            if (englishStopWords.has(word)) {
                continue;
            }
            if (word == "" || word.length < 2) {
                continue;
            }
            finalTokens.push(word);
        }
    }
    return finalTokens;
}
