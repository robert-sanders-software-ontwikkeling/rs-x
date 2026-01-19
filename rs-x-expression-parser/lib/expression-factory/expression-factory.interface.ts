import { IExpression } from '../expressions';

export interface IExpressionFactory {
    create(context: object, expression: string): IExpression;
}