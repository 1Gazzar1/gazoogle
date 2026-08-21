import { QueryArrayConfig, QueryArrayResult } from "pg";

interface Client {
    query: (config: QueryArrayConfig) => Promise<QueryArrayResult>;
}

export const getBacklinkCountQuery = `-- name: GetBacklinkCount :many
SELECT to_page_id,COUNT(*) AS backlink_count
FROM links 
WHERE to_page_id = ANY($1::int[])
GROUP BY to_page_id`;

export interface GetBacklinkCountArgs {
    linkIds: number[];
}

export interface GetBacklinkCountRow {
    toPageId: number;
    backlinkCount: string;
}

export async function getBacklinkCount(client: Client, args: GetBacklinkCountArgs): Promise<GetBacklinkCountRow[]> {
    const result = await client.query({
        text: getBacklinkCountQuery,
        values: [args.linkIds],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            toPageId: row[0],
            backlinkCount: row[1]
        };
    });
}

export const getForwardlinksQuery = `-- name: GetForwardlinks :many
SELECT from_page_id,to_page_id,url,title 
FROM links 
JOIN pages ON pages.id = to_page_id 
WHERE from_page_id = $1::int`;

export interface GetForwardlinksArgs {
    pageId: number;
}

export interface GetForwardlinksRow {
    fromPageId: number;
    toPageId: number;
    url: string;
    title: string | null;
}

export async function getForwardlinks(client: Client, args: GetForwardlinksArgs): Promise<GetForwardlinksRow[]> {
    const result = await client.query({
        text: getForwardlinksQuery,
        values: [args.pageId],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            fromPageId: row[0],
            toPageId: row[1],
            url: row[2],
            title: row[3]
        };
    });
}

export const getBacklinksQuery = `-- name: GetBacklinks :many
SELECT from_page_id,to_page_id,url,title 
FROM links 
JOIN pages ON pages.id = from_page_id 
WHERE to_page_id = $1::int`;

export interface GetBacklinksArgs {
    pageId: number;
}

export interface GetBacklinksRow {
    fromPageId: number;
    toPageId: number;
    url: string;
    title: string | null;
}

export async function getBacklinks(client: Client, args: GetBacklinksArgs): Promise<GetBacklinksRow[]> {
    const result = await client.query({
        text: getBacklinksQuery,
        values: [args.pageId],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            fromPageId: row[0],
            toPageId: row[1],
            url: row[2],
            title: row[3]
        };
    });
}

