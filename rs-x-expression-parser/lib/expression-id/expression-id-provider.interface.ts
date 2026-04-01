import { type IExpressionTree } from '../expressions/expression-parser.interface';

export interface IExpressionIdProvider {
  getId(node: IExpressionTree): string;
}
