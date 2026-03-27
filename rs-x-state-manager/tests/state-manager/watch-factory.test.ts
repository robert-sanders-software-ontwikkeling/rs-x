import { Subject } from 'rxjs';

import type { IGuidFactory } from '@rs-x/core';
import { Type } from '@rs-x/core';

import {
  type IChangeCycleIndex,
  type IContextChanged,
  type IStateChange,
  type IStateManager,
} from '../../lib/state-manager/state-manager.interface';
import { WatchFactory } from '../../lib/state-manager/watch-factory/watch-factory';
import { IndexWatchRuleMock } from '../../lib/testing/watch-index-rule.mock';

interface IStateManagerMock {
  changedSubject: Subject<IStateChange>;
  contextChangedSubject: Subject<IContextChanged>;
  startChangeCycleSubject: Subject<IChangeCycleIndex>;
  endChangeCycleSubject: Subject<IChangeCycleIndex>;
  instance: IStateManager;
  watchState: jest.Mock;
  getState: jest.Mock;
  releaseState: jest.Mock;
}

const createStateManagerMock = (): IStateManagerMock => {
  const changedSubject = new Subject<IStateChange>();
  const contextChangedSubject = new Subject<IContextChanged>();
  const startChangeCycleSubject = new Subject<IChangeCycleIndex>();
  const endChangeCycleSubject = new Subject<IChangeCycleIndex>();

  const watchState = jest.fn();
  const getState = jest.fn();
  const releaseState = jest.fn();

  const instance = {
    changed: changedSubject.asObservable(),
    contextChanged: contextChangedSubject.asObservable(),
    startChangeCycle: startChangeCycleSubject.asObservable(),
    endChangeCycle: endChangeCycleSubject.asObservable(),
    watchState,
    getState,
    releaseState,
  } as unknown as IStateManager;

  return {
    changedSubject,
    contextChangedSubject,
    startChangeCycleSubject,
    endChangeCycleSubject,
    instance,
    watchState,
    getState,
    releaseState,
  };
};

describe('WatchFactory', () => {
  let stateManagerMock: IStateManagerMock;
  let guidFactory: IGuidFactory;
  let watchFactory: WatchFactory;

  beforeEach(() => {
    stateManagerMock = createStateManagerMock();
    let guidIndex = 0;
    guidFactory = {
      create: jest.fn(() => `guid-${++guidIndex}`),
    } as unknown as IGuidFactory;
    watchFactory = new WatchFactory(stateManagerMock.instance, guidFactory);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('watches non-readonly state, falls back to getState when watchState returns undefined, and reference-counted unwatch works', () => {
    const context = { a: 1 };
    const index = 'a';
    stateManagerMock.watchState.mockReturnValue(undefined);
    stateManagerMock.getState.mockReturnValue(10);
    jest.spyOn(Type, 'isReadonlyProperty').mockReturnValue(false);

    const watch = watchFactory.create({
      context,
      index,
      options: {},
    }).instance;

    watch.watch();
    expect(stateManagerMock.watchState).toHaveBeenCalledTimes(1);
    expect(stateManagerMock.getState).toHaveBeenCalledTimes(1);
    expect(watch.value).toBe(10);

    // Second watch call only increases internal ref count.
    watch.watch();
    expect(stateManagerMock.watchState).toHaveBeenCalledTimes(1);

    watch.unwatch();
    expect(stateManagerMock.releaseState).toHaveBeenCalledTimes(0);

    watch.unwatch();
    expect(stateManagerMock.releaseState).toHaveBeenCalledTimes(1);
    expect(stateManagerMock.releaseState).toHaveBeenCalledWith(
      context,
      index,
      undefined,
    );
  });

  it('uses getState for readonly properties', () => {
    const context = { a: 1 };
    const index = 'a';
    stateManagerMock.getState.mockReturnValue(5);
    jest.spyOn(Type, 'isReadonlyProperty').mockReturnValue(true);

    const watch = watchFactory.create({
      context,
      index,
      options: {},
    }).instance;

    watch.watch();

    expect(stateManagerMock.watchState).not.toHaveBeenCalled();
    expect(stateManagerMock.getState).toHaveBeenCalledWith(context, index);
    expect(watch.value).toBe(5);
  });

  it('forwards matching state, context, and cycle events and ignores mismatches', () => {
    const context = { a: 1 };
    const otherContext = { a: 2 };
    const newContext = { a: 3 };
    const index = 'a';
    jest.spyOn(Type, 'isReadonlyProperty').mockReturnValue(false);
    stateManagerMock.watchState.mockReturnValue(1);

    const watch = watchFactory.create({
      context,
      index,
      options: {},
    }).instance;

    const changed: IStateChange[] = [];
    const contexts: IContextChanged[] = [];
    const starts: IChangeCycleIndex[] = [];
    const ends: IChangeCycleIndex[] = [];
    watch.changed.subscribe((event) => changed.push(event));
    watch.contextChange.subscribe((event) => contexts.push(event));
    watch.startChangeCycle.subscribe((event) => starts.push(event));
    watch.endChangeCycle.subscribe((event) => ends.push(event));

    watch.watch();

    stateManagerMock.changedSubject.next({
      context: otherContext,
      oldContext: otherContext,
      index,
      oldValue: 0,
      newValue: 99,
    });
    expect(changed).toHaveLength(0);

    const validStateChange: IStateChange = {
      context,
      oldContext: context,
      index,
      oldValue: 1,
      newValue: 2,
    };
    stateManagerMock.changedSubject.next(validStateChange);
    expect(changed).toEqual([validStateChange]);
    expect(watch.value).toBe(2);

    stateManagerMock.contextChangedSubject.next({
      context: newContext,
      oldContext: otherContext,
      index,
    });
    expect(contexts).toHaveLength(0);

    const validContextChanged: IContextChanged = {
      context: newContext,
      oldContext: context,
      index,
    };
    stateManagerMock.contextChangedSubject.next(validContextChanged);
    expect(contexts).toEqual([validContextChanged]);
    expect(watch.context).toBe(newContext);

    stateManagerMock.startChangeCycleSubject.next({
      context: otherContext,
      index,
    });
    stateManagerMock.endChangeCycleSubject.next({
      context: otherContext,
      index,
    });
    expect(starts).toHaveLength(0);
    expect(ends).toHaveLength(0);

    const validStart = { context: newContext, index };
    const validEnd = { context: newContext, index };
    stateManagerMock.startChangeCycleSubject.next(validStart);
    stateManagerMock.endChangeCycleSubject.next(validEnd);
    expect(starts).toEqual([validStart]);
    expect(ends).toEqual([validEnd]);
  });

  it('does not rebind context when ownerId is set', () => {
    const context = { a: 1 };
    const newContext = { a: 2 };
    const index = 'a';
    jest.spyOn(Type, 'isReadonlyProperty').mockReturnValue(false);
    stateManagerMock.watchState.mockReturnValue(1);

    const watch = watchFactory.create({
      context,
      index,
      options: { ownerId: 'owner' },
    }).instance;
    const contexts: IContextChanged[] = [];
    watch.contextChange.subscribe((event) => contexts.push(event));

    watch.watch();
    stateManagerMock.contextChangedSubject.next({
      context: newContext,
      oldContext: context,
      index,
    });

    expect(contexts).toHaveLength(0);
    expect(watch.context).toBe(context);
  });

  it('dispose honors factory reference ownership and is idempotent', () => {
    const context = { a: 1 };
    const index = 'a';
    jest.spyOn(Type, 'isReadonlyProperty').mockReturnValue(false);
    stateManagerMock.watchState.mockReturnValue(1);

    const first = watchFactory.create({ context, index, options: {} }).instance;
    const second = watchFactory.create({
      context,
      index,
      options: {},
    }).instance;
    expect(first).toBe(second);

    first.watch();

    const changed: IStateChange[] = [];
    first.changed.subscribe((event) => changed.push(event));

    // First dispose cannot teardown shared instance yet.
    first.dispose();
    stateManagerMock.changedSubject.next({
      context,
      oldContext: context,
      index,
      oldValue: 1,
      newValue: 2,
    });
    expect(changed).toHaveLength(1);
    expect(stateManagerMock.releaseState).toHaveBeenCalledTimes(0);

    // Now owner can dispose and unsubscribe.
    first.dispose();
    expect(stateManagerMock.releaseState).toHaveBeenCalledTimes(1);

    // Idempotent.
    first.dispose();
    expect(stateManagerMock.releaseState).toHaveBeenCalledTimes(1);
  });

  it('shares watches by index when no watch rule and by identity when watch rule is present', () => {
    const context = { a: 1 };
    const ruleA = new IndexWatchRuleMock();
    const ruleB = new IndexWatchRuleMock();

    const noRuleA = watchFactory.create({
      context,
      index: 'a',
      options: {},
    }).instance;
    const noRuleB = watchFactory.create({
      context,
      index: 'a',
      options: {},
    }).instance;
    expect(noRuleA).toBe(noRuleB);

    const withRuleA1 = watchFactory.create({
      context,
      index: 'a',
      options: { indexWatchRule: ruleA },
    }).instance;
    const withRuleA2 = watchFactory.create({
      context,
      index: 'a',
      options: { indexWatchRule: ruleA },
    }).instance;
    const withRuleB = watchFactory.create({
      context,
      index: 'a',
      options: { indexWatchRule: ruleB },
    }).instance;
    expect(withRuleA1).toBe(withRuleA2);
    expect(withRuleA1).not.toBe(withRuleB);
  });

  it('supports identity keys for primitive, null, object and function indexes with watch rules', () => {
    const context = { a: 1 };
    const rule = new IndexWatchRuleMock();
    const objectIndex = { key: 'x' };
    const functionIndex = () => 1;

    const primitiveA = watchFactory.create({
      context,
      index: 1,
      options: { indexWatchRule: rule },
    }).instance;
    const primitiveB = watchFactory.create({
      context,
      index: 1,
      options: { indexWatchRule: rule },
    }).instance;
    expect(primitiveA).toBe(primitiveB);

    const nullA = watchFactory.create({
      context,
      index: null,
      options: { indexWatchRule: rule },
    }).instance;
    const nullB = watchFactory.create({
      context,
      index: null,
      options: { indexWatchRule: rule },
    }).instance;
    expect(nullA).toBe(nullB);

    const objectA = watchFactory.create({
      context,
      index: objectIndex,
      options: { indexWatchRule: rule },
    }).instance;
    const objectB = watchFactory.create({
      context,
      index: objectIndex,
      options: { indexWatchRule: rule },
    }).instance;
    expect(objectA).toBe(objectB);

    const functionA = watchFactory.create({
      context,
      index: functionIndex,
      options: { indexWatchRule: rule },
    }).instance;
    const functionB = watchFactory.create({
      context,
      index: functionIndex,
      options: { indexWatchRule: rule },
    }).instance;
    expect(functionA).toBe(functionB);
  });

  it('unwatch is safe when watch was never started', () => {
    const watch = watchFactory.create({
      context: { a: 1 },
      index: 'a',
      options: {},
    }).instance;

    watch.unwatch();
    expect(stateManagerMock.releaseState).not.toHaveBeenCalled();
  });
});
