import type { IExpression } from '../expressions/expression-parser.interface';

export interface IExpressionFactory {
    create<T>(context: object, expression: string, observerLeafsRecursively?: boolean): IExpression<T>;
}