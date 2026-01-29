import type { IDisposableOwner } from '@rs-x/core';

import type { IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';

import type { IMustProxifyHandler } from './abstract-expression';

export interface IBindConfigurationBase {
  mustProxifyHandler?: IMustProxifyHandler;
  transactionManager?: IExpressionChangeTransactionManager;
  owner?: IDisposableOwner;
}

// Exactly one of rootContext or context, plus optional extra props
export type IExpressionBindConfigurationExtra = {
  currentValue?: unknown;
};

// Union approach to enforce exactly one of rootContext or context
export type IExpressionBindConfiguration =
  | (IBindConfigurationBase & IExpressionBindConfigurationExtra & { rootContext: unknown; context?: never })
  | (IBindConfigurationBase & IExpressionBindConfigurationExtra & { rootContext?: never; context: unknown });