import { GuidFactory } from '@rs-x/core';
import { ProxyRegistryMock } from '@rs-x/core/testing';

import { DateProxyFactory } from '../../../lib/proxies/date-proxy/date-proxy.factory';

describe('DateProxyFactory tests', () => {
  let dateProxyFactory: DateProxyFactory;
  beforeEach(() => {
    dateProxyFactory = new DateProxyFactory(
      new GuidFactory(),
      new ProxyRegistryMock(),
    );
  });

  it('will  create an instance of date proxy', () => {
    const actual = dateProxyFactory.create({
      date: new Date(),
    }).instance;

    expect(actual).toBeDefined();
    expect(actual.proxy).toBeDefined();
    expect(actual.observer).toBeDefined();
  });
});
