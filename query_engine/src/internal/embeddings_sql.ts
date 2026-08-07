import { QueryArrayConfig, QueryArrayResult } from "pg";

interface Client {
    query: (config: QueryArrayConfig) => Promise<QueryArrayResult>;
}

export const searchEmbeddingsQuery = `-- name: SearchEmbeddings :many
SELECT id, url, title, heading, embedding, doc_length, crawled_at FROM pages 
ORDER BY embedding <=> $1::Vector(384)
LIMIT $2::int`;

export interface SearchEmbeddingsArgs {
    embedding: string;
    count: number;
}

export interface SearchEmbeddingsRow {
    id: number;
    url: string;
    title: string | null;
    heading: string | null;
    embedding: string | null;
    docLength: number | null;
    crawledAt: Date | null;
}

export async function searchEmbeddings(client: Client, args: SearchEmbeddingsArgs): Promise<SearchEmbeddingsRow[]> {
    const result = await client.query({
        text: searchEmbeddingsQuery,
        values: [args.embedding, args.count],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            id: row[0],
            url: row[1],
            title: row[2],
            heading: row[3],
            embedding: row[4],
            docLength: row[5],
            crawledAt: row[6]
        };
    });
}

