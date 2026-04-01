import {
  type IPropertyChange,
  utCDate,
  WaitForEvent,
} from '@rs-x/core';
import { ProxyRegistryMock } from '@rs-x/core/testing';

import type { IObserver } from '../../../lib/observer.interface';
import { DateProxyFactory } from '../../../lib/proxies/date-proxy/date-proxy.factory';
import { IndexWatchRuleMock } from '../../../lib/testing/watch-index-rule.mock';

describe('DateProxy tests', () => {
function expectDateParts(actual: Date, expected: Date): void {
  expect(actual.getFullYear()).toEqual(expected.getFullYear());
  expect(actual.getMonth()).toEqual(expected.getMonth());
  expect(actual.getDate()).toEqual(expected.getDate());
  expect(actual.getHours()).toEqual(expected.getHours());
  expect(actual.getMinutes()).toEqual(expected.getMinutes());
  expect(actual.getSeconds()).toEqual(expected.getSeconds());
  expect(actual.getMilliseconds()).toEqual(expected.getMilliseconds());
}

  let indexWatchRule: IndexWatchRuleMock;

  beforeEach(() => {
    indexWatchRule = new IndexWatchRuleMock();
    indexWatchRule.test.mockReturnValue(true);
  });

  it('Node timezone is UTC', () => {
    process.env.TZ = process.env.TZ ?? 'UTC';
    expect(process.env.TZ).toEqual('UTC');
  });

  it('create will register the data proxy to the proxy registry', () => {
    const date = new Date();
    const proxyRegistry = new ProxyRegistryMock();
    const setProxyFactory = new DateProxyFactory(
      proxyRegistry,
    );
    const { proxy } = setProxyFactory.createAndGetInstance({ date });

    expect(proxyRegistry.register).toHaveBeenCalledTimes(1);
    expect(proxyRegistry.register.mock.calls[0][0]).toBe(date);
    expect(proxyRegistry.register.mock.calls[0][1]).toBe(proxy);
  });

  it('dispose will unregister the data proxy to the proxy registry', () => {
    const date = new Date();
    const proxyRegistry = new ProxyRegistryMock();
    const setProxyFactory = new DateProxyFactory(
      proxyRegistry,
    );
    const { observer } = setProxyFactory.createAndGetInstance({ date });

    observer.dispose();

    expect(proxyRegistry.unregister).toHaveBeenCalledTimes(1);
    expect(proxyRegistry.unregister).toHaveBeenCalledWith(date);
  });

  it('dispose will unregister proxy when all references are released', () => {
    const dateProxyFactory = new DateProxyFactory(
      new ProxyRegistryMock(),
    );
    const date = new Date();

    const { observer: observer1 } = dateProxyFactory.create({
      date,
    }).instance;
    const { observer: observer2 } = dateProxyFactory.create({
      date,
    }).instance;

    const id = dateProxyFactory.getId({ date }) as number;
    expect(id).toBeDefined();

    expect(observer1).toBe(observer2);
    expect(dateProxyFactory.getFromId(id)).toBeDefined();

    observer1.dispose();

    expect(dateProxyFactory.getFromId(id)).toBeDefined();

    observer2.dispose();

    expect(dateProxyFactory.getFromId(id)).toBeUndefined();
  });

  describe('all date operation still work as before', () => {
    it('setFullYear', () => {
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date: utCDate(2021, 0, 2),
      }).instance.proxy as Date;

      const timestamp = proxy.setFullYear(2022);

      expect(new Date(timestamp)).toEqual(utCDate(2022, 0, 2));
      expectDateParts(proxy, new Date(timestamp));
    });

    it('setUTCFullYear', () => {
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date: utCDate(2021, 0, 2),
      }).instance.proxy as Date;

      const timestamp = proxy.setUTCFullYear(2022);

      expect(new Date(timestamp)).toEqual(utCDate(2022, 0, 2));
      expectDateParts(proxy, new Date(timestamp));
    });

    it('setMonth', () => {
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date: utCDate(2021, 0, 2),
      }).instance.proxy as Date;

      const timestamp = proxy.setMonth(1);

      expect(new Date(timestamp)).toEqual(utCDate(2021, 1, 2));
      expectDateParts(proxy, new Date(timestamp));
    });

    it('setUTCMonth', () => {
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date: utCDate(2021, 0, 2),
      }).instance.proxy as Date;
      const timestamp = proxy.setUTCMonth(1);

      expect(new Date(timestamp)).toEqual(utCDate(2021, 1, 2));
      expectDateParts(proxy, new Date(timestamp));
    });

    it('setDate', () => {
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date: utCDate(2021, 0, 2),
      }).instance.proxy as Date;
      const timestamp = proxy.setDate(4);

      expect(new Date(timestamp)).toEqual(utCDate(2021, 0, 4));
      expectDateParts(proxy, new Date(timestamp));
    });

    it('setUTCDate', () => {
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date: utCDate(2021, 0, 2),
      }).instance.proxy as Date;
      const timestamp = proxy.setUTCDate(4);

      expect(new Date(timestamp)).toEqual(utCDate(2021, 0, 4));
      expectDateParts(proxy, new Date(timestamp));
    });

    it('setHours', () => {
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date: utCDate(2021, 0, 2),
      }).instance.proxy as Date;
      const timestamp = proxy.setHours(3);

      expect(new Date(timestamp).getTime()).toEqual(proxy.getTime());
      expectDateParts(proxy, new Date(timestamp));
    });

    it('setUTCHours', () => {
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date: utCDate(2021, 0, 2),
      }).instance.proxy as Date;
      const timestamp = proxy.setUTCHours(3);

      expect(new Date(timestamp)).toEqual(utCDate(2021, 0, 2, 3));
      expectDateParts(proxy, new Date(timestamp));
    });

    it('setMinutes', () => {
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date: utCDate(2021, 0, 2),
      }).instance.proxy as Date;
      const timestamp = proxy.setMinutes(3);

      expect(new Date(timestamp)).toEqual(utCDate(2021, 0, 2, 0, 3));
      expectDateParts(proxy, new Date(timestamp));
    });

    it('setUTCMinutes', () => {
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date: utCDate(2021, 0, 2),
      }).instance.proxy as Date;
      const timestamp = proxy.setUTCMinutes(3);

      expect(new Date(timestamp)).toEqual(utCDate(2021, 0, 2, 0, 3));
      expectDateParts(proxy, new Date(timestamp));
    });

    it('setSeconds', () => {
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date: utCDate(2021, 0, 2),
      }).instance.proxy as Date;
      const timestamp = proxy.setSeconds(3);

      expect(new Date(timestamp)).toEqual(utCDate(2021, 0, 2, 0, 0, 3));
      expectDateParts(proxy, new Date(timestamp));
    });

    it('setUTCSeconds', () => {
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date: utCDate(2021, 0, 2),
      }).instance.proxy as Date;
      const timestamp = proxy.setUTCSeconds(3);

      expect(new Date(timestamp)).toEqual(utCDate(2021, 0, 2, 0, 0, 3));
      expectDateParts(proxy, new Date(timestamp));
    });

    it('setMilliseconds', () => {
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date: utCDate(2021, 0, 2),
      }).instance.proxy as Date;
      const timestamp = proxy.setMilliseconds(3);

      expect(new Date(timestamp)).toEqual(utCDate(2021, 0, 2, 0, 0, 0, 3));
      expectDateParts(proxy, new Date(timestamp));
    });

    it('setUTCMilliseconds', () => {
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date: utCDate(2021, 0, 2),
      }).instance.proxy as Date;
      const timestamp = proxy.setUTCMilliseconds(3);

      expect(new Date(timestamp)).toEqual(utCDate(2021, 0, 2, 0, 0, 0, 3));
      expectDateParts(proxy, new Date(timestamp));
    });

    it('setTime', () => {
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date: utCDate(2022, 1, 2),
      }).instance.proxy as Date;
      const timestamp = proxy.setTime(1612137600000);

      expect(new Date(timestamp)).toEqual(utCDate(2021, 1, 1));
      expectDateParts(proxy, new Date(timestamp));
    });

    it('toString', () => {
      const date = utCDate(2022, 1, 2);
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date,
      }).instance.proxy as Date;
      expect(date.toString()).toEqual(proxy.toString());
    });

    it('toDateString', () => {
      const date = utCDate(2022, 1, 2);
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date,
      }).instance.proxy as Date;
      expect(date.toDateString()).toEqual(proxy.toDateString());
    });

    it('toTimeString', () => {
      const date = utCDate(2022, 1, 2);
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date,
      }).instance.proxy as Date;
      expect(date.toTimeString()).toEqual(proxy.toTimeString());
    });

    it('toLocaleString', () => {
      const date = utCDate(2022, 1, 2);
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date,
      }).instance.proxy as Date;
      expect(date.toLocaleString()).toEqual(proxy.toLocaleString());
    });

    it('toLocaleDateString', () => {
      const date = utCDate(2022, 1, 2);
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date,
      }).instance.proxy as Date;
      expect(date.toLocaleDateString()).toEqual(proxy.toLocaleDateString());
    });

    it('toLocaleTimeString', () => {
      const date = utCDate(2022, 1, 2);
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date,
      }).instance.proxy as Date;
      expect(date.toLocaleTimeString()).toEqual(proxy.toLocaleTimeString());
    });

    it('valueOf', () => {
      const date = utCDate(2022, 1, 2);
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date,
      }).instance.proxy as Date;
      expect(date.valueOf()).toEqual(proxy.valueOf());
    });

    it('getTime', () => {
      const date = utCDate(2022, 1, 2);
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date,
      }).instance.proxy as Date;
      expect(date.getTime()).toEqual(proxy.getTime());
    });

    it('getFullYear', () => {
      const date = utCDate(2022, 1, 2);
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date,
      }).instance.proxy as Date;
      expect(date.getFullYear()).toEqual(proxy.getFullYear());
    });

    it('getUTCFullYear', () => {
      const date = utCDate(2022, 1, 2);
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date,
      }).instance.proxy as Date;

      expect(date.getUTCFullYear()).toEqual(proxy.getUTCFullYear());
    });

    it('getMonth', () => {
      const date = utCDate(2022, 1, 2);
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date,
      }).instance.proxy as Date;
      expect(date.getMonth()).toEqual(proxy.getMonth());
    });

    it('getUTCMonth', () => {
      const date = utCDate(2022, 1, 2);
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date,
      }).instance.proxy as Date;
      expect(date.getUTCMonth()).toEqual(proxy.getUTCMonth());
    });

    it('getDate', () => {
      const date = utCDate(2022, 1, 2);
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date,
      }).instance.proxy as Date;
      expect(date.getDate()).toEqual(proxy.getDate());
    });

    it('getUTCDate', () => {
      const date = utCDate(2022, 1, 2);
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date,
      }).instance.proxy as Date;
      expect(date.getUTCDate()).toEqual(proxy.getUTCDate());
    });

    it('getDay', () => {
      const date = utCDate(2022, 1, 2);
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date,
      }).instance.proxy as Date;
      expect(date.getDay()).toEqual(proxy.getDay());
    });

    it('getUTCDay', () => {
      const date = utCDate(2022, 1, 2);
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date,
      }).instance.proxy as Date;

      expect(date.getUTCDay()).toEqual(proxy.getUTCDay());
    });

    it('getHours', () => {
      const date = utCDate(2022, 1, 2);
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date,
      }).instance.proxy as Date;
      expect(date.getHours()).toEqual(proxy.getHours());
    });

    it('getUTCHours', () => {
      const date = utCDate(2022, 1, 2);
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date,
      }).instance.proxy as Date;
      expect(date.getUTCHours()).toEqual(proxy.getUTCHours());
    });

    it('getMinutes', () => {
      const date = utCDate(2022, 1, 2);
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date,
      }).instance.proxy as Date;

      expect(date.getMinutes()).toEqual(proxy.getMinutes());
    });

    it('getUTCMinutes', () => {
      const date = utCDate(2022, 1, 2);
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date,
      }).instance.proxy as Date;
      expect(date.getUTCMinutes()).toEqual(proxy.getUTCMinutes());
    });

    it('getSeconds', () => {
      const date = utCDate(2022, 1, 2);
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date,
      }).instance.proxy as Date;
      expect(date.getSeconds()).toEqual(proxy.getSeconds());
    });

    it('getUTCSeconds', () => {
      const date = utCDate(2022, 1, 2);
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date,
      }).instance.proxy as Date;
      expect(date.getUTCSeconds()).toEqual(proxy.getUTCSeconds());
    });

    it('getMilliseconds', () => {
      const date = utCDate(2022, 1, 2);
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date,
      }).instance.proxy as Date;
      expect(date.getMilliseconds()).toEqual(proxy.getMilliseconds());
    });

    it('getUTCMilliseconds', () => {
      const date = utCDate(2022, 1, 2);
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date,
      }).instance.proxy as Date;
      expect(date.getUTCMilliseconds()).toEqual(proxy.getUTCMilliseconds());
    });

    it('getTimezoneOffset', () => {
      const date = utCDate(2022, 1, 2);
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date,
      }).instance.proxy as Date;
      expect(date.getTimezoneOffset()).toEqual(proxy.getTimezoneOffset());
    });

    it('toISOString', () => {
      const date = utCDate(2022, 1, 2);
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date,
      }).instance.proxy as Date;

      expect(date.toISOString()).toEqual(proxy.toISOString());
    });

    it('toUTCString', () => {
      const date = utCDate(2022, 1, 2);
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date,
      }).instance.proxy as Date;
      expect(date.toUTCString()).toEqual(proxy.toUTCString());
    });

    it('toJSON', () => {
      const date = utCDate(2022, 1, 2);
      const proxy = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date,
      }).instance.proxy as Date;
      expect(date.toJSON()).toEqual(proxy.toJSON());
    });
  });

  describe('Change event', () => {
    it('if not mustProxify have been set set only only event with the changed date will be emitted', async () => {
      const { observer, proxy, proxyTarget } = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date: utCDate(2021, 1, 2),
      }).instance as { observer: IObserver; proxy: Date; proxyTarget: unknown };

      const actual = await new WaitForEvent(observer, 'changed').wait(() => {
        proxy.setFullYear(2022);
      });

      const expected: IPropertyChange = {
        arguments: [],
        chain: [{ context: proxyTarget, index: 'year' }],
        index: 'year',
        newValue: utCDate(2022, 1, 2),
        target: proxyTarget,
      };

      expect(actual).toEqual(expected);
    });
    it('setFullYear will emit change event for every change property', async () => {
      const { observer, proxy, proxyTarget } = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date: utCDate(2021, 1, 2),
        indexWatchRule,
      }).instance as { observer: IObserver; proxy: Date; proxyTarget: unknown };

      const actual = await new WaitForEvent(observer, 'changed', {
        count: 3,
      }).wait(() => {
        proxy.setFullYear(2022);
      });

      const expected: IPropertyChange[] = [
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'year' }],
          index: 'year',
          newValue: 2022,
          target: proxyTarget,
        },
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'utcYear' }],
          index: 'utcYear',
          newValue: 2022,
          target: proxyTarget,
        },
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'time' }],
          index: 'time',
          newValue: utCDate(2022, 1, 2).getTime(),
          target: proxyTarget,
        },
      ];

      expect(actual).toEqual(expected);
    });

    it('setMonth will emit change event for every change property', async () => {
      const { observer, proxy, proxyTarget } = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date: utCDate(2021, 1, 2),
        indexWatchRule,
      }).instance as { observer: IObserver; proxy: Date; proxyTarget: unknown };

      const actual = await new WaitForEvent(observer, 'changed', {
        count: 3,
      }).wait(() => {
        proxy.setMonth(2);
      });

      const expected: IPropertyChange[] = [
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'month' }],
          index: 'month',
          newValue: 2,
          target: proxyTarget,
        },
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'utcMonth' }],
          index: 'utcMonth',
          newValue: 2,
          target: proxyTarget,
        },
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'time' }],
          index: 'time',
          newValue: utCDate(2021, 2, 2).getTime(),
          target: proxyTarget,
        },
      ];
      expect(actual).toEqual(expected);
    });

    it('setDate will emit change event for every change property', async () => {
      const { observer, proxy, proxyTarget } = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date: utCDate(2021, 1, 2),
        indexWatchRule,
      }).instance as { observer: IObserver; proxy: Date; proxyTarget: unknown };

      const actual = await new WaitForEvent(observer, 'changed', {
        count: 3,
      }).wait(() => {
        proxy.setDate(3);
      });

      const expected: IPropertyChange[] = [
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'date' }],
          index: 'date',
          newValue: 3,
          target: proxyTarget,
        },
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'utcDate' }],
          index: 'utcDate',
          newValue: 3,
          target: proxyTarget,
        },
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'time' }],
          index: 'time',
          newValue: utCDate(2021, 1, 3).getTime(),
          target: proxyTarget,
        },
      ];
      expect(actual).toEqual(expected);
    });

    it('setHours will emit change event for every change property', async () => {
      const { observer, proxy, proxyTarget } = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date: utCDate(2021, 1, 2),
        indexWatchRule,
      }).instance as { observer: IObserver; proxy: Date; proxyTarget: unknown };

      const actual = await new WaitForEvent(observer, 'changed', {
        count: 3,
      }).wait(() => {
        proxy.setHours(3);
      });

      const expected: IPropertyChange[] = [
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'hours' }],
          index: 'hours',
          newValue: (proxyTarget as Date).getHours(),
          target: proxyTarget,
        },
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'utcHours' }],
          index: 'utcHours',
          newValue: (proxyTarget as Date).getUTCHours(),
          target: proxyTarget,
        },
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'time' }],
          index: 'time',
          newValue: (proxyTarget as Date).getTime(),
          target: proxyTarget,
        },
      ];
      expect(actual).toEqual(expected);
    });

    it('setMinutes will emit change event', async () => {
      const { observer, proxy, proxyTarget } = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date: utCDate(2021, 1, 2),
        indexWatchRule,
      }).instance as { observer: IObserver; proxy: Date; proxyTarget: unknown };

      const actual = await new WaitForEvent(observer, 'changed', {
        count: 3,
      }).wait(() => {
        proxy.setMinutes(3);
      });

      const expected: IPropertyChange[] = [
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'minutes' }],
          index: 'minutes',
          newValue: 3,
          target: proxyTarget,
        },
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'utcMinutes' }],
          index: 'utcMinutes',
          newValue: 3,
          target: proxyTarget,
        },
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'time' }],
          index: 'time',
          newValue: utCDate(2021, 1, 2, 0, 3).getTime(),
          target: proxyTarget,
        },
      ];
      expect(actual).toEqual(expected);
    });

    it('setSeconds will emit change event', async () => {
      const { observer, proxy, proxyTarget } = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date: utCDate(2021, 1, 2),
        indexWatchRule,
      }).instance as { observer: IObserver; proxy: Date; proxyTarget: unknown };

      const actual = await new WaitForEvent(observer, 'changed', {
        count: 3,
      }).wait(() => {
        proxy.setSeconds(3);
      });

      const expected: IPropertyChange[] = [
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'seconds' }],
          index: 'seconds',
          newValue: 3,
          target: proxyTarget,
        },
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'utcSeconds' }],
          index: 'utcSeconds',
          newValue: 3,
          target: proxyTarget,
        },
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'time' }],
          index: 'time',
          newValue: utCDate(2021, 1, 2, 0, 0, 3).getTime(),
          target: proxyTarget,
        },
      ];
      expect(actual).toEqual(expected);
    });

    it('setMilliseconds will emit change event for every change property', async () => {
      const { observer, proxy, proxyTarget } = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date: utCDate(2021, 1, 2),
        indexWatchRule,
      }).instance as { observer: IObserver; proxy: Date; proxyTarget: unknown };

      const actual = await new WaitForEvent(observer, 'changed', {
        count: 3,
      }).wait(() => {
        proxy.setMilliseconds(3);
      });

      const expected: IPropertyChange[] = [
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'milliseconds' }],
          index: 'milliseconds',
          newValue: 3,
          target: proxyTarget,
        },
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'utcMilliseconds' }],
          index: 'utcMilliseconds',
          newValue: 3,
          target: proxyTarget,
        },
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'time' }],
          index: 'time',
          newValue: utCDate(2021, 1, 2, 0, 0, 0, 3).getTime(),
          target: proxyTarget,
        },
      ];
      expect(actual).toEqual(expected);
    });

    it('setTime will emit change event for every change property', async () => {
      const { observer, proxy, proxyTarget } = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        // Mon Jan 07 2030 07:23:45
        date: new Date(1893997425123),
        indexWatchRule,
      }).instance as { observer: IObserver; proxy: Date; proxyTarget: unknown };

      const actual = await new WaitForEvent(observer, 'changed', {
        count: 15,
      }).wait(() => {
        //Thu Nov 03 2022 09:54:12
        proxy.setTime(1667465652987);
      });

      const expectedDate = proxyTarget as Date;
      const expected: IPropertyChange[] = [
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'year' }],
          index: 'year',
          newValue: expectedDate.getFullYear(),
          target: proxyTarget,
        },
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'utcYear' }],
          index: 'utcYear',
          newValue: expectedDate.getUTCFullYear(),
          target: proxyTarget,
        },
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'month' }],
          index: 'month',
          newValue: expectedDate.getMonth(),
          target: proxyTarget,
        },
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'utcMonth' }],
          index: 'utcMonth',
          newValue: expectedDate.getUTCMonth(),
          target: proxyTarget,
        },
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'date' }],
          index: 'date',
          newValue: expectedDate.getDate(),
          target: proxyTarget,
        },
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'utcDate' }],
          index: 'utcDate',
          newValue: expectedDate.getUTCDate(),
          target: proxyTarget,
        },
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'hours' }],
          index: 'hours',
          newValue: expectedDate.getHours(),
          target: proxyTarget,
        },
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'utcHours' }],
          index: 'utcHours',
          newValue: expectedDate.getUTCHours(),
          target: proxyTarget,
        },
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'minutes' }],
          index: 'minutes',
          newValue: expectedDate.getMinutes(),
          target: proxyTarget,
        },
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'utcMinutes' }],
          index: 'utcMinutes',
          newValue: expectedDate.getUTCMinutes(),
          target: proxyTarget,
        },
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'seconds' }],
          index: 'seconds',
          newValue: expectedDate.getSeconds(),
          target: proxyTarget,
        },
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'utcSeconds' }],
          index: 'utcSeconds',
          newValue: expectedDate.getUTCSeconds(),
          target: proxyTarget,
        },
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'milliseconds' }],
          index: 'milliseconds',
          newValue: expectedDate.getMilliseconds(),
          target: proxyTarget,
        },
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'utcMilliseconds' }],
          index: 'utcMilliseconds',
          newValue: expectedDate.getUTCMilliseconds(),
          target: proxyTarget,
        },
        {
          arguments: [],
          chain: [{ context: proxyTarget, index: 'time' }],
          index: 'time',
          newValue: expectedDate.getTime(),
          target: proxyTarget,
        },
      ];
      expect(actual).toEqual(expected);
    });

    it('will not emit change event if date does not change', async () => {
      const { observer, proxy } = new DateProxyFactory(
        new ProxyRegistryMock(),
      ).create({
        date: utCDate(2021, 1, 2),
        indexWatchRule,
      }).instance as { observer: IObserver; proxy: Date };

      const actual = await new WaitForEvent(observer, 'changed').wait(() => {
        proxy.setDate(2);
      });

      expect(actual).toBeNull();
    });
  });
});
