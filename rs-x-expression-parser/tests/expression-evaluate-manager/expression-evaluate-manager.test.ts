import type { IExpressionChangeTransactionManager } from '../../lib/expresion-change-transaction-manager.interface';
import {
  ExpressionEvaluateManager,
  type IExpressionEvaluateUnit,
} from '../../lib/expression-evaluate-manager';
import type { IExpressionEvaluateChangeManager } from '../../lib/expression-evaluate-manager/expression-evaluate-unit.interface';

const flushMicrotasks = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

class EvaluateUnitMock implements IExpressionEvaluateUnit {
  public readonly count = 1;
  public readonly index = 'x';
  public readonly context = undefined;
  public value: unknown;
  public readonly dispose = jest.fn();
  public readonly commitChange = jest.fn();

  private _ready = true;

  public watch = jest.fn((changeManager: IExpressionEvaluateChangeManager) => {
    changeManager.markDirty(this);
  });

  public isCommitReady(): boolean {
    return this._ready;
  }

  public setReady(value: boolean): void {
    this._ready = value;
  }
}

describe('ExpressionEvaluateManager', () => {
  const setup = () => {
    const committedListeners: Array<() => void> = [];
    const transactionManager = {
      subscribeCommitted: jest.fn((listener: () => void) => {
        committedListeners.push(listener);
        return () => undefined;
      }),
      suspend: jest.fn(),
      continue: jest.fn(() => {
        committedListeners.forEach((listener) => listener());
      }),
      commit: jest.fn(),
      dispose: jest.fn(),
    } as unknown as IExpressionChangeTransactionManager;

    const manager = new ExpressionEvaluateManager(transactionManager);

    return {
      manager,
      transactionManager,
    };
  };

  it('initializes once and commits bootstrap + reevaluation when a unit marks dirty', async () => {
    const { manager, transactionManager } = setup();
    const commit = jest.fn();
    const created = manager.create(commit).instance;
    const unit = new EvaluateUnitMock();

    created.register(unit);
    created.initialize();
    await flushMicrotasks();

    expect(unit.watch).toHaveBeenCalledTimes(1);
    expect(unit.commitChange).toHaveBeenCalledTimes(1);
    expect(transactionManager.suspend).toHaveBeenCalledTimes(1);
    expect(transactionManager.continue).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith(false);
    expect(commit).toHaveBeenCalledWith(true);
  });

  it('proves post-bootstrap tryFlushQueue drains dirties queued during initialize', async () => {
    const { manager, transactionManager } = setup();
    const commit = jest.fn();
    const created = manager.create(commit).instance;
    const unit = new EvaluateUnitMock();

    // Dirty is raised synchronously while initialize() is wiring watchers.
    unit.watch.mockImplementation(
      (changeManager: IExpressionEvaluateChangeManager) => {
        changeManager.markDirty(unit);
      },
    );
    created.register(unit);
    created.initialize();

    // No additional dirty signals happen after initialize() returns.
    expect(unit.watch).toHaveBeenCalledTimes(1);
    expect(unit.commitChange).toHaveBeenCalledTimes(0);
    expect(transactionManager.suspend).toHaveBeenCalledTimes(0);

    // At this point we are still pre-bootstrap, and the dirty unit is queued.
    const internal = created as unknown as {
      _initialized: boolean;
      _changeManager: IExpressionEvaluateChangeManager;
      _changedQueue: Set<IExpressionEvaluateUnit>;
    };
    expect(internal._initialized).toBe(false);
    expect(internal._changedQueue.has(unit)).toBe(true);

    await flushMicrotasks();

    // Reevaluation happened without any new markDirty calls after initialize().
    expect(unit.commitChange).toHaveBeenCalledTimes(1);
    expect(transactionManager.suspend).toHaveBeenCalledTimes(1);
    expect(transactionManager.continue).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenNthCalledWith(1, false);
    expect(commit).toHaveBeenNthCalledWith(2, true);
    expect(internal._changedQueue.size).toBe(0);
  });

  it('skips commitChange until the unit becomes ready', async () => {
    const { manager } = setup();
    const created = manager.create(jest.fn()).instance;
    const unit = new EvaluateUnitMock();
    unit.setReady(false);

    created.register(unit);
    created.initialize();
    await flushMicrotasks();

    expect(unit.commitChange).toHaveBeenCalledTimes(0);

    unit.setReady(true);
    const watchChangeManager = unit.watch.mock
      .calls[0][0] as IExpressionEvaluateChangeManager;
    watchChangeManager.markDirty(unit);
    await flushMicrotasks();

    expect(unit.commitChange).toHaveBeenCalledTimes(1);
  });
});
