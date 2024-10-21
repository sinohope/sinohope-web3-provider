import { ASSETS } from "./constants";
import { ChainSymbol, Asset } from "./types";

export function getAssetByChain(chain: ChainSymbol): Asset {
    return ASSETS[chain]
}

export function promiseToFunction(func: () => Promise<any>): () => Promise<void> {
    let exceptionThrown = false

    const promise = func().catch((e) => {
        exceptionThrown = true
        return e
    });

    return async () => {
        const result = await promise
        if (exceptionThrown)
            throw result
    };
}
