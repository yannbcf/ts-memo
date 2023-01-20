type MemoCache = { value: unknown; ttl: null | number; tags: null | string[] };
type Callback = (...args: any[]) => any;

let memoCacheMap = new Map<string, MemoCache>();

function isTtlExpired(cache: MemoCache, time: number): boolean {
    if (cache.ttl == null) return false;
    return time > cache.ttl;
}

function cleanupCache(cacheKey: string, time = Date.now()): boolean {
    let hasBeenCleared = false;

    for (const [key, value] of memoCacheMap) {
        if (!isTtlExpired(value, time)) {
            break;
        }

        if (cacheKey === key) {
            hasBeenCleared = true;
        }

        memoCacheMap.delete(key);
    }

    return hasBeenCleared;
}

function processFnKey(name: string, arg?: unknown): string {
    return arg != null ? `mfn_${name}_${arg}` : `mfn_${name}`;
}

export function cache(
    key: string,
    value: unknown,
    opts: { ttl?: number | null; tags?: string[] | null } = {}
): void {
    const ttl = opts.ttl ?? null;
    const tags = opts.tags ?? null;

    memoCacheMap.set(key, {
        value,
        ttl: ttl ? Date.now() + ttl : ttl,
        tags,
    });

    memoCacheMap = new Map<string, MemoCache>(
        [...memoCacheMap.entries()].sort((a, b) => {
            const aTtl = a[1].ttl;
            const bTtl = b[1].ttl;

            if (aTtl == null) {
                return 1;
            }

            if (bTtl == null) {
                return -1;
            }

            if (aTtl === bTtl) return 0;
            return aTtl < bTtl ? -1 : 1;
        })
    );
}

// export function getFnKey<T extends Callback>(
//     fn: T,
//     arg?: Parameters<T>[0]
// ): string | undefined {
//     const key = processFnKey(fn.name, arg);
//     return memoCacheMap.has(key) ? key : undefined;
// }

export function getCache(key: string): MemoCache | undefined {
    return memoCacheMap.get(key);
}

export function revalidate(key: string, ttl: number): void {
    const memoCache = memoCacheMap.get(key);
    if (memoCache) {
        cache(key, memoCache.value, { ttl, tags: memoCache.tags });
    }
}

export function invalidateByKey(key: string): boolean {
    return memoCacheMap.delete(key);
}

export function invalidateByTags(...tags: string[]): void {
    for (const [key, memoCache] of memoCacheMap) {
        if (tags.filter((tag) => memoCache.tags?.includes(tag)).length > 0) {
            invalidateByKey(key);
        }
    }
}

export function MemoWithTtl(
    ttl: number,
    opts: { tags?: string[] | null } = {}
) {
    return Memo({ ttl, tags: opts.tags });
}

export function Memo(opts: { ttl?: number; tags?: string[] | null } = {}) {
    const ttl = opts.ttl ?? null;
    const tags = opts.tags ?? null;

    return (
        // eslint-disable-next-line @typescript-eslint/ban-types
        target: Object,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) => {
        const originalMethod = descriptor.value;

        descriptor.value = function (...args: unknown[]) {
            const className = target.constructor.name;
            const hash = `${className}_${propertyKey}`;

            const key = args[0] != null ? `${hash}_${args[0]}` : `${hash}`;
            const memoCache = memoCacheMap.get(key);

            cache: if (memoCache) {
                if (cleanupCache(key)) {
                    break cache;
                }

                if (ttl != null) {
                    cache(key, memoCache.value, { ttl, tags });
                }

                return memoCache.value;
            }

            const result = originalMethod.apply(this, args);
            if (result === undefined) {
                throw new Error(
                    `Attempted to memo cache ${key} which returned undefined`
                );
            }

            cache(key, result, { ttl, tags });
            return result;
        };

        return descriptor;
    };
}

export function memoCall<T extends Callback>(
    fn: T,
    opts: {
        args: Parameters<T>;
        ttl?: number | null;
        tags?: string[] | null;
    }
): void {
    const key = processFnKey(fn.name, opts.args[0]);
    const memoCache = memoCacheMap.get(key);

    cache: if (memoCache) {
        if (cleanupCache(key)) {
            break cache;
        }

        if (memoCache.ttl != null) {
            cache(key, memoCache.value, {
                ttl: memoCache.ttl,
                tags: memoCache.tags,
            });

            return memoCache.value as ReturnType<T>;
        }
    }

    const value = fn(...opts.args);
    cache(key, value, { ttl: opts.ttl, tags: opts.tags });
}
