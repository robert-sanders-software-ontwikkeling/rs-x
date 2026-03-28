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
const wideModel = makeWideModel(N);

const flushMicrotasks = async () => { for (let i = 0; i < 3; i++) await Promise.resolve(); };

const gc = () => { if (typeof global.gc === 'function') global.gc(); };

const baseline = () => {
  gc();
  return process.memoryUsage().heapUsed;
};

gc();
const initial = process.memoryUsage().heapUsed;
console.log(`Initial heap: ${(initial/MB).toFixed(1)}MB`);

for (let run = 0; run < 10; run++) {
  gc();
  const before = process.memoryUsage().heapUsed;
  
  const expressions = [];
  for (let i = 0; i < uniqueExpressions.length; i++) expressions.push(rsx(uniqueExpressions[i])(wideModel));
  for (const e of expressions) e.dispose();
  
  stateManager.clear();
  expressionCache.dispose();
  await flushMicrotasks();
  gc();
  
  const after = process.memoryUsage().heapUsed;
  console.log(`Run ${run}: before=${Math.round(before/MB)}MB, after=${Math.round(after/MB)}MB, leak=${Math.round((after-initial)/MB)}MB retained`);
}
