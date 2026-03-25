import { ExpressionChangeTransactionManager } from '../lib/expresion-change-transaction-manager';

describe('ExpressionChangeTransactionManager', () => {
  it('commits listeners and allows nested subscriptions to run on next commit', () => {
    const manager = new ExpressionChangeTransactionManager();
    const first = jest.fn();
    const second = jest.fn();

    manager.subscribeCommitted(() => {
      first();
      manager.subscribeCommitted(second);
    });

    manager.commit();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(0);

    manager.commit();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('does not commit while suspended and commits when continued', () => {
    const manager = new ExpressionChangeTransactionManager();
    const listener = jest.fn();
    manager.subscribeCommitted(listener);

    manager.suspend();
    manager.commit();
    expect(listener).not.toHaveBeenCalled();

    manager.continue();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe and dispose remove listeners', () => {
    const manager = new ExpressionChangeTransactionManager();
    const listener = jest.fn();
    const unsubscribe = manager.subscribeCommitted(listener);

    unsubscribe();
    manager.commit();
    expect(listener).not.toHaveBeenCalled();

    manager.subscribeCommitted(listener);
    manager.dispose();
    manager.commit();
    expect(listener).not.toHaveBeenCalled();
  });
});
