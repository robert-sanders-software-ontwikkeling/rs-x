import { InjectionContainer } from '@rs-x/core';
import { RsXExpressionParserModule } from '@rs-x/expression-parser';

export async function bootstrap(): Promise<void> {
  await InjectionContainer.load(RsXExpressionParserModule);
}
