import { IExpression } from '../expressions/expression-parser.interface';

export interface IExpressionIdProvider {
     getId(node: IExpression): string;
}