import { Subject } from 'rxjs';

import type { IStateChange, IStateManager } from '@rs-x/state-manager';

import type { IExpressionChangeTransactionManager } from '../../lib/expresion-change-transaction-manager.interface';
import {
  ExpressionEvaluateManager,
  type IExpressionEvaluateUnit,
  ValueChange,
} from '../../lib/expression-evaluate-manager';

class MockEvaluateUnit implements IExpressionEvaluateUnit {
  public readonly commit = jest.fn();
  public readonly dispose = jest.fn();
  public context: unknown;
  public value: unknown;

  constructor(
    public readonly index: unknown,
    private readonly statuses: ValueChange[] = [],
  ) {}

  public setValue(_value: unknown, _context: unknown, _index: unknown): ValueChange {
    return this.statuses.length > 0
      ? this.statuses.shift()!
      : ValueChange.NotApplicable;
  }
}

class MatchingUnit implements IExpressionEvaluateUnit {
  public readonly commit = jest.fn();
  public readonly dispose = jest.fn();
  public context: unknown;
  public value: unknown;

  constructor(
    public readonly index: unknown,
    private readonly statuses: ValueChange[] = [],
  ) {}

  public setValue(_value: unknown, _context: unknown, index: unknown): ValueChange {
    if (index !== this.index) {
      return ValueChange.NotApplicable;
    }
    return this.statuses.length > 0
      ? this.statuses.shift()!
      : ValueChange.NotApplicable;
  }
}

const flushMicrotasks = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('ExpressionEvaluateManager', () => {
  const setup = () => {
    const changed = new Subject<IStateChange>();
    const stateManager = {
      changed,
    } as unknown as IStateManager;

    const transactionManager = {
      suspend: jest.fn(),
      continue: jest.fn(),
    } as unknown as IExpressionChangeTransactionManager;

    const manager = new ExpressionEvaluateManager(stateManager, transactionManager);

    return {
      changed,
      manager,
      transactionManager,
    };
  };

  it('boots once when all units initialize and then reevaluates on further changes', async () => {
    const { changed, manager, transactionManager } = setup();
    const evaluate = jest.fn();

    const created = (manager as any).create(evaluate);

    const u1 = new MockEvaluateUnit('a', [ValueChange.Initialized, ValueChange.Changed]);
    const u2 = new MockEvaluateUnit('b', [ValueChange.Initialized, ValueChange.Changed]);

    created.instance.register(u1);
    created.instance.register(u2);

    changed.next({
      context: {},
      oldContext: {},
      index: 'x',
      oldValue: undefined,
      newValue: 1,
    });

    await flushMicrotasks();

    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(u1.commit).toHaveBeenCalledTimes(0);
    expect(u2.commit).toHaveBeenCalledTimes(0);

    changed.next({
      context: {},
      oldContext: {},
      index: 'x',
      oldValue: 1,
      newValue: 2,
    });

    await flushMicrotasks();

    expect(transactionManager.suspend).toHaveBeenCalledTimes(1);
    expect(transactionManager.continue).toHaveBeenCalledTimes(1);
    expect(u1.commit).toHaveBeenCalledTimes(1);
    expect(u2.commit).toHaveBeenCalledTimes(1);
  });

  it('does not bootstrap when not all units report changed during initialization', async () => {
    const { changed, manager } = setup();
    const evaluate = jest.fn();

    const created = (manager as any).create(evaluate);

    const u1 = new MockEvaluateUnit('a', [ValueChange.Initialized]);
    const u2 = new MockEvaluateUnit('b', [ValueChange.NotApplicable]);

    created.instance.register(u1);
    created.instance.register(u2);

    changed.next({
      context: {},
      oldContext: {},
      index: 'x',
      oldValue: undefined,
      newValue: 1,
    });

    await flushMicrotasks();

    expect(evaluate).not.toHaveBeenCalled();
    expect(u1.commit).not.toHaveBeenCalled();
    expect(u2.commit).not.toHaveBeenCalled();
  });

  it('coalesces reevaluation while one microtask is already scheduled', async () => {
    const { changed, manager, transactionManager } = setup();
    const evaluate = jest.fn();

    const created = (manager as any).create(evaluate);

    const u1 = new MockEvaluateUnit('a', [ValueChange.Initialized, ValueChange.Changed, ValueChange.Changed]);
    const u2 = new MockEvaluateUnit('b', [ValueChange.Initialized, ValueChange.Changed, ValueChange.Changed]);

    created.instance.register(u1);
    created.instance.register(u2);

    changed.next({
      context: {},
      oldContext: {},
      index: 'init',
      oldValue: undefined,
      newValue: 1,
    });
    await flushMicrotasks();

    changed.next({
      context: {},
      oldContext: {},
      index: 'x1',
      oldValue: 1,
      newValue: 2,
    });
    changed.next({
      context: {},
      oldContext: {},
      index: 'x2',
      oldValue: 2,
      newValue: 3,
    });

    await flushMicrotasks();

    expect(transactionManager.suspend).toHaveBeenCalledTimes(1);
    expect(transactionManager.continue).toHaveBeenCalledTimes(1);
    expect(u1.commit).toHaveBeenCalledTimes(1);
    expect(u2.commit).toHaveBeenCalledTimes(1);
  });

  it('exposes ids consistently and disposes instance on release', () => {
    const { manager } = setup();
    const evaluate = jest.fn();

    expect(manager.getId(evaluate)).toBe(evaluate);
    expect((manager as any).createId(evaluate)).toBe(evaluate);

    const created = (manager as any).create(evaluate);

    const unit = new MockEvaluateUnit('a', []);
    created.instance.register(unit);

    const released = (manager as any).release(created.id);

    expect(released.referenceCount).toBe(0);
    expect(unit.dispose).toHaveBeenCalledTimes(1);
  });

  it('handles multiple occurrences of the same identifier key', async () => {
    const { changed, manager, transactionManager } = setup();
    const evaluate = jest.fn();

    const created = (manager as any).create(evaluate);

    const firstOccurrence = new MatchingUnit('shared', [
      ValueChange.Initialized,
      ValueChange.Changed,
    ]);
    const secondOccurrence = new MatchingUnit('shared', [
      ValueChange.Initialized,
      ValueChange.Changed,
    ]);

    created.instance.register(firstOccurrence);
    created.instance.register(secondOccurrence);

    changed.next({
      context: {},
      oldContext: {},
      index: 'shared',
      oldValue: undefined,
      newValue: 1,
    });
    await flushMicrotasks();

    expect(evaluate).toHaveBeenCalledTimes(1);

    changed.next({
      context: {},
      oldContext: {},
      index: 'shared',
      oldValue: 1,
      newValue: 2,
    });
    await flushMicrotasks();

    expect(transactionManager.suspend).toHaveBeenCalledTimes(1);
    expect(transactionManager.continue).toHaveBeenCalledTimes(1);
    expect(firstOccurrence.commit).toHaveBeenCalledTimes(1);
    expect(secondOccurrence.commit).toHaveBeenCalledTimes(1);
  });

  it('covers scheduling guard branches used during bootstrap/evaluate', async () => {
    const { changed, manager } = setup();
    const evaluate = jest.fn();
    const created = (manager as any).create(evaluate);

    const unit = new MatchingUnit('guard', [ValueChange.Initialized]);
    created.instance.register(unit);

    // Cover: unresolved path prevents bootstrap evaluate scheduling.
    (created.instance as any)._unresolvedCount = 1;
    changed.next({
      context: {},
      oldContext: {},
      index: 'guard',
      oldValue: undefined,
      newValue: 1,
    });
    await flushMicrotasks();
    expect(evaluate).not.toHaveBeenCalled();

    // Cover: scheduleEvaluate early-return when already initialized.
    (created.instance as any)._initialized = true;
    (created.instance as any).scheduleEvaluate();
    await flushMicrotasks();
    expect(evaluate).not.toHaveBeenCalled();

    // Cover: microtask guard branch (_unresolvedCount !== 0 || _initialized).
    (created.instance as any)._initialized = false;
    (created.instance as any)._bootstrapScheduled = false;
    (created.instance as any)._unresolvedCount = 1;
    (created.instance as any).scheduleEvaluate();
    await flushMicrotasks();
    expect(evaluate).not.toHaveBeenCalled();
  });
});
