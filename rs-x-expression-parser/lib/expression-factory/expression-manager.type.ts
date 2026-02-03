import { type ISingletonFactory } from '@rs-x/core';
import type { IIndexWatchRule } from '@rs-x/state-manager';

import type { IExpression } from '../expressions/expression-parser.interface';

export interface IExpressionInfo {
  context: object;
  expression: string;
}

export interface IExpressionIdData {
  expressionString: string;
}

export interface IExpressionData extends IExpressionIdData {
  leafIndexWatchRule?: IIndexWatchRule;
}

export type IExpressionForContextManager = ISingletonFactory<
  string,
  IExpressionData,
  IExpression,
  IExpressionIdData
>;
export type IExpressionManager = ISingletonFactory<
  object,
  object,
  IExpressionForContextManager
>;
