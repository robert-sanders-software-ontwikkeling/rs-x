import { InjectionContainer } from '@rs-x/core';
import { IExpressionFactory, RsXExpressionParserInjectionTokens, RsXExpressionParserModule } from '@rs-x/expression-parser';

// Internal singleton instance
let factoryInstance!: IExpressionFactory;

export function getExpressionFactory() {
  if (!factoryInstance) {
    if (!InjectionContainer.isBound(RsXExpressionParserInjectionTokens.IExpressionFactory)) {
      InjectionContainer.load(RsXExpressionParserModule);
    }
    factoryInstance = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionFactory);
  }
  return factoryInstance;
}