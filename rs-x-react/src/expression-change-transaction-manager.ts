import { InjectionContainer } from '@rs-x/core';
import {
  type IExpressionChangeTransactionManager,
  RsXExpressionParserInjectionTokens,
  RsXExpressionParserModule,
} from '@rs-x/expression-parser';

let transactionManager!: IExpressionChangeTransactionManager;

export function getExpressionChangeTransactionManager() {
  if (!transactionManager) {
    if (
      !InjectionContainer.isBound(
        RsXExpressionParserInjectionTokens.IExpressionParser,
      )
    ) {
      InjectionContainer.load(RsXExpressionParserModule);
    }
    transactionManager = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager,
    );
  }
  return transactionManager;
}
