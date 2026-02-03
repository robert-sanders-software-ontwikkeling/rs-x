import {
  emptyFunction,
  ErrorLog,
  GuidFactory,
  InjectionContainer,
  type IPropertyChange,
  truePredicate,
  WaitForEvent,
} from '@rs-x/core';

import { type IObjectPropertyObserverProxyPairManager } from '../../lib/object-property-observer-proxy-pair-manager.type';
import { RsXStateManagerModule } from '../../lib/rs-x-state-manager.module';
import { RsXStateManagerInjectionTokens } from '../../lib/rs-x-state-manager-injection-tokens';
import { StateChangeSubscriptionManager } from '../../lib/state-manager/state-change-subscription-manager/state-change-subsription-manager';
import { IndexWatchRuleMock } from '../../lib/testing/watch-index-rule.mock';

describe('StateChangeSubscriptionManager tests', () => {
  let stateChangeSubscriptionManager: StateChangeSubscriptionManager;
  let indexWatchRule: IndexWatchRuleMock;

  beforeAll(async () => {
    await InjectionContainer.load(RsXStateManagerModule);
  });

  afterAll(async () => {
    await InjectionContainer.unload(RsXStateManagerModule);
  });

  beforeEach(() => {
    stateChangeSubscriptionManager = new StateChangeSubscriptionManager(
      InjectionContainer.get(
        RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager,
      ),
      new ErrorLog(),
      new GuidFactory(),
    );
    indexWatchRule = new IndexWatchRuleMock();
    indexWatchRule.test.mockReturnValue(true);
  });

  afterEach(() => {
    stateChangeSubscriptionManager.dispose();
  });

  it('can create a recursive and unrecursive observer for a property ', () => {
    const context = {
      x: {
        y: 10,
      },
    };
    const stateChangeSubscrionInfoForContext =
      stateChangeSubscriptionManager.create(context).instance;
    const recursiveObserver = stateChangeSubscrionInfoForContext.create({
      index: 'x',
      indexWatchRule,
      onChanged: emptyFunction,
    }).instance;
    const nonRecursiveObserver = stateChangeSubscrionInfoForContext.create({
      index: 'x',
      onChanged: emptyFunction,
    }).instance;

    expect(recursiveObserver).not.toBeNull();
    expect(recursiveObserver).not.toBeUndefined();
    expect(nonRecursiveObserver).not.toBeNull();
    expect(nonRecursiveObserver).not.toBeUndefined();
    expect(recursiveObserver).not.toBe(nonRecursiveObserver);
  });

  it('recursive  observer still works after disposing non recursive observer', async () => {
    const context = {
      x: {
        y: 10,
      },
    };
    const stateChangeSubscriptionInfoForContext =
      stateChangeSubscriptionManager.create(context).instance;
    const recursiveObserver = stateChangeSubscriptionInfoForContext.create({
      index: 'x',
      indexWatchRule,
      onChanged: emptyFunction,
    }).instance;
    const nonRecursiveObserver = stateChangeSubscriptionInfoForContext.create({
      index: 'x',
      onChanged: emptyFunction,
    }).instance;

    nonRecursiveObserver.dispose();

    const recursiveChange = await new WaitForEvent(
      recursiveObserver,
      'changed',
    ).wait(() => {
      context.x.y = 20;
    });

    const expected: IPropertyChange = {
      arguments: [],
      chain: [
        { context: context, index: 'x' },
        { context: context.x, index: 'y' },
      ],
      target: context.x,
      index: 'y',
      newValue: 20,
    };

    expect(recursiveChange).toEqual(expected);
  });

  it('non-recursive observer still works after disposing recursive observer', async () => {
    const context = {
      x: {
        y: 10,
      },
    };
    const stateChangeSubscrionInfoForContext =
      stateChangeSubscriptionManager.create(context).instance;
    const recursiveObserver = stateChangeSubscrionInfoForContext.create({
      index: 'x',
      indexWatchRule,
      onChanged: emptyFunction,
    }).instance;
    const nonRecursiveObserver = stateChangeSubscrionInfoForContext.create({
      index: 'x',
      onChanged: emptyFunction,
    }).instance;

    recursiveObserver.dispose();

    const nonRecursiveChange = await new WaitForEvent(
      nonRecursiveObserver,
      'changed',
    ).wait(() => {
      context.x = { y: 20 };
    });

    const expected: IPropertyChange = {
      arguments: [],
      chain: [{ context: context, index: 'x' }],
      target: context,
      index: 'x',
      newValue: { y: 20 },
    };

    expect(nonRecursiveChange).toEqual(expected);
  });

  it('recursive observer still works after disposing non-recursive observer', async () => {
    const context = {
      x: {
        y: 10,
      },
    };
    const stateChangeSubscrionInfoForContext =
      stateChangeSubscriptionManager.create(context).instance;
    const recursiveObserver = stateChangeSubscrionInfoForContext.create({
      index: 'x',
      indexWatchRule,
      onChanged: emptyFunction,
    }).instance;
    const nonRecursiveObserver = stateChangeSubscrionInfoForContext.create({
      index: 'x',
      onChanged: emptyFunction,
    }).instance;

    recursiveObserver.dispose();

    const nonRecursiveChange = await new WaitForEvent(
      nonRecursiveObserver,
      'changed',
    ).wait(() => {
      context.x = { y: 20 };
    });

    const expected: IPropertyChange = {
      arguments: [],
      chain: [{ context: context, index: 'x' }],
      target: context,
      index: 'x',
      newValue: { y: 20 },
    };

    expect(nonRecursiveChange).toEqual(expected);
  });

  it('recursive and unrecursive observer: no conclict to detect changes ', async () => {
    const context = {
      x: {
        y: 10,
      },
    };

    const stateChangeSubscrionInfoForContext =
      stateChangeSubscriptionManager.create(context).instance;
    const recursiveObserver = stateChangeSubscrionInfoForContext.create({
      index: 'x',
      indexWatchRule,
      onChanged: emptyFunction,
    }).instance;
    const nonRecursiveObserver = stateChangeSubscrionInfoForContext.create({
      index: 'x',
      onChanged: emptyFunction,
    }).instance;

    const nonRecursiveChange = await new WaitForEvent(
      nonRecursiveObserver,
      'changed',
    ).wait(() => {
      context.x.y = 15;
    });

    const recursiveChange = await new WaitForEvent(
      recursiveObserver,
      'changed',
      { ignoreInitialValue: true },
    ).wait(() => {
      context.x.y = 20;
    });

    expect(nonRecursiveChange).toBeNull();
    const expected: IPropertyChange = {
      arguments: [],
      chain: [
        { context: context, index: 'x' },
        { context: context.x, index: 'y' },
      ],
      target: context.x,
      index: 'y',
      newValue: 20,
    };

    expect(recursiveChange).toEqual(expected);
  });

  it('recursive and unrecursive observer:  all proxies have been release when all observers have been disposed', async () => {
    const propertyObserverProxyPairManager =
      InjectionContainer.get<IObjectPropertyObserverProxyPairManager>(
        RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager,
      );
    const context = {
      x: {
        y: 10,
      },
    };
    const stateChangeSubscrionInfoForContext =
      stateChangeSubscriptionManager.create(context).instance;
    const recursiveObserver = stateChangeSubscrionInfoForContext.create({
      index: 'x',
      indexWatchRule,
      onChanged: emptyFunction,
    }).instance;
    const nonRecursiveObserver = stateChangeSubscrionInfoForContext.create({
      index: 'x',
      onChanged: emptyFunction,
    }).instance;

    const rootPropertyObserverProxyPairManager =
      propertyObserverProxyPairManager.getFromId(context);
    const nestedPropertyObserverProxyPairManager =
      propertyObserverProxyPairManager.getFromId(context.x);
    expect(rootPropertyObserverProxyPairManager).toBeDefined();
    expect(nestedPropertyObserverProxyPairManager).toBeDefined();

    expect(
      rootPropertyObserverProxyPairManager?.getFromData({
        index: 'x',
        indexWatchRule,
      }),
    ).toBeDefined();
    expect(
      rootPropertyObserverProxyPairManager?.getFromData({
        index: 'x',
      }),
    ).toBeDefined();
    expect(
      nestedPropertyObserverProxyPairManager?.getFromData({
        index: 'y',
        indexWatchRule,
      }),
    ).toBeDefined();

    recursiveObserver.dispose();

    expect(
      rootPropertyObserverProxyPairManager?.getFromData({
        index: 'x',
        indexWatchRule,
      }),
    ).toBeUndefined();
    expect(
      rootPropertyObserverProxyPairManager?.getFromData({
        index: 'x',
      }),
    ).toBeDefined();
    expect(
      nestedPropertyObserverProxyPairManager?.getFromData({
        index: 'y',
        indexWatchRule,
      }),
    ).toBeUndefined();

    nonRecursiveObserver.dispose();

    expect(
      rootPropertyObserverProxyPairManager?.getFromId({
        key: 'x',
        mustProxify: truePredicate,
      }),
    ).toBeUndefined();
    expect(
      rootPropertyObserverProxyPairManager?.getFromId({
        key: 'x',
      }),
    ).toBeUndefined();
    expect(
      nestedPropertyObserverProxyPairManager?.getFromId({
        key: 'y',
        mustProxify: truePredicate,
      }),
    ).toBeUndefined();
  });
});
