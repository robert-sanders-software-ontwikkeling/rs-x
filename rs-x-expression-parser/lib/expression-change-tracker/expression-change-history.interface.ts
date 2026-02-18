import { IExpression } from '../expressions/expression-parser.interface';

export interface IExpressionChangeHistory<T extends IExpression = IExpression> {
    expression: T;
    value: unknown;
    oldValue: unknown;
}
