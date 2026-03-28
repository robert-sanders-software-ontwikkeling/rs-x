import { performance } from 'node:perf_hooks';
import { InjectionContainer } from '@rs-x/core';
import { RsXExpressionParserModule, rsx } from '@rs-x/expression-parser';
import { RsXStateManagerInjectionTokens } from '@rs-x/state-manager';

function makeRowModels(n) {
  return Array.from({ length: n }, (_, i) => ({ a: i, b: i * 2 }));
}

function f(n) {
  return Number(n.toFixed(3));
}

await InjectionContainer.load(RsXExpressionParserModule);
const stateManager = InjectionContainer.get(RsXStateManagerInjectionTokens.IStateManager);

for (const count of [1000, 10000]) {
  global.gc?.();
  stateManager.clear();

  const rows = makeRowModels(count);

  const originalDefineProperty = Object.defineProperty;
  let definePropertyCalls = 0;
  let definePropertyMs = 0;

  Object.defineProperty = function patchedDefineProperty(...args) {
    const t0 = performance.now();
    const out = originalDefineProperty.apply(Object, args);
    definePropertyMs += performance.now() - t0;
    definePropertyCalls += 1;
    return out;
  };

  const t0 = performance.now();
  const expressions = rows.map((row) => rsx('a + b')(row));
  const bindMs = performance.now() - t0;

  Object.defineProperty = originalDefineProperty;

  const d0 = performance.now();
  for (const expression of expressions) expression.dispose();
  const disposeMs = performance.now() - d0;

  console.log(JSON.stringify({
    count,
    bindMs: f(bindMs),
    disposeMs: f(disposeMs),
    definePropertyCalls,
    definePropertyMs: f(definePropertyMs),
    definePropertyShareOfBindPct: f((definePropertyMs / Math.max(bindMs, 0.0001)) * 100),
  }, null, 2));

  global.gc?.();
}
