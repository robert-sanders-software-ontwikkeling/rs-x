import { performance } from 'node:perf_hooks';
import { InjectionContainer } from '@rs-x/core';
import {
  RsXExpressionParserInjectionTokens,
  RsXExpressionParserModule,
  rsx,
} from '@rs-x/expression-parser';
import { RsXStateManagerInjectionTokens } from '@rs-x/state-manager';

function makeUniqueExpressions(n) {
  return Array.from({ length: n }, (_, i) => 'x' + i + ' + y' + i);
}

function makeWideModel(n) {
  const model = {};
  for (let i = 0; i < n; i += 1) {
    model['x' + i] = i;
    model['y' + i] = i * 2;
  }
  return model;
}

function makeRowModels(n) {
  return Array.from({ length: n }, (_, i) => ({ a: i, b: i * 2 }));
}

function format(n) {
  return Number(n.toFixed(3));
}

await InjectionContainer.load(RsXExpressionParserModule);

const expressionCache = InjectionContainer.get(
  RsXExpressionParserInjectionTokens.IExpressionCache,
);
const expressionParser = InjectionContainer.get(
  RsXExpressionParserInjectionTokens.IExpressionParser,
);
const stateManager = InjectionContainer.get(
  RsXStateManagerInjectionTokens.IStateManager,
);

const originalParse = expressionParser.parse.bind(expressionParser);
const originalWatchState = stateManager.watchState.bind(stateManager);

const sizes = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000];

const results = [];

for (const count of sizes) {
  global.gc?.();
  stateManager.clear();
  expressionCache.dispose();

  let parseMs = 0;
  let parseCalls = 0;
  let watchStateMs = 0;
  let watchStateCalls = 0;

  expressionParser.parse = (expression) => {
    const t0 = performance.now();
    const out = originalParse(expression);
    parseMs += performance.now() - t0;
    parseCalls += 1;
    return out;
  };

  stateManager.watchState = (context, index, options) => {
    const t0 = performance.now();
    const out = originalWatchState(context, index, options);
    watchStateMs += performance.now() - t0;
    watchStateCalls += 1;
    return out;
  };

  const uniqueExpressions = makeUniqueExpressions(count);

  // A) parse/cache only (no bind)
  const parseOnlyStart = performance.now();
  for (let i = 0; i < uniqueExpressions.length; i += 1) {
    const ref = expressionCache.create(uniqueExpressions[i]);
    ref.instance.dispose();
    expressionCache.release(ref.id);
  }
  const parseOnlyMs = performance.now() - parseOnlyStart;

  const parseOnlyParseMs = parseMs;
  const parseOnlyParseCalls = parseCalls;

  // reset parser counters for next scenarios
  parseMs = 0;
  parseCalls = 0;
  watchStateMs = 0;
  watchStateCalls = 0;

  // B) bind path with cached same expression (minimal parse)
  const rowModels = makeRowModels(count);
  const bindSameStart = performance.now();
  const same = [];
  for (let i = 0; i < rowModels.length; i += 1) {
    same.push(rsx('a + b')(rowModels[i]));
  }
  const bindSameMs = performance.now() - bindSameStart;
  const disposeSameStart = performance.now();
  for (const e of same) {
    e.dispose();
  }
  const disposeSameMs = performance.now() - disposeSameStart;

  const bindSameParseMs = parseMs;
  const bindSameParseCalls = parseCalls;
  const bindSameWatchMs = watchStateMs;
  const bindSameWatchCalls = watchStateCalls;

  // reset all state
  stateManager.clear();
  expressionCache.dispose();
  parseMs = 0;
  parseCalls = 0;
  watchStateMs = 0;
  watchStateCalls = 0;

  // C) full unique bind
  const wideModel = makeWideModel(count);
  const bindUniqueStart = performance.now();
  const unique = [];
  for (let i = 0; i < uniqueExpressions.length; i += 1) {
    unique.push(rsx(uniqueExpressions[i])(wideModel));
  }
  const bindUniqueMs = performance.now() - bindUniqueStart;
  const disposeUniqueStart = performance.now();
  for (const e of unique) {
    e.dispose();
  }
  const disposeUniqueMs = performance.now() - disposeUniqueStart;

  results.push({
    count,
    parseOnlyMs: format(parseOnlyMs),
    parseOnlyParseMs: format(parseOnlyParseMs),
    parseOnlyParseCalls,

    bindSameMs: format(bindSameMs),
    bindSameDisposeMs: format(disposeSameMs),
    bindSameParseMs: format(bindSameParseMs),
    bindSameParseCalls,
    bindSameWatchMs: format(bindSameWatchMs),
    bindSameWatchCalls,

    bindUniqueMs: format(bindUniqueMs),
    bindUniqueDisposeMs: format(disposeUniqueMs),
    bindUniqueParseMs: format(parseMs),
    bindUniqueParseCalls: parseCalls,
    bindUniqueWatchMs: format(watchStateMs),
    bindUniqueWatchCalls: watchStateCalls,
  });

  expressionParser.parse = originalParse;
  stateManager.watchState = originalWatchState;

  global.gc?.();

  console.log('done', count);
}

console.table(
  results.map((r) => ({
    count: r.count,
    parseOnlyMs: r.parseOnlyMs,
    bindSameMs: r.bindSameMs,
    bindUniqueMs: r.bindUniqueMs,
    bindSameParseMs: r.bindSameParseMs,
    bindUniqueParseMs: r.bindUniqueParseMs,
    bindSameWatchMs: r.bindSameWatchMs,
    bindUniqueWatchMs: r.bindUniqueWatchMs,
  })),
);

console.log(JSON.stringify(results, null, 2));
