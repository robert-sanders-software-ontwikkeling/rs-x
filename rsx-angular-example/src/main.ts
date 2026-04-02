import { InjectionContainer } from '@rs-x/core';
import { type IExpression, rsx } from '@rs-x/expression-parser';
import {
  RsXExpressionParserInjectionTokens,
  RsXExpressionParserModule,
} from '@rs-x/expression-parser';

import {
  benchmarkExpressionFactories,
  lightBenchmarkExpressionFactories,
} from './expressions/static-benchmark-expressions.generated';

type BenchmarkResult = {
  mode: 'responsive' | 'strict';
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
  phase: 'creating';
  completedCount: number;
  totalCount: number;
  remainingCount: number;
};

type BenchmarkShape =
  | 'heavy'
  | 'light'
  | 'identifier10k'
  | 'identifier10kDifferentModels'
  | 'addition10kDifferentModels';

const BENCHMARK_BATCH_SIZE = 20;
const DISPOSE_BATCH_SIZE = 50;
const BENCHMARK_EXPRESSION_COUNT = 1000;
const BENCHMARK_TERMS_PER_EXPRESSION = 32;
const IDENTIFIER_ONLY_EXPRESSION_COUNT = 10000;
const RESOLVE_TIMEOUT_MS = 2000;
const RESOLVE_POLL_INTERVAL_MS = 16;

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

type ExpressionCacheDebugState = {
  createCalls: number;
  precompiledCreates: number;
  fallbackCreates: number;
  preloadedCount: number;
};

const expressionCacheDebugState: ExpressionCacheDebugState = {
  createCalls: 0,
  precompiledCreates: 0,
  fallbackCreates: 0,
  preloadedCount: 0,
};

function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

function waitForDuration(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

async function createExpressionsInBatches(
  expressionFactories: ReadonlyArray<() => IExpression>,
  onProgress?: (progress: BenchmarkProgress) => void,
): Promise<{ expressions: IExpression[]; schedulerWaitMs: number }> {
  const expressions: IExpression[] = [];
  const totalCount = expressionFactories.length;
  let schedulerWaitMs = 0;

  for (let index = 0; index < totalCount; index += BENCHMARK_BATCH_SIZE) {
    const batchEnd = Math.min(index + BENCHMARK_BATCH_SIZE, totalCount);
    for (let cursor = index; cursor < batchEnd; cursor += 1) {
      expressions.push(expressionFactories[cursor]());
    }

    onProgress?.({
      phase: 'creating',
      completedCount: batchEnd,
      totalCount,
      remainingCount: totalCount - batchEnd,
    });
    const schedulerStart = performance.now();
    await yieldToMainThread();
    schedulerWaitMs += performance.now() - schedulerStart;
  }

  return { expressions, schedulerWaitMs };
}

function createExpressionsStrict(
  expressionFactories: ReadonlyArray<() => IExpression>,
): IExpression[] {
  return expressionFactories.map((createExpression) => createExpression());
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

async function runBenchmark(
  shape: BenchmarkShape,
  mode: 'responsive' | 'strict',
  onProgress?: (progress: BenchmarkProgress) => void,
): Promise<BenchmarkResult> {
  const expressionFactories =
    shape === 'light'
      ? lightBenchmarkExpressionFactories
      : shape === 'identifier10k'
        ? identifierOnlyExpressionFactories
        : shape === 'identifier10kDifferentModels'
          ? identifierDifferentModelExpressionFactories
          : shape === 'addition10kDifferentModels'
            ? additionDifferentModelExpressionFactories
            : benchmarkExpressionFactories;
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
        unresolvedIndexes[cursor] =
          unresolvedIndexes[unresolvedIndexes.length - 1];
        unresolvedIndexes.pop();
      }
    }
  }

  return { resolvedCount, timedOut: false };
}

function buildExpressionString(expressionIndex: number): string {
  const terms: string[] = [];
  for (
    let termIndex = 0;
    termIndex < BENCHMARK_TERMS_PER_EXPRESSION;
    termIndex += 1
  ) {
    terms.push(`v_${expressionIndex}_${termIndex}`);
  }
  return terms.join(' + ');
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

  const expectedExpressions = new Array<string>(BENCHMARK_EXPRESSION_COUNT);
  for (let index = 0; index < BENCHMARK_EXPRESSION_COUNT; index += 1) {
    expectedExpressions[index] = buildExpressionString(index);
  }
  const preloadedBenchmarkExpressions = expectedExpressions.filter(
    (expression) => precompiledExpressions.has(expression),
  ).length;

  console.info(
    `[rsx benchmark] preloaded benchmark expressions: ${preloadedBenchmarkExpressions}/${BENCHMARK_EXPRESSION_COUNT}`,
  );

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

function renderApp(): void {
  const root = document.getElementById('app');
  if (!root) {
    return;
  }

  root.innerHTML = `
    <main style="max-width: 920px; margin: 2rem auto; font-family: sans-serif; line-height: 1.5;">
      <h1>RS-X Angular Benchmark</h1>
      <p>Runs ${benchmarkExpressionFactories.length} static expressions. Choose heavy or light shape.</p>
      <label style="display: block; margin: 0.75rem 0;">
        <input id="shape-heavy" type="radio" name="shape" value="heavy" checked />
        Heavy: 1000 unique 32-term expressions
      </label>
      <label style="display: block; margin: 0.75rem 0;">
        <input id="shape-light" type="radio" name="shape" value="light" />
        Light: 1000 expressions of "a + b"
      </label>
      <label style="display: block; margin: 0.75rem 0;">
        <input id="shape-identifier-10k" type="radio" name="shape" value="identifier10k" />
        Identifier-only: 10000 expressions of "a"
      </label>
      <label style="display: block; margin: 0.75rem 0;">
        <input id="shape-identifier-10k-different-models" type="radio" name="shape" value="identifier10kDifferentModels" />
        Identifier-only: 10000 expressions of "a" (different models)
      </label>
      <label style="display: block; margin: 0.75rem 0;">
        <input id="shape-addition-10k-different-models" type="radio" name="shape" value="addition10kDifferentModels" />
        Addition: 10000 expressions of "a + b" (different models)
      </label>
      <label style="display: block; margin: 0.75rem 0;">
        <input id="strict-mode" type="checkbox" checked />
        Strict mode (no UI yields/progress updates, cleanup measured separately)
      </label>
      <button id="run-benchmark" style="padding: 0.5rem 1rem;">Run benchmark</button>
      <section id="results" style="margin-top: 1rem;"></section>
    </main>
  `;

  const button = document.getElementById(
    'run-benchmark',
  ) as HTMLButtonElement | null;
  const strictModeCheckbox = document.getElementById(
    'strict-mode',
  ) as HTMLInputElement | null;
  const heavyShapeRadio = document.getElementById(
    'shape-heavy',
  ) as HTMLInputElement | null;
  const lightShapeRadio = document.getElementById(
    'shape-light',
  ) as HTMLInputElement | null;
  const identifierShapeRadio = document.getElementById(
    'shape-identifier-10k',
  ) as HTMLInputElement | null;
  const identifierDifferentModelsShapeRadio = document.getElementById(
    'shape-identifier-10k-different-models',
  ) as HTMLInputElement | null;
  const additionDifferentModelsShapeRadio = document.getElementById(
    'shape-addition-10k-different-models',
  ) as HTMLInputElement | null;
  const results = document.getElementById('results');
  if (
    !button ||
    !results ||
    !strictModeCheckbox ||
    !heavyShapeRadio ||
    !lightShapeRadio ||
    !identifierShapeRadio ||
    !identifierDifferentModelsShapeRadio ||
    !additionDifferentModelsShapeRadio
  ) {
    return;
  }

  button.addEventListener('click', async () => {
    let mode: 'responsive' | 'strict' = strictModeCheckbox.checked
      ? 'strict'
      : 'responsive';
    const shape: BenchmarkShape = identifierShapeRadio.checked
      ? 'identifier10k'
      : identifierDifferentModelsShapeRadio.checked
        ? 'identifier10kDifferentModels'
        : additionDifferentModelsShapeRadio.checked
          ? 'addition10kDifferentModels'
          : lightShapeRadio.checked
            ? 'light'
            : 'heavy';
    if (shape === 'identifier10k') {
      mode = 'strict';
      strictModeCheckbox.checked = true;
    }
    button.disabled = true;
    strictModeCheckbox.disabled = true;
    heavyShapeRadio.disabled = true;
    lightShapeRadio.disabled = true;
    identifierShapeRadio.disabled = true;
    identifierDifferentModelsShapeRadio.disabled = true;
    additionDifferentModelsShapeRadio.disabled = true;
    button.textContent =
      mode === 'strict'
        ? `Running strict ${shape} benchmark...`
        : `Running ${shape} benchmark...`;
    results.textContent = '';

    try {
      const result = await runBenchmark(
        shape,
        mode,
        mode === 'responsive'
          ? (progress) => {
              button.textContent = `Creating expressions... ${progress.completedCount}/${progress.totalCount}`;
            }
          : undefined,
      );
      results.innerHTML = `
        <p>Shape: ${shape}</p>
        <p>Mode: ${result.mode}</p>
        <p>Created expressions: ${result.createdCount}</p>
        <p>Create time: ${result.createMs.toFixed(2)} ms</p>
        <p>Scheduler wait time (excluded from create): ${result.schedulerWaitMs.toFixed(2)} ms</p>
        <p>Bind-to-value time: ${result.bindToValueMs.toFixed(2)} ms</p>
        <p>Create-to-value total: ${result.createToValueMs.toFixed(2)} ms</p>
        <p>Resolved count: ${result.resolvedCount}/${result.createdCount}</p>
        <p>Resolve timed out: ${result.resolveTimedOut ? 'yes' : 'no'}</p>
        <p id="cleanup-time">Cleanup time (outside measured window): pending...</p>
        <hr />
        <p>Cache preloaded entries (all expressions): ${result.cachePreloadedCount}</p>
        <p>Cache create() calls this run: ${result.cacheCreateCalls}</p>
        <p>Precompiled cache creates this run: ${result.cachePrecompiledCreates}</p>
        <p>Fallback creates this run: ${result.cacheFallbackCreates}</p>
      `;
      const cleanupStart = performance.now();
      if (result.mode === 'strict') {
        disposeExpressionsStrict(result.expressions);
      } else {
        await disposeExpressionsInBatches(result.expressions);
      }
      const cleanupEnd = performance.now();
      const cleanupElement = document.getElementById('cleanup-time');
      if (cleanupElement) {
        cleanupElement.textContent = `Cleanup time (outside measured window): ${(
          cleanupEnd - cleanupStart
        ).toFixed(2)} ms`;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.innerHTML = `<p style="color: #b42318;">Benchmark failed: ${message}</p>`;
      // Keep error visible in devtools so failures are easy to diagnose.

      console.error('Benchmark execution failed', error);
    } finally {
      button.disabled = false;
      strictModeCheckbox.disabled = false;
      heavyShapeRadio.disabled = false;
      lightShapeRadio.disabled = false;
      identifierShapeRadio.disabled = false;
      identifierDifferentModelsShapeRadio.disabled = false;
      additionDifferentModelsShapeRadio.disabled = false;
      button.textContent = 'Run benchmark';
    }
  });
}

async function bootstrap(): Promise<void> {
  await InjectionContainer.load(RsXExpressionParserModule);
  installExpressionCacheDebugHooks();
  renderApp();
}

void bootstrap();
