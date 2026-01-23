import { type IDisposableOwner, type ISingletonFactory } from '@rs-x/core';
import { type IObserver } from '@rs-x/state-manager';
import { type AbstractExpression } from '../expressions';

export interface IExpressionObserverData {
   owner?: IDisposableOwner;
   expression: AbstractExpression;
}

export type IExpressionObserverFactory = ISingletonFactory<
   AbstractExpression,
   IExpressionObserverData,
   IObserver
>;
