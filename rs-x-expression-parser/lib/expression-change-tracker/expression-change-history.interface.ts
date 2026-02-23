import { IExpression } from '../expressions/expression-parser.interface';

export interface IExpressionChangeHistory<T extends IExpression = IExpression> {
    expression: T;
    isAsync: boolean | undefined
    value: unknown;
    oldValue: unknown;
}
