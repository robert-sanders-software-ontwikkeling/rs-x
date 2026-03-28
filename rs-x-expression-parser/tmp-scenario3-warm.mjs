import { performance } from 'node:perf_hooks';
import { InjectionContainer } from '@rs-x/core';
import { RsXExpressionParserModule, generatedBenchmarkExpressionStrings, rsx, RsXExpressionParserInjectionTokens } from '@rs-x/expression-parser';
import { RsXStateManagerInjectionTokens } from '@rs-x/state-manager';
import { signal, computed, createEnvironmentInjector, provideZonelessChangeDetection } from '@angular/core';

await InjectionContainer.load(RsXExpressionParserModule);
const expressionCache = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionCache);
const stateManager = InjectionContainer.get(RsXStateManagerInjectionTokens.IStateManager);
const angularInjector = createEnvironmentInjector([provideZonelessChangeDetection()], null, 'bench');

const compiledExprFns = generatedBenchmarkExpressionStrings.map(e => new Function('x', 'y', `return ${e}`));

const flushMicrotasks = async (n = 3) => { for (let i = 0; i < n; i++) await Promise.resolve(); };
const gcFlush = async () => { for (let i = 0; i < 4; i++) { if (typeof global.gc === 'function') global.gc(); await flushMicrotasks(4); } };
const rsxReset = async () => { stateManager.clear(); expressionCache.dispose(); await gcFlush(); };

const measureMs = async (runs, warmup, fn) => {
  for (let i = 0; i < warmup; i++) await fn();
  const samples = [];
  for (let i = 0; i < runs; i++) {
    if (typeof global.gc === 'function') global.gc();
    const t0 = performance.now();
    await fn();
    samples.push(performance.now() - t0);
  }
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

await rsxReset();

const rsxBindMs = await measureMs(3, 4, async () => {
  const model = { x: 1, y: 2 };
  const bindings = generatedBenchmarkExpressionStrings.map(expr => rsx(expr)(model));
  await flushMicrotasks(8);
  for (const b of bindings) b.dispose();
});
console.log('RSX bind (4 warmup):', rsxBindMs.toFixed(2), 'ms');

await rsxReset();

const rsxModel = { x: 1, y: 2 };
const rsxBindings = generatedBenchmarkExpressionStrings.map(expr => rsx(expr)(rsxModel));
await flushMicrotasks(8);

const rsxSingleMs = await measureMs(7, 2, async () => { rsxModel.x += 1; await flushMicrotasks(5); });
const rsxBulkMs = await measureMs(3, 1, async () => {
  for (let r = 0; r < 10; r++) { rsxModel.x += 1; await flushMicrotasks(5); }
});
console.log('RSX single update (warm):', rsxSingleMs.toFixed(3), 'ms');
console.log('RSX bulk 10x (warm):', rsxBulkMs.toFixed(2), 'ms');
for (const b of rsxBindings) b.dispose();
await rsxReset();

await gcFlush();
const angularBindMs = await measureMs(3, 2, async () => {
  const xSig = signal(1); const ySig = signal(2);
  const cs = generatedBenchmarkExpressionStrings.map((_, i) => {
    const c = computed(() => compiledExprFns[i](xSig(), ySig())); c(); return c;
  });
  cs.length;
});
console.log('Angular bind (2 warmup):', angularBindMs.toFixed(3), 'ms');

await gcFlush();
const xSig = signal(1); const ySig = signal(2);
const angularCs = generatedBenchmarkExpressionStrings.map((_, i) => {
  const c = computed(() => compiledExprFns[i](xSig(), ySig())); c(); return c;
});
const angularSingleMs = await measureMs(7, 2, async () => { xSig.update(v => v+1); for (const c of angularCs) c(); });
const angularBulkMs = await measureMs(3, 1, async () => {
  for (let r = 0; r < 10; r++) { xSig.update(v => v+1); for (const c of angularCs) c(); }
});
console.log('Angular single update (warm):', angularSingleMs.toFixed(3), 'ms');
console.log('Angular bulk 10x (warm):', angularBulkMs.toFixed(2), 'ms');
angularInjector.destroy();
