import { performance } from 'node:perf_hooks';
import { InjectionContainer } from '@rs-x/core';
import { RsXExpressionParserModule, rsx, RsXExpressionParserInjectionTokens } from '@rs-x/expression-parser';
import { RsXStateManagerInjectionTokens } from '@rs-x/state-manager';

await InjectionContainer.load(RsXExpressionParserModule);

const N = 2000;
const models = Array.from({ length: N }, (_, i) => ({ [`f${i}`]: i }));
const exprs = Array.from({ length: N }, (_, i) => `f${i}`);

// Warm up
exprs.forEach(e => rsx(e));
{ const b = models.map((m,i) => rsx(exprs[i])(m)); b.forEach(x=>x.dispose()); }

// Step 1: clone only
let t = performance.now();
for (let i = 0; i < N; i++) rsx(exprs[i]);
console.log(`1. clone: ${(performance.now()-t).toFixed(2)}ms`);

// Step 2: bind but no watch (just attach expression to model without starting watcher)
// Can't isolate easily, so measure full bind vs dispose separately
t = performance.now();
const bindings = models.map((m,i) => rsx(exprs[i])(m));
const bindMs = performance.now()-t;
t = performance.now();
bindings.forEach(b => b.dispose());
const disposeMs = performance.now()-t;
console.log(`2. bind: ${bindMs.toFixed(2)}ms (${(bindMs/N*1000).toFixed(2)}µs/binding)  dispose: ${disposeMs.toFixed(2)}ms`);

// Step 3: how much is just creating new objects (baseline allocation cost)
t = performance.now();
const objs = Array.from({ length: N }, () => ({ changed: null, dispose: null }));
console.log(`3. baseline object alloc: ${(performance.now()-t).toFixed(2)}ms`);

// Step 4: how much is Map operations (rough overhead of factory layers)
t = performance.now();
const map = new Map();
for (let i = 0; i < N; i++) { map.set(i, i); map.get(i); map.delete(i); }
console.log(`4. ${N} Map set+get+delete: ${(performance.now()-t).toFixed(2)}ms`);

// Step 5: how much is defineProperty
t = performance.now();
for (let i = 0; i < N; i++) {
  let v = i;
  Object.defineProperty(models[i], `g${i}`, { get:()=>v, set:(x)=>{v=x}, configurable:true, enumerable:true });
}
console.log(`5. defineProperty: ${(performance.now()-t).toFixed(2)}ms`);
