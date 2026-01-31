import type { IDisposableOwner } from '@rs-x/core';
import type { ShouldWatchIndex } from '@rs-x/state-manager';

import type { IExpressionServices } from '../expression-services/expression-services.interface';

export interface IBindConfigurationBase {
  readonly services: IExpressionServices;
  readonly owner?: IDisposableOwner;
  readonly shouldWatchLeaf?: ShouldWatchIndex;
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
