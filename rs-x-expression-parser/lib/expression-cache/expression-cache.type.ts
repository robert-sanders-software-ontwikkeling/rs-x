import type { IKeyedInstanceFactory } from '@rs-x/core';

import type { IExpression } from '../expressions/expression-parser.interface';

export interface IExpressionCacheData {
  expressionString: string;
  /** When set, overrides the global engine mode for this expression. */
  compiled?: boolean;
  /** When true, defer AOT readiness until the lazy preloader resolves. */
  lazy?: boolean;
  /**
   * When set, the expression belongs to this named lazy group.
   * On first use, the entire group's manifest is loaded — not just this
   * expression — keeping the number of dynamic imports small.
   * Implies lazy: true.
   */
  lazyGroup?: string;
}

export interface IExpressionCache extends IKeyedInstanceFactory<
  string,
  IExpressionCacheData,
  IExpression
> {
  registerExpressionTree(
    expressionString: string,
    expressionTree: IExpression,
  ): void;
}
