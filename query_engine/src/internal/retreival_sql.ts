import { Sql } from "postgres";

export const getPagesBytWordsQuery = `-- name: GetPagesBytWords :many
SELECT postings.id, word, page_id, tf, term, df, pages.id, url, title, heading, embedding, doc_length, crawled_at FROM postings 
JOIN terms ON word = terms.term 
JOIN pages ON page_id = pages.id 
WHERE word in (unnest($1::text[]))`;

export interface GetPagesBytWordsArgs {
    words: string[];
}

export interface GetPagesBytWordsRow {
    id: number;
    word: string;
    pageId: number;
    tf: number;
    term: string;
    df: number;
    id_2: number;
    url: string;
    title: string | null;
    heading: string | null;
    embedding: string | null;
    docLength: number | null;
    crawledAt: Date | null;
}

export async function getPagesBytWords(sql: Sql, args: GetPagesBytWordsArgs): Promise<GetPagesBytWordsRow[]> {
    return (await sql.unsafe(getPagesBytWordsQuery, [args.words]).values()).map(row => ({
        id: row[0],
        word: row[1],
        pageId: row[2],
        tf: row[3],
        term: row[4],
        df: row[5],
        id_2: row[6],
        url: row[7],
        title: row[8],
        heading: row[9],
        embedding: row[10],
        docLength: row[11],
        crawledAt: row[12]
    }));
}

