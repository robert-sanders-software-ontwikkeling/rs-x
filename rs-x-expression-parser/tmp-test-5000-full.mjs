import { performance } from 'node:perf_hooks';
import { InjectionContainer } from '@rs-x/core';
import { RsXExpressionParserInjectionTokens, RsXExpressionParserModule, rsx } from '@rs-x/expression-parser';
import { RsXStateManagerInjectionTokens } from '@rs-x/state-manager';

await InjectionContainer.load(RsXExpressionParserModule);
const stateManager = InjectionContainer.get(RsXStateManagerInjectionTokens.IStateManager);
const expressionCache = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionCache);

const MB = 1024 * 1024;
const count = 5000;

const flushMicrotasks = async (rounds = 3) => {
  for (let i = 0; i < rounds; i++) await Promise.resolve();
};

const waitForInit = async (expressions) => {
  let polls = 0;
  while (expressions.some(e => e.value === undefined)) {
    await Promise.resolve();
    if (++polls >= 2000) throw new Error('Timeout: ' + expressions.filter(e => e.value === undefined).length + ' uninit');
  }
};

const resetRuntimeState = async () => {
  stateManager.clear();
  expressionCache.dispose();
  await flushMicrotasks();
  if (typeof global.gc === 'function') global.gc();
};

const rowModels = Array.from({ length: count }, (_, i) => ({ a: i, b: i * 2 }));
const makeUniqueExpressions = (count) => Array.from({ length: count }, (_, i) => `x${i} + y${i}`);
const makeWideModel = (count) => {
  const model = {};
  for (let i = 0; i < count; i++) { model[`x${i}`] = i; model[`y${i}`] = i * 2; }
  return model;
};
const uniqueExpressions = makeUniqueExpressions(count);
const wideModel = makeWideModel(count);

console.log(`=== N=${count} binding scale test ===`);

// bindUnique (1 warmup + 2 runs)
await resetRuntimeState();
for (let run = 0; run < 3; run++) {
  if (typeof global.gc === 'function') global.gc();
  const mem = process.memoryUsage().heapUsed;
  const t = performance.now();
  const expressions = [];
  for (let i = 0; i < uniqueExpressions.length; i++) expressions.push(rsx(uniqueExpressions[i])(wideModel));
  for (const e of expressions) e.dispose();
  const elapsed = performance.now() - t;
  const memDelta = (process.memoryUsage().heapUsed - mem) / MB;
  console.log(`bindUnique run ${run}: ${elapsed.toFixed(1)}ms, heap delta: ${memDelta.toFixed(1)}MB`);
}

await resetRuntimeState();

// bindUnique+initialized (1 warmup + 2 runs)
for (let run = 0; run < 3; run++) {
  if (typeof global.gc === 'function') global.gc();
  const mem = process.memoryUsage().heapUsed;
  const t = performance.now();
  const expressions = [];
  for (let i = 0; i < uniqueExpressions.length; i++) expressions.push(rsx(uniqueExpressions[i])(wideModel));
  await waitForInit(expressions);
  for (const e of expressions) e.dispose();
  const elapsed = performance.now() - t;
  const memDelta = (process.memoryUsage().heapUsed - mem) / MB;
  console.log(`bindUniqueInit run ${run}: ${elapsed.toFixed(1)}ms, heap delta: ${memDelta.toFixed(1)}MB`);
}

await resetRuntimeState();

// bindSame + updates
const updateExpressions = rowModels.map(row => rsx('a + b')(row));
console.log('Created update expressions, heap:', Math.round(process.memoryUsage().heapUsed / MB), 'MB');

// single update (2 warmup + 5 runs)
for (let run = 0; run < 7; run++) {
  if (typeof global.gc === 'function') global.gc();
  const t = performance.now();
  const idx = Math.floor(count / 2);
  rowModels[idx].a += 1;
  await flushMicrotasks();
  const elapsed = performance.now() - t;
  if (run >= 2) console.log(`updateSingle run ${run-2}: ${elapsed.toFixed(3)}ms`);
}

// bulk update (2 warmup + 4 runs)
for (let run = 0; run < 6; run++) {
  if (typeof global.gc === 'function') global.gc();
  const memBefore = process.memoryUsage().heapUsed;
  const t = performance.now();
  for (let i = 0; i < rowModels.length; i++) rowModels[i].a += 1;
  await flushMicrotasks();
  const elapsed = performance.now() - t;
  const memDelta = (process.memoryUsage().heapUsed - memBefore) / MB;
  if (run >= 2) console.log(`updateBulk run ${run-2}: ${elapsed.toFixed(3)}ms, heap delta: ${memDelta.toFixed(1)}MB`);
}

for (const e of updateExpressions) e.dispose();
await resetRuntimeState();
console.log('Final heap:', Math.round(process.memoryUsage().heapUsed / MB), 'MB');
console.log('Done!');
