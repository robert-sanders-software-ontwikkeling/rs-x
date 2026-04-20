import { performance } from 'node:perf_hooks';

import { InjectionContainer } from '@rs-x/core';
import {
  RsXExpressionParserInjectionTokens,
  RsXExpressionParserModule,
  rsx,
} from '@rs-x/expression-parser';
import { RsXStateManagerInjectionTokens } from '@rs-x/state-manager';

const flush = async (rounds = 2) => {
  for (let i = 0; i < rounds; i += 1) {
    await Promise.resolve();
  }
};

const gcFlush = async (rounds = 3) => {
  for (let i = 0; i < rounds; i += 1) {
    if (typeof global.gc === 'function') {
      global.gc();
    }
    await flush(2);
  }
};

const mode = process.env.RSX_EXPRESSION_ENGINE_MODE ?? 'compiled';
const bindings = Number.parseInt(
  process.env.RSX_PROFILE_BINDINGS ?? '10000',
  10,
);
const rounds = Number.parseInt(process.env.RSX_PROFILE_ROUNDS ?? '8', 10);

await InjectionContainer.load(RsXExpressionParserModule);

const expressionCache = InjectionContainer.get(
  RsXExpressionParserInjectionTokens.IExpressionCache,
);
const stateManager = InjectionContainer.get(
  RsXStateManagerInjectionTokens.IStateManager,
);

const resetRuntimeState = async () => {
  stateManager.clear();
  expressionCache.dispose();
  await gcFlush();
};

const models = Array.from({ length: bindings }, (_, i) => ({ a: i, b: i * 2 }));

await resetRuntimeState();

// Warmup
for (let i = 0; i < 3; i += 1) {
  const expressions = models.map((row) => rsx('a + b')(row));
  await flush(3);
  for (const expression of expressions) {
    expression.dispose();
  }
  await resetRuntimeState();
}

const bindDurations = [];
const bulkUpdateDurations = [];

for (let round = 0; round < rounds; round += 1) {
  await gcFlush();

  const bindStart = performance.now();
  const expressions = models.map((row) => rsx('a + b')(row));
  await flush(3);
  const bindEnd = performance.now();

  const updateStart = performance.now();
  for (let i = 0; i < models.length; i += 1) {
    models[i].a += 1;
  }
  await flush(3);
  const updateEnd = performance.now();

  bindDurations.push(bindEnd - bindStart);
  bulkUpdateDurations.push(updateEnd - updateStart);

  for (const expression of expressions) {
    expression.dispose();
  }

  await resetRuntimeState();
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

console.log(
  JSON.stringify(
    {
      mode,
      bindings,
      rounds,
      bindMedianMs: median(bindDurations),
      bulkUpdateMedianMs: median(bulkUpdateDurations),
      bindDurations,
      bulkUpdateDurations,
    },
    null,
    2,
  ),
);
