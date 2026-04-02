import { type IExpressionTree } from '../expressions/expression-parser.interface';

export interface IExpressionChangeHistory<
  T extends IExpressionTree = IExpressionTree,
> {
  expression: T;
  value: unknown;
  oldValue: unknown;
}
