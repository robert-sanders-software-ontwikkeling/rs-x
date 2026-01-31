import { type IGuidFactory, type IIndexValueAccessor, Inject, Injectable, type IValueMetadata,RsXCoreInjectionTokens } from '@rs-x/core';
import { type IStateManager,RsXStateManagerInjectionTokens } from '@rs-x/state-manager';

import type { IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';
import { RsXExpressionParserInjectionTokens } from '../rs-x-expression-parser-injection-tokes';

import type { IExpressionServices } from './expression-services.interface';

@Injectable()
export class ExpressionServices implements IExpressionServices {
    constructor(
        @Inject(RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager)
        public readonly transactionManager: IExpressionChangeTransactionManager,
        @Inject(RsXStateManagerInjectionTokens.IStateManager)
        public readonly stateManager: IStateManager,
        @Inject(RsXCoreInjectionTokens.IIndexValueAccessor)
        public readonly indexValueAccessor: IIndexValueAccessor,
        @Inject(RsXCoreInjectionTokens.IGuidFactory)
        public readonly guidFactory: IGuidFactory,
        @Inject(RsXCoreInjectionTokens.IValueMetadata)
        public readonly valueMetadata: IValueMetadata
    ) {}
}