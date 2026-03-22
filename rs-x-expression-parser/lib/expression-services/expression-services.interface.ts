import type {
  IGuidFactory,
  IIndexValueAccessor,
  IValueMetadata,
} from '@rs-x/core';
import type { IStateManager } from '@rs-x/state-manager';

import type {
  IExpressionEvaluateManager,
  IExpressionEvaluateUnitFactory,
} from '../expression-evaluate-manager';
import type { IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';
import { type IExpressionIdProvider } from '../expression-id/expression-id-provider.interface';
import { type IIdentifierOwnerResolver } from '../identifier-owner-resolver';

export interface IExpressionServices {
  readonly transactionManager: IExpressionChangeTransactionManager;
  readonly expressionEvaluateManager: IExpressionEvaluateManager;
  readonly expressionEvaluateUnitFactory: IExpressionEvaluateUnitFactory;
  readonly stateManager: IStateManager;
  readonly indexValueAccessor: IIndexValueAccessor;
  readonly identifierOwnerResolver: IIdentifierOwnerResolver;
  readonly guidFactory: IGuidFactory;
  readonly valueMetadata: IValueMetadata;
  readonly expressionIdProvider: IExpressionIdProvider;
}
