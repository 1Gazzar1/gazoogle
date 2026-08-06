import { Pool } from "pg";

export async function initDb(url: string) {
    const client = new Pool({
        connectionString: url,
    });
    await client.connect();

    return client;
}
