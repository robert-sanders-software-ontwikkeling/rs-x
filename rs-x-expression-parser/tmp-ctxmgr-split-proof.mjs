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

const count = 10000;
global.gc?.();
stateManager.clear();

const timings = {
  trySubMs: 0,
  trySubCalls: 0,
  ctxCreateMs: 0,
  ctxCreateCalls: 0,
  createObserverMs: 0,
  createObserverCalls: 0,
  onInstanceCreatedMs: 0,
  onInstanceCreatedCalls: 0,
};

const wrappedPrototypes = new WeakSet();
const scm = stateManager._stateChangeSubscriptionManager;
const scmCreateOriginal = scm.create.bind(scm);
scm.create = (...args) => {
  const out = scmCreateOriginal(...args);
  const ctxMgr = out?.instance;
  if (ctxMgr) {
    const proto = Object.getPrototypeOf(ctxMgr);
    if (proto && !wrappedPrototypes.has(proto)) {
      wrappedPrototypes.add(proto);

      const createOriginal = proto.create;
      proto.create = function patchedCreate(...createArgs) {
        const t0 = performance.now();
        const res = createOriginal.apply(this, createArgs);
        timings.ctxCreateMs += performance.now() - t0;
        timings.ctxCreateCalls += 1;
        return res;
      };

      const createObserverOriginal = proto.createObserver;
      proto.createObserver = function patchedCreateObserver(...obsArgs) {
        const t0 = performance.now();
        const res = createObserverOriginal.apply(this, obsArgs);
        timings.createObserverMs += performance.now() - t0;
        timings.createObserverCalls += 1;
        return res;
      };

      const onInstanceCreatedOriginal = proto.onInstanceCreated;
      proto.onInstanceCreated = function patchedOnInstanceCreated(...initArgs) {
        const t0 = performance.now();
        const res = onInstanceCreatedOriginal.apply(this, initArgs);
        timings.onInstanceCreatedMs += performance.now() - t0;
        timings.onInstanceCreatedCalls += 1;
        return res;
      };
    }
  }
  return out;
};

const trySubOriginal = stateManager.tryToSubscribeToChange.bind(stateManager);
stateManager.tryToSubscribeToChange = (...args) => {
  const t0 = performance.now();
  const out = trySubOriginal(...args);
  timings.trySubMs += performance.now() - t0;
  timings.trySubCalls += 1;
  return out;
};

const rows = makeRowModels(count);
const t0 = performance.now();
const expressions = rows.map((row) => rsx('a + b')(row));
const bindMs = performance.now() - t0;

const d0 = performance.now();
for (const expression of expressions) expression.dispose();
const disposeMs = performance.now() - d0;

console.log(JSON.stringify({
  count,
  bindMs: f(bindMs),
  disposeMs: f(disposeMs),
  trySubMs: f(timings.trySubMs),
  trySubCalls: timings.trySubCalls,
  ctxCreateMs: f(timings.ctxCreateMs),
  ctxCreateCalls: timings.ctxCreateCalls,
  createObserverMs: f(timings.createObserverMs),
  createObserverCalls: timings.createObserverCalls,
  onInstanceCreatedMs: f(timings.onInstanceCreatedMs),
  onInstanceCreatedCalls: timings.onInstanceCreatedCalls,
  ctxCreateMinusSubstepsMs: f(timings.ctxCreateMs - timings.createObserverMs - timings.onInstanceCreatedMs),
  createObserverSharePct: f((timings.createObserverMs / Math.max(timings.ctxCreateMs, 0.0001)) * 100),
  onInstanceCreatedSharePct: f((timings.onInstanceCreatedMs / Math.max(timings.ctxCreateMs, 0.0001)) * 100),
}, null, 2));
