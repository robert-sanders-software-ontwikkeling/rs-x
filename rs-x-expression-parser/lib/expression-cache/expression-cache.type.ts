import type { IKeyedInstanceFactory } from '@rs-x/core';

import type { IExpression } from '../expressions/expression-parser.interface';

export type IExpressionCache = IKeyedInstanceFactory<
  string,
  string,
  IExpression
>;
