import type { IDisposableOwner } from '@rs-x/core';

import type { IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';

import type { IMustProxifyHandler } from './abstract-expression';

export interface IBindConfigurationBase {
  mustProxifyHandler?: IMustProxifyHandler;
  transactionManager?: IExpressionChangeTransactionManager;
  owner?: IDisposableOwner;
}

export type IExpressionBindConfigurationExtra = {
  currentValue?: unknown;
};

export type IExpressionBindConfiguration =
  | (IBindConfigurationBase & IExpressionBindConfigurationExtra & { rootContext: unknown; context?: never })
  | (IBindConfigurationBase & IExpressionBindConfigurationExtra & { rootContext?: never; context: unknown });