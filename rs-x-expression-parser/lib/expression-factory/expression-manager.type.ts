import { type ISingletonFactory } from '@rs-x/core';
import type { ShouldWatchIndex } from '@rs-x/state-manager';

import type { IExpression } from '../expressions/expression-parser.interface';

export interface IExpressionInfo {
   context: object;
   expression: string;
}


export interface IExpressionIdData {
   expressionString: string;

}

export interface IExpressionData extends IExpressionIdData {
   shouldWatchLeaf?: ShouldWatchIndex
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
