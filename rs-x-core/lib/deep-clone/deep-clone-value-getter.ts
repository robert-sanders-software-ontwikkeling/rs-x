import { Observable } from 'rxjs';
import { Inject, Injectable } from '../dependency-injection';
import { IResolvedValueCache } from '../index-value-accessor/resolved-value-cache.interface';
import { RsXCoreInjectionTokens } from '../rs-x-core.injection-tokens';
import { IDeepCloneValueGetter } from './deep-clone-value-getter.interface';

@Injectable()
export class DeepCloneValueGetter implements IDeepCloneValueGetter {
    constructor(
        @Inject(RsXCoreInjectionTokens.IResolvedValueCache)
        private readonly _resolvedValueCache: IResolvedValueCache
    ) {

    }
    public get(source: unknown): unknown {
        if (source instanceof Promise || source instanceof Observable) {
            return this._resolvedValueCache.get(source)
        }

        return source;
    }
}