import { type IIndexWatchRule } from '@rs-x/state-manager';
import { WatchFactoryMock, WatchMock } from '@rs-x/state-manager/testing';

import { IdentifierExpressionEvaluateUnit } from '../../lib/expression-evaluate-manager/identifier-expression-evaluate-unit';
import { ExpressionEvaluateChangeManagerMock } from '../../lib/testing';

describe('IdentifierExpressionEvaluateUnit', () => {
  let watchFactory: WatchFactoryMock;
  let watch: WatchMock;
  let changeManager: ExpressionEvaluateChangeManagerMock;

  beforeEach(() => {
    watch = new WatchMock({
      context: { c: true },
      index: 'a',
      value: 1,
    });
    watchFactory = new WatchFactoryMock();
    watchFactory.create.mockReturnValue({
      id: 'watch-id',
      instance: watch,
      referenceCount: 1,
    });
    changeManager = new ExpressionEvaluateChangeManagerMock();
  });

  it('watch does nothing when context is undefined', () => {
    const unit = new IdentifierExpressionEvaluateUnit(
      'a',
      undefined,
      watchFactory,
      undefined,
      jest.fn(),
      'owner',
    );

    expect(unit.watch(changeManager)).toBeUndefined();
    expect(watchFactory.create).not.toHaveBeenCalled();
  });

  it('watch creates watcher and sets current value from WatchMock', () => {
    const unit = new IdentifierExpressionEvaluateUnit(
      'a',
      { c: true },
      watchFactory,
      undefined,
      jest.fn(),
      'owner',
    );

    unit.watch(changeManager);
    expect(unit.value).toBe(1);
    expect(watchFactory.create).toHaveBeenCalledWith({
      index: 'a',
      context: { c: true },
      options: {
        indexWatchRule: undefined,
        ownerId: 'owner',
      },
    });
  });

  it('changed event updates value and marks unit dirty', () => {
    const unit = new IdentifierExpressionEvaluateUnit(
      'a',
      { c: true },
      watchFactory,
      undefined,
      jest.fn(),
      'owner',
    );

    unit.watch(changeManager);

    watch.changed.next({
      context: { c: true },
      oldContext: { c: true },
      index: 'a',
      oldValue: 1,
      newValue: 2,
    });
    expect(unit.value).toBe(2);
    expect(changeManager.markDirty).toHaveBeenCalledWith(unit);
  });

  it('contextChange event updates unit context', () => {
    const unit = new IdentifierExpressionEvaluateUnit(
      'a',
      { c: true },
      watchFactory,
      undefined,
      jest.fn(),
      'owner',
    );

    unit.watch(changeManager);

    watch.contextChange.next({
      context: { c: 2 },
      oldContext: { c: true },
      index: 'a',
    });
    expect(unit.context).toEqual({ c: 2 });
  });

  it('change-cycle events are forwarded to change manager', () => {
    const unit = new IdentifierExpressionEvaluateUnit(
      'a',
      { c: true },
      watchFactory,
      undefined,
      jest.fn(),
      'owner',
    );

    unit.watch(changeManager);

    watch.startChangeCycle.next({
      context: { c: 2 },
      index: 'a',
    });
    watch.endChangeCycle.next({
      context: { c: 2 },
      index: 'a',
    });
    expect(changeManager.incrementChangeCycle).toHaveBeenCalledTimes(1);
    expect(changeManager.decrementChangeCycle).toHaveBeenCalledTimes(1);
  });

  it('passes configured watch rule to watch factory options', () => {
    const watchRule = {
      context: undefined,
      id: 'rule-1',
      test: jest.fn(() => true),
      dispose: jest.fn(),
    } as unknown as IIndexWatchRule;

    const unit = new IdentifierExpressionEvaluateUnit(
      'a',
      { c: true },
      watchFactory,
      watchRule,
      jest.fn(),
      'owner',
    );

    unit.watch(changeManager);

    expect(watchFactory.create).toHaveBeenCalledWith({
      index: 'a',
      context: { c: true },
      options: {
        indexWatchRule: watchRule,
        ownerId: 'owner',
      },
    });
  });

  it('commitChange only commits when value is defined', () => {
    const commit = jest.fn();
    const unit = new IdentifierExpressionEvaluateUnit(
      'a',
      undefined,
      watchFactory,
      undefined,
      commit,
      'owner',
    );

    expect(unit.isCommitReady()).toBe(true);
    unit.watch(changeManager);
    unit.commitChange();
    expect(commit).not.toHaveBeenCalled();

    watch = new WatchMock({
      context: { c: true },
      index: 'a',
      value: 10,
    });
    watchFactory.create.mockReturnValue({
      id: 'watch-id',
      instance: watch,
      referenceCount: 1,
    });
    const withValue = new IdentifierExpressionEvaluateUnit(
      'a',
      { c: true },
      watchFactory,
      undefined,
      commit,
      'owner',
    );

    withValue.watch(changeManager);
    withValue.commitChange();
    expect(commit).toHaveBeenCalledWith(10);
  });

  it('dispose is idempotent and disposes WatchMock once', () => {
    const unit = new IdentifierExpressionEvaluateUnit(
      'a',
      { c: true },
      watchFactory,
      undefined,
      jest.fn(),
      'owner',
    );

    unit.watch(changeManager);
    unit.dispose();
    unit.dispose();

    expect(watch.dispose).toHaveBeenCalledTimes(1);

    expect(changeManager.markDirty).toHaveBeenCalledTimes(0);
  });

  it('commits with forceDirty for object value changes when leaf force option is enabled', () => {
    const commit = jest.fn();
    const unit = new IdentifierExpressionEvaluateUnit(
      'a',
      { c: true },
      watchFactory,
      undefined,
      commit,
      'owner',
      undefined,
      undefined,
      false,
      true,
    );

    unit.watch(changeManager);
    const setValue = new Set([1, 2]);
    watch.changed.next({
      context: { c: true },
      oldContext: { c: true },
      index: 'a',
      oldValue: 1,
      newValue: setValue,
    });
    unit.commitChange();

    expect(commit).toHaveBeenCalledWith(setValue, true);
  });

  it('dispose handles missing endChangeCycle subscription', () => {
    const unit = new IdentifierExpressionEvaluateUnit(
      'a',
      { c: true },
      watchFactory,
      undefined,
      jest.fn(),
      'owner',
    );

    unit.watch(changeManager);
    (
      unit as unknown as { _endChangeCycleSubscription?: unknown }
    )._endChangeCycleSubscription = undefined;

    expect(() => unit.dispose()).not.toThrow();
    expect(watch.dispose).toHaveBeenCalledTimes(1);
  });

  it('dispose without watch is safe', () => {
    const unit = new IdentifierExpressionEvaluateUnit(
      'a',
      undefined,
      watchFactory,
      undefined,
      jest.fn(),
      'owner',
    );

    expect(() => unit.dispose()).not.toThrow();
    expect(watchFactory.create).not.toHaveBeenCalled();
    expect(watch.dispose).toHaveBeenCalledTimes(0);
  });
});
