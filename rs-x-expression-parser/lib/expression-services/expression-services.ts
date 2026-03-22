import {
  type IGuidFactory,
  type IIndexValueAccessor,
  Inject,
  Injectable,
  type IValueMetadata,
  RsXCoreInjectionTokens,
} from '@rs-x/core';
import {
  type IStateManager,
  RsXStateManagerInjectionTokens,
} from '@rs-x/state-manager';

import {
  type IExpressionEvaluateManager,
  type IExpressionEvaluateUnitFactory,
} from '../expression-evaluate-manager';
import type { IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';
import type { IExpressionIdProvider } from '../expression-id/expression-id-provider.interface';
import type { IIdentifierOwnerResolver } from '../identifier-owner-resolver/identifier-owner-resolver.interface';
import { RsXExpressionParserInjectionTokens } from '../rs-x-expression-parser-injection-tokes';

import type { IExpressionServices } from './expression-services.interface';

@Injectable()
export class ExpressionServices implements IExpressionServices {
  constructor(
    @Inject(
      RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager,
    )
    public readonly transactionManager: IExpressionChangeTransactionManager,
    @Inject(RsXExpressionParserInjectionTokens.IExpressionEvaluateManager)
    public readonly expressionEvaluateManager: IExpressionEvaluateManager,
    @Inject(RsXExpressionParserInjectionTokens.IExpressionEvaluateUnitFactory)
    public readonly expressionEvaluateUnitFactory: IExpressionEvaluateUnitFactory,
    @Inject(RsXStateManagerInjectionTokens.IStateManager)
    public readonly stateManager: IStateManager,
    @Inject(RsXCoreInjectionTokens.IIndexValueAccessor)
    public readonly indexValueAccessor: IIndexValueAccessor,
    @Inject(RsXCoreInjectionTokens.IGuidFactory)
    public readonly guidFactory: IGuidFactory,
    @Inject(RsXCoreInjectionTokens.IValueMetadata)
    public readonly valueMetadata: IValueMetadata,
    @Inject(RsXExpressionParserInjectionTokens.IExpressionIdProvider)
    public readonly expressionIdProvider: IExpressionIdProvider,
    @Inject(RsXExpressionParserInjectionTokens.IdentifierOwnerResolver)
    public readonly identifierOwnerResolver: IIdentifierOwnerResolver,
  ) {}
}
