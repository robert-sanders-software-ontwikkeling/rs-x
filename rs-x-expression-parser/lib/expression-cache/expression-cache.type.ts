import type { ISingletonFactory } from '@rs-x/core';

import type { IExpression } from '../expressions/expression-parser.interface';

export type IExpressionCache = ISingletonFactory<string, string, IExpression>;
