import { QueryArrayConfig, QueryArrayResult } from "pg";

interface Client {
    query: (config: QueryArrayConfig) => Promise<QueryArrayResult>;
}

export const searchPageEmbeddingsQuery = `-- name: SearchPageEmbeddings :many
SELECT id FROM pages -- we're gonna retreive it again anyways so reduce the width
ORDER BY embedding <=> $1::Vector(384)
LIMIT $2::int`;

export interface SearchPageEmbeddingsArgs {
    embedding: string;
    count: number;
}

export interface SearchPageEmbeddingsRow {
    id: number;
}

export async function searchPageEmbeddings(client: Client, args: SearchPageEmbeddingsArgs): Promise<SearchPageEmbeddingsRow[]> {
    const result = await client.query({
        text: searchPageEmbeddingsQuery,
        values: [args.embedding, args.count],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            id: row[0]
        };
    });
}

export const searchImageEmbeddingsQuery = `-- name: SearchImageEmbeddings :many
SELECT id,alt_text,url from images
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
            url: row[2]
        };
    });
}

