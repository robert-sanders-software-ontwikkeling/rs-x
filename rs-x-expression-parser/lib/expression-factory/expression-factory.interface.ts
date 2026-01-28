import { type IExpression } from '../expressions';

export interface IExpressionFactory {
    create<T>(context: object, expression: string): IExpression<T>;
}