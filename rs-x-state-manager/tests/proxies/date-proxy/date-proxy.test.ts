import { IPropertyChange, truePredicate, utCDate, WaitForEvent } from '@rs-x/core';
import { DateProxyFactory } from '../../../lib/proxies/date-proxy/date-proxy.factory';
import { ProxyRegistryMock } from '../../../lib/testing/proxies/proxy-registry.mock';

describe('DateProxy tests', () => {
   it('Node timezone is UTC', () => {
      expect(process.env.TZ).toEqual('UTC');
   });

   it('create will register the data proxy to the proxy registry', () => {
      const date = new Date()
      const proxyRegistry = new ProxyRegistryMock();
      const setProxyFactory = new DateProxyFactory(proxyRegistry);
      const { proxy } = setProxyFactory.create({ date }).instance;

      expect(proxyRegistry.register).toHaveBeenCalledTimes(1);
      expect(proxyRegistry.register.mock.calls[0][0]).toBe(date);
      expect(proxyRegistry.register.mock.calls[0][1]).toBe(proxy);
   });

   it('dispose will unregister the data proxy to the proxy registry', () => {
      const date = new Date()
      const proxyRegistry = new ProxyRegistryMock();
      const setProxyFactory = new DateProxyFactory(proxyRegistry);
      const { observer } = setProxyFactory.create({ date }).instance;

      observer.dispose();

      expect(proxyRegistry.unregister).toHaveBeenCalledTimes(1);
      expect(proxyRegistry.unregister).toHaveBeenCalledWith(date)
   });

   it('dispose will unregister proxy when all references are released', () => {
      const dateProxyFactory = new DateProxyFactory(new ProxyRegistryMock());
      const date = new Date()

      const { observer: observer1, id: id1 } = dateProxyFactory.create({
         date,
      }).instance;
      const { observer: observer2, id: id2 } = dateProxyFactory.create({
         date,
      }).instance;

      expect(observer1).toBe(observer2);
      expect(id1).toBe(id2);
      expect(dateProxyFactory.getFromId(id1)).toBeDefined();

      observer1.dispose();

      expect(dateProxyFactory.getFromId(id2)).toBeDefined();

      observer2.dispose();

      expect(dateProxyFactory.getFromId(id2)).toBeUndefined();
   });

   describe('all date operation still work as before', () => {
      it('setFullYear', () => {
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date: utCDate(2021, 0, 2)
            }
         ).instance;

         const timestamp = proxy.setFullYear(2022);

         expect(new Date(timestamp)).toEqual(utCDate(2022, 0, 2));
         expect(proxy.getFullYear()).toEqual(2022);
         expect(proxy.getMonth()).toEqual(0);
         expect(proxy.getDate()).toEqual(2);
         expect(proxy.getHours()).toEqual(0);
         expect(proxy.getMinutes()).toEqual(0);
         expect(proxy.getSeconds()).toEqual(0);
         expect(proxy.getMilliseconds()).toEqual(0);
      });

      it('setUTCFullYear', () => {
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date: utCDate(2021, 0, 2)
            }
         ).instance;

         const timestamp = proxy.setUTCFullYear(2022);

         expect(new Date(timestamp)).toEqual(utCDate(2022, 0, 2));
         expect(proxy.getFullYear()).toEqual(2022);
         expect(proxy.getMonth()).toEqual(0);
         expect(proxy.getDate()).toEqual(2);
         expect(proxy.getHours()).toEqual(0);
         expect(proxy.getMinutes()).toEqual(0);
         expect(proxy.getSeconds()).toEqual(0);
         expect(proxy.getMilliseconds()).toEqual(0);
      });

      it('setMonth', () => {
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date: utCDate(2021, 0, 2)
            }
         ).instance;

         const timestamp = proxy.setMonth(1);

         expect(new Date(timestamp)).toEqual(utCDate(2021, 1, 2));
         expect(proxy.getFullYear()).toEqual(2021);
         expect(proxy.getMonth()).toEqual(1);
         expect(proxy.getDate()).toEqual(2);
         expect(proxy.getHours()).toEqual(0);
         expect(proxy.getMinutes()).toEqual(0);
         expect(proxy.getSeconds()).toEqual(0);
         expect(proxy.getMilliseconds()).toEqual(0);
      });

      it('setUTCMonth', () => {
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date: utCDate(2021, 0, 2)
            }
         ).instance;
         const timestamp = proxy.setUTCMonth(1);

         expect(new Date(timestamp)).toEqual(utCDate(2021, 1, 2));
         expect(proxy.getFullYear()).toEqual(2021);
         expect(proxy.getMonth()).toEqual(1);
         expect(proxy.getDate()).toEqual(2);
         expect(proxy.getHours()).toEqual(0);
         expect(proxy.getMinutes()).toEqual(0);
         expect(proxy.getSeconds()).toEqual(0);
         expect(proxy.getMilliseconds()).toEqual(0);
      });

      it('setDate', () => {
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date: new Date(2021, 0, 2)
            }
         ).instance;

         const timestamp = proxy.setDate(4);

         expect(new Date(timestamp)).toEqual(new Date(2021, 0, 4))
         expect(proxy.getFullYear()).toEqual(2021);
         expect(proxy.getMonth()).toEqual(0);
         expect(proxy.getDate()).toEqual(4);
         expect(proxy.getHours()).toEqual(0);
         expect(proxy.getMinutes()).toEqual(0);
         expect(proxy.getSeconds()).toEqual(0);
         expect(proxy.getMilliseconds()).toEqual(0);
      });

      it('setUTCDate', () => {
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date: utCDate(2021, 0, 2)
            }
         ).instance;

         const timestamp = proxy.setUTCDate(4);

         expect(new Date(timestamp)).toEqual(utCDate(2021, 0, 4));
         expect(proxy.getFullYear()).toEqual(2021);
         expect(proxy.getMonth()).toEqual(0);
         expect(proxy.getDate()).toEqual(4);
         expect(proxy.getHours()).toEqual(0);
         expect(proxy.getMinutes()).toEqual(0);
         expect(proxy.getSeconds()).toEqual(0);
         expect(proxy.getMilliseconds()).toEqual(0);
      });

      it('setHours', () => {
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date: new Date(2021, 0, 2)
            }
         ).instance;

         const timestamp = proxy.setHours(3);

         expect(new Date(timestamp)).toEqual(new Date(2021, 0, 2, 3))
         expect(proxy.getFullYear()).toEqual(2021);
         expect(proxy.getMonth()).toEqual(0);
         expect(proxy.getDate()).toEqual(2);
         expect(proxy.getHours()).toEqual(3);
         expect(proxy.getMinutes()).toEqual(0);
         expect(proxy.getSeconds()).toEqual(0);
         expect(proxy.getMilliseconds()).toEqual(0);
      });

      it('seUTCtHours', () => {
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date: utCDate(2021, 0, 2)
            }
         ).instance;

         const timestamp = proxy.setUTCHours(3);

         expect(new Date(timestamp)).toEqual(utCDate(2021, 0, 2, 3));
         expect(proxy.getFullYear()).toEqual(2021);
         expect(proxy.getMonth()).toEqual(0);
         expect(proxy.getDate()).toEqual(2);
         expect(proxy.getHours()).toEqual(3);
         expect(proxy.getMinutes()).toEqual(0);
         expect(proxy.getSeconds()).toEqual(0);
         expect(proxy.getMilliseconds()).toEqual(0);
      });


      it('setMinutes', () => {
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date: new Date(2021, 0, 2)
            }
         ).instance;

         const timestamp = proxy.setMinutes(3);

         expect(new Date(timestamp)).toEqual(new Date(2021, 0, 2, 0, 3))
         expect(proxy.getFullYear()).toEqual(2021);
         expect(proxy.getMonth()).toEqual(0);
         expect(proxy.getDate()).toEqual(2);
         expect(proxy.getHours()).toEqual(0);
         expect(proxy.getMinutes()).toEqual(3);
         expect(proxy.getSeconds()).toEqual(0);
         expect(proxy.getMilliseconds()).toEqual(0);
      });

      it('setUTCMinutes', () => {
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date: utCDate(2021, 0, 2)
            }
         ).instance;

         const timestamp = proxy.setUTCMinutes(3);

         expect(new Date(timestamp)).toEqual(utCDate(2021, 0, 2, 0, 3));
         expect(proxy.getFullYear()).toEqual(2021);
         expect(proxy.getMonth()).toEqual(0);
         expect(proxy.getDate()).toEqual(2);
         expect(proxy.getHours()).toEqual(0);
         expect(proxy.getMinutes()).toEqual(3);
         expect(proxy.getSeconds()).toEqual(0);
         expect(proxy.getMilliseconds()).toEqual(0);
      });

      it('setSeconds', () => {
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date: new Date(2021, 0, 2)
            }
         ).instance;

         const timestamp = proxy.setSeconds(3);

         expect(new Date(timestamp)).toEqual(utCDate(2021, 0, 2, 0, 0, 3));
         expect(proxy.getFullYear()).toEqual(2021);
         expect(proxy.getMonth()).toEqual(0);
         expect(proxy.getDate()).toEqual(2);
         expect(proxy.getHours()).toEqual(0);
         expect(proxy.getMinutes()).toEqual(0);
         expect(proxy.getSeconds()).toEqual(3);
         expect(proxy.getMilliseconds()).toEqual(0);
      });

      it('setUTCSeconds', () => {
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date: utCDate(2021, 0, 2)
            }
         ).instance;

         const timestamp = proxy.setUTCSeconds(3);

         expect(new Date(timestamp)).toEqual(utCDate(2021, 0, 2, 0, 0, 3));
         expect(proxy.getFullYear()).toEqual(2021);
         expect(proxy.getMonth()).toEqual(0);
         expect(proxy.getDate()).toEqual(2);
         expect(proxy.getHours()).toEqual(0);
         expect(proxy.getMinutes()).toEqual(0);
         expect(proxy.getSeconds()).toEqual(3);
         expect(proxy.getMilliseconds()).toEqual(0);
      });

      it('setMilliseconds', () => {
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date: utCDate(2021, 0, 2)
            }
         ).instance;

         const timestamp = proxy.setMilliseconds(3);

         expect(new Date(timestamp)).toEqual(utCDate(2021, 0, 2, 0, 0, 0, 3));
         expect(proxy.getFullYear()).toEqual(2021);
         expect(proxy.getMonth()).toEqual(0);
         expect(proxy.getDate()).toEqual(2);
         expect(proxy.getHours()).toEqual(0);
         expect(proxy.getMinutes()).toEqual(0);
         expect(proxy.getSeconds()).toEqual(0);
         expect(proxy.getMilliseconds()).toEqual(3);
      });

      it('setUTCMilliseconds', () => {
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date: utCDate(2021, 0, 2)
            }
         ).instance;

         const timestamp = proxy.setUTCMilliseconds(3);

         expect(new Date(timestamp)).toEqual(utCDate(2021, 0, 2, 0, 0, 0, 3));
         expect(proxy.getFullYear()).toEqual(2021);
         expect(proxy.getMonth()).toEqual(0);
         expect(proxy.getDate()).toEqual(2);
         expect(proxy.getHours()).toEqual(0);
         expect(proxy.getMinutes()).toEqual(0);
         expect(proxy.getSeconds()).toEqual(0);
         expect(proxy.getMilliseconds()).toEqual(3);
      });

      it('setTime', () => {
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date: utCDate(2022, 1, 2)
            }
         ).instance;

         const timestamp = proxy.setTime(1612137600000);

         expect(new Date(timestamp)).toEqual(utCDate(2021, 1, 1));
         expect(proxy.getFullYear()).toEqual(2021);
         expect(proxy.getMonth()).toEqual(1);
         expect(proxy.getDate()).toEqual(1);
         expect(proxy.getHours()).toEqual(0);
         expect(proxy.getMinutes()).toEqual(0);
         expect(proxy.getSeconds()).toEqual(0);
         expect(proxy.getMilliseconds()).toEqual(0);
      });

      it('toString', () => {
         const date = new Date(2022, 1, 2);
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date
            }
         ).instance;

         expect(date.toString()).toEqual(proxy.toString())
      });

      it('toDateString', () => {
         const date = new Date(2022, 1, 2);
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date
            }
         ).instance;

         expect(date.toDateString()).toEqual(proxy.toDateString())
      });


      it('toTimeString', () => {
         const date = new Date(2022, 1, 2);
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date
            }
         ).instance;

         expect(date.toTimeString()).toEqual(proxy.toTimeString())
      });

      it('toLocaleString', () => {
         const date = new Date(2022, 1, 2);
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date
            }
         ).instance;

         expect(date.toLocaleString()).toEqual(proxy.toLocaleString())
      });

      it('toLocaleDateString', () => {
         const date = new Date(2022, 1, 2);
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date
            }
         ).instance;

         expect(date.toLocaleDateString()).toEqual(proxy.toLocaleDateString())
      });

      it('toLocaleTimeString', () => {
         const date = new Date(2022, 1, 2);
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date
            }
         ).instance;

         expect(date.toLocaleTimeString()).toEqual(proxy.toLocaleTimeString())
      });

      it('valueOf', () => {
         const date = new Date(2022, 1, 2);
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date
            }
         ).instance;

         expect(date.valueOf()).toEqual(proxy.valueOf())
      });

      it('getTime', () => {
         const date = new Date(2022, 1, 2);
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date
            }
         ).instance;

         expect(date.getTime()).toEqual(proxy.getTime())
      });

      it('getFullYear', () => {
         const date = new Date(2022, 1, 2);
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date
            }
         ).instance;

         expect(date.getFullYear()).toEqual(proxy.getFullYear())
      });

      it('getUTCFullYear', () => {
         const date = new Date(2022, 1, 2);
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date
            }
         ).instance;

         expect(date.getUTCFullYear()).toEqual(proxy.getUTCFullYear())
      });

      it('getMonth', () => {
         const date = new Date(2022, 1, 2);
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date
            }
         ).instance;

         expect(date.getMonth()).toEqual(proxy.getMonth())
      });

      it('getUTCMonth', () => {
         const date = new Date(2022, 1, 2);
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date
            }
         ).instance;

         expect(date.getUTCMonth()).toEqual(proxy.getUTCMonth())
      });

      it('getDate', () => {
         const date = new Date(2022, 1, 2);
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date
            }
         ).instance;

         expect(date.getDate()).toEqual(proxy.getDate())
      });

      it('getUTCDate', () => {
         const date = new Date(2022, 1, 2);
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date
            }
         ).instance;

         expect(date.getUTCDate()).toEqual(proxy.getUTCDate())
      });

      it('getDay', () => {
         const date = new Date(2022, 1, 2);
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date
            }
         ).instance;

         expect(date.getDay()).toEqual(proxy.getDay())
      });

      it('getUTCDay', () => {
         const date = new Date(2022, 1, 2);
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date
            }
         ).instance;

         expect(date.getUTCDay()).toEqual(proxy.getUTCDay())
      });

      it('getHours', () => {
         const date = new Date(2022, 1, 2);
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date
            }
         ).instance;

         expect(date.getHours()).toEqual(proxy.getHours())
      });

      it('getUTCHours', () => {
         const date = new Date(2022, 1, 2);
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date
            }
         ).instance;

         expect(date.getUTCHours()).toEqual(proxy.getUTCHours())
      });

      it('getMinutes', () => {
         const date = new Date(2022, 1, 2);
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date
            }
         ).instance;

         expect(date.getMinutes()).toEqual(proxy.getMinutes())
      });

      it('getUTCMinutes', () => {
         const date = new Date(2022, 1, 2);
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date
            }
         ).instance;

         expect(date.getUTCMinutes()).toEqual(proxy.getUTCMinutes())
      });

      it('getSeconds', () => {
         const date = new Date(2022, 1, 2);
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date
            }
         ).instance;

         expect(date.getSeconds()).toEqual(proxy.getSeconds())
      });

      it('getUTCSeconds', () => {
         const date = new Date(2022, 1, 2);
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date
            }
         ).instance;

         expect(date.getUTCSeconds()).toEqual(proxy.getUTCSeconds())
      });

      it('getMilliseconds', () => {
         const date = new Date(2022, 1, 2);
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date
            }
         ).instance;

         expect(date.getMilliseconds()).toEqual(proxy.getMilliseconds())
      });

      it('getUTCMilliseconds', () => {
         const date = new Date(2022, 1, 2);
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date
            }
         ).instance;

         expect(date.getUTCMilliseconds()).toEqual(proxy.getUTCMilliseconds())
      });

      it('getTimezoneOffset', () => {
         const date = new Date(2022, 1, 2);
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date
            }
         ).instance;

         expect(date.getTimezoneOffset()).toEqual(proxy.getTimezoneOffset())
      });

      it('toISOString', () => {
         const date = new Date(2022, 1, 2);
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date
            }
         ).instance;

         expect(date.toISOString()).toEqual(proxy.toISOString())
      });

      it('toUTCString', () => {
         const date = new Date(2022, 1, 2);
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date
            }
         ).instance;

         expect(date.toUTCString()).toEqual(proxy.toUTCString())
      });

      it('toJSON', () => {
         const date = new Date(2022, 1, 2);
         const { proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date
            }
         ).instance;

         expect(date.toJSON()).toEqual(proxy.toJSON())
      });
   });

   describe('Change event', () => {

      it('if not mustProxify have been set set only only event with the changed date will be emitted', async () => {

         const { observer, proxy, proxyTarget } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date: utCDate(2021, 1, 2),
            }
         ).instance;
         const actual = await new WaitForEvent(
            observer,
            'changed'
         ).wait(() => {
            proxy.setFullYear(2022);
         });

         const expected = {
            arguments: [],
            chain: [{ object: proxyTarget, id: 'year' }],
            id: 'year',
            newValue: utCDate(2022, 1, 2),
            target: proxyTarget,
         }

         expect(actual).toEqual(expected);
      });
      it('setFullYear will emit change event for every change property', async () => {
         const { observer, proxy, proxyTarget } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date: utCDate(2021, 1, 2),
               mustProxify: truePredicate
            }
         ).instance;
         const actual = await new WaitForEvent(
            observer,
            'changed',
            { count: 3 }
         ).wait(() => {
            proxy.setFullYear(2022);
         });

         const expected: IPropertyChange[] = [
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'year' }],
               id: 'year',
               newValue: 2022,
               target: proxyTarget,
            },
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'utcYear' }],
               id: 'utcYear',
               newValue: 2022,
               target: proxyTarget,
            },
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'time' }],
               id: 'time',
               newValue: new Date(2022, 1, 2).getTime(),
               target: proxyTarget,
            },
         ];

         expect(actual).toEqual(expected);
      });

      it('setMonth will emit change event for every change property', async () => {
         const { observer, proxy, proxyTarget } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date: utCDate(2021, 1, 2),
               mustProxify: truePredicate
            }
         ).instance;
         const actual = await new WaitForEvent(
            observer,
            'changed',
            { count: 3 }
         ).wait(() => {
            proxy.setMonth(2);
         });

         const expected: IPropertyChange[] = [
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'month' }],
               id: 'month',
               newValue: 2,
               target: proxyTarget,
            },
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'utcMonth' }],
               id: 'utcMonth',
               newValue: 2,
               target: proxyTarget,
            },
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'time' }],
               id: 'time',
               newValue: utCDate(2021, 2, 2).getTime(),
               target: proxyTarget,
            },
         ];
         expect(actual).toEqual(expected);
      });

      it('setDate will emit change event for every change property', async () => {
         const { observer, proxy, proxyTarget } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date: utCDate(2021, 1, 2),
               mustProxify: truePredicate
            }
         ).instance;
         const actual = await new WaitForEvent(
            observer,
            'changed',
            { count: 3 }
         ).wait(() => {
            proxy.setDate(3);
         });

         const expected: IPropertyChange[] = [
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'date' }],
               id: 'date',
               newValue: 3,
               target: proxyTarget,
            },
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'utcDate' }],
               id: 'utcDate',
               newValue: 3,
               target: proxyTarget,
            },
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'time' }],
               id: 'time',
               newValue: utCDate(2021, 1, 3).getTime(),
               target: proxyTarget,
            },
         ];
         expect(actual).toEqual(expected);
      });

      it('setHours will emit change event for every change property', async () => {
         const { observer, proxy, proxyTarget } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date: utCDate(2021, 1, 2),
               mustProxify: truePredicate
            }
         ).instance;
         const actual = await new WaitForEvent(
            observer,
            'changed',
            { count: 3 }
         ).wait(() => {
            proxy.setHours(3);
         });


         const expected: IPropertyChange[] = [
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'hours' }],
               id: 'hours',
               newValue: 3,
               target: proxyTarget,
            },
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'utcHours' }],
               id: 'utcHours',
               newValue: 3,
               target: proxyTarget,
            },
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'time' }],
               id: 'time',
               newValue: utCDate(2021, 1, 2, 3).getTime(),
               target: proxyTarget,
            },
         ];
         expect(actual).toEqual(expected);
      });

      it('setMinutes will emit change event', async () => {
         const { observer, proxy, proxyTarget } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date: utCDate(2021, 1, 2),
               mustProxify: truePredicate
            }
         ).instance;
         const actual = await new WaitForEvent(
            observer,
            'changed',
            { count: 3 }
         ).wait(() => {
            proxy.setMinutes(3);
         });

         const expected: IPropertyChange[] = [
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'minutes' }],
               id: 'minutes',
               newValue: 3,
               target: proxyTarget,
            },
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'utcMinutes' }],
               id: 'utcMinutes',
               newValue: 3,
               target: proxyTarget,
            },
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'time' }],
               id: 'time',
               newValue: utCDate(2021, 1, 2, 0, 3).getTime(),
               target: proxyTarget,
            },
         ];
         expect(actual).toEqual(expected);
      });

      it('setSeconds will emit change event', async () => {
         const { observer, proxy, proxyTarget } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date: utCDate(2021, 1, 2),
               mustProxify: truePredicate
            }
         ).instance;
         const actual = await new WaitForEvent(
            observer,
            'changed',
            { count: 3 },
         ).wait(() => {
            proxy.setSeconds(3);
         });

         const expected: IPropertyChange[] = [
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'seconds' }],
               id: 'seconds',
               newValue: 3,
               target: proxyTarget,
            },
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'utcSeconds' }],
               id: 'utcSeconds',
               newValue: 3,
               target: proxyTarget,
            },
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'time' }],
               id: 'time',
               newValue: utCDate(2021, 1, 2, 0, 0, 3).getTime(),
               target: proxyTarget,
            },
         ];
         expect(actual).toEqual(expected);
      });


      it('setMilliseconds will emit change event for every change property', async () => {
         const { observer, proxy, proxyTarget } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date: utCDate(2021, 1, 2),
               mustProxify: truePredicate
            }
         ).instance;
         const actual = await new WaitForEvent(
            observer,
            'changed',
            { count: 3 }
         ).wait(() => {
            proxy.setMilliseconds(3);
         });

         const expected: IPropertyChange[] = [
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'milliseconds' }],
               id: 'milliseconds',
               newValue: 3,
               target: proxyTarget,
            },
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'utcMilliseconds' }],
               id: 'utcMilliseconds',
               newValue: 3,
               target: proxyTarget,
            },
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'time' }],
               id: 'time',
               newValue: utCDate(2021, 1, 2, 0, 0, 0, 3).getTime(),
               target: proxyTarget,
            },

         ];
         expect(actual).toEqual(expected);
      });

      it('setTime will emit change event for every change property', async () => {
         const { observer, proxy, proxyTarget } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               // Mon Jan 07 2030 07:23:45
               date: new Date(1893997425123),
               mustProxify: truePredicate
            }
         ).instance;
         const actual = await new WaitForEvent(
            observer,
            'changed',
            { count: 15 }
         ).wait(() => {

            //Thu Nov 03 2022 09:54:12
            proxy.setTime(1667465652987);
         });

         const expected: IPropertyChange[] = [
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'year' }],
               id: 'year',
               newValue: 2022,
               target: proxyTarget,
            },
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'utcYear' }],
               id: 'utcYear',
               newValue: 2022,
               target: proxyTarget,
            },
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'month' }],
               id: 'month',
               newValue: 10,
               target: proxyTarget,
            },
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'utcMonth' }],
               id: 'utcMonth',
               newValue: 10,
               target: proxyTarget,
            },
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'date' }],
               id: 'date',
               newValue: 3,
               target: proxyTarget,
            },
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'utcDate' }],
               id: 'utcDate',
               newValue: 3,
               target: proxyTarget,
            },
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'hours' }],
               id: 'hours',
               newValue: 8,
               target: proxyTarget,
            },
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'utcHours' }],
               id: 'utcHours',
               newValue: 8,
               target: proxyTarget,
            },
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'minutes' }],
               id: 'minutes',
               newValue: 54,
               target: proxyTarget,
            },
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'utcMinutes' }],
               id: 'utcMinutes',
               newValue: 54,
               target: proxyTarget,
            },
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'seconds' }],
               id: 'seconds',
               newValue: 12,
               target: proxyTarget,
            },
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'utcSeconds' }],
               id: 'utcSeconds',
               newValue: 12,
               target: proxyTarget,
            },
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'milliseconds' }],
               id: 'milliseconds',
               newValue: 987,
               target: proxyTarget,
            },
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'utcMilliseconds' }],
               id: 'utcMilliseconds',
               newValue: 987,
               target: proxyTarget,
            },
            {
               arguments: [],
               chain: [{ object: proxyTarget, id: 'time' }],
               id: 'time',
               newValue: 1667465652987,
               target: proxyTarget,
            }
         ]
         expect(actual).toEqual(expected);
      });

      it('will not emit change event if date does not change', async () => {
         const { observer, proxy } = new DateProxyFactory(new ProxyRegistryMock()).create(
            {
               date: utCDate(2021, 1, 2),
               mustProxify: truePredicate
            }
         ).instance;
         const actual = await new WaitForEvent(
            observer,
            'changed',
         ).wait(() => {
            proxy.setDate(2);
         });


         expect(actual).toBeNull();
      });
   });
});
