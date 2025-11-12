import {
   emptyFunction,
   ErrorLog,
   InjectionContainer,
   IPropertyChange,
   truePredicate,
   WaitForEvent,
} from '@rs-x-core';
import { IObjectPropertyObserverProxyPairManager } from '../../lib/object-property-observer-proxy-pair-manager.type';
import { RsXStateManagerInjectionTokens } from '../../lib/rs-x-state-manager-injection-tokes';
import { RsXStateManagerModule } from '../../lib/rs-x-state-manager.module';
import { StateChangeSubscriptionManager } from '../../lib/state-manager/state-change-subscription-manager/state-change-subsription-manager';

describe('StateChangeSubscriptionManager tests', () => {
   let stateChangeSubscriptionManager: StateChangeSubscriptionManager;

   beforeAll(async () => {
      await InjectionContainer.load(RsXStateManagerModule);
   });

   afterAll(async () => {
      await InjectionContainer.unload(RsXStateManagerModule);
   });

   beforeEach(() => {
      stateChangeSubscriptionManager = new StateChangeSubscriptionManager(
         InjectionContainer.get(
            RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager
         ),
         new ErrorLog()
      );
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
         key: 'x',
         mustProxify: truePredicate,
         onChanged: emptyFunction,
      }).instance;
      const nonRecursiveObserver = stateChangeSubscrionInfoForContext.create({
         key: 'x',
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
      const stateChangeSubscrionInfoForContext =
         stateChangeSubscriptionManager.create(context).instance;
      const recursiveObserver = stateChangeSubscrionInfoForContext.create({
         key: 'x',
         mustProxify: truePredicate,
         onChanged: emptyFunction,
      }).instance;
      const nonRecursiveObserver = stateChangeSubscrionInfoForContext.create({
         key: 'x',
         onChanged: emptyFunction,
      }).instance;

      nonRecursiveObserver.dispose();

      const recursiveChange = await new WaitForEvent(
         recursiveObserver,
         'changed'
      ).wait(() => {
         context.x.y = 20;
      });

      const expected: IPropertyChange = {
         arguments: [],
         chain: [
            { object: context, id: 'x' },
            { object: context.x, id: 'y' },
         ],
         hasRebindNested: false,
         target: context.x,
         id: 'y',
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
         key: 'x',
         mustProxify: truePredicate,
         onChanged: emptyFunction,
      }).instance;
      const nonRecursiveObserver = stateChangeSubscrionInfoForContext.create({
         key: 'x',
         onChanged: emptyFunction,
      }).instance;

      recursiveObserver.dispose();

      const nonRecursiveChange = await new WaitForEvent(
         nonRecursiveObserver,
         'changed'
      ).wait(() => {
         context.x = { y: 20 };
      });

      const expected: IPropertyChange = {
         arguments: [],
         chain: [{ object: context, id: 'x' }],
         hasRebindNested: false,
         target: context,
         id: 'x',
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
         key: 'x',
         mustProxify: truePredicate,
         onChanged: emptyFunction,
      }).instance;
      const nonRecursiveObserver = stateChangeSubscrionInfoForContext.create({
         key: 'x',
         onChanged: emptyFunction,
      }).instance;

      recursiveObserver.dispose();

      const nonRecursiveChange = await new WaitForEvent(
         nonRecursiveObserver,
         'changed'
      ).wait(() => {
         context.x = { y: 20 };
      });

      const expected: IPropertyChange = {
         arguments: [],
         chain: [{ object: context, id: 'x' }],
         hasRebindNested: false,
         target: context,
         id: 'x',
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
         key: 'x',
         mustProxify: truePredicate,
         onChanged: emptyFunction,
      }).instance;
      const nonRecursiveObserver = stateChangeSubscrionInfoForContext.create({
         key: 'x',
         onChanged: emptyFunction,
      }).instance;

      const nonRecursiveChange = await new WaitForEvent(
         nonRecursiveObserver,
         'changed'
      ).wait(() => {
         context.x.y = 15;
      });

      const recursiveChange = await new WaitForEvent(
         recursiveObserver,
         'changed',
         { ignoreInitialValue: true }
      ).wait(() => {
         context.x.y = 20;
      });

      expect(nonRecursiveChange).toBeNull();
      const expected: IPropertyChange = {
         arguments: [],
         chain: [
            { object: context, id: 'x' },
            { object: context.x, id: 'y' },
         ],
         hasRebindNested: false,
         target: context.x,
         id: 'y',
         newValue: 20,
      };

      expect(recursiveChange).toEqual(expected);
   });

   it('recursive and unrecursive observer:  all proxies have been release when all observers have been disposed', async () => {
      const propertyObserverProxyPairManager =
         InjectionContainer.get<IObjectPropertyObserverProxyPairManager>(
            RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager
         );
      const context = {
         x: {
            y: 10,
         },
      };
      const stateChangeSubscrionInfoForContext =
         stateChangeSubscriptionManager.create(context).instance;
      const recursiveObserver = stateChangeSubscrionInfoForContext.create({
         key: 'x',
         mustProxify: truePredicate,
         onChanged: emptyFunction,
      }).instance;
      const nonRecursiveObserver = stateChangeSubscrionInfoForContext.create({
         key: 'x',
         onChanged: emptyFunction,
      }).instance;

      const rootPropertyObserverProxyPairManager =
         propertyObserverProxyPairManager.getFromId(context);
      const nestedPropertyObserverProxyPairManager =
         propertyObserverProxyPairManager.getFromId(context.x);
      expect(rootPropertyObserverProxyPairManager).toBeDefined();
      expect(nestedPropertyObserverProxyPairManager).toBeDefined();

      expect(
         rootPropertyObserverProxyPairManager.getFromData({
            key: 'x',
            mustProxify: truePredicate,
         })
      ).toBeDefined();
      expect(
         rootPropertyObserverProxyPairManager.getFromData({
            key: 'x',
         })
      ).toBeDefined();
      expect(
         nestedPropertyObserverProxyPairManager.getFromData({
            key: 'y',
            mustProxify: truePredicate,
         })
      ).toBeDefined();

      recursiveObserver.dispose();

      expect(
         rootPropertyObserverProxyPairManager.getFromData({
            key: 'x',
            mustProxify: truePredicate,
         })
      ).toBeUndefined();
      expect(
         rootPropertyObserverProxyPairManager.getFromData({
            key: 'x',
         })
      ).toBeDefined();
      expect(
         nestedPropertyObserverProxyPairManager.getFromData({
            key: 'y',
            mustProxify: truePredicate,
         })
      ).toBeUndefined();

      nonRecursiveObserver.dispose();

      expect(
         rootPropertyObserverProxyPairManager.getFromId({
            key: 'x',
            mustProxify: truePredicate,
         })
      ).toBeUndefined();
      expect(
         rootPropertyObserverProxyPairManager.getFromId({
            key: 'x',
         })
      ).toBeUndefined();
      expect(
         nestedPropertyObserverProxyPairManager.getFromId({
            key: 'y',
            mustProxify: truePredicate,
         })
      ).toBeUndefined();
   });
});
