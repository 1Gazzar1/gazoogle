import * as leven from "fast-levenshtein";
export function doLevenshtein(q: string, vocab: string[]) {
    // this might need to be refactored to return a list of clostest matches instead of 1
    const lowest = 99999999999999;
    let output = "";
    for (const word of vocab) {
        const len = leven.get(q, word);
        if (len < lowest) {
            output = word;
        }
    }
    return output;
}
