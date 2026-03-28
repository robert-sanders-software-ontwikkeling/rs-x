import { performance } from 'node:perf_hooks';
import { InjectionContainer } from '@rs-x/core';
import { RsXExpressionParserModule, generatedBenchmarkExpressionStrings, rsx, RsXExpressionParserInjectionTokens } from '@rs-x/expression-parser';
import { RsXStateManagerInjectionTokens } from '@rs-x/state-manager';

await InjectionContainer.load(RsXExpressionParserModule);
const expressionCache = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionCache);
const stateManager = InjectionContainer.get(RsXStateManagerInjectionTokens.IStateManager);

const flushMicrotasks = async (n = 3) => { for (let i = 0; i < n; i++) await Promise.resolve(); };
const gcFlush = async () => { for (let i = 0; i < 4; i++) { if (typeof global.gc === 'function') global.gc(); await flushMicrotasks(4); } };

// Run multiple times to see JIT effect across runs
for (let run = 0; run < 5; run++) {
  stateManager.clear(); expressionCache.dispose();
  await gcFlush();

  const model = { x: 1, y: 2 };

  const t0 = performance.now();
  const bindings = generatedBenchmarkExpressionStrings.map(expr => rsx(expr)(model));
  const t1 = performance.now();
  await flushMicrotasks(8);
  const t2 = performance.now();
  for (const b of bindings) b.dispose();
  const t3 = performance.now();

  console.log(`run ${run}: rsx()= ${(t1-t0).toFixed(0)}ms  flush= ${(t2-t1).toFixed(0)}ms  dispose= ${(t3-t2).toFixed(0)}ms  total= ${(t3-t0).toFixed(0)}ms`);
}

// Now test with cache already warm (no rsxReset between)
console.log('\n--- same model, cache preserved between runs ---');
stateManager.clear(); expressionCache.dispose(); await gcFlush();
// seed the cache
const seedModel = { x: 1, y: 2 };
const seedBindings = generatedBenchmarkExpressionStrings.map(expr => rsx(expr)(seedModel));
await flushMicrotasks(8);
// DON'T dispose - keep cache alive
// now measure clone-only bind
for (let run = 0; run < 3; run++) {
  if (typeof global.gc === 'function') global.gc();
  const model = { x: 1, y: 2 };
  const t0 = performance.now();
  const bindings = generatedBenchmarkExpressionStrings.map(expr => rsx(expr)(model));
  const t1 = performance.now();
  await flushMicrotasks(8);
  const t2 = performance.now();
  for (const b of bindings) b.dispose();
  const t3 = performance.now();
  console.log(`cache-warm run ${run}: rsx()= ${(t1-t0).toFixed(0)}ms  flush= ${(t2-t1).toFixed(0)}ms  dispose= ${(t3-t2).toFixed(0)}ms  total= ${(t3-t0).toFixed(0)}ms`);
}
for (const b of seedBindings) b.dispose();
