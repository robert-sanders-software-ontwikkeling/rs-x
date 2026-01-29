import { type IDeepCloneExcept, Inject, Injectable, PENDING, RsXCoreInjectionTokens } from '@rs-x/core';

import { AbstractExpression } from '../expressions';

@Injectable()
export class DeepCloneExceptWithExpressionSupport implements IDeepCloneExcept {
    constructor(
        @Inject(RsXCoreInjectionTokens.IDeepCloneExcept)
        private readonly _defaultDeepCloneValueGetter: IDeepCloneExcept) {

    }
    public except(source: unknown): unknown {
        if (source instanceof AbstractExpression) {
            return source.value === undefined ? PENDING : source.value;
        }

        return this._defaultDeepCloneValueGetter.except(source);
    }
}