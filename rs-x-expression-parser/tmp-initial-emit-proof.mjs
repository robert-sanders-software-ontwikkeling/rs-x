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

for (const count of [1000, 3000, 5000, 10000]) {
  const run = (disableInitialEmit) => {
    global.gc?.();
    stateManager.clear();

    let emitted = 0;
    const emitOriginal = stateManager.emitChange.bind(stateManager);
    const setInitialValueOriginal = stateManager.setInitialValue.bind(stateManager);

    if (disableInitialEmit) {
      stateManager.setInitialValue = function patchedSetInitialValue(
        context,
        index,
        initialValue,
        transferedValue,
        watched,
        ownerId,
      ) {
        const existingStateForContext = this._objectStateManager.getFromId(context);
        const existingStateForIndex = existingStateForContext?.getFromId(index);
        this.updateState(
          context,
          transferedValue?.context ?? context,
          index,
          initialValue,
          watched,
          ownerId,
        );
        // intentionally skip emitChange for proof run
        return existingStateForIndex?.value;
      };
    } else {
      stateManager.emitChange = (...args) => {
        emitted += 1;
        return emitOriginal(...args);
      };
    }

    const rows = makeRowModels(count);
    const t0 = performance.now();
    const expressions = rows.map((row) => rsx('a + b')(row));
    const bindMs = performance.now() - t0;

    const d0 = performance.now();
    for (const expression of expressions) expression.dispose();
    const disposeMs = performance.now() - d0;

    // restore
    stateManager.emitChange = emitOriginal;
    stateManager.setInitialValue = setInitialValueOriginal;

    return { bindMs: f(bindMs), disposeMs: f(disposeMs), emitted };
  };

  const baseline = run(false);
  const noInitEmit = run(true);

  console.log(JSON.stringify({
    count,
    baseline,
    noInitEmit,
    speedupNoInitEmit: f(baseline.bindMs / Math.max(noInitEmit.bindMs, 0.0001)),
  }, null, 2));
}
