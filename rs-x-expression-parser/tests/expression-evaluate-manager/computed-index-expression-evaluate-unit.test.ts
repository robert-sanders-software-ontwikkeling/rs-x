import { WatchFactoryMock, WatchMock } from '@rs-x/state-manager/testing';

import { ComputedIndexExpressionEvaluateUnit } from '../../lib/expression-evaluate-manager/computed-index-expression-evaluate-unit';
import { ExpressionEvaluateChangeManagerMock } from '../../lib/testing';

describe('ComputedIndexExpressionEvaluateUnit', () => {
  it('does not create an inner identifier watch until both context and index are set', () => {
    const watchFactory = new WatchFactoryMock();
    watchFactory.create.mockReturnValue({
      id: 'watch-id',
      instance: new WatchMock({
        context: { ctx: true },
        index: 'k',
        value: 1,
      }),
      referenceCount: 1,
    });
    const changeManager = new ExpressionEvaluateChangeManagerMock();
    const unit = new ComputedIndexExpressionEvaluateUnit(
      watchFactory,
      'owner',
      undefined,
      jest.fn(),
    );

    unit.watch(changeManager);
    expect(watchFactory.create).not.toHaveBeenCalled();

    unit.context = { ctx: true };
    unit.watch(changeManager);
    expect(watchFactory.create).not.toHaveBeenCalled();

    unit.setIndex('k');
    unit.watch(changeManager);
    expect(watchFactory.create).toHaveBeenCalledTimes(1);
  });

  it('wires through WatchMock changes and marks computed unit dirty', () => {
    const watch = new WatchMock({
      context: { ctx: true },
      index: 'k',
      value: 1,
    });
    const watchFactory = new WatchFactoryMock();
    watchFactory.create.mockReturnValue({
      id: 'watch-id',
      instance: watch,
      referenceCount: 1,
    });

    const changeManager = new ExpressionEvaluateChangeManagerMock();
    const unit = new ComputedIndexExpressionEvaluateUnit(
      watchFactory,
      'owner',
      undefined,
      jest.fn(),
    );

    unit.context = { ctx: true };
    unit.setIndex('k');
    unit.watch(changeManager);

    expect(unit.value).toBe(1);
    expect(watchFactory.create).toHaveBeenCalledWith({
      index: 'k',
      context: { ctx: true },
      options: {
        indexWatchRule: undefined,
        ownerId: 'owner',
      },
    });

    watch.changed.next({
      context: { ctx: true },
      oldContext: { ctx: true },
      index: 'k',
      oldValue: 1,
      newValue: 2,
    });

    expect(unit.value).toBe(2);
    expect(changeManager.markDirty).toHaveBeenCalledWith(unit);
  });

  it('rebinds on context/index changes and disposes on teardown', () => {
    const firstWatch = new WatchMock({
      context: { ctx: 1 },
      index: 'a',
      value: 1,
    });
    const secondWatch = new WatchMock({
      context: { ctx: 2 },
      index: 'a',
      value: 2,
    });
    const thirdWatch = new WatchMock({
      context: { ctx: 2 },
      index: 'b',
      value: 2,
    });
    const watchFactory = new WatchFactoryMock();
    watchFactory.create
      .mockReturnValueOnce({
        id: 'watch-1',
        instance: firstWatch,
        referenceCount: 1,
      })
      .mockReturnValueOnce({
        id: 'watch-2',
        instance: secondWatch,
        referenceCount: 1,
      })
      .mockReturnValue({
        id: 'watch-3',
        instance: thirdWatch,
        referenceCount: 1,
      });

    const commit = jest.fn();
    const changeManager = new ExpressionEvaluateChangeManagerMock();
    const unit = new ComputedIndexExpressionEvaluateUnit(
      watchFactory,
      'owner',
      undefined,
      commit,
    );

    unit.context = { ctx: 1 };
    unit.setIndex('a');
    unit.watch(changeManager);
    expect(unit.value).toBe(1);

    unit.context = { ctx: 2 };
    unit.setIndex('b');
    expect(commit).toHaveBeenCalledTimes(0);
    expect(unit.value).toBe(2);
    expect(firstWatch.dispose).toHaveBeenCalledTimes(1);

    unit.dispose();
    unit.dispose();
    expect(secondWatch.dispose).toHaveBeenCalledTimes(1);
    expect(thirdWatch.dispose).toHaveBeenCalledTimes(1);
  });
});
