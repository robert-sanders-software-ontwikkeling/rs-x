import type { IKeyedInstanceFactory } from '@rs-x/core';

import type { IExpression } from '../expressions/expression-parser.interface';

export interface IExpressionCache extends IKeyedInstanceFactory<
  string,
  string,
  IExpression
> {
  registerExpressionTree(
    expressionString: string,
    expressionTree: IExpression,
  ): void;
}
