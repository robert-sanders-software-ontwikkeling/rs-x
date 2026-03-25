import { Subject } from 'rxjs';

import type {
  IContextChanged,
  IStateChange,
  IStateManager,
} from '@rs-x/state-manager';

import type { IExpressionChangeTransactionManager } from '../../lib/expresion-change-transaction-manager.interface';
import {
  ExpressionEvaluateManager,
  type IExpressionEvaluateUnit,
} from '../../lib/expression-evaluate-manager';

class MatchingUnit implements IExpressionEvaluateUnit {
  public readonly count = 1;
  public readonly commitChange = jest.fn();
  public readonly dispose = jest.fn();
  public context: unknown;
  public value: unknown;

  constructor(public readonly index: unknown) {}

  public clear(): void {}

  public isCommitReady(): boolean {
    return true;
  }

  public setContext(): void {}

  public setValue(
    value: unknown,
    context: unknown,
    index: unknown,
  ): IExpressionEvaluateUnit | null {
    if (index !== this.index) {
      return null;
    }

    this.context = context;
    this.value = value;
    return this;
  }

  public watch(): unknown {
    return undefined;
  }
}

class ValueOnlyWatchUnit extends MatchingUnit {
  constructor(index: unknown, initialValue: unknown) {
    super(index);
    this.value = initialValue;
  }

  public override watch(): unknown {
    return undefined;
  }
}

class SegmentGateUnit implements IExpressionEvaluateUnit {
  public readonly count = 1;
  public readonly context: unknown = undefined;
  public readonly value: unknown = undefined;
  public readonly commitChange = jest.fn(() => {
    this._updatedSegments.clear();
  });
  public readonly dispose = jest.fn();

  private readonly _updatedSegments = new Set<unknown>();

  constructor(
    public readonly index: unknown,
    private readonly _requiredSegments: readonly unknown[],
  ) {}

  public clear(): void {}

  public isCommitReady(): boolean {
    return this._updatedSegments.size === this._requiredSegments.length;
  }

  public setContext(): void {}

  public setValue(
    _value: unknown,
    _context: unknown,
    index: unknown,
  ): IExpressionEvaluateUnit | null {
    if (!this._requiredSegments.includes(index)) {
      return null;
    }

    this._updatedSegments.add(index);
    return this;
  }

  public watch(): unknown {
    return undefined;
  }
}

class StickyNotReadyUnit implements IExpressionEvaluateUnit {
  public readonly count = 1;
  public readonly index = 'x';
  public readonly context: unknown = undefined;
  public readonly value: unknown = undefined;
  public readonly commitChange = jest.fn();
  public readonly dispose = jest.fn();
  private _ready = false;

  public clear(): void {}

  public setReady(value: boolean): void {
    this._ready = value;
  }

  public isCommitReady(): boolean {
    return this._ready;
  }

  public setContext(): void {}

  public setValue(): IExpressionEvaluateUnit | null {
    return this;
  }

  public watch(): unknown {
    return undefined;
  }
}

const flushMicrotasks = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

type IInternalEvaluateManagerForExpression = {
  register(unit: IExpressionEvaluateUnit): void;
  initialize(): void;
  _initialized: boolean;
  _changedQueue: Set<unknown>;
  _unresolvedCount: number;
  _reevaluateScheduled: boolean;
  _bootstrapScheduled: boolean;
  readonly evaluateUnitsCount: number;
  onContextChanged(change: IContextChanged): void;
  onStartChangeCycle(): void;
  onEndChangeCycle(): void;
  scheduleReevaluate(): void;
  scheduleInitialize(): void;
};

type ICreatedEvaluateManager = {
  id: unknown;
  instance: IInternalEvaluateManagerForExpression;
};

type IManagerInternals = {
  create(commit: (initialized: boolean) => void): ICreatedEvaluateManager;
  createId(commit: unknown): unknown;
  release(id: unknown): { referenceCount: number };
};

describe('ExpressionEvaluateManager', () => {
  const setup = () => {
    const changed = new Subject<IStateChange>();
    const contextChanged = new Subject<IContextChanged>();
    const startChangeCycle = new Subject<void>();
    const endChangeCycle = new Subject<void>();

    const stateManager = {
      changed,
      contextChanged,
      startChangeCycle,
      endChangeCycle,
    } as unknown as IStateManager;

    const transactionManager = {
      subscribeCommitted: jest.fn(() => () => undefined),
      suspend: jest.fn(),
      continue: jest.fn(),
      commit: jest.fn(),
      dispose: jest.fn(),
    } as unknown as IExpressionChangeTransactionManager;

    const manager = new ExpressionEvaluateManager(
      stateManager,
      transactionManager,
    );

    return {
      changed,
      manager,
      transactionManager,
    };
  };

  it('boots once when all units initialize and then reevaluates on further changes', async () => {
    const { changed, manager, transactionManager } = setup();
    const evaluate = jest.fn();

    const managerInternals = manager as unknown as IManagerInternals;
    const created = managerInternals.create(evaluate);

    const u1 = new MatchingUnit('shared');
    const u2 = new MatchingUnit('shared');

    created.instance.register(u1);
    created.instance.register(u2);

    changed.next({
      context: {},
      oldContext: {},
      index: 'shared',
      oldValue: undefined,
      newValue: 1,
    });

    await flushMicrotasks();

    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(evaluate).toHaveBeenCalledWith(false);
    expect(u1.commitChange).toHaveBeenCalledTimes(0);
    expect(u2.commitChange).toHaveBeenCalledTimes(0);

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
    expect(u1.commitChange).toHaveBeenCalledTimes(1);
    expect(u2.commitChange).toHaveBeenCalledTimes(1);
  });

  it('bootstraps even when only some units report initial changes', async () => {
    const { changed, manager } = setup();
    const evaluate = jest.fn();

    const managerInternals = manager as unknown as IManagerInternals;
    const created = managerInternals.create(evaluate);

    const u1 = new MatchingUnit('a');
    const u2 = new MatchingUnit('b');

    created.instance.register(u1);
    created.instance.register(u2);

    changed.next({
      context: {},
      oldContext: {},
      index: 'a',
      oldValue: undefined,
      newValue: 1,
    });

    await flushMicrotasks();

    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(evaluate).toHaveBeenCalledWith(false);
    expect(u1.commitChange).not.toHaveBeenCalled();
    expect(u2.commitChange).not.toHaveBeenCalled();
  });

  it('waits for all member-like segments before committing when updates arrive out of order', async () => {
    const { changed, manager, transactionManager } = setup();
    const evaluate = jest.fn();

    const managerInternals = manager as unknown as IManagerInternals;
    const created = managerInternals.create(evaluate);
    const gateUnit = new SegmentGateUnit('a.b.c.d', ['a', 'b', 'c', 'd']);

    created.instance.register(gateUnit);
    created.instance._initialized = true;

    const emit = (index: unknown) => {
      changed.next({
        context: {},
        oldContext: {},
        index,
        oldValue: undefined,
        newValue: 1,
      });
    };

    emit('a');
    await flushMicrotasks();
    emit('b');
    await flushMicrotasks();
    emit('d');
    await flushMicrotasks();

    expect(gateUnit.commitChange).toHaveBeenCalledTimes(0);
    expect(created.instance._changedQueue.size).toBe(1);

    emit('c');
    await flushMicrotasks();

    expect(gateUnit.commitChange).toHaveBeenCalledTimes(1);
    expect(created.instance._changedQueue.size).toBe(0);
    expect(transactionManager.suspend).toHaveBeenCalledTimes(4);
    expect(transactionManager.continue).toHaveBeenCalledTimes(4);
  });

  it('exposes ids consistently and disposes instance on release', () => {
    const { manager } = setup();
    const evaluate = jest.fn();

    expect(manager.getId(evaluate)).toBe(evaluate);
    const managerInternals = manager as unknown as IManagerInternals;
    expect(managerInternals.createId(evaluate)).toBe(evaluate);

    const created = managerInternals.create(evaluate);

    const unit = new MatchingUnit('a');
    created.instance.register(unit);

    const released = managerInternals.release(created.id);

    expect(released.referenceCount).toBe(0);
    expect(unit.dispose).toHaveBeenCalledTimes(1);
  });

  it('propagates contextChanged events to units', () => {
    const { manager } = setup();
    const evaluate = jest.fn();
    const managerInternals = manager as unknown as IManagerInternals;
    const created = managerInternals.create(evaluate);

    const unit = new MatchingUnit('a');
    const setContextSpy = jest.spyOn(unit, 'setContext');
    created.instance.register(unit);

    created.instance.onContextChanged({
      context: { next: true },
      oldContext: { prev: true },
      index: 'a',
    });

    expect(setContextSpy).toHaveBeenCalledTimes(1);
    expect(setContextSpy).toHaveBeenCalledWith(
      { next: true },
      { prev: true },
      'a',
    );
  });

  it('keeps changed units queued until they become commit-ready', async () => {
    const { changed, manager, transactionManager } = setup();
    const evaluate = jest.fn();
    const managerInternals = manager as unknown as IManagerInternals;
    const created = managerInternals.create(evaluate);

    const unit = new StickyNotReadyUnit();
    created.instance.register(unit);
    created.instance._initialized = true;

    changed.next({
      context: {},
      oldContext: {},
      index: 'x',
      oldValue: undefined,
      newValue: 1,
    });

    await flushMicrotasks();

    expect(unit.commitChange).not.toHaveBeenCalled();
    expect(created.instance._changedQueue.size).toBe(1);
    expect(transactionManager.suspend).toHaveBeenCalledTimes(1);
    expect(transactionManager.continue).toHaveBeenCalledTimes(1);

    unit.setReady(true);
    changed.next({
      context: {},
      oldContext: {},
      index: 'x',
      oldValue: 1,
      newValue: 2,
    });

    await flushMicrotasks();

    expect(unit.commitChange).toHaveBeenCalledTimes(1);
    expect(created.instance._changedQueue.size).toBe(0);
  });

  it('queues units that expose value during watch-only initialization', async () => {
    const { manager } = setup();
    const evaluate = jest.fn();
    const managerInternals = manager as unknown as IManagerInternals;
    const created = managerInternals.create(evaluate);

    const unit = new ValueOnlyWatchUnit('a', 123);
    created.instance.register(unit);

    created.instance.initialize();
    await flushMicrotasks();

    expect(evaluate).toHaveBeenCalledWith(false);
    expect(created.instance._changedQueue.size).toBe(0);
  });

  it('caches evaluateUnitsCount and skips bootstrap while unresolved', async () => {
    const { manager } = setup();
    const evaluate = jest.fn();
    const managerInternals = manager as unknown as IManagerInternals;
    const created = managerInternals.create(evaluate);

    const u1 = new MatchingUnit('a');
    const u2 = new MatchingUnit('b');
    created.instance.register(u1);
    created.instance.register(u2);

    const first = created.instance.evaluateUnitsCount;
    const second = created.instance.evaluateUnitsCount;
    expect(first).toBe(2);
    expect(second).toBe(2);

    created.instance._unresolvedCount = 1;
    created.instance.initialize();
    await flushMicrotasks();

    expect(evaluate).not.toHaveBeenCalled();
  });

  it('covers state-cycle and scheduler guards', async () => {
    const { changed, manager, transactionManager } = setup();
    const evaluate = jest.fn();
    const managerInternals = manager as unknown as IManagerInternals;
    const created = managerInternals.create(evaluate);

    const unit = new MatchingUnit('a');
    unit.watch = jest.fn(() => 1);
    created.instance.register(unit);

    // initialize path with value from watch -> addChange branch
    created.instance.initialize();
    await flushMicrotasks();
    expect(evaluate).toHaveBeenCalledWith(false);

    // initialize guard when already initialized
    created.instance.initialize();
    expect((unit.watch as jest.Mock).mock.calls.length).toBe(1);

    // start/end change cycle handlers and flush guard
    created.instance.onStartChangeCycle();
    changed.next({
      context: {},
      oldContext: {},
      index: 'a',
      oldValue: 1,
      newValue: 2,
    });
    await flushMicrotasks();
    expect(transactionManager.suspend).toHaveBeenCalledTimes(0);

    created.instance.onEndChangeCycle();
    await flushMicrotasks();
    expect(transactionManager.suspend).toHaveBeenCalledTimes(1);

    // scheduleReevaluate guard when already scheduled
    created.instance._reevaluateScheduled = true;
    created.instance.scheduleReevaluate();
    expect(transactionManager.suspend).toHaveBeenCalledTimes(1);

    // scheduleInitialize guard when bootstrap already scheduled
    created.instance._initialized = false;
    created.instance._bootstrapScheduled = true;
    created.instance.scheduleInitialize();
    expect(created.instance._bootstrapScheduled).toBe(true);
  });

  it('executes subscribeCommitted callback path during reevaluate', async () => {
    const { changed, manager, transactionManager } = setup();
    const evaluate = jest.fn();
    const managerInternals = manager as unknown as IManagerInternals;
    const created = managerInternals.create(evaluate);
    const unit = new MatchingUnit('a');
    created.instance.register(unit);
    created.instance._initialized = true;

    (transactionManager.subscribeCommitted as jest.Mock).mockImplementation(
      (listener: () => void) => {
        listener();
        return () => undefined;
      },
    );

    changed.next({
      context: {},
      oldContext: {},
      index: 'a',
      oldValue: undefined,
      newValue: 1,
    });

    await flushMicrotasks();
    expect(evaluate).toHaveBeenCalledWith(true);
  });
});
