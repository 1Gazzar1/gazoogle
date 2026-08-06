import { QueryArrayConfig, QueryArrayResult } from "pg";

interface Client {
    query: (config: QueryArrayConfig) => Promise<QueryArrayResult>;
}

export const getDocInfoQuery = `-- name: GetDocInfo :one
SELECT id, total_documents, avg_doc_length FROM metadata
WHERE id = true`;

export interface GetDocInfoRow {
    id: boolean;
    totalDocuments: number;
    avgDocLength: number;
}

export async function getDocInfo(client: Client): Promise<GetDocInfoRow | null> {
    const result = await client.query({
        text: getDocInfoQuery,
        values: [],
        rowMode: "array"
    });
    if (result.rows.length !== 1) {
        return null;
    }
    const row = result.rows[0];
    return {
        id: row[0],
        totalDocuments: row[1],
        avgDocLength: row[2]
    };
}

