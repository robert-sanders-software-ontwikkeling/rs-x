import { Observable } from 'rxjs';

import { Inject, Injectable } from '../dependency-injection';
import { PENDING } from '../index-value-accessor';
import type { IResolvedValueCache } from '../index-value-accessor/resolved-value-cache.interface';
import { RsXCoreInjectionTokens } from '../rs-x-core.injection-tokens';

import type { IDeepCloneExcept } from './deep-clone-except.interface';

@Injectable()
export class DeepCloneValueExcept implements IDeepCloneExcept {
    constructor(
        @Inject(RsXCoreInjectionTokens.IResolvedValueCache)
        private readonly _resolvedValueCache: IResolvedValueCache
    ) {

    }
    public except(source: unknown): unknown {
        if (source instanceof Promise || source instanceof Observable) {
            const value =  this._resolvedValueCache.get(source);
            return value === undefined ? PENDING : value;
        }

        return undefined;
    }
}