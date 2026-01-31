import {
  type IPropertyChange,
  PromiseAccessor,
  WaitForEvent,
} from '@rs-x/core';
import { ResolvedValueCacheMock } from '@rs-x/core/testing';

import { PromiseProxyFactory } from '../../../lib/proxies/promise-proxy/promise-proxy.factory';

describe('PromiseProxy tests', () => {
  it('dispose will unregister proxy when all references are released', () => {
    const promiseProxyFactory = new PromiseProxyFactory(
      new PromiseAccessor(new ResolvedValueCacheMock()),
    );
    const promise = Promise.resolve(10);

    const { observer: observer1 } = promiseProxyFactory.create({
      promise,
    }).instance;
    const { observer: observer2 } = promiseProxyFactory.create({
      promise,
    }).instance;

    expect(observer1).toBe(observer2);

    expect(promiseProxyFactory.getFromId(promise)).toBeDefined();

    observer1.dispose();

    expect(promiseProxyFactory.getFromId(promise)).toBeDefined();

    observer2.dispose();

    expect(promiseProxyFactory.getFromId(promise)).toBeUndefined();
  });

  it('will emit initial value if promise is resolved before subscribing to change event', async () => {
    const promiseProxyFactory = new PromiseProxyFactory(
      new PromiseAccessor(new ResolvedValueCacheMock()),
    );
    const promise = Promise.resolve(10);

    const { observer } = promiseProxyFactory.create({ promise }).instance;

    const actual = await new WaitForEvent(observer, 'changed').wait(() => {});

    const expected: IPropertyChange = {
      arguments: [],
      chain: [],
      newValue: 10,
      target: promise,
    };
    expect(actual).toEqual(expected);
  });

  it('will emit  value if promise is resolved after subscribing to change event', async () => {
    const promiseProxyFactory = new PromiseProxyFactory(
      new PromiseAccessor(new ResolvedValueCacheMock()),
    );
    let resolve: (value: number) => void;
    const promise = new Promise<number>(
      (resolveHandler: (value: number) => void) => {
        resolve = resolveHandler;
      },
    );
    const { observer } = promiseProxyFactory.create({ promise }).instance;

    const actual = await new WaitForEvent(observer, 'changed').wait(() => {
      resolve(10);
    });

    const expected: IPropertyChange = {
      arguments: [],
      chain: [],
      newValue: 10,
      target: promise,
    };
    expect(actual).toEqual(expected);
  });
});
