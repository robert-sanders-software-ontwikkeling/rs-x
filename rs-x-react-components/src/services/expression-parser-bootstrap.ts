import { InjectionContainer } from '@rs-x/core';
import {
  RsXExpressionParserInjectionTokens,
  RsXExpressionParserModule,
} from '@rs-x/expression-parser';

export function ensureExpressionParserBootstrapped(): void {
  if (
    !InjectionContainer.isBound(
      RsXExpressionParserInjectionTokens.IExpressionParser,
    )
  ) {
    InjectionContainer.load(RsXExpressionParserModule);
  }
}
