'use client';

import { useState } from 'react';

import { type IExpression } from '@rs-x/expression-parser';

import { benchmarkExpressionFactories } from './generated-benchmark-expressions';
import { initRsx } from './rsx-bootstrap';

type BenchmarkResult = {
  createMs: number;
  resolveMs: number;
  totalMs: number;
  cleanupMs: number;
  createdCount: number;
  resolvedCount: number;
  sampleValue: unknown;
};

type BenchmarkProgress = {
  completedCount: number;
  totalCount: number;
};

const CREATE_BATCH_SIZE = 20;
const DISPOSE_BATCH_SIZE = 50;

function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

async function createExpressionsInBatches(
  onProgress?: (progress: BenchmarkProgress) => void,
): Promise<IExpression[]> {
  const expressions: IExpression[] = [];
  const totalCount = benchmarkExpressionFactories.length;

  for (let index = 0; index < totalCount; index += CREATE_BATCH_SIZE) {
    const batchEnd = Math.min(index + CREATE_BATCH_SIZE, totalCount);
    for (let cursor = index; cursor < batchEnd; cursor += 1) {
      expressions.push(benchmarkExpressionFactories[cursor]());
    }

    onProgress?.({
      completedCount: batchEnd,
      totalCount,
    });
    await yieldToMainThread();
  }

  return expressions;
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
  onProgress?: (progress: BenchmarkProgress) => void,
): Promise<BenchmarkResult> {
  await initRsx();

  const createStart = performance.now();
  const expressions = await createExpressionsInBatches(onProgress);
  const createEnd = performance.now();
  const resolvedCount = expressions.filter(
    (expression) => expression.value !== undefined,
  ).length;
  const cleanupStart = performance.now();
  await disposeExpressionsInBatches(expressions);
  const cleanupEnd = performance.now();

  return {
    createMs: createEnd - createStart,
    resolveMs: 0,
    totalMs: createEnd - createStart,
    cleanupMs: cleanupEnd - cleanupStart,
    createdCount: expressions.length,
    resolvedCount,
    sampleValue: expressions[0]?.value,
  };
}

export default function Page() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [progressLabel, setProgressLabel] = useState('');

  const onRun = async () => {
    setRunning(true);
    setResult(null);
    setProgressLabel('Starting benchmark...');
    try {
      setResult(
        await runBenchmark((progress) => {
          setProgressLabel(
            `Creating expressions... ${progress.completedCount}/${progress.totalCount}`,
          );
        }),
      );
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
        Runs {benchmarkExpressionFactories.length} unique static{' '}
        <code>rsx(&apos;...&apos;)(model)</code> expressions with about 60 nodes
        per expression.
      </p>
      <button
        onClick={onRun}
        disabled={running}
        style={{ padding: '0.5rem 1rem' }}
      >
        {running
          ? progressLabel || 'Running benchmark...'
          : 'Run 1000-expression benchmark'}
      </button>
      {result ? (
        <section style={{ marginTop: '1rem' }}>
          <p>Created expressions: {result.createdCount}</p>
          <p>
            Resolved expressions (immediate snapshot): {result.resolvedCount}
          </p>
          <p>Create time: {result.createMs.toFixed(2)} ms</p>
          <p>Resolve time: {result.resolveMs.toFixed(2)} ms (not awaited)</p>
          <p>Total time: {result.totalMs.toFixed(2)} ms</p>
          <p>Cleanup time: {result.cleanupMs.toFixed(2)} ms</p>
          <p>Sample value (expression #0): {String(result.sampleValue)}</p>
        </section>
      ) : null}
    </main>
  );
}
