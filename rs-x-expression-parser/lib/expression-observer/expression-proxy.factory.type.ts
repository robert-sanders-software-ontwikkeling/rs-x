import { IDisposableOwner, ISingletonFactory } from '@rs-x/core';
import { IObserver } from '@rs-x/state-manager';
import { AbstractExpression } from '../expressions';

export interface IExpressionObserverData {
   owner?: IDisposableOwner;
   expression: AbstractExpression;
}

export type IExpressionObserverFactory = ISingletonFactory<
   AbstractExpression,
   IExpressionObserverData,
   IObserver
>;
