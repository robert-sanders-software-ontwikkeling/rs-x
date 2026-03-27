import type {
  IGuidFactory,
  IIndexValueAccessor,
  IValueMetadata,
} from '@rs-x/core';
import type { IStateManager } from '@rs-x/state-manager';
import { type IWatchFactory } from '@rs-x/state-manager/lib/state-manager/watch-factory/watch-factory';

import type { IExpressionEvaluateManager } from '../expression-evaluate-manager';
import { type IExpressionIdProvider } from '../expression-id/expression-id-provider.interface';
import type { IIdentifierWatchRuleFactory } from '../expressions/identifier-index-watch-rule/identifier-watch-rule.factory.interface';
import { type IIdentifierOwnerResolver } from '../identifier-owner-resolver';

export interface IExpressionServices {
  readonly expressionEvaluateManager: IExpressionEvaluateManager;
  readonly stateManager: IStateManager;
  readonly indexValueAccessor: IIndexValueAccessor;
  readonly identifierOwnerResolver: IIdentifierOwnerResolver;
  readonly guidFactory: IGuidFactory;
  readonly valueMetadata: IValueMetadata;
  readonly expressionIdProvider: IExpressionIdProvider;
  readonly watchFactory: IWatchFactory;
  readonly identifierWatchRuleFactory: IIdentifierWatchRuleFactory;
}
