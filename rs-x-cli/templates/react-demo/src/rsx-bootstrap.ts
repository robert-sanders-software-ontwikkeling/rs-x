import { InjectionContainer } from '@rs-x/core';
import { RsXExpressionParserModule } from '@rs-x/expression-parser';

import { registerRsxAotCompiledExpressions } from './rsx-generated/rsx-aot-compiled.generated';
import { registerRsxAotParsedExpressionCache } from './rsx-generated/rsx-aot-preparsed.generated';

let initialized = false;

export async function initRsx(): Promise<void> {
  if (initialized) {
    return;
  }

  registerRsxAotParsedExpressionCache();
  registerRsxAotCompiledExpressions();
  await InjectionContainer.load(RsXExpressionParserModule);
  initialized = true;
}
