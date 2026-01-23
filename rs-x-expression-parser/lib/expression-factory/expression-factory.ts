import { Inject, Injectable } from '@rs-x/core';
import type { IExpression } from '../expressions';
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

    public create(context: object, expression: string): IExpression {
        return this._expressionManager.create(context).instance.create(expression).instance;
    }

}