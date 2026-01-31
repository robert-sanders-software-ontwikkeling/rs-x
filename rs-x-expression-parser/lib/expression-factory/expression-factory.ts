import { Inject, Injectable } from '@rs-x/core';
import type { ShouldWatchIndex } from '@rs-x/state-manager';

import type { IExpression } from '../expressions/expression-parser.interface';
import { RsXExpressionParserInjectionTokens } from '../rs-x-expression-parser-injection-tokes';

import type { IExpressionFactory } from './expression-factory.interface';
import type { IExpressionManager } from './expression-manager.type';

@Injectable()
export class ExpressionFactory implements IExpressionFactory {
    constructor(
        @Inject(RsXExpressionParserInjectionTokens.IExpressionManager)
        private readonly _expressionManager: IExpressionManager       
    ) {   
    }

    public create<T>(context: object, expressionString: string, shouldWatchLeaf?: ShouldWatchIndex): IExpression<T> {
        return this._expressionManager.create(context).instance.create({expressionString, shouldWatchLeaf}).instance as IExpression<T>; 
    }
}