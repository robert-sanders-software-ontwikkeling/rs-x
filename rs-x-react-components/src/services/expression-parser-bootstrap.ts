import { InjectionContainer } from '@rs-x/core';
import { RsXExpressionParserModule } from '@rs-x/expression-parser';

let bootstrapPromise: Promise<void> | null = null;

export function ensureExpressionParserBootstrapped(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = InjectionContainer.load(RsXExpressionParserModule).catch(
      (error) => {
        bootstrapPromise = null;
        throw error;
      },
    );
  }

  return bootstrapPromise;
}
