import { performance } from 'node:perf_hooks';
import { InjectionContainer } from '@rs-x/core';
import {
  RsXExpressionParserModule,
  rsx,
} from '@rs-x/expression-parser';
import { RsXStateManagerInjectionTokens } from '@rs-x/state-manager';

function makeRowModels(n) {
  return Array.from({ length: n }, (_, i) => ({ a: i, b: i * 2 }));
}

function fmt(n) {
  return Number(n.toFixed(3));
}

function ratio(part, total) {
  if (!total) return 0;
  return Number(((part / total) * 100).toFixed(1));
}

await InjectionContainer.load(RsXExpressionParserModule);

const stateManager = InjectionContainer.get(
  RsXStateManagerInjectionTokens.IStateManager,
);
const watchFactory = InjectionContainer.get(
  RsXStateManagerInjectionTokens.IWatchFactory,
);

const sizes = [1000, 2000, 3000, 4000, 5000, 7000, 10000];

const results = [];

for (const count of sizes) {
  global.gc?.();
  stateManager.clear();

  const timings = {
    watchFactoryCreateMs: 0,
    watchFactoryCreateCalls: 0,

    watchStateMs: 0,
    watchStateCalls: 0,

    isWatchedMs: 0,
    isWatchedCalls: 0,

    getStateMs: 0,
    getStateCalls: 0,

    tryToSubscribeMs: 0,
    tryToSubscribeCalls: 0,

    increaseRefMs: 0,
    increaseRefCalls: 0,
  };

  const wfCreateOriginal = watchFactory.create.bind(watchFactory);
  watchFactory.create = (...args) => {
    const t0 = performance.now();
    const out = wfCreateOriginal(...args);
    timings.watchFactoryCreateMs += performance.now() - t0;
    timings.watchFactoryCreateCalls += 1;
    return out;
  };

  const watchStateOriginal = stateManager.watchState.bind(stateManager);
  stateManager.watchState = (...args) => {
    const t0 = performance.now();
    const out = watchStateOriginal(...args);
    timings.watchStateMs += performance.now() - t0;
    timings.watchStateCalls += 1;
    return out;
  };

  const isWatchedOriginal = stateManager.isWatched.bind(stateManager);
  stateManager.isWatched = (...args) => {
    const t0 = performance.now();
    const out = isWatchedOriginal(...args);
    timings.isWatchedMs += performance.now() - t0;
    timings.isWatchedCalls += 1;
    return out;
  };

  const getStateOriginal = stateManager.getState.bind(stateManager);
  stateManager.getState = (...args) => {
    const t0 = performance.now();
    const out = getStateOriginal(...args);
    timings.getStateMs += performance.now() - t0;
    timings.getStateCalls += 1;
    return out;
  };

  const tryToSubscribeOriginal = stateManager.tryToSubscribeToChange?.bind(stateManager);
  if (tryToSubscribeOriginal) {
    stateManager.tryToSubscribeToChange = (...args) => {
      const t0 = performance.now();
      const out = tryToSubscribeOriginal(...args);
      timings.tryToSubscribeMs += performance.now() - t0;
      timings.tryToSubscribeCalls += 1;
      return out;
    };
  }

  const increaseRefOriginal = stateManager.increaseStateReferenceCount?.bind(stateManager);
  if (increaseRefOriginal) {
    stateManager.increaseStateReferenceCount = (...args) => {
      const t0 = performance.now();
      const out = increaseRefOriginal(...args);
      timings.increaseRefMs += performance.now() - t0;
      timings.increaseRefCalls += 1;
      return out;
    };
  }

  const rows = makeRowModels(count);

  const bindStart = performance.now();
  const expressions = [];
  for (let i = 0; i < rows.length; i += 1) {
    expressions.push(rsx('a + b')(rows[i]));
  }
  const bindMs = performance.now() - bindStart;

  const disposeStart = performance.now();
  for (const expression of expressions) {
    expression.dispose();
  }
  const disposeMs = performance.now() - disposeStart;

  watchFactory.create = wfCreateOriginal;
  stateManager.watchState = watchStateOriginal;
  stateManager.isWatched = isWatchedOriginal;
  stateManager.getState = getStateOriginal;
  if (tryToSubscribeOriginal) {
    stateManager.tryToSubscribeToChange = tryToSubscribeOriginal;
  }
  if (increaseRefOriginal) {
    stateManager.increaseStateReferenceCount = increaseRefOriginal;
  }

  global.gc?.();

  results.push({
    count,
    bindMs: fmt(bindMs),
    disposeMs: fmt(disposeMs),
    watchFactoryCreateMs: fmt(timings.watchFactoryCreateMs),
    watchFactoryCreateCalls: timings.watchFactoryCreateCalls,
    watchStateMs: fmt(timings.watchStateMs),
    watchStateCalls: timings.watchStateCalls,
    isWatchedMs: fmt(timings.isWatchedMs),
    isWatchedCalls: timings.isWatchedCalls,
    getStateMs: fmt(timings.getStateMs),
    getStateCalls: timings.getStateCalls,
    tryToSubscribeMs: fmt(timings.tryToSubscribeMs),
    tryToSubscribeCalls: timings.tryToSubscribeCalls,
    increaseRefMs: fmt(timings.increaseRefMs),
    increaseRefCalls: timings.increaseRefCalls,
    shareWatchStateOfBindPct: ratio(timings.watchStateMs, bindMs),
    shareTryToSubscribeOfWatchStatePct: ratio(
      timings.tryToSubscribeMs,
      timings.watchStateMs,
    ),
  });

  console.log('done', count);
}

console.table(
  results.map((r) => ({
    count: r.count,
    bindMs: r.bindMs,
    watchFactoryCreateMs: r.watchFactoryCreateMs,
    watchStateMs: r.watchStateMs,
    tryToSubscribeMs: r.tryToSubscribeMs,
    isWatchedMs: r.isWatchedMs,
    getStateMs: r.getStateMs,
    watchStateSharePct: r.shareWatchStateOfBindPct,
    subscribeShareInWatchStatePct: r.shareTryToSubscribeOfWatchStatePct,
  })),
);

console.log(JSON.stringify(results, null, 2));
