import type {
  IGuidFactory,
  IIndexValueAccessor,
  IValueMetadata,
} from '@rs-x/core';
import type {
  IIndexWatchRuleRegistry,
  IStateManager,
} from '@rs-x/state-manager';

import type { IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';

export interface IExpressionServices {
  readonly transactionManager: IExpressionChangeTransactionManager;
  readonly stateManager: IStateManager;
  readonly indexValueAccessor: IIndexValueAccessor;
  readonly guidFactory: IGuidFactory;
  readonly valueMetadata: IValueMetadata;
  readonly indexWatchRuleRegistry: IIndexWatchRuleRegistry;
}
