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

const stateManager = InjectionContainer.get(
  RsXStateManagerInjectionTokens.IStateManager,
);

const sizes = [1000, 3000, 5000, 7000, 10000];
const results = [];

for (const count of sizes) {
  global.gc?.();
  stateManager.clear();

  const timings = {
    tryToSubscribeMs: 0,
    tryToSubscribeCalls: 0,

    scmCreateMs: 0,
    scmCreateCalls: 0,

    ctxMgrCreateMs: 0,
    ctxMgrCreateCalls: 0,

    objectObserverManagerCreateMs: 0,
    objectObserverManagerCreateCalls: 0,

    objectObserverCreateMs: 0,
    objectObserverCreateCalls: 0,
  };

  const wrappedContextManagers = new WeakSet();
  const wrappedObjectManagers = new WeakSet();

  const scm = stateManager._stateChangeSubscriptionManager;
  const scmCreateOriginal = scm.create.bind(scm);
  scm.create = (...args) => {
    const t0 = performance.now();
    const out = scmCreateOriginal(...args);
    timings.scmCreateMs += performance.now() - t0;
    timings.scmCreateCalls += 1;

    const ctxMgr = out?.instance;
    if (ctxMgr && !wrappedContextManagers.has(ctxMgr)) {
      wrappedContextManagers.add(ctxMgr);
      const ctxMgrCreateOriginal = ctxMgr.create.bind(ctxMgr);
      ctxMgr.create = (...ctxArgs) => {
        const c0 = performance.now();
        const createdObserver = ctxMgrCreateOriginal(...ctxArgs);
        timings.ctxMgrCreateMs += performance.now() - c0;
        timings.ctxMgrCreateCalls += 1;

        const objectObserverManager = ctxMgr._objectObserverManager;
        if (objectObserverManager && !wrappedObjectManagers.has(objectObserverManager)) {
          wrappedObjectManagers.add(objectObserverManager);
          const omCreateOriginal = objectObserverManager.create.bind(objectObserverManager);
          objectObserverManager.create = (...omArgs) => {
            const o0 = performance.now();
            const omOut = omCreateOriginal(...omArgs);
            timings.objectObserverManagerCreateMs += performance.now() - o0;
            timings.objectObserverManagerCreateCalls += 1;

            const objMgr = omOut?.instance;
            if (objMgr && !objMgr.__wrappedCreate) {
              objMgr.__wrappedCreate = true;
              const objCreateOriginal = objMgr.create.bind(objMgr);
              objMgr.create = (...objArgs) => {
                const oc0 = performance.now();
                const objCreated = objCreateOriginal(...objArgs);
                timings.objectObserverCreateMs += performance.now() - oc0;
                timings.objectObserverCreateCalls += 1;
                return objCreated;
              };
            }

            return omOut;
          };
        }

        return createdObserver;
      };
    }

    return out;
  };

  const tryToSubscribeOriginal = stateManager.tryToSubscribeToChange.bind(stateManager);
  stateManager.tryToSubscribeToChange = (...args) => {
    const t0 = performance.now();
    const out = tryToSubscribeOriginal(...args);
    timings.tryToSubscribeMs += performance.now() - t0;
    timings.tryToSubscribeCalls += 1;
    return out;
  };

  const rows = makeRowModels(count);
  const bindStart = performance.now();
  const expressions = [];
  for (let i = 0; i < rows.length; i += 1) {
    expressions.push(rsx('a + b')(rows[i]));
  }
  const bindMs = performance.now() - bindStart;

  const disposeStart = performance.now();
  for (const expression of expressions) {
    expression.dispose();
  }
  const disposeMs = performance.now() - disposeStart;

  stateManager.tryToSubscribeToChange = tryToSubscribeOriginal;
  scm.create = scmCreateOriginal;

  global.gc?.();

  results.push({
    count,
    bindMs: f(bindMs),
    disposeMs: f(disposeMs),
    tryToSubscribeMs: f(timings.tryToSubscribeMs),
    scmCreateMs: f(timings.scmCreateMs),
    ctxMgrCreateMs: f(timings.ctxMgrCreateMs),
    objectObserverManagerCreateMs: f(timings.objectObserverManagerCreateMs),
    objectObserverCreateMs: f(timings.objectObserverCreateMs),
    tryToSubscribeCalls: timings.tryToSubscribeCalls,
    ctxMgrCreateCalls: timings.ctxMgrCreateCalls,
    objectObserverCreateCalls: timings.objectObserverCreateCalls,
  });

  console.log('done', count);
}

console.table(results);
console.log(JSON.stringify(results, null, 2));
