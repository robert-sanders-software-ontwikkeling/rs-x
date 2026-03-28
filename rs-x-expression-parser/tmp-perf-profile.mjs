import { performance } from 'node:perf_hooks';
import { InjectionContainer } from '@rs-x/core';
import { RsXExpressionParserModule, rsx } from '@rs-x/expression-parser';

await InjectionContainer.load(RsXExpressionParserModule);

const N = 5000;
const models = Array.from({ length: N }, (_, i) => ({ [`f${i}`]: i }));
const exprs  = Array.from({ length: N }, (_, i) => `f${i}`);

// Warm up so JIT is hot
exprs.forEach(e => rsx(e));
{ const b = models.map((m,i) => rsx(exprs[i])(m)); b.forEach(x=>x.dispose()); }
if (typeof global.gc === 'function') global.gc();

// Profile this section
const t0 = performance.now();
const bindings = models.map((m,i) => rsx(exprs[i])(m));
console.log(`bind: ${(performance.now()-t0).toFixed(2)}ms`);
