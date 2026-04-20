import { InjectionContainer } from '@rs-x/core';
import {
  type IExpressionFactory,
  RsXExpressionParserInjectionTokens,
  RsXExpressionParserModule,
} from '@rs-x/expression-parser';

let factoryInstance!: IExpressionFactory;

export function getExpressionFactory() {
  if (!factoryInstance) {
    if (
      !InjectionContainer.isBound(
        RsXExpressionParserInjectionTokens.IExpressionParser,
      )
    ) {
      InjectionContainer.load(RsXExpressionParserModule);
    }
    factoryInstance = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionFactory,
    );
  }
  return factoryInstance;
}
