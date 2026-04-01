'use client';

import { useState } from 'react';

import { InjectionContainer } from '@rs-x/core';
import {
  type IExpression,
  rsx,
  RsXExpressionParserInjectionTokens,
} from '@rs-x/expression-parser';

import {
  benchmarkExpressionFactories,
  lightBenchmarkExpressionFactories,
} from './rsx-generated/static-benchmark-expressions.generated';
import { initRsx } from './rsx-bootstrap';

type BenchmarkShape =
  | 'heavy'
  | 'light'
  | 'identifier10k'
  | 'identifier10kDifferentModels'
  | 'addition10kDifferentModels';

type BenchmarkMode = 'responsive' | 'strict';

type BenchmarkResult = {
  shape: BenchmarkShape;
  mode: BenchmarkMode;
  createMs: number;
  schedulerWaitMs: number;
  bindToValueMs: number;
  createToValueMs: number;
  resolvedCount: number;
  resolveTimedOut: boolean;
  expressions: IExpression[];
  createdCount: number;
  cacheCreateCalls: number;
  cachePrecompiledCreates: number;
  cacheFallbackCreates: number;
  cachePreloadedCount: number;
};

type BenchmarkProgress = {
  completedCount: number;
  totalCount: number;
};

type ExpressionCacheDebugState = {
  createCalls: number;
  precompiledCreates: number;
  fallbackCreates: number;
  preloadedCount: number;
};

const CREATE_BATCH_SIZE = 20;
const DISPOSE_BATCH_SIZE = 50;
const IDENTIFIER_ONLY_EXPRESSION_COUNT = 10000;
const RESOLVE_TIMEOUT_MS = 2000;
const RESOLVE_POLL_INTERVAL_MS = 16;

const expressionCacheDebugState: ExpressionCacheDebugState = {
  createCalls: 0,
  precompiledCreates: 0,
  fallbackCreates: 0,
  preloadedCount: 0,
};

const identifierOnlyBenchmarkModel: Record<string, number> = { a: 1 };
const identifierOnlyExpressionFactories: Array<() => IExpression> = Array.from(
  { length: IDENTIFIER_ONLY_EXPRESSION_COUNT },
  () => () => rsx('a')(identifierOnlyBenchmarkModel),
);

const identifierDifferentModelExpressionFactories: Array<() => IExpression> =
  Array.from({ length: IDENTIFIER_ONLY_EXPRESSION_COUNT }, () => {
    const model: Record<string, number> = { a: 1 };
    return () => rsx('a')(model);
  });

const additionDifferentModelExpressionFactories: Array<() => IExpression> =
  Array.from({ length: IDENTIFIER_ONLY_EXPRESSION_COUNT }, () => {
    const model: Record<string, number> = { a: 1, b: 2 };
    return () => rsx('a + b')(model);
  });

function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

function waitForDuration(durationMs: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, durationMs));
}

function installExpressionCacheDebugHooks(): void {
  const expressionCache = InjectionContainer.get(
    RsXExpressionParserInjectionTokens.IExpressionCache,
  ) as {
    create: (expression: string) => unknown;
    _precompiledExpressions?: Map<string, unknown>;
    __rsxDebugCreatePatched?: boolean;
  };

  if (expressionCache.__rsxDebugCreatePatched) {
    return;
  }

  const precompiledExpressions =
    expressionCache._precompiledExpressions instanceof Map
      ? expressionCache._precompiledExpressions
      : new Map<string, unknown>();

  expressionCacheDebugState.preloadedCount = precompiledExpressions.size;

  const originalCreate = expressionCache.create.bind(expressionCache);
  expressionCache.create = (expressionString: string) => {
    expressionCacheDebugState.createCalls += 1;
    if (precompiledExpressions.has(expressionString)) {
      expressionCacheDebugState.precompiledCreates += 1;
    } else {
      expressionCacheDebugState.fallbackCreates += 1;
    }
    return originalCreate(expressionString);
  };

  expressionCache.__rsxDebugCreatePatched = true;
}

function createExpressionsStrict(
  expressionFactories: ReadonlyArray<() => IExpression>,
): IExpression[] {
  return expressionFactories.map((createExpression) => createExpression());
}

async function createExpressionsInBatches(
  expressionFactories: ReadonlyArray<() => IExpression>,
  onProgress?: (progress: BenchmarkProgress) => void,
): Promise<{ expressions: IExpression[]; schedulerWaitMs: number }> {
  const expressions: IExpression[] = [];
  let schedulerWaitMs = 0;
  const totalCount = expressionFactories.length;
  for (let index = 0; index < totalCount; index += CREATE_BATCH_SIZE) {
    const batchEnd = Math.min(index + CREATE_BATCH_SIZE, totalCount);
    for (let cursor = index; cursor < batchEnd; cursor += 1) {
      expressions.push(expressionFactories[cursor]());
    }
    onProgress?.({ completedCount: batchEnd, totalCount });
    const schedulerStart = performance.now();
    await yieldToMainThread();
    schedulerWaitMs += performance.now() - schedulerStart;
  }
  return { expressions, schedulerWaitMs };
}

function disposeExpressionsStrict(expressions: readonly IExpression[]): void {
  for (let index = 0; index < expressions.length; index += 1) {
    expressions[index].dispose();
  }
}

async function disposeExpressionsInBatches(
  expressions: readonly IExpression[],
): Promise<void> {
  for (let index = 0; index < expressions.length; index += DISPOSE_BATCH_SIZE) {
    const batchEnd = Math.min(index + DISPOSE_BATCH_SIZE, expressions.length);
    for (let cursor = index; cursor < batchEnd; cursor += 1) {
      expressions[cursor].dispose();
    }
    await yieldToMainThread();
  }
}

async function waitForExpressionsToHaveValue(
  expressions: readonly IExpression[],
  timeoutMs: number,
): Promise<{ resolvedCount: number; timedOut: boolean }> {
  const start = performance.now();
  let resolvedCount = 0;
  const unresolvedIndexes: number[] = [];

  for (let index = 0; index < expressions.length; index += 1) {
    if (expressions[index].value !== undefined) {
      resolvedCount += 1;
    } else {
      unresolvedIndexes.push(index);
    }
  }

  if (unresolvedIndexes.length === 0) {
    return { resolvedCount, timedOut: false };
  }

  while (unresolvedIndexes.length > 0) {
    if (performance.now() - start >= timeoutMs) {
      return { resolvedCount, timedOut: true };
    }
    await waitForDuration(RESOLVE_POLL_INTERVAL_MS);

    for (let cursor = unresolvedIndexes.length - 1; cursor >= 0; cursor -= 1) {
      const expressionIndex = unresolvedIndexes[cursor];
      if (expressions[expressionIndex].value !== undefined) {
        resolvedCount += 1;
        unresolvedIndexes[cursor] = unresolvedIndexes[unresolvedIndexes.length - 1];
        unresolvedIndexes.pop();
      }
    }
  }

  return { resolvedCount, timedOut: false };
}

function resolveExpressionFactories(
  shape: BenchmarkShape,
): ReadonlyArray<() => IExpression> {
  switch (shape) {
    case 'light':
      return lightBenchmarkExpressionFactories;
    case 'identifier10k':
      return identifierOnlyExpressionFactories;
    case 'identifier10kDifferentModels':
      return identifierDifferentModelExpressionFactories;
    case 'addition10kDifferentModels':
      return additionDifferentModelExpressionFactories;
    default:
      return benchmarkExpressionFactories;
  }
}

async function runBenchmark(
  shape: BenchmarkShape,
  mode: BenchmarkMode,
  onProgress?: (progress: BenchmarkProgress) => void,
): Promise<BenchmarkResult> {
  await initRsx();
  installExpressionCacheDebugHooks();

  const expressionFactories = resolveExpressionFactories(shape);
  const startCreateCalls = expressionCacheDebugState.createCalls;
  const startPrecompiledCreates = expressionCacheDebugState.precompiledCreates;
  const startFallbackCreates = expressionCacheDebugState.fallbackCreates;

  const createWallStart = performance.now();
  let expressions: IExpression[];
  let schedulerWaitMs = 0;
  if (mode === 'strict') {
    expressions = createExpressionsStrict(expressionFactories);
  } else {
    const batchedResult = await createExpressionsInBatches(
      expressionFactories,
      onProgress,
    );
    expressions = batchedResult.expressions;
    schedulerWaitMs = batchedResult.schedulerWaitMs;
  }
  const createWallEnd = performance.now();
  const createMs = createWallEnd - createWallStart - schedulerWaitMs;

  const bindToValueStart = performance.now();
  const resolveResult = await waitForExpressionsToHaveValue(
    expressions,
    RESOLVE_TIMEOUT_MS,
  );
  const bindToValueMs = performance.now() - bindToValueStart;

  return {
    shape,
    mode,
    createMs,
    schedulerWaitMs,
    bindToValueMs,
    createToValueMs: createMs + bindToValueMs,
    resolvedCount: resolveResult.resolvedCount,
    resolveTimedOut: resolveResult.timedOut,
    expressions,
    createdCount: expressions.length,
    cacheCreateCalls: expressionCacheDebugState.createCalls - startCreateCalls,
    cachePrecompiledCreates:
      expressionCacheDebugState.precompiledCreates - startPrecompiledCreates,
    cacheFallbackCreates:
      expressionCacheDebugState.fallbackCreates - startFallbackCreates,
    cachePreloadedCount: expressionCacheDebugState.preloadedCount,
  };
}

export default function Page() {
  const [running, setRunning] = useState(false);
  const [strictMode, setStrictMode] = useState(true);
  const [shape, setShape] = useState<BenchmarkShape>('heavy');
  const [progressLabel, setProgressLabel] = useState('');
  const [cleanupMs, setCleanupMs] = useState<number | null>(null);
  const [result, setResult] = useState<Omit<BenchmarkResult, 'expressions'> | null>(
    null,
  );

  const run = async () => {
    let mode: BenchmarkMode = strictMode ? 'strict' : 'responsive';
    if (shape === 'identifier10k') {
      mode = 'strict';
      setStrictMode(true);
    }

    setRunning(true);
    setResult(null);
    setCleanupMs(null);
    setProgressLabel(
      mode === 'strict'
        ? `Running strict ${shape} benchmark...`
        : `Running ${shape} benchmark...`,
    );

    try {
      const benchmarkResult = await runBenchmark(
        shape,
        mode,
        mode === 'responsive'
          ? (progress) => {
              setProgressLabel(
                `Creating expressions... ${progress.completedCount}/${progress.totalCount}`,
              );
            }
          : undefined,
      );

      const cleanupStart = performance.now();
      if (mode === 'strict') {
        disposeExpressionsStrict(benchmarkResult.expressions);
      } else {
        await disposeExpressionsInBatches(benchmarkResult.expressions);
      }
      const cleanupEnd = performance.now();

      setResult({
        shape: benchmarkResult.shape,
        mode: benchmarkResult.mode,
        createMs: benchmarkResult.createMs,
        schedulerWaitMs: benchmarkResult.schedulerWaitMs,
        bindToValueMs: benchmarkResult.bindToValueMs,
        createToValueMs: benchmarkResult.createToValueMs,
        resolvedCount: benchmarkResult.resolvedCount,
        resolveTimedOut: benchmarkResult.resolveTimedOut,
        createdCount: benchmarkResult.createdCount,
        cacheCreateCalls: benchmarkResult.cacheCreateCalls,
        cachePrecompiledCreates: benchmarkResult.cachePrecompiledCreates,
        cacheFallbackCreates: benchmarkResult.cacheFallbackCreates,
        cachePreloadedCount: benchmarkResult.cachePreloadedCount,
      });
      setCleanupMs(cleanupEnd - cleanupStart);
    } finally {
      setProgressLabel('');
      setRunning(false);
    }
  };

  return (
    <main
      style={{
        maxWidth: 920,
        margin: '2rem auto',
        fontFamily: 'sans-serif',
        lineHeight: 1.5,
      }}
    >
      <h1>RS-X Next Benchmark</h1>
      <p>
        Runs static <code>rsx(&apos;...&apos;)(model)</code> expressions and reports
        create, scheduler wait, bind-to-value, and cleanup timings.
      </p>

      <label style={{ display: 'block', margin: '0.75rem 0' }}>
        <input
          type="radio"
          name="shape"
          value="heavy"
          checked={shape === 'heavy'}
          disabled={running}
          onChange={() => setShape('heavy')}
        />
        {' '}
        Heavy: 1000 unique 32-term expressions
      </label>
      <label style={{ display: 'block', margin: '0.75rem 0' }}>
        <input
          type="radio"
          name="shape"
          value="light"
          checked={shape === 'light'}
          disabled={running}
          onChange={() => setShape('light')}
        />
        {' '}
        Light: 1000 expressions of &quot;a + b&quot;
      </label>
      <label style={{ display: 'block', margin: '0.75rem 0' }}>
        <input
          type="radio"
          name="shape"
          value="identifier10k"
          checked={shape === 'identifier10k'}
          disabled={running}
          onChange={() => setShape('identifier10k')}
        />
        {' '}
        Identifier-only: 10000 expressions of &quot;a&quot;
      </label>
      <label style={{ display: 'block', margin: '0.75rem 0' }}>
        <input
          type="radio"
          name="shape"
          value="identifier10kDifferentModels"
          checked={shape === 'identifier10kDifferentModels'}
          disabled={running}
          onChange={() => setShape('identifier10kDifferentModels')}
        />
        {' '}
        Identifier-only: 10000 expressions of &quot;a&quot; (different models)
      </label>
      <label style={{ display: 'block', margin: '0.75rem 0' }}>
        <input
          type="radio"
          name="shape"
          value="addition10kDifferentModels"
          checked={shape === 'addition10kDifferentModels'}
          disabled={running}
          onChange={() => setShape('addition10kDifferentModels')}
        />
        {' '}
        Addition: 10000 expressions of &quot;a + b&quot; (different models)
      </label>

      <label style={{ display: 'block', margin: '0.75rem 0' }}>
        <input
          type="checkbox"
          checked={strictMode}
          disabled={running || shape === 'identifier10k'}
          onChange={(event) => setStrictMode(event.target.checked)}
        />
        {' '}
        Strict mode (no UI yields/progress updates, cleanup measured separately)
      </label>

      <button onClick={run} disabled={running} style={{ padding: '0.5rem 1rem' }}>
        {running ? progressLabel || 'Running benchmark...' : 'Run benchmark'}
      </button>

      {result ? (
        <section style={{ marginTop: '1rem' }}>
          <p>Shape: {result.shape}</p>
          <p>Mode: {result.mode}</p>
          <p>Created expressions: {result.createdCount}</p>
          <p>Create time: {result.createMs.toFixed(2)} ms</p>
          <p>
            Scheduler wait time (excluded from create):{' '}
            {result.schedulerWaitMs.toFixed(2)} ms
          </p>
          <p>Bind-to-value time: {result.bindToValueMs.toFixed(2)} ms</p>
          <p>Create-to-value total: {result.createToValueMs.toFixed(2)} ms</p>
          <p>
            Resolved count: {result.resolvedCount}/{result.createdCount}
          </p>
          <p>Resolve timed out: {result.resolveTimedOut ? 'yes' : 'no'}</p>
          <p>
            Cleanup time (outside measured window):{' '}
            {cleanupMs === null ? 'pending...' : `${cleanupMs.toFixed(2)} ms`}
          </p>
          <hr />
          <p>Cache preloaded entries (all expressions): {result.cachePreloadedCount}</p>
          <p>Cache create() calls this run: {result.cacheCreateCalls}</p>
          <p>
            Precompiled cache creates this run: {result.cachePrecompiledCreates}
          </p>
          <p>Fallback creates this run: {result.cacheFallbackCreates}</p>
        </section>
      ) : null}
    </main>
  );
}
