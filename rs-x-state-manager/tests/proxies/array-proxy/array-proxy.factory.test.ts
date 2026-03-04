import { ProxyRegistry } from '@rs-x/core';
import { ArrayProxyFactory } from '../../../lib/proxies/array-proxy/array-proxy.factory';


describe('ArrayProxyFactory tests', () => {
  let arrayProxyFactory: ArrayProxyFactory;
  beforeEach(() => {
    arrayProxyFactory = new ArrayProxyFactory(new ProxyRegistry());
  });

  it('Will create an instance of array proxy', () => {
    const actual = arrayProxyFactory.create({
      array: [],
    }).instance;

    expect(actual).toBeDefined();
    expect(actual.proxy).toBeDefined();
    expect(actual.observer).toBeDefined();
  });
});
