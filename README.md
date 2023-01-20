# ts-memo is a strongly typed typescript memoizer

## Features

You can use it in different ways:

-   Memoize a method which takes no parameters,
-   Memoize a method which varies based on its first parameter only,
-   TODO: ~~Memoize a function~~,
-   TODO: ~~Memoize a `get` class accessor~~,
-   TODO: ~~Memoize a class method which varies based on some combination of parameters~~

## state -> **alpha**

-   [x] First implementation
-   [ ] Deployment
-   [ ] Unit tests

## Installation (todo)

> Not yet available

npm

```
npm install --save  @yannbcf/ts-memo
```

pnpm

```
pnpm add --save @yannbcf/ts-memo
```

# How does it work ?

Ts-memo is useable with decorators and also in a functionnal way, once a value is cached it is retrieved from the cache on each subsequent method call.

> You can call memoized methods _within_ the same class, too. This could be useful if you want to memoize the return value for an entire data set, and also a filtered or mapped version of that same set.

The memo caches are stored in ttl sorted map and the invalidation occurs passively by iterating the sorted map and removing the expired ttl's on each cache hit.

Therefore, no intervals are running and we still clear the map reliably. This pattern is inspired by Redis.

# Usage

## Decorators usage

```ts
import { Memo, MemoWithTtl } from "@yannbcf/ts-memo";

class Test {
    /**
     * Will throw an error when trying to memoize
     * a method returning undefined.
     */
    @Memo()
    test1(): void {}

    /**
     * The first call will cache the value 42 and each subsequent call
     * will return 42 instead of calling this method.
     */
    @Memo()
    test2(): number {
        console.log("Test 2 called");
        return 42;
    }

    /**
     * The first call will cache the value for the given argument.
     * Each subsequent call with the same argument will
     * return 42 + n instead of calling this method.
     */
    @Memo()
    test3(n: number): number {
        console.log("Test 3 called");
        return 42 + n;
    }

    private property = 1;

    /**
     * The class context is also applied while calling the method.
     */
    @Memo()
    test4(): number {
        console.log("Test 4 called");
        return 42 + this.property;
    }

    /**
     * The ttl is the time in milliseconds after which the cached value
     * is invalidated.
     *
     * Each subsequent call refreshes the tll.
     */
    @Memo({ ttl: 5000 })
    @MemoWithTtl(5000)
    test5(): number {
        console.log("Test 5 called");
        return 42;
    }

    /**
     * The tags are used to easily manually invalidate
     * the cache via the method invalidateByTags.
     */
    @Memo({ tags: ["tag1"] })
    @MemoWithTtl(5000, { tags: ["tag1"] })
    test6(): number {
        console.log("Test 6 called");
        return 42;
    }
}
```

## Fuctions usage

```ts
import {
    cache,
    getFnKey,
    getCache,
    revalidate,
    invalidateByKey,
    invalidateByTags,
} from "@yannbcf/ts-memo";

/**
 * Manually caches a value.
 * This allows you to use ts-memo in a functional way
 */
cache("cache_key", 42, { ttl: 5000, tags: ["tag1"] });

/**
 * NOT YET IMPLEMENTED!
 * Gets the cache key of a function.
 * Optionally takes the first parameter of the given function.
 *
 * This key can then be used with cache, revalidate, invalidateByKey..
 */
getFnKey(a, 52); // mfn_a_52

/**
 * Get cache from the given key.
 */
getCache("cache_key");

/**
 * Updates the cache ttl to Date.now() + 10_000 for the given key.
 */
revalidate("cache_key", 10_000);

/**
 * Deletes the cache for the given key
 */
invalidateByKey("cache_key");

/**
 * Deletes the cache for the given tag(s)
 */
invalidateByTags("tag1", "tag2");
```

## Important

```ts
import {
    Memo,
    cache,
    getCache,
    revalidate,
    invalidateByKey,
    invalidateByTags,
} from "@yannbcf/ts-memo";

/**
 * The cache key is generated as {class_name}_{method_name}_{optional_first_argument}
 */
class Test {
    /**
     * The cache key is Test_test1.
     */
    @Memo()
    test1(): number {
        return 42;
    }

    /**
     * The cache key is Test_test2_{n}
     * Exemple: Test_test2_0
     */
    @Memo()
    test2(n: number): number {
        return 42 + n;
    }

    /**
     * The cache key is Test_test3_{n}
     * Exemple: Test_test3_theString
     */
    @Memo()
    test3(n: string): number {
        return 42 + n.length;
    }
}

const test = new Test();
test.test1();
test.test2();
test.test3(":)");

getCache("Test_test3_:)")?.value; // 44
```
