import { GetAllVocabRow } from "@/internal/vocab_sql.js";

export function vocabBuckets(vocab: GetAllVocabRow[]) {
    const bucket: Record<number, string[]> = {};
    for (const word of vocab) {
        const len = word.word.length;

        if (!bucket[len]) {
            bucket[len] = [];
        }
        bucket[len].push(word.word)
    }
    return bucket;
}
