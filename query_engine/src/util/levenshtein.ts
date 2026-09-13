import { distance } from "fastest-levenshtein";

export function doLevenshtein(q: string, vocab: string[]) {
    let bestDist = Infinity;
    let match = q;
    for (const word of vocab) {
        const d = distance(q, word);
        if (d < bestDist) {
            match = word;
            bestDist = d;
        }
        if (bestDist === 1) {
            break;
        }
    }
    return match;
}
