import type { ShouldWatchIndex } from '@rs-x/state-manager';

import type { IExpression } from '../expressions/expression-parser.interface';

export interface IExpressionFactory {
  create<T>(
    context: object,
    expression: string,
    shouldWatchLeaf?: ShouldWatchIndex,
  ): IExpression<T>;
}
