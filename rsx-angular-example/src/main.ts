import { InjectionContainer } from '@rs-x/core';
import { type IExpression, rsx } from '@rs-x/expression-parser';
import { RsXExpressionParserModule } from '@rs-x/expression-parser';

type BenchmarkResult = {
  mode: 'responsive' | 'strict';
  createMs: number;
  resolveMs: number;
  totalMs: number;
  cleanupMs: number;
  createdCount: number;
  resolvedCount: number;
  sampleValue: unknown;
};

type BenchmarkProgress = {
  phase: 'creating';
  completedCount: number;
  totalCount: number;
  remainingCount: number;
};

const BENCHMARK_EXPRESSION_COUNT = 1000;
const BENCHMARK_TERMS_PER_EXPRESSION = 32;
const BENCHMARK_BATCH_SIZE = 20;
const DISPOSE_BATCH_SIZE = 50;

type BenchmarkDefinition = {
  factories: Array<() => IExpression>;
};

function buildBenchmarkDefinition(): BenchmarkDefinition {
  const sharedModel: Record<string, number> = {};
  const factories: Array<() => IExpression> = [];

  for (
    let expressionIndex = 0;
    expressionIndex < BENCHMARK_EXPRESSION_COUNT;
    expressionIndex += 1
  ) {
    const terms: string[] = [];
    for (
      let termIndex = 0;
      termIndex < BENCHMARK_TERMS_PER_EXPRESSION;
      termIndex += 1
    ) {
      const key = `v_${expressionIndex}_${termIndex}`;
      sharedModel[key] = expressionIndex + termIndex;
      terms.push(key);
    }

    const expression = terms.join(' + ');
    factories.push(() => rsx(expression)(sharedModel));
  }

  return { factories };
}

const benchmarkDefinition = buildBenchmarkDefinition();
const benchmarkExpressionFactories = benchmarkDefinition.factories;

function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

async function createExpressionsInBatches(
  onProgress?: (progress: BenchmarkProgress) => void,
): Promise<IExpression[]> {
  const expressions: IExpression[] = [];
  const totalCount = benchmarkExpressionFactories.length;

  for (let index = 0; index < totalCount; index += BENCHMARK_BATCH_SIZE) {
    const batchEnd = Math.min(index + BENCHMARK_BATCH_SIZE, totalCount);
    for (let cursor = index; cursor < batchEnd; cursor += 1) {
      expressions.push(benchmarkExpressionFactories[cursor]());
    }

    onProgress?.({
      phase: 'creating',
      completedCount: batchEnd,
      totalCount,
      remainingCount: totalCount - batchEnd,
    });
    await yieldToMainThread();
  }

  return expressions;
}

function createExpressionsStrict(): IExpression[] {
  return benchmarkExpressionFactories.map((createExpression) =>
    createExpression(),
  );
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
  mode: 'responsive' | 'strict',
  onProgress?: (progress: BenchmarkProgress) => void,
): Promise<BenchmarkResult> {
  const createStart = performance.now();
  const expressions =
    mode === 'strict'
      ? createExpressionsStrict()
      : await createExpressionsInBatches(onProgress);
  const createEnd = performance.now();
  const resolvedCount = expressions.filter(
    (expression) => expression.value !== undefined,
  ).length;
  const sampleValue = expressions[0]?.value;

  const cleanupStart = performance.now();
  if (mode === 'strict') {
    disposeExpressionsStrict(expressions);
  } else {
    await disposeExpressionsInBatches(expressions);
  }
  const cleanupEnd = performance.now();

  return {
    mode,
    createMs: createEnd - createStart,
    resolveMs: 0,
    totalMs: createEnd - createStart,
    cleanupMs: cleanupEnd - cleanupStart,
    createdCount: expressions.length,
    resolvedCount,
    sampleValue,
  };
}

function renderApp(): void {
  const root = document.getElementById('app');
  if (!root) {
    return;
  }

  root.innerHTML = `
    <main style="max-width: 920px; margin: 2rem auto; font-family: sans-serif; line-height: 1.5;">
      <h1>RS-X Angular Benchmark</h1>
      <p>Runs ${benchmarkExpressionFactories.length} unique static rsx('...')(model) expressions.</p>
      <label style="display: block; margin: 0.75rem 0;">
        <input id="strict-mode" type="checkbox" />
        Strict mode (no UI yields/progress updates, cleanup measured separately)
      </label>
      <button id="run-benchmark" style="padding: 0.5rem 1rem;">Run 1000-expression benchmark</button>
      <section id="results" style="margin-top: 1rem;"></section>
    </main>
  `;

  const button = document.getElementById(
    'run-benchmark',
  ) as HTMLButtonElement | null;
  const strictModeCheckbox = document.getElementById(
    'strict-mode',
  ) as HTMLInputElement | null;
  const results = document.getElementById('results');
  if (!button || !results || !strictModeCheckbox) {
    return;
  }

  button.addEventListener('click', async () => {
    const mode: 'responsive' | 'strict' = strictModeCheckbox.checked
      ? 'strict'
      : 'responsive';
    button.disabled = true;
    strictModeCheckbox.disabled = true;
    button.textContent =
      mode === 'strict'
        ? 'Running strict benchmark...'
        : 'Running benchmark...';
    results.textContent = '';

    try {
      const result = await runBenchmark(
        mode,
        mode === 'responsive'
          ? (progress) => {
              button.textContent = `Creating expressions... ${progress.completedCount}/${progress.totalCount}`;
            }
          : undefined,
      );
      results.innerHTML = `
        <p>Mode: ${result.mode}</p>
        <p>Created expressions: ${result.createdCount}</p>
        <p>Resolved expressions (immediate snapshot): ${result.resolvedCount}</p>
        <p>Unresolved expressions (immediate snapshot): ${result.createdCount - result.resolvedCount}</p>
        <p>Create time: ${result.createMs.toFixed(2)} ms</p>
        <p>Resolve time: ${result.resolveMs.toFixed(2)} ms (not awaited)</p>
        <p>Measured total time: ${result.totalMs.toFixed(2)} ms</p>
        <p>Cleanup time (outside measured window): ${result.cleanupMs.toFixed(2)} ms</p>
        <p>Sample value (expression #0): ${String(result.sampleValue)}</p>
      `;
    } finally {
      button.disabled = false;
      strictModeCheckbox.disabled = false;
      button.textContent = 'Run 1000-expression benchmark';
    }
  });
}

async function bootstrap(): Promise<void> {
  await InjectionContainer.load(RsXExpressionParserModule);
  renderApp();
}

void bootstrap();
