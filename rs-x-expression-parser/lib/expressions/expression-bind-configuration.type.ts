import type { IDisposableOwner } from '@rs-x/core';
import type { IIndexWatchRule } from '@rs-x/state-manager';

import type { IExpressionServices } from '../expression-services/expression-services.interface';

export interface IBindConfigurationBase {
  readonly services: IExpressionServices;
  readonly owner?: IDisposableOwner;
  readonly leafIndexWatchRule?: IIndexWatchRule;
}

export type IExpressionBindConfigurationExtra = {
  readonly currentValue?: unknown;
  readonly isRoot?: boolean;
};

export type IExpressionBindConfiguration =
  | (IBindConfigurationBase &
      IExpressionBindConfigurationExtra & {
        context?: never;
      })
  | (IBindConfigurationBase &
      IExpressionBindConfigurationExtra & {
        context: unknown;
      });
