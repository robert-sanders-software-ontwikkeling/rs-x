import { IDeepCloneValueGetter, Inject, Injectable, RsXCoreInjectionTokens } from '@rs-x/core';
import { AbstractExpression } from '../expressions';


@Injectable()
export class DeepCloneValueGetterWithExpressionSupport  implements IDeepCloneValueGetter{
    constructor(
        @Inject(RsXCoreInjectionTokens.DefaultDeepCloneValueGetter)
        private readonly _defaultDeepCloneValueGetter: IDeepCloneValueGetter) {

    }
    public get(source: unknown): unknown {
       if(source instanceof AbstractExpression) {
        return source.value;
       }

       return this._defaultDeepCloneValueGetter.get(source);
    }
}