export interface TimedDbResult<T> {
    data: T;
    durationMs: number;
}

export async function timedDbCall<T>(
    fn: () => Promise<T>,
): Promise<TimedDbResult<T>> {
    const start = Date.now();
    const data = await fn();
    return { data, durationMs: Date.now() - start };
}

export async function timedDbCalls(
    calls: (() => Promise<unknown>)[],
): Promise<{ data: unknown; durationMs: number }[]> {
    return Promise.all(calls.map(timedDbCall));
}