import { performance } from 'node:perf_hooks';
import { InjectionContainer } from '@rs-x/core';
import { RsXExpressionParserModule, rsx } from '@rs-x/expression-parser';
import { RsXStateManagerInjectionTokens } from '@rs-x/state-manager';

function makeRowModels(n) {
  return Array.from({ length: n }, (_, i) => ({ a: i, b: i * 2 }));
}

function f(n) {
  return Number(n.toFixed(3));
}

await InjectionContainer.load(RsXExpressionParserModule);
const stateManager = InjectionContainer.get(RsXStateManagerInjectionTokens.IStateManager);

for (const count of [1000, 3000, 5000, 10000]) {
  global.gc?.();
  stateManager.clear();

  const rows = makeRowModels(count);

  const metrics = {
    first: { watchStateMs: 0, watchStateCalls: 0, trySubMs: 0, trySubCalls: 0, incRefMs: 0, incRefCalls: 0 },
    second: { watchStateMs: 0, watchStateCalls: 0, trySubMs: 0, trySubCalls: 0, incRefMs: 0, incRefCalls: 0 },
  };

  const watchStateOriginal = stateManager.watchState.bind(stateManager);
  const trySubOriginal = stateManager.tryToSubscribeToChange.bind(stateManager);
  const incRefOriginal = stateManager.increaseStateReferenceCount.bind(stateManager);

  let phase = 'first';

  stateManager.watchState = (...args) => {
    const t0 = performance.now();
    const out = watchStateOriginal(...args);
    metrics[phase].watchStateMs += performance.now() - t0;
    metrics[phase].watchStateCalls += 1;
    return out;
  };

  stateManager.tryToSubscribeToChange = (...args) => {
    const t0 = performance.now();
    const out = trySubOriginal(...args);
    metrics[phase].trySubMs += performance.now() - t0;
    metrics[phase].trySubCalls += 1;
    return out;
  };

  stateManager.increaseStateReferenceCount = (...args) => {
    const t0 = performance.now();
    const out = incRefOriginal(...args);
    metrics[phase].incRefMs += performance.now() - t0;
    metrics[phase].incRefCalls += 1;
    return out;
  };

  const tFirst0 = performance.now();
  const firstExpressions = rows.map((row) => rsx('a + b')(row));
  const firstBindMs = performance.now() - tFirst0;

  phase = 'second';
  const tSecond0 = performance.now();
  const secondExpressions = rows.map((row) => rsx('a + b')(row));
  const secondBindMs = performance.now() - tSecond0;

  const dispose0 = performance.now();
  for (const e of secondExpressions) e.dispose();
  for (const e of firstExpressions) e.dispose();
  const disposeMs = performance.now() - dispose0;

  stateManager.watchState = watchStateOriginal;
  stateManager.tryToSubscribeToChange = trySubOriginal;
  stateManager.increaseStateReferenceCount = incRefOriginal;

  console.log(JSON.stringify({
    count,
    firstBindMs: f(firstBindMs),
    secondBindMs: f(secondBindMs),
    speedupSecondVsFirst: f(firstBindMs / Math.max(secondBindMs, 0.0001)),
    first: {
      watchStateMs: f(metrics.first.watchStateMs),
      watchStateCalls: metrics.first.watchStateCalls,
      trySubMs: f(metrics.first.trySubMs),
      trySubCalls: metrics.first.trySubCalls,
      incRefMs: f(metrics.first.incRefMs),
      incRefCalls: metrics.first.incRefCalls,
    },
    second: {
      watchStateMs: f(metrics.second.watchStateMs),
      watchStateCalls: metrics.second.watchStateCalls,
      trySubMs: f(metrics.second.trySubMs),
      trySubCalls: metrics.second.trySubCalls,
      incRefMs: f(metrics.second.incRefMs),
      incRefCalls: metrics.second.incRefCalls,
    },
    disposeMs: f(disposeMs),
  }, null, 2));

  global.gc?.();
}
