export async function embed(text: string) {
    try {
        const response = await fetch("http://localhost:1234/embed", {
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
    } catch (error) {
        console.error(`ERROR: failed to embed something,error: ${(error as Error).message} `);
        return [];
    }
}
