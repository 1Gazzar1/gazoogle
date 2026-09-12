import { QueryArrayConfig, QueryArrayResult } from "pg";

interface Client {
    query: (config: QueryArrayConfig) => Promise<QueryArrayResult>;
}

export const getPagesBytWordsQuery = `-- name: GetPagesBytWords :many
SELECT page_id,tf,terms.df,pages.doc_length,terms.term,pages.url,pages.heading,pages.title 
FROM postings 
JOIN terms ON word = terms.term 
JOIN pages ON page_id = pages.id 
WHERE word = ANY($1::text[])`;

export interface GetPagesBytWordsArgs {
    words: string[];
}

export interface GetPagesBytWordsRow {
    pageId: number;
    tf: number;
    df: number;
    docLength: number | null;
    term: string;
    url: string;
    heading: string | null;
    title: string | null;
}

export async function getPagesBytWords(client: Client, args: GetPagesBytWordsArgs): Promise<GetPagesBytWordsRow[]> {
    const result = await client.query({
        text: getPagesBytWordsQuery,
        values: [args.words],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            pageId: row[0],
            tf: row[1],
            df: row[2],
            docLength: row[3],
            term: row[4],
            url: row[5],
            heading: row[6],
            title: row[7]
        };
    });
}

