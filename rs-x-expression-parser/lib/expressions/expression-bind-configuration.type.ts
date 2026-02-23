import type { IDisposableOwner } from '@rs-x/core';
import type { IIndexWatchRule } from '@rs-x/state-manager/lib';

import type { IExpressionServices } from '../expression-services/expression-services.interface';

export interface IBindConfigurationBase {
  readonly services: IExpressionServices;
  readonly owner?: IDisposableOwner;
  readonly leafIndexWatchRule?: IIndexWatchRule;
}

export type IExpressionBindConfigurationExtra = {
  readonly currentValue?: unknown;
};

export type IExpressionBindConfiguration =
  | (IBindConfigurationBase &
      IExpressionBindConfigurationExtra & {
        rootContext: unknown;
        context?: never;
      })
  | (IBindConfigurationBase &
      IExpressionBindConfigurationExtra & {
        rootContext?: never;
        context: unknown;
      });
