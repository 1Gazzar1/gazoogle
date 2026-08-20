import { loadEnvFile } from "node:process";

loadEnvFile();

const EMBEDDING = process.env.EMBEDDING_URL;
export async function embed(text: string) {
    const response = await fetch(`${EMBEDDING}/embed`, {
        method: "POST",
        body: JSON.stringify({
            inputs: text,
        }),
        headers: {
            "Content-Type": "application/json",
        },
    });

    const json = (await response.json()) as number[][];

    return json[0];
}
