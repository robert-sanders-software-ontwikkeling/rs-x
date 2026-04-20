import type { IIndexWatchRule } from '@rs-x/state-manager';

import type { IExpression } from '../expressions/expression-parser.interface';

export interface IExpressionFactory {
  create<T>(
    context: object,
    expression: string,
    leafIndexWatchRule?: IIndexWatchRule,
    compiled?: boolean,
    lazy?: boolean,
    lazyGroup?: string,
  ): IExpression<T>;
}
