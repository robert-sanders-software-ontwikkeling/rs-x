import {
   InjectionContainer,
   truePredicate,
   Type,
   WaitForEvent,
} from '@rs-x/core';
import { ObservableMock } from '@rs-x/core/testing';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { IArrayProxyFactory } from '../../lib/proxies/array-proxy/array-proxy.factory.type';
import { IMapProxyFactory } from '../../lib/proxies/map-proxy/map-proxy.factory.type';
import { RsXStateManagerInjectionTokens } from '../../lib/rs-x-state-manager-injection-tokes';
import { RsXStateManagerModule } from '../../lib/rs-x-state-manager.module';
import {
   IStateChange,
   IStateManager,
} from '../../lib/state-manager/state-manager.interface';
import { IProxyRegistry } from '../../lib';

interface IPrivateIStateManager extends IStateManager {
   _changed: Observable<IStateChange>;
}

describe('StateManager tests', () => {
   let stateManager: IPrivateIStateManager;
   let _oldChange: Observable<IStateChange>;

   beforeAll(async () => {
      await InjectionContainer.load(RsXStateManagerModule);
      stateManager = InjectionContainer.get<IPrivateIStateManager>(
         RsXStateManagerInjectionTokens.IStateManager
      );
   });

   afterAll(async () => {
      await InjectionContainer.unload(RsXStateManagerModule);
   });

   afterEach(() => {
      if (_oldChange) {
         stateManager._changed = _oldChange;
         _oldChange = undefined;
      }
      stateManager.clear();
   });

   it('first time register will return undefined', () => {
      const object = {
         x: 10,
      };

      const actual = stateManager.register(object, 'x');
      expect(actual).toBeUndefined();
   });

   it('if state is already registered it will return the current state', () => {
      const object = {
         x: 10,
      };

      stateManager.register(object, 'x');
      const actual = stateManager.register(object, 'x');
      expect(actual).toEqual(10);
   });

   it('state will be release when reference count goes to zero', () => {
      const object = {
         x: 10,
      };
      stateManager.register(object, 'x');
      stateManager.register(object, 'x');

      stateManager.unregister(object, 'x');
      expect(stateManager.getState(object, 'x')).toEqual(10);

      stateManager.unregister(object, 'x');
      expect(stateManager.getState(object, 'x')).toBeUndefined();
   });

   describe('register property of an object', () => {
      it('register will initialise state', () => {
         const object = {
            x: 10,
         };

         stateManager.register(object, 'x');

         expect(stateManager.getState(object, 'x')).toEqual(10);
      });

      it('after register change event will emit initial value', async () => {
         const object = {
            x: 10,
         };

         const actual = await new WaitForEvent(stateManager, 'changed').wait(
            () => {
               stateManager.register(object, 'x');
            }
         );

         const expected: IStateChange = {
            context: object,
            oldContext: object,
            key: 'x',
            oldValue: undefined,
            newValue: 10,
         };
         expect(actual).toEqual(expected);
      });

      it('set a new value for a registered field will emit change event', async () => {
         const object = { x: 10 };
         stateManager.register(object, 'x');

         const actual = await new WaitForEvent(stateManager, 'changed').wait(
            () => {
               object.x = 20;
            }
         );

         const expected: IStateChange = {
            context: object,
            oldContext: object,
            key: 'x',
            oldValue: 10,
            newValue: 20,
         };
         expect(actual).toEqual(expected);
      });

      it('set a new value for an unregistered field will not emit change event', async () => {
         const object = { x: 10, y: 20 };
         stateManager.register(object, 'x');

         const actual = await new WaitForEvent(stateManager, 'changed').wait(
            () => {
               object.y = 30;
            }
         );

         expect(actual).toBeNull();
      });

      it('state will be update when property changed', async () => {
         const object = { x: 10 };
         stateManager.register(object, 'x');

         object.x = 20;

         expect(stateManager.getState(object, 'x')).toEqual(20);
      });
   });

   describe('register an item in an array', () => {
      let arrayProxyFactory: IArrayProxyFactory;

      beforeAll(() => {
         arrayProxyFactory = InjectionContainer.get<IArrayProxyFactory>(
            RsXStateManagerInjectionTokens.IArrayProxyFactory
         );
      });

      it('register will initialise state', () => {
         const array = [1, 2];

         stateManager.register(array, 1);

         expect(stateManager.getState(array, 1)).toEqual(2);
      });

      it('after register change event will emit initial value', async () => {
         const array = [1, 2];

         const actual = await new WaitForEvent(stateManager, 'changed').wait(
            () => {
               stateManager.register(array, 1);
            }
         );

         const expected: IStateChange = {
            context: array,
            oldContext: array,
            key: 1,
            oldValue: undefined,
            newValue: 2,
         };
         expect(actual).toEqual(expected);
      });

      it('set a new value for a registered index will emit change event', async () => {
         const array = [1, 2];
         stateManager.register(array, 1);

         const actual = await new WaitForEvent(stateManager, 'changed').wait(
            () => {
               arrayProxyFactory.getFromData({ array }).proxy[1] = 20;
            }
         );

         const expected: IStateChange = {
            context: array,
            oldContext: array,
            key: 1,
            oldValue: 2,
            newValue: 20,
         };
         expect(actual).toEqual(expected);
      });

      it('set a new value for an unregistered index will not emit change event', async () => {
         const array = [1, 2];
         stateManager.register(array, 1);

         const actual = await new WaitForEvent(stateManager, 'changed').wait(
            () => {
               arrayProxyFactory.getFromData({ array }).proxy[0] = 20;
            }
         );

         expect(actual).toBeNull();
      });

      it('state will be update when property changed', async () => {
         const array = [1, 2];
         stateManager.register(array, 1);

         arrayProxyFactory.getFromData({ array }).proxy[1] = 20;

         expect(stateManager.getState(array, 1)).toEqual(20);
      });

      it('set array length to a value lesser or equal to given index will emit change event', async () => {
         const array = [1, 2];
         stateManager.register(array, 1);

         const actual = await new WaitForEvent(stateManager, 'changed').wait(
            () => {
               Type.cast<unknown[]>(
                  arrayProxyFactory.getFromData({ array }).proxy
               ).length = 1;
            }
         );

         const expected: IStateChange = {
            context: array,
            oldContext: array,
            key: 1,
            oldValue: 2,
            newValue: undefined,
         };
         expect(actual).toEqual(expected);
      });

      it('a registered index will be unregistered when array length changes to a length lesser or equal to given index', async () => {
         const array = [1, 2];

         stateManager.register(array, 0);
         stateManager.register(array, 1);

         expect(stateManager.getState(array, 1)).toEqual(2);
         expect(arrayProxyFactory.getFromData({ array })).toBeDefined();

         Type.cast<unknown[]>(
            arrayProxyFactory.getFromData({ array }).proxy
         ).length = 1;

         expect(stateManager.getState(array, 1)).toBeUndefined();
         expect(arrayProxyFactory.getFromData({ array })).toBeDefined();
      });
   });

   describe('register an item in a map', () => {
      let mapProxyFactory: IMapProxyFactory;

      beforeAll(() => {
         mapProxyFactory = InjectionContainer.get<IMapProxyFactory>(
            RsXStateManagerInjectionTokens.IMapProxyFactory
         );
      });

      it('register will initialise state', () => {
         const map = new Map<string, number>([
            ['a', 1],
            ['b', 2],
         ]);

         stateManager.register(map, 'b');

         expect(stateManager.getState(map, 'b')).toEqual(2);
      });

      it('after register change event will emit initial value', async () => {
         const map = new Map<string, number>([
            ['a', 1],
            ['b', 2],
         ]);

         const actual = await new WaitForEvent(stateManager, 'changed').wait(
            () => {
               stateManager.register(map, 'b');
            }
         );

         const expected: IStateChange = {
            context: map,
            oldContext: map,
            key: 'b',
            oldValue: undefined,
            newValue: 2,
         };
         expect(actual).toEqual(expected);
      });

      it('set a new value for a registered key will emit change event', async () => {
         const map = new Map<string, number>([
            ['a', 1],
            ['b', 2],
         ]);
         stateManager.register(map, 'b');

         const actual = await new WaitForEvent(stateManager, 'changed').wait(
            () => {
               mapProxyFactory.getFromData({ map: map }).proxy.set('b', 20);
            }
         );

         const expected: IStateChange = {
            context: map,
            oldContext: map,
            key: 'b',
            oldValue: 2,
            newValue: 20,
         };
         expect(actual).toEqual(expected);
      });

      it('set a new value for an unregistered key will not emit change event', async () => {
         const map = new Map<string, number>([
            ['a', 1],
            ['b', 2],
         ]);
         stateManager.register(map, 'b');

         const actual = await new WaitForEvent(stateManager, 'changed').wait(
            () => {
               mapProxyFactory.getFromData({ map: map }).proxy.set('a', 20);
            }
         );

         expect(actual).toBeNull();
      });

      it('state will be update when property changed', async () => {
         const map = new Map<string, number>([
            ['a', 1],
            ['b', 2],
         ]);
         stateManager.register(map, 'b');

         Type.cast<Map<string, number>>(
            mapProxyFactory.getFromData({ map }).proxy
         ).set('b', 20);

         expect(stateManager.getState(map, 'b')).toEqual(20);
      });

      it('delete an item will emit change event', async () => {
         const map = new Map<string, number>([
            ['a', 1],
            ['b', 2],
         ]);

         stateManager.register(map, 'b');

         const actual = await new WaitForEvent(stateManager, 'changed').wait(
            () => {
               mapProxyFactory.getFromData({ map: map }).proxy.delete('b');
            }
         );

         const expected: IStateChange = {
            context: map,
            oldContext: map,
            key: 'b',
            oldValue: 2,
            newValue: undefined,
         };

         expect(actual).toEqual(expected);
      });
   });


   describe('register a date property', () => {

      let proxyRegistry: IProxyRegistry;

      beforeAll(() => {
         proxyRegistry = InjectionContainer.get(RsXStateManagerInjectionTokens.IProxyRegistry);
      });

      it('register will initialise state', async () => {
         const object = { x: new Date(2021, 2, 3) };

         await new WaitForEvent(stateManager, 'changed').wait(() => {
            stateManager.register(object, 'x');
         });

         expect(stateManager.getState(object, 'x')).toEqual(new Date(2021, 2, 3));
      });

      it('after register change event will emit initial value', async () => {
         const object = { x: new Date(2021, 2, 3) };;

         const actual = await new WaitForEvent(stateManager, 'changed').wait(
            () => {
               stateManager.register(object, 'x');
            }
         );

         const expected: IStateChange = {
            context: object,
            oldContext: object,
            key: 'x',
            oldValue: undefined,
            newValue: new Date(2021, 2, 3),
         };

         expect(actual).toEqual(expected);
      });

      it('replacing date property will emit change event', async () => {
         const object = { x: new Date(2021, 2, 3) };;

         await new WaitForEvent(stateManager, 'changed').wait(() => {
            stateManager.register(object, 'x');
         });

         const actual = await new WaitForEvent(stateManager, 'changed').wait(
            () => {
               object.x = new Date(2023, 2, 3)
            }
         );

         const expected: IStateChange = {
            context: object,
            oldContext: object,
            key: 'x',
            oldValue: new Date(2021, 2, 3),
            newValue: new Date(2023, 2, 3),
         };
         expect(actual).toEqual(expected);
      });

      it('changing date property will not emit change event if not recursive', async () => {
         const object = { x: new Date(2021, 2, 3) };;

         await new WaitForEvent(stateManager, 'changed').wait(() => {
            stateManager.register(object, 'x');
         });

         const actual = await new WaitForEvent(stateManager, 'changed').wait(
            () => {
               object.x.setFullYear(2024)
            }
         );

         expect(actual).toBeNull();
      });

      it('changing date property will emit change event if recursive', async () => {
         const object = { x: new Date(2021, 2, 3) };;

         await new WaitForEvent(stateManager, 'changed').wait(() => {
            stateManager.register(object, 'x', truePredicate);
         });

         const actual = await new WaitForEvent(stateManager, 'changed').wait(
            () => {
               object.x.setFullYear(2024)
            }
         );

         const expected: IStateChange = {
            context: object,
            oldContext: object,
            key: 'x',
            oldValue: new Date(2021, 2, 3),
            newValue: new Date(2024, 2, 3),
         };
         expect(actual).toDeepEqualCircular(expected);
      });

      it('register date property will initialise state', async () => {
         const date = new Date(2021, 2, 3)

         await new WaitForEvent(stateManager, 'changed').wait(() => {
            stateManager.register(date, 'year');
         });

         expect(stateManager.getState(date, 'year')).toEqual(2021);
      });

      it('after register date property change event will emit initial value', async () => {
         const date = new Date(2021, 2, 3)

         const actual = await new WaitForEvent(stateManager, 'changed').wait(
            () => {
               stateManager.register(date, 'year');
            }
         );

         const expected: IStateChange = {
            context: date,
            oldContext: date,
            key: 'year',
            oldValue: undefined,
            newValue: 2021,
         };

         expect(actual).toEqual(expected);
      });

      it('changing date property will emit change evenet', async () => {
         const date = new Date(2021, 2, 3)

         stateManager.register(date, 'year');

         const actual = await new WaitForEvent(stateManager, 'changed').wait(
            () => {
               const dataProxy = proxyRegistry.getProxy<Date>(date);
               dataProxy.setFullYear(2023)
            }
         );

         const expected: IStateChange = {
            context: date,
            oldContext: date,
            key: 'year',
            oldValue: 2021,
            newValue: 2023,
         };

         expect(actual).toEqual(expected);
      });

   });

   describe('register promise property', () => {
      it('register will initialise state', async () => {
         const object = { x: Promise.resolve(2) };

         await new WaitForEvent(stateManager, 'changed').wait(() => {
            stateManager.register(object, 'x');
         });

         expect(stateManager.getState(object, 'x')).toEqual(2);
      });

      it('after register change event will emit initial value', async () => {
         const object = { x: Promise.resolve(2) };

         const actual = await new WaitForEvent(stateManager, 'changed').wait(
            () => {
               stateManager.register(object, 'x');
            }
         );

         const expected: IStateChange = {
            context: object,
            oldContext: object,
            key: 'x',
            oldValue: undefined,
            newValue: 2,
         };

         expect(actual).toEqual(expected);
      });

      it('replacing promise property with null will emit change event', async () => {
         const object = { x: Promise.resolve(2) };

         await new WaitForEvent(stateManager, 'changed').wait(() => {
            stateManager.register(object, 'x');
         });

         const actual = await new WaitForEvent(stateManager, 'changed').wait(
            () => {
               object.x = null;
            }
         );

         const expected: IStateChange = {
            context: object,
            oldContext: object,
            key: 'x',
            oldValue: 2,
            newValue: null,
         };
         expect(actual).toEqual(expected);
      });

      it('set initial value from null to promise will  emit change event', async () => {
         const object = { x: null };
         await new WaitForEvent(stateManager, 'changed').wait(() => {
            stateManager.register(object, 'x');
         });

         const actual = await new WaitForEvent(stateManager, 'changed').wait(
            () => {
               object.x = Promise.resolve(3);
            }
         );

         const expected: IStateChange = {
            context: object,
            oldContext: object,
            key: 'x',
            oldValue: null,
            newValue: 3,
         };
         expect(actual).toEqual(expected);
      });

      it('replacing promise will emit change event', async () => {
         const object = { x: Promise.resolve(2) };
         await new WaitForEvent(stateManager, 'changed').wait(() => {
            stateManager.register(object, 'x');
         });

         const actual = await new WaitForEvent(stateManager, 'changed').wait(
            () => {
               object.x = Promise.resolve(3);
            }
         );

         const expected: IStateChange = {
            context: object,
            oldContext: object,
            key: 'x',
            oldValue: 2,
            newValue: 3,
         };

         expect(actual).toEqual(expected);
      });

      it('replacing promise will update state', async () => {
         const object = { x: Promise.resolve(2) };

         await new WaitForEvent(stateManager, 'changed').wait(() => {
            stateManager.register(object, 'x');
         });

         await new WaitForEvent(stateManager, 'changed').wait(() => {
            object.x = Promise.resolve(3);
         });

         expect(stateManager.getState(object, 'x')).toEqual(3);
      });
   });

   describe('register observable property', () => {
      it('register will initialise state', async () => {
         const object = { x: of(2) };

         await new WaitForEvent(stateManager, 'changed').wait(() => {
            stateManager.register(object, 'x');
         });

         expect(stateManager.getState(object, 'x')).toEqual(2);
      });

      it('after register change event will emit initial value', async () => {
         const object = { x: of(2) };

         const actual = await new WaitForEvent(stateManager, 'changed').wait(
            () => {
               stateManager.register(object, 'x');
            }
         );

         const expected: IStateChange = {
            context: object,
            oldContext: object,
            key: 'x',
            oldValue: undefined,
            newValue: 2,
         };

         expect(actual).toEqual(expected);
      });

      it('replacing observable property with null will emit change event', async () => {
         const object = { x: of(2) };

         await new WaitForEvent(stateManager, 'changed').wait(() => {
            stateManager.register(object, 'x');
         });

         const actual = await new WaitForEvent(stateManager, 'changed').wait(
            () => {
               object.x = null;
            }
         );

         const expected: IStateChange = {
            context: object,
            oldContext: object,
            key: 'x',
            oldValue: 2,
            newValue: null,
         };

         expect(actual).toEqual(expected);
      });

      it('set initial value from null to a observable will emit change event', async () => {
         const object = { x: null };

         await new WaitForEvent(stateManager, 'changed').wait(() => {
            stateManager.register(object, 'x');
         });

         const actual = await new WaitForEvent(stateManager, 'changed').wait(
            () => {
               object.x = of(3);
            }
         );

         const expected: IStateChange = {
            context: object,
            oldContext: object,
            key: 'x',
            oldValue: null,
            newValue: 3,
         };
         expect(actual).toEqual(expected);
      });

      it('replacing observable will emit change event', async () => {
         const object = { x: of(2) };
         await new WaitForEvent(stateManager, 'changed').wait(() => {
            stateManager.register(object, 'x');
         });

         const actual = await new WaitForEvent(stateManager, 'changed').wait(
            () => {
               object.x = of(3);
            }
         );

         const expected: IStateChange = {
            context: object,
            oldContext: object,
            key: 'x',
            oldValue: 2,
            newValue: 3,
         };
         expect(actual).toEqual(expected);
      });

      it('replacing observable will update state', async () => {
         const object = { x: of(2) };

         await new WaitForEvent(stateManager, 'changed').wait(() => {
            stateManager.register(object, 'x');
         });

         await new WaitForEvent(stateManager, 'changed').wait(() => {
            object.x = of(3);
         });

         expect(stateManager.getState(object, 'x')).toEqual(3);
      });

      it('will emit change event when observable emits new value', async () => {
         const object = { x: new BehaviorSubject(2) };
         stateManager.register(object, 'x');

         const actual = await new WaitForEvent(stateManager, 'changed').wait(
            () => {
               object.x.next(3);
            }
         );

         const expected: IStateChange = {
            context: object,
            oldContext: object,
            key: 'x',
            oldValue: 2,
            newValue: 3,
         };

         expect(actual).toEqual(expected);
      });

      it('will update state  when observable emits new value', async () => {
         const object = { x: new BehaviorSubject(2) };
         stateManager.register(object, 'x');

         await new WaitForEvent(stateManager, 'changed').wait(() => {
            object.x.next(3);
         });

         expect(stateManager.getState(object, 'x')).toEqual(3);
      });
   });

   describe('updating nested state', () => {
      it('replace root state will emit event for all changed  states', async () => {
         const object = {
            nested: {
               value: 2,
               nested: {
                  value: 3,
               },
            },
         };

         stateManager.register(object, 'nested');
         stateManager.register(object.nested, 'value');
         stateManager.register(object.nested, 'nested');
         stateManager.register(object.nested.nested, 'value');

         const actual = await new WaitForEvent(stateManager, 'changed', {
            count: 3,
         }).wait(() => {
            object.nested = {
               value: 2,
               nested: {
                  value: 13,
               },
            };
         });

         const expected: IStateChange[] = [
            {
               oldContext: {
                  value: 2,
                  nested: {
                     value: 3,
                  },
               },
               context: {
                  value: 2,
                  nested: {
                     value: 13,
                  },
               },
               key: 'nested',
               oldValue: {
                  value: 3,
               },
               newValue: {
                  value: 13,
               },
            },
            {
               oldContext: {
                  value: 3,
               },
               context: {
                  value: 13,
               },
               key: 'value',
               oldValue: 3,
               newValue: 13,
            },
            {
               oldContext: {
                  nested: {
                     value: 2,
                     nested: {
                        value: 13,
                     },
                  },
               },
               context: {
                  nested: {
                     value: 2,
                     nested: {
                        value: 13,
                     },
                  },
               },
               key: 'nested',
               oldValue: {
                  value: 2,
                  nested: {
                     value: 3,
                  },
               },
               newValue: {
                  value: 2,
                  nested: {
                     value: 13,
                  },
               },
            },
         ];
         expect(actual).toEqual(expected);
      });
      it('replace root state will update all registered nested state', async () => {
         const object = {
            nested: {
               value: 2,
               nested: {
                  value: 3,
               },
            },
         };

         stateManager.register(object, 'nested');
         stateManager.register(object.nested, 'value');
         stateManager.register(object.nested, 'nested');
         stateManager.register(object.nested.nested, 'value');

         await new WaitForEvent(stateManager, 'changed', {
            count: 4,
         }).wait(() => {
            object.nested = {
               value: 12,
               nested: {
                  value: 13,
               },
            };
         });

         expect(stateManager.getState(object, 'nested')).toEqual({
            value: 12,
            nested: {
               value: 13,
            },
         });

         expect(stateManager.getState(object.nested, 'value')).toEqual(12);

         expect(stateManager.getState(object.nested, 'nested')).toEqual({
            value: 13,
         });

         expect(stateManager.getState(object.nested.nested, 'value')).toEqual(
            13
         );
      });

      it('replace nested object will emit correct number of changed events', async () => {
         const oldContext = {
            value: 2,
            nested: {
               value: 3,
            },
         };
         const object = {
            nested: oldContext,
         };
         stateManager.register(object, 'nested');
         stateManager.register(object.nested, 'value');
         stateManager.register(object.nested, 'nested');
         stateManager.register(object.nested.nested, 'value');
         const changed = new ObservableMock();
         stateManager._changed = changed;

         await new WaitForEvent(stateManager, 'changed', { count: 4 }).wait(
            () => {
               object.nested = {
                  value: 12,
                  nested: {
                     value: 13,
                  },
               };
            }
         );

         expect(changed.next).toHaveBeenCalledTimes(4);
      });

      it('replace nested object will emit change event fo every change', async () => {
         const oldContext = {
            value: 2,
            nested: {
               value: 3,
            },
         };
         const object = {
            nested: oldContext,
         };
         stateManager.register(object, 'nested');
         stateManager.register(object.nested, 'value');
         stateManager.register(object.nested, 'nested');
         stateManager.register(object.nested.nested, 'value');
         const newContext = {
            value: 12,
            nested: {
               value: 13,
            },
         };

         const actual = await new WaitForEvent(stateManager, 'changed', {
            count: 4,
         }).wait(() => {
            object.nested = newContext;
         });

         const expected = [
            {
               context: newContext,
               oldContext,
               key: 'value',
               oldValue: oldContext.value,
               newValue: newContext.value,
            },
            {
               context: newContext,
               oldContext,
               key: 'nested',
               oldValue: oldContext.nested,
               newValue: newContext.nested,
            },
            {
               context: newContext.nested,
               oldContext: oldContext.nested,
               key: 'value',
               oldValue: oldContext.nested.value,
               newValue: newContext.nested.value,
            },
            {
               context: object,
               oldContext: object,
               key: 'nested',
               oldValue: oldContext,
               newValue: newContext,
            },
         ];

         expect(actual[0]).toEqual(expected[0]);
         expect(actual[1]).toEqual(expected[1]);
         expect(actual[2]).toEqual(expected[2]);
         expect(actual[3]).toEqual(expected[3]);
         expect(actual).toEqual(expected);
      });
   });

   it('when changing a nested state a change event will be also emitted for registed parent states', async () => {
      const object = {
         nested: {
            value: 2,
            nested: {
               value: 3,
            },
         },
      };

      stateManager.register(object, 'nested', truePredicate);
      stateManager.register(object.nested.nested, 'value');

      const actual = await new WaitForEvent(stateManager, 'changed', {
         count: 2,
      }).wait(() => {
         object.nested.nested.value = 13;
      });

      const expected = [
         {
            context: object,
            oldContext: object,
            key: 'nested',
            oldValue: {
               value: 2,
               nested: {
                  value: 3,
               },
            },
            newValue: {
               value: 2,
               nested: {
                  value: 13,
               },
            },
         },
         {
            context: object.nested.nested,
            oldContext: object.nested.nested,
            key: 'value',
            oldValue: 3,
            newValue: 13,
         },
      ];
      expect(actual).toEqual(expected);
   });
});
