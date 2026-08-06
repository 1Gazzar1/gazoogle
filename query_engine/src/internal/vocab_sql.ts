import { Sql } from "postgres";

export const getAllVocabQuery = `-- name: GetAllVocab :many
SELECT word FROM vocab`;

export interface GetAllVocabRow {
    word: string;
}

export async function getAllVocab(sql: Sql): Promise<GetAllVocabRow[]> {
    return (await sql.unsafe(getAllVocabQuery, []).values()).map(row => ({
        word: row[0]
    }));
}

