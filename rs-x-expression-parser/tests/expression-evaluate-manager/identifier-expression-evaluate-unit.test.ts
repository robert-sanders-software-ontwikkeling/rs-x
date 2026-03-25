import type { IIndexWatchRule, IStateManager } from '@rs-x/state-manager';

import { IdentifierExpressionEvaluateUnit } from '../../lib/expression-evaluate-manager/identifier-expression-evaluate-unit';

describe('IdentifierExpressionEvaluateUnit', () => {
  const createStateManager = () => ({
    getState: jest.fn(),
    watchState: jest.fn(),
    releaseState: jest.fn(),
  });

  type IIdentifierUnitTestInternals = {
    syncValueFromState(): void;
  };

  it('watch returns undefined without context and supports readonly properties', () => {
    const stateManager = createStateManager();
    const commit = jest.fn();
    const unit = new IdentifierExpressionEvaluateUnit(
      'a',
      undefined,
      stateManager as unknown as IStateManager,
      commit,
      'owner',
    );

    expect(unit.watch()).toBeUndefined();

    const context = {};
    Object.defineProperty(context, 'a', {
      configurable: true,
      enumerable: true,
      get: () => 1,
    });
    stateManager.getState.mockReturnValue(1);

    unit.context = context;
    expect(unit.watch()).toBe(1);
    expect(stateManager.watchState).not.toHaveBeenCalled();
  });

  it('watch registers state watcher and merges custom/default watch rules', () => {
    const stateManager = createStateManager();
    const commit = jest.fn();
    const defaultRule = {
      context: undefined,
      test: jest.fn(() => false),
    };
    const customRule = {
      context: undefined,
      test: jest.fn(() => true),
    };
    const context = { a: 2 };
    stateManager.getState.mockReturnValue(2);

    const unit = new IdentifierExpressionEvaluateUnit(
      'a',
      context,
      stateManager as unknown as IStateManager,
      commit,
      'owner',
      defaultRule as unknown as IIndexWatchRule,
    );

    expect(unit.watch(customRule as unknown as IIndexWatchRule)).toBe(2);
    expect(stateManager.watchState).toHaveBeenCalledTimes(1);
    const watchRule = stateManager.watchState.mock.calls[0][2].indexWatchRule;
    expect(watchRule.test('x', context)).toBe(true);
    expect(customRule.test).toHaveBeenCalled();

    // branch where merged rule falls back to default rule
    customRule.test.mockReturnValue(false);
    defaultRule.test.mockReturnValue(true);
    expect(watchRule.test('y', context)).toBe(true);
  });

  it('context transitions while watching release/rebind state correctly', () => {
    const stateManager = createStateManager();
    const commit = jest.fn();
    const c1 = { a: 1 };
    const c2 = { a: 2 };
    stateManager.getState.mockReturnValue(1);

    const unit = new IdentifierExpressionEvaluateUnit(
      'a',
      c1,
      stateManager as unknown as IStateManager,
      commit,
      'owner',
    );

    unit.watch();
    unit.context = undefined;
    expect(stateManager.releaseState).toHaveBeenCalledWith(c1, 'a', undefined);

    unit.context = c2;
    expect(stateManager.watchState).toHaveBeenCalledWith(c2, 'a', {
      indexWatchRule: undefined,
      ownerId: 'owner',
    });
  });

  it('setContext, setValue, commit, clear and dispose behaviors', () => {
    const stateManager = createStateManager();
    const commit = jest.fn();
    const context = { a: 1 };
    stateManager.getState.mockReturnValue(1);

    const unit = new IdentifierExpressionEvaluateUnit(
      'a',
      context,
      stateManager as unknown as IStateManager,
      commit,
      'owner',
    );
    unit.watch();

    unit.setContext({ a: 2 }, context, 'z');
    expect(unit.context).toEqual({ a: 2 });

    // setContext by index match even with oldContext mismatch
    unit.setContext({ a: 22 }, { other: true }, 'a');
    expect(unit.context).toEqual({ a: 22 });

    expect(unit.setValue(3, { a: 3 }, 'a')).toBeNull();
    const currentContext = unit.context;
    expect(unit.setValue(3, currentContext, 'a')).toBe(unit);
    expect(unit.value).toBe(3);

    unit.commitChange();
    expect(commit).toHaveBeenCalledWith(3);
    expect(unit.isCommitReady()).toBe(true);

    unit.clear();
    unit.commitChange();
    expect(commit).toHaveBeenCalledTimes(1);

    unit.dispose();
    unit.dispose();
    expect(stateManager.releaseState).toHaveBeenCalled();
  });

  it('syncValueFromState swallows getState errors and sets undefined', () => {
    const stateManager = createStateManager();
    stateManager.getState.mockImplementation(() => {
      throw new Error('boom');
    });

    const unit = new IdentifierExpressionEvaluateUnit(
      'a',
      { a: 1 },
      stateManager as unknown as IStateManager,
      jest.fn(),
      'owner',
    );

    expect(unit.watch()).toBeUndefined();
    expect(unit.value).toBeUndefined();
  });

  it('syncValueFromState sets undefined when context is nullish', () => {
    const stateManager = createStateManager();
    const unit = new IdentifierExpressionEvaluateUnit(
      'a',
      undefined,
      stateManager as unknown as IStateManager,
      jest.fn(),
      'owner',
    );

    (unit as unknown as IIdentifierUnitTestInternals).syncValueFromState();
    expect(unit.value).toBeUndefined();
  });
});
