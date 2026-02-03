import type { IIndexWatchRule } from '@rs-x/state-manager';

import type { IExpression } from '../expressions/expression-parser.interface';

export interface IExpressionFactory {
  create<T>(
    context: object,
    expression: string,
    leafIndexWatchRule?: IIndexWatchRule,
  ): IExpression<T>;
}
