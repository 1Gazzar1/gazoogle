import { QueryArrayConfig, QueryArrayResult } from "pg";

interface Client {
    query: (config: QueryArrayConfig) => Promise<QueryArrayResult>;
}

export const searchPageEmbeddingsQuery = `-- name: SearchPageEmbeddings :many
SELECT id, url, title, heading, embedding, doc_length, crawled_at FROM pages 
ORDER BY embedding <=> $1::Vector(384)
LIMIT $2::int`;

export interface SearchPageEmbeddingsArgs {
    embedding: string;
    count: number;
}

export interface SearchPageEmbeddingsRow {
    id: number;
    url: string;
    title: string | null;
    heading: string | null;
    embedding: string | null;
    docLength: number | null;
    crawledAt: Date | null;
}

export async function searchPageEmbeddings(client: Client, args: SearchPageEmbeddingsArgs): Promise<SearchPageEmbeddingsRow[]> {
    const result = await client.query({
        text: searchPageEmbeddingsQuery,
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

export const searchImageEmbeddingsQuery = `-- name: SearchImageEmbeddings :many
SELECT id, alt_text, url, embedding from images
ORDER BY embedding <=> $1::Vector(384)
LIMIT $2::int`;

export interface SearchImageEmbeddingsArgs {
    embedding: string;
    count: number;
}

export interface SearchImageEmbeddingsRow {
    id: number;
    altText: string;
    url: string;
    embedding: string | null;
}

export async function searchImageEmbeddings(client: Client, args: SearchImageEmbeddingsArgs): Promise<SearchImageEmbeddingsRow[]> {
    const result = await client.query({
        text: searchImageEmbeddingsQuery,
        values: [args.embedding, args.count],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            id: row[0],
            altText: row[1],
            url: row[2],
            embedding: row[3]
        };
    });
}

