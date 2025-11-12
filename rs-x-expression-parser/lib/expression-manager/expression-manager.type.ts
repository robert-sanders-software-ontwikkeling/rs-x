import { ISingletonFactory } from '@rs-x-core';
import { AbstractExpression } from '../expressions/abstract-expression';

export interface IExpressionInfo {
   context: object;
   expression: string;
}

export type IExpressionForContextManager = ISingletonFactory<
   string,
   string,
   AbstractExpression
>;
export type IExpressionManager = ISingletonFactory<
   string,
   IExpressionInfo,
   IExpressionForContextManager
>;
