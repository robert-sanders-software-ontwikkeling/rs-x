import { of } from 'rxjs';

import {
  InjectionContainer,
  type IPropertyChange,
  WaitForEvent,
} from '@rs-x/core';
import { DisposableOwnerMock } from '@rs-x/core/testing';

import { type IObserver } from '../../../../lib/observer.interface';
import { type IIndexObserverProxyPairFactory } from '../../../../lib/property-observer/index-observer-proxy-pair.factory.interface';
import { type IArrayProxyFactory } from '../../../../lib/proxies/array-proxy/array-proxy.factory.type';
import { RsXStateManagerModule } from '../../../../lib/rs-x-state-manager.module';
import { RsXStateManagerInjectionTokens } from '../../../../lib/rs-x-state-manager-injection-tokens';
import { IndexWatchRuleMock } from '../../../../lib/testing/watch-index-rule.mock';

describe('non iterableObjectPropertyObserverFactory', () => {
  let disposableOwner: DisposableOwnerMock;
  let observer: IObserver | undefined;
  let recursiveObserver: IObserver | undefined;
  let nonRecursiveObserver: IObserver | undefined;
  let arrayProxyFactory: IArrayProxyFactory;
  let nonIterableObjectPropertyObserverFactory: IIndexObserverProxyPairFactory;
  let indexWatchRule: IndexWatchRuleMock;

  beforeAll(async () => {
    await InjectionContainer.load(RsXStateManagerModule);
    nonIterableObjectPropertyObserverFactory =
      InjectionContainer.get<IIndexObserverProxyPairFactory>(
        RsXStateManagerInjectionTokens.NonIterableObjectPropertyObserverProxyPairFactory,
      );
    arrayProxyFactory = InjectionContainer.get<IArrayProxyFactory>(
      RsXStateManagerInjectionTokens.IArrayProxyFactory,
    );
  });

  beforeEach(() => {
    indexWatchRule = new IndexWatchRuleMock();
    indexWatchRule.test.mockReturnValue(true);
  });

  afterAll(async () => {
    await InjectionContainer.unload(RsXStateManagerModule);
  });

  beforeEach(() => {
    disposableOwner = new DisposableOwnerMock();
  });

  afterEach(() => {
    observer?.dispose();
    recursiveObserver?.dispose();
    nonRecursiveObserver?.dispose();
    observer = undefined;
    recursiveObserver = undefined;
    nonRecursiveObserver = undefined;
  });

  it('applies return true if object is not iterable', () => {
    const actual = nonIterableObjectPropertyObserverFactory.applies(
      {},
      { index: 'x' },
    );
    expect(actual).toEqual(true);
  });

  it('applies return false if object is array', () => {
    const actual = nonIterableObjectPropertyObserverFactory.applies([], {
      index: 'x',
    });
    expect(actual).toEqual(false);
  });

  it('applies return false if object is Map', () => {
    const actual = nonIterableObjectPropertyObserverFactory.applies(new Map(), {
      index: 'x',
    });
    expect(actual).toEqual(false);
  });

  it('applies return false if object is Set', () => {
    const actual = nonIterableObjectPropertyObserverFactory.applies(new Set(), {
      index: 'x',
    });
    expect(actual).toEqual(false);
  });

  it('create will return no proxy for value type', () => {
    const object = { x: 300 };
    const actual = nonIterableObjectPropertyObserverFactory.create(
      disposableOwner,
      object,
      { index: 'x', indexWatchRule },
    ).proxy;

    expect(actual).toBeUndefined();
  });

  it('create will return proxy for property value for recursive observer if proxy is creayed', () => {
    const array = [];
    const object = { x: array };
    const actual = nonIterableObjectPropertyObserverFactory.create(
      disposableOwner,
      object,
      { index: 'x', indexWatchRule },
    ).proxy;

    const expected = arrayProxyFactory.getFromData({
      array,
    })?.proxy;
    expect(actual).toBe(expected);
  });

  it('create will return no proxy for property value for non-recursive observer', () => {
    const array = [];
    const object = { x: array };
    const actual = nonIterableObjectPropertyObserverFactory.create(
      disposableOwner,
      object,
      { index: 'x' },
    ).proxy;

    expect(actual).toBeUndefined();
  });

  it('create will replace property with proxy for recursive observer', () => {
    const array = [];
    const object = { x: array };

    nonIterableObjectPropertyObserverFactory.create(disposableOwner, object, {
      index: 'x',
      indexWatchRule,
    });

    const expected = arrayProxyFactory.getFromData({
      array,
    })?.proxy;
    expect(object.x).toBe(expected);
  });

  it('old proxy will be replaced if we set property to new value', () => {
    const array: number[] = [];
    const object = { x: array };

    nonIterableObjectPropertyObserverFactory.create(disposableOwner, object, {
      index: 'x',
      indexWatchRule,
    });

    const newArray = [1];
    object.x = newArray;

    const expected = arrayProxyFactory.getFromData({
      array: newArray,
    })?.proxy;
    expect(object.x).toBe(expected);
  });

  it('old proxy will be dispose if we set property to new value', () => {
    const oldArray: number[] = [];
    const object = { x: oldArray };

    nonIterableObjectPropertyObserverFactory.create(disposableOwner, object, {
      index: 'x',
      indexWatchRule,
    });

    expect(
      arrayProxyFactory.getFromData({
        array: oldArray,
      }),
    ).toBeDefined();

    const newArray = [1];
    object.x = newArray;

    expect(
      arrayProxyFactory.getFromData({
        array: oldArray,
      }),
    ).toBeUndefined();

    expect(
      arrayProxyFactory.getFromData({
        array: newArray,
      }),
    ).toBeDefined();
    expect(object.x).toBe(
      arrayProxyFactory.getFromData({
        array: newArray,
      })?.proxy,
    );
  });

  it('if we set set property to a new Promise it will be observed ', async () => {
    const object = { x: Promise.resolve(10) };
    observer = nonIterableObjectPropertyObserverFactory.create(
      disposableOwner,
      object,
      { index: 'x', indexWatchRule },
    ).observer;

    const actual = await new WaitForEvent(observer, 'changed').wait(() => {
      object.x = Promise.resolve(20);
    });

    const expected: IPropertyChange = {
      arguments: [],
      chain: [{ context: object, index: 'x' }],
      newValue: 20,
      target: object.x,
    };

    expect(actual).toEqual(expected);
  });

  it('if we set set property to a new Observable it will be observed ', async () => {
    const object = { x: of(10) };
    observer = nonIterableObjectPropertyObserverFactory.create(
      disposableOwner,
      object,
      { index: 'x', indexWatchRule },
    ).observer;

    const actual = await new WaitForEvent(observer, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      object.x = of(20);
    });

    const expected: IPropertyChange = {
      arguments: [],
      chain: [{ context: object, index: 'x' }],
      newValue: 20,
      target: object.x,
    };

    expect(actual).toEqual(expected);
  });

  it('if we set set property to new value it will be observed for recursive observer', async () => {
    const object = { x: [] as number[] };
    observer = nonIterableObjectPropertyObserverFactory.create(
      disposableOwner,
      object,
      { index: 'x', indexWatchRule },
    ).observer;
    object.x = [1, 2, 3];

    const actual = await new WaitForEvent(observer, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      object.x.push(4);
    });

    const expected: IPropertyChange = {
      arguments: [],
      chain: [
        { context: object, index: 'x' },
        { context: object.x, index: 3 },
      ],
      index: 3,
      newValue: 4,
      target: object.x,
    };

    expect(actual).toEqual(expected);
  });

  it('change event will emit if we change property value for recursive observer', async () => {
    const object = { x: [] as number[] };
    observer = nonIterableObjectPropertyObserverFactory.create(
      disposableOwner,
      object,
      { index: 'x', indexWatchRule },
    ).observer;

    const actual = await new WaitForEvent(observer, 'changed').wait(() => {
      object.x.push(1);
    });

    const expected: IPropertyChange = {
      arguments: [],
      chain: [
        { context: object, index: 'x' },
        { context: object.x, index: 0 },
      ],
      index: 0,
      newValue: 1,
      target: object.x,
    };

    expect(actual).toEqual(expected);
  });

  it('change event will not emit if we change property value for non-recursive observer', async () => {
    const object = { x: [] as number[] };
    observer = nonIterableObjectPropertyObserverFactory.create(
      disposableOwner,
      object,
      { index: 'x' },
    ).observer;

    const actual = await new WaitForEvent(observer, 'changed').wait(() => {
      object.x.push(1);
    });

    expect(actual).toBeNull();
  });

  it('can create recursive and  non-recursive observer without conflicts: changing index value', async () => {
    const object = { x: [] as number[] };
    recursiveObserver = nonIterableObjectPropertyObserverFactory.create(
      disposableOwner,
      object,
      { index: 'x', indexWatchRule },
    ).observer;
    nonRecursiveObserver = nonIterableObjectPropertyObserverFactory.create(
      disposableOwner,
      object,
      { index: 'x' },
    ).observer;

    let actual = await new WaitForEvent(recursiveObserver, 'changed').wait(
      () => {
        object.x.push(1);
      },
    );

    expect(actual).not.toBeNull();

    actual = await new WaitForEvent(nonRecursiveObserver, 'changed').wait(
      () => {
        object.x.push(12);
      },
    );

    expect(actual).toBeNull();
  });

  it('can create recursive and non-recursive observer without conflicts: setting index value', async () => {
    const object = { x: [] as number[] };
    recursiveObserver = nonIterableObjectPropertyObserverFactory.create(
      disposableOwner,
      object,
      { index: 'x', indexWatchRule },
    ).observer;
    nonRecursiveObserver = nonIterableObjectPropertyObserverFactory.create(
      disposableOwner,
      object,
      { index: 'x' },
    ).observer;

    let actual = await new WaitForEvent(recursiveObserver, 'changed').wait(
      () => {
        object.x = [1];
      },
    );

    let expected: IPropertyChange = {
      arguments: [],
      chain: [{ context: object, index: 'x' }],
      index: 'x',
      newValue: [1],
      target: object,
    };
    expect(actual).toEqual(expected);

    actual = await new WaitForEvent(nonRecursiveObserver, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      object.x = [2];
    });

    expected = {
      arguments: [],
      chain: [{ context: object, index: 'x' }],
      index: 'x',
      newValue: [2],
      target: object,
    };
    expect(actual).toEqual(expected);
  });

  it('can create recursive and non-recursive observer without conflicts: changing nested value', async () => {
    const object = { x: [] as unknown[] };
    recursiveObserver = nonIterableObjectPropertyObserverFactory.create(
      disposableOwner,
      object,
      { index: 'x', indexWatchRule },
    ).observer;
    nonRecursiveObserver = nonIterableObjectPropertyObserverFactory.create(
      disposableOwner,
      object,
      { index: 'x' },
    ).observer;

    let actual = await new WaitForEvent(recursiveObserver, 'changed').wait(
      () => {
        object.x.push(1);
      },
    );

    const expected: IPropertyChange = {
      arguments: [],
      chain: [
        { context: object, index: 'x' },
        { context: object.x, index: 0 },
      ],
      index: 0,
      newValue: 1,
      target: object.x,
    };

    expect(actual).toEqual(expected);

    actual = await new WaitForEvent(nonRecursiveObserver, 'changed').wait(
      () => {
        object.x.push(2);
      },
    );

    expect(actual).toBeNull();
  });
});
