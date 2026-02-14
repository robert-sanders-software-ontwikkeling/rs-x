import { InjectionContainer } from '@rs-x/core';
import {
  type IExpressionFactory,
  IExpressionManager,
  RsXExpressionParserInjectionTokens,
  RsXExpressionParserModule,
} from '@rs-x/expression-parser';

// Internal singleton instance
let expressionManager!: IExpressionManager;

export function getExpressionManager() {
  if (!expressionManager) {
    if (
      !InjectionContainer.isBound(
        RsXExpressionParserInjectionTokens.IExpressionManager,
      )
    ) {
      InjectionContainer.load(RsXExpressionParserModule);
    }
    expressionManager = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionManager,
    );
  }
  return expressionManager;
}
