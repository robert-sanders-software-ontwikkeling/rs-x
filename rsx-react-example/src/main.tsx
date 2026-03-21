import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { initRsx } from './rsx-bootstrap';
import { type IExpression } from '@rs-x/expression-parser';
import { benchmarkExpressionFactories } from './expressions/generated-benchmark-expressions';

type BenchmarkResult = {
  createMs: number;
  resolveMs: number;
  totalMs: number;
  createdCount: number;
  resolvedCount: number;
  sampleValue: unknown;
};

function waitForAllResolved(expressions: readonly IExpression[]): Promise<void> {
  if (expressions.every((expression) => expression.value !== undefined)) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const subscriptions = expressions.map((expression) =>
      expression.changed.subscribe(() => {
        if (expressions.every((item) => item.value !== undefined)) {
          subscriptions.forEach((subscription) => subscription.unsubscribe());
          resolve();
        }
      }),
    );
  });
}

async function runBenchmark(): Promise<BenchmarkResult> {
  const createStart = performance.now();
  const expressions: IExpression[] = benchmarkExpressionFactories.map((createExpression) => createExpression());

  const createEnd = performance.now();
  const resolveStart = performance.now();
  await waitForAllResolved(expressions);
  const resolveEnd = performance.now();
  const resolvedCount = expressions.filter((expression) => expression.value !== undefined).length;

  return {
    createMs: createEnd - createStart,
    resolveMs: resolveEnd - resolveStart,
    totalMs: resolveEnd - createStart,
    createdCount: expressions.length,
    resolvedCount,
    sampleValue: expressions[0]?.value,
  };
}

function App() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const expressionCount = useMemo(() => benchmarkExpressionFactories.length, []);

  const onRun = async () => {
    setRunning(true);
    setResult(null);
    try {
      const nextResult = await runBenchmark();
      setResult(nextResult);
    } finally {
      setRunning(false);
    }
  };

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 920, margin: '2rem auto', lineHeight: 1.5 }}>
      <h1>RS-X React Benchmark</h1>
      <p>
        This benchmark creates <strong>{expressionCount} unique</strong> expressions with about{' '}
        <strong>60 nodes</strong> each using static <code>rsx(&apos;...&apos;)(model)</code> call sites, then
        measures creation + resolution time.
      </p>
      <button onClick={onRun} disabled={running} style={{ padding: '0.5rem 1rem' }}>
        {running ? 'Running benchmark...' : 'Run 1000-expression benchmark'}
      </button>
      {result ? (
        <section style={{ marginTop: '1.25rem' }}>
          <h2>Results</h2>
          <p>Created expressions: {result.createdCount}</p>
          <p>Resolved expressions: {result.resolvedCount}</p>
          <p>Create time: {result.createMs.toFixed(2)} ms</p>
          <p>Resolve time: {result.resolveMs.toFixed(2)} ms</p>
          <p>Total time: {result.totalMs.toFixed(2)} ms</p>
          <p>Sample value (expression #0): {String(result.sampleValue)}</p>
        </section>
      ) : null}
    </main>
  );
}

async function start() {
  await initRsx();
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void start();
