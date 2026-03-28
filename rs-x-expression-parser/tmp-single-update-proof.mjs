/**
 * Proof script: is single update O(1)?
 *
 * Hypothesis A (JIT warmup): the 1k value in the benchmark is high because
 * the JIT hasn't compiled the update path yet. More warmup should bring it
 * to the same level as 3k+.
 *
 * Hypothesis B (timer floor): 0.002ms values are near performance.now()
 * resolution. Measuring many iterations and dividing should reveal the real cost.
 *
 * Hypothesis C (truly O(1)): single update time is independent of total
 * active binding count.
 */

import { performance } from 'node:perf_hooks';
import { InjectionContainer } from '@rs-x/core';
import {
  RsXExpressionParserInjectionTokens,
  RsXExpressionParserModule,
  rsx,
} from '@rs-x/expression-parser';
import { RsXStateManagerInjectionTokens } from '@rs-x/state-manager';

const flushMicrotasks = async (rounds = 3) => {
  for (let i = 0; i < rounds; i++) await Promise.resolve();
};

await InjectionContainer.load(RsXExpressionParserModule);
const stateManager = InjectionContainer.get(RsXStateManagerInjectionTokens.IStateManager);

const gcFlush = async () => {
  for (let i = 0; i < 5; i++) {
    if (typeof global.gc === 'function') global.gc();
    await flushMicrotasks(4);
  }
};

// ─── Test 1: does warmup level affect 1k single update? ─────────────────────
console.log('\n=== Test 1: JIT warmup effect at 1k bindings ===');
console.log('Measuring single update at 1k with 0, 5, 20, 50 warmup rounds');

for (const warmupRounds of [0, 5, 20, 50]) {
  stateManager.clear();
  await gcFlush();

  const count = 1000;
  const models = Array.from({ length: count }, (_, i) => ({ a: i, b: i * 2 }));
  const bindings = models.map((m) => rsx('a + b')(m));
  await flushMicrotasks(5);

  // Warmup
  for (let w = 0; w < warmupRounds; w++) {
    models[500].a += 1;
    await flushMicrotasks();
  }

  // Measure 30 runs
  const samples = [];
  for (let r = 0; r < 30; r++) {
    models[500].a += 1;
    const start = performance.now();
    await flushMicrotasks();
    const end = performance.now();
    samples.push(end - start);
  }
  samples.sort((a, b) => a - b);
  const median = samples[Math.floor(samples.length / 2)];
  const p5 = samples[Math.floor(samples.length * 0.05)];
  const p95 = samples[Math.floor(samples.length * 0.95)];

  console.log(`  warmup=${warmupRounds.toString().padStart(2)}: median=${median.toFixed(4)}ms  p5=${p5.toFixed(4)}ms  p95=${p95.toFixed(4)}ms`);

  bindings.forEach((b) => b.dispose());
  stateManager.clear();
  await gcFlush();
}

// ─── Test 2: timer resolution — measure N single updates in one block ────────
console.log('\n=== Test 2: Timer resolution ===');
console.log('Measuring 1000 consecutive single updates in one block at 1k and 10k bindings');

for (const count of [1000, 10000]) {
  stateManager.clear();
  await gcFlush();

  const models = Array.from({ length: count }, (_, i) => ({ a: i, b: i * 2 }));
  const bindings = models.map((m) => rsx('a + b')(m));
  await flushMicrotasks(5);

  // Warmup 20 rounds
  for (let w = 0; w < 20; w++) {
    models[Math.floor(count / 2)].a += 1;
    await flushMicrotasks();
  }

  // Time N=1000 single updates in one block
  const N = 1000;
  const start = performance.now();
  for (let i = 0; i < N; i++) {
    models[Math.floor(count / 2)].a += 1;
    await flushMicrotasks();
  }
  const end = performance.now();
  const totalMs = end - start;
  const perUpdateMs = totalMs / N;

  console.log(`  ${count.toLocaleString()} bindings: ${N} updates total=${totalMs.toFixed(2)}ms  per-update=${perUpdateMs.toFixed(4)}ms`);

  bindings.forEach((b) => b.dispose());
  stateManager.clear();
  await gcFlush();
}

// ─── Test 3: single update across binding counts (same warmup for all) ───────
console.log('\n=== Test 3: O(1) check — single update vs binding count (uniform warmup) ===');
console.log('Each size gets 30 warmup rounds then 50 measured runs');

for (const count of [100, 500, 1000, 3000, 5000, 10000]) {
  stateManager.clear();
  await gcFlush();

  const models = Array.from({ length: count }, (_, i) => ({ a: i, b: i * 2 }));
  const bindings = models.map((m) => rsx('a + b')(m));
  await flushMicrotasks(5);

  // Uniform warmup
  for (let w = 0; w < 30; w++) {
    models[Math.floor(count / 2)].a += 1;
    await flushMicrotasks();
  }

  // Measure
  const samples = [];
  for (let r = 0; r < 50; r++) {
    models[Math.floor(count / 2)].a += 1;
    const start = performance.now();
    await flushMicrotasks();
    const end = performance.now();
    samples.push(end - start);
  }
  samples.sort((a, b) => a - b);
  const median = samples[Math.floor(samples.length / 2)];
  const p5 = samples[Math.floor(samples.length * 0.05)];
  const p95 = samples[Math.floor(samples.length * 0.95)];

  console.log(`  ${count.toString().padStart(6)} bindings: median=${median.toFixed(4)}ms  p5=${p5.toFixed(4)}ms  p95=${p95.toFixed(4)}ms`);

  bindings.forEach((b) => b.dispose());
  stateManager.clear();
  await gcFlush();
}
