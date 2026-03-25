import type { IStateManager } from '@rs-x/state-manager';

import { ComputedIndexExpressionEvaluateUnit } from '../../lib/expression-evaluate-manager/computed-index-expression-evaluate-unit';

describe('ComputedIndexExpressionEvaluateUnit', () => {
  const createStateManager = () => ({
    watchState: jest.fn(),
    releaseState: jest.fn(),
    getState: jest.fn(),
  });

  type IComputedIndexTestInternals = {
    syncValueFromState(): void;
  };

  it('watch returns undefined until both context and index are set', () => {
    const stateManager = createStateManager();
    const commit = jest.fn();
    const unit = new ComputedIndexExpressionEvaluateUnit(
      stateManager as unknown as IStateManager,
      'owner',
      commit,
    );

    expect(unit.watch()).toBeUndefined();
    unit.context = { ctx: true };
    expect(unit.watch()).toBeUndefined();
    unit.setIndex('k');
    expect(unit.index).toBe('k');
    stateManager.getState.mockReturnValue(10);
    expect(unit.watch()).toBe(10);
    expect(stateManager.watchState).toHaveBeenCalled();
  });

  it('setIndex rebinds state and commits only when resolved value changes', () => {
    const stateManager = createStateManager();
    const commit = jest.fn();
    const unit = new ComputedIndexExpressionEvaluateUnit(
      stateManager as unknown as IStateManager,
      'owner',
      commit,
    );
    const ctx = { ctx: true };
    unit.context = ctx;

    stateManager.getState.mockReturnValueOnce(1);
    unit.setIndex('a');
    expect(commit).toHaveBeenCalledTimes(1);

    stateManager.getState.mockReturnValueOnce(1);
    unit.setIndex('b');
    expect(commit).toHaveBeenCalledTimes(1);

    unit.setIndex('b');
    expect(stateManager.releaseState).toHaveBeenCalledTimes(1);
  });

  it('context changes release previous state and rewatch new context', () => {
    const stateManager = createStateManager();
    const commit = jest.fn();
    const unit = new ComputedIndexExpressionEvaluateUnit(
      stateManager as unknown as IStateManager,
      'owner',
      commit,
    );

    const c1 = { c1: true };
    const c2 = { c2: true };
    stateManager.getState.mockReturnValue(5);

    unit.context = c1;
    unit.setIndex('x');
    unit.context = c2;
    expect(stateManager.releaseState).toHaveBeenCalledWith(c1, 'x');
    expect(stateManager.watchState).toHaveBeenCalledWith(c2, 'x', {
      ownerId: 'owner',
    });
  });

  it('setContext and setValue match rules and commitChange guard', () => {
    const stateManager = createStateManager();
    const commit = jest.fn();
    const unit = new ComputedIndexExpressionEvaluateUnit(
      stateManager as unknown as IStateManager,
      'owner',
      commit,
    );
    const context = { ctx: true };
    unit.context = context;
    unit.setIndex('k');

    expect(unit.setValue(1, context, 'x', true)).toBeNull();
    expect(unit.setValue(1, { other: true }, 'k', true)).toBeNull();

    expect(unit.setValue(2, context, 'k', true)).toBe(unit);
    expect(unit.value).toBe(2);

    unit.clear();
    unit.commitChange();
    expect(commit).toHaveBeenCalledTimes(0);

    unit.setValue(3, context, 'k', true);
    unit.commitChange();
    expect(commit).toHaveBeenCalledTimes(1);

    unit.setContext({ next: true }, context, 'zzz');
    expect(unit.context).toEqual({ next: true });

    const unchanged = unit.context;
    unit.setContext({ noChange: true }, { other: true }, 'other');
    expect(unit.context).toBe(unchanged);
  });

  it('handles getState errors and dispose is idempotent', () => {
    const stateManager = createStateManager();
    const unit = new ComputedIndexExpressionEvaluateUnit(
      stateManager as unknown as IStateManager,
      'owner',
      jest.fn(),
    );
    const ctx = { ctx: true };
    unit.context = ctx;
    stateManager.getState.mockImplementation(() => {
      throw new Error('boom');
    });

    unit.setIndex('k');
    expect(unit.watch()).toBeUndefined();
    expect(unit.isCommitReady()).toBe(true);

    unit.dispose();
    unit.dispose();
    expect(stateManager.releaseState).toHaveBeenCalledWith(ctx, 'k');
  });

  it('syncValueFromState handles missing context/index', () => {
    const stateManager = createStateManager();
    const unit = new ComputedIndexExpressionEvaluateUnit(
      stateManager as unknown as IStateManager,
      'owner',
      jest.fn(),
    );

    (unit as unknown as IComputedIndexTestInternals).syncValueFromState();
    expect(unit.value).toBeUndefined();
  });
});
