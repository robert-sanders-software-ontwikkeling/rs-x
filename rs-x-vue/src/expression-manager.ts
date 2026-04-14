import { InjectionContainer } from '@rs-x/core';
import {
  type IExpressionManager,
  RsXExpressionParserInjectionTokens,
  RsXExpressionParserModule,
} from '@rs-x/expression-parser';

let expressionManager!: IExpressionManager;

export function getExpressionManager() {
  if (!expressionManager) {
    if (
      !InjectionContainer.isBound(
        RsXExpressionParserInjectionTokens.IExpressionParser,
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
