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

