import { performance } from 'node:perf_hooks';
import { InjectionContainer } from '@rs-x/core';
import { RsXExpressionParserModule, rsx } from '@rs-x/expression-parser';

await InjectionContainer.load(RsXExpressionParserModule);

const N = 5000;
const models = Array.from({ length: N }, (_, i) => ({ [`field${i}`]: i }));
const exprs = Array.from({ length: N }, (_, i) => `field${i}`);

// Warm up parse cache
exprs.forEach(e => rsx(e));

// 1. Clone only (rsx() with warm cache — no model binding)
{
  const t0 = performance.now();
  for (let i = 0; i < N; i++) rsx(exprs[i]);
  console.log(`clone only (${N}): ${(performance.now()-t0).toFixed(2)}ms = ${((performance.now()-t0)/N*1000).toFixed(2)}µs/binding`);
}

// Reset time measurement
let t0, t1, t2;

// 2. Full bind: rsx(expr)(model) — measures clone + attach + defineProperty + subscriptions
t0 = performance.now();
const bindings = models.map((m, i) => rsx(exprs[i])(m));
t1 = performance.now();
bindings.forEach(b => b.dispose());
t2 = performance.now();
console.log(`full bind (${N}): ${(t1-t0).toFixed(2)}ms = ${((t1-t0)/N*1000).toFixed(2)}µs/binding`);
console.log(`dispose (${N}): ${(t2-t1).toFixed(2)}ms`);

// 3. How much is defineProperty? Measure raw defineProperty cost
{
  const objs = Array.from({ length: N }, (_, i) => ({ [`f${i}`]: i }));
  const t0 = performance.now();
  for (let i = 0; i < N; i++) {
    const obj = objs[i];
    const key = `f${i}`;
    const val = obj[key];
    Object.defineProperty(obj, key, { get: () => val, set: () => {}, configurable: true, enumerable: true });
  }
  console.log(`raw defineProperty (${N}): ${(performance.now()-t0).toFixed(2)}ms`);
}
