import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionServices } from '../../lib/expression-services/expression-services.interface';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import type { IExpression } from '../../lib/expressions/expression-parser.interface';

export async function loadCompiledModule(): Promise<() => Promise<void>> {
  const previousMode = process.env.RSX_EXPRESSION_ENGINE_MODE;
  process.env.RSX_EXPRESSION_ENGINE_MODE = 'compiled';
  await InjectionContainer.load(RsXExpressionParserModule);

  return async () => {
    if (previousMode === undefined) {
      delete process.env.RSX_EXPRESSION_ENGINE_MODE;
    } else {
      process.env.RSX_EXPRESSION_ENGINE_MODE = previousMode;
    }
    await unloadRsXExpressionParserModule();
  };
}

export function getExpressionServices(): IExpressionServices {
  return InjectionContainer.get(
    RsXExpressionParserInjectionTokens.IExpressionServices,
  );
}

export async function waitForInitialEmission(expression: IExpression): Promise<void> {
  await new WaitForEvent(expression, 'changed').wait(() => {});
}

export async function waitForUpdateEmission(
  expression: IExpression,
  mutate: () => void,
): Promise<void> {
  await new WaitForEvent(expression, 'changed', {
    ignoreInitialValue: true,
  }).wait(mutate);
}
