import { closest } from "fastest-levenshtein";

export function doLevenshtein(q: string, vocab: string[]) {
    // this might need to be refactored to return a list of clostest matches instead of 1
    return closest(q, vocab);
}
