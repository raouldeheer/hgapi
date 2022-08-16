export class CachedRequests<T, Y> {
    private readonly cachedResults: Map<T, Y>;
    constructor(
        private readonly threshold: number,
        private readonly action: (input: T) => Promise<Y>
    ) {
        this.cachedResults = new Map;
    }
    public async request(input: T): Promise<Y> {
        if (this.cachedResults.has(input)) {
            const result = this.cachedResults.get(input);
            if (result) return result;
        }
        const outputResult = await this.action(input);
        this.cachedResults.set(input, outputResult);
        setTimeout(() => {
            this.cachedResults.delete(input);
        }, this.threshold * 1000);
        return outputResult;
    }
}

export function CachedFunction<T>(threshold: number, action: () => Promise<T>) {
    let cache: T | undefined;
    return async () => {
        if (cache) return cache;
        const outputResult = await action();
        cache = outputResult;
        setTimeout(() => {
            cache = undefined;
        }, threshold * 1000);
        return outputResult;
    };
}
