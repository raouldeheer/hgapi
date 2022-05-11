export function cached<T>(threshold: number, action: () => Promise<T>): () => Promise<T> {
    let cachedData: T | null;
    return async () => {
        if (!cachedData) {
            cachedData = await action();
            setTimeout(() => {
                cachedData = null;
            }, threshold * 1000);
        }
        return cachedData;
    };
}
