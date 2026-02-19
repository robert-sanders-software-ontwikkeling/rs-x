import type {
  IGuidFactory,
  IIndexValueAccessor,
  IValueMetadata,
} from '@rs-x/core';
import type { IStateManager } from '@rs-x/state-manager';

import type { IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';
import { IExpressionIdProvider } from '../expression-id/expression-id-provider.interface';

export interface IExpressionServices {
  readonly transactionManager: IExpressionChangeTransactionManager;
  readonly stateManager: IStateManager;
  readonly indexValueAccessor: IIndexValueAccessor;
  readonly guidFactory: IGuidFactory;
  readonly valueMetadata: IValueMetadata;
  readonly expressionIdProvider: IExpressionIdProvider;
}
