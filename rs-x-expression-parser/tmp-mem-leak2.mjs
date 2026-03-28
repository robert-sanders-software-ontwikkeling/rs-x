import { InjectionContainer } from '@rs-x/core';
import { RsXExpressionParserInjectionTokens, RsXExpressionParserModule, rsx } from '@rs-x/expression-parser';
import { RsXStateManagerInjectionTokens } from '@rs-x/state-manager';

await InjectionContainer.load(RsXExpressionParserModule);
const stateManager = InjectionContainer.get(RsXStateManagerInjectionTokens.IStateManager);
const expressionCache = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionCache);

const MB = 1024 * 1024;
const N = 3000;
const makeUniqueExpressions = (count) => Array.from({ length: count }, (_, i) => `x${i} + y${i}`);
const makeWideModel = (count) => {
  const model = {};
  for (let i = 0; i < count; i++) { model[`x${i}`] = i; model[`y${i}`] = i * 2; }
  return model;
};
const uniqueExpressions = makeUniqueExpressions(N);

const flushMicrotasks = async () => { for (let i = 0; i < 3; i++) await Promise.resolve(); };
const gc = () => { if (typeof global.gc === 'function') global.gc(); };

gc();
const initial = process.memoryUsage().heapUsed;
console.log(`Initial heap: ${(initial/MB).toFixed(1)}MB`);
console.log('Testing with fresh model each run:');

for (let run = 0; run < 6; run++) {
  gc();
  const before = process.memoryUsage().heapUsed;
  
  const wideModel = makeWideModel(N); // FRESH model each run
  const expressions = [];
  for (let i = 0; i < uniqueExpressions.length; i++) expressions.push(rsx(uniqueExpressions[i])(wideModel));
  for (const e of expressions) e.dispose();
  
  stateManager.clear();
  expressionCache.dispose();
  await flushMicrotasks();
  gc();
  
  const after = process.memoryUsage().heapUsed;
  console.log(`Run ${run}: heap retained from initial = ${Math.round((after-initial)/MB)}MB`);
}

console.log('\nTesting with shared model (original benchmark behavior):');
gc();
const initial2 = process.memoryUsage().heapUsed;
const sharedModel = makeWideModel(N);
for (let run = 0; run < 6; run++) {
  gc();
  const expressions = [];
  for (let i = 0; i < uniqueExpressions.length; i++) expressions.push(rsx(uniqueExpressions[i])(sharedModel));
  for (const e of expressions) e.dispose();
  stateManager.clear();
  expressionCache.dispose();
  await flushMicrotasks();
  gc();
  const after = process.memoryUsage().heapUsed;
  console.log(`Run ${run}: heap retained from initial2 = ${Math.round((after-initial2)/MB)}MB`);
}
