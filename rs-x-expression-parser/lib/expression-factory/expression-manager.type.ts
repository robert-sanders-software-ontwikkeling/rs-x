import { ISingletonFactory } from '@rs-x/core';
import { IExpression } from '../expressions';

export interface IExpressionInfo {
   context: object;
   expression: string;
}

export type IExpressionForContextManager = ISingletonFactory<
   string,
   string,
   IExpression
>;
export type IExpressionManager = ISingletonFactory<
   object,
   object,
   IExpressionForContextManager
>;
