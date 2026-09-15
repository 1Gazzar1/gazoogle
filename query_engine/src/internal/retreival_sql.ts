import { QueryArrayConfig, QueryArrayResult } from "pg";

interface Client {
    query: (config: QueryArrayConfig) => Promise<QueryArrayResult>;
}

export const getBM25RelevantInfoByWordsQuery = `-- name: GetBM25RelevantInfoByWords :many


SELECT page_id,tf,terms.df,pages.doc_length,terms.term
FROM postings 
JOIN terms ON word = terms.term 
JOIN pages ON page_id = pages.id
WHERE word = ANY($1::text[])`;

export interface GetBM25RelevantInfoByWordsArgs {
    words: string[];
}

export interface GetBM25RelevantInfoByWordsRow {
    pageId: number;
    tf: number;
    df: number;
    docLength: number | null;
    term: string;
}

export async function getBM25RelevantInfoByWords(client: Client, args: GetBM25RelevantInfoByWordsArgs): Promise<GetBM25RelevantInfoByWordsRow[]> {
    const result = await client.query({
        text: getBM25RelevantInfoByWordsQuery,
        values: [args.words],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            pageId: row[0],
            tf: row[1],
            df: row[2],
            docLength: row[3],
            term: row[4]
        };
    });
}

export const getPagesByIdQuery = `-- name: GetPagesById :many
SELECT id,url,heading,title 
FROM pages 
WHERE id = ANY($1::int[])`;

export interface GetPagesByIdArgs {
    ids: number[];
}

export interface GetPagesByIdRow {
    id: number;
    url: string;
    heading: string | null;
    title: string | null;
}

export async function getPagesById(client: Client, args: GetPagesByIdArgs): Promise<GetPagesByIdRow[]> {
    const result = await client.query({
        text: getPagesByIdQuery,
        values: [args.ids],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            id: row[0],
            url: row[1],
            heading: row[2],
            title: row[3]
        };
    });
}

