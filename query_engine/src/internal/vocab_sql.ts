import { QueryArrayConfig, QueryArrayResult } from "pg";

interface Client {
    query: (config: QueryArrayConfig) => Promise<QueryArrayResult>;
}

export const getAllVocabQuery = `-- name: GetAllVocab :many
SELECT word, stem FROM vocab`;

export interface GetAllVocabRow {
    word: string;
    stem: string;
}

export async function getAllVocab(client: Client): Promise<GetAllVocabRow[]> {
    const result = await client.query({
        text: getAllVocabQuery,
        values: [],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            word: row[0],
            stem: row[1]
        };
    });
}

