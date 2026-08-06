import { Sql } from "postgres";

export const getDocInfoQuery = `-- name: GetDocInfo :one
SELECT id, total_documents, avg_doc_length FROM metadata
WHERE id = true`;

export interface GetDocInfoRow {
    id: boolean;
    totalDocuments: number;
    avgDocLength: number;
}

export async function getDocInfo(sql: Sql): Promise<GetDocInfoRow | null> {
    const rows = await sql.unsafe(getDocInfoQuery, []).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        totalDocuments: row[1],
        avgDocLength: row[2]
    };
}

