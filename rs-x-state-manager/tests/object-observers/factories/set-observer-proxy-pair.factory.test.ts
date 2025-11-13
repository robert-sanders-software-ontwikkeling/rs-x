import {
   ErrorLog,
   InjectionContainer,
   IPropertyChange,
   truePredicate,
   WaitForEvent,
} from '@rs-x/core';
import { IProxyRegistry } from 'rs-x-state-manager/lib/proxies/proxy-registry/proxy-registry.interface';
import { ISetObserverProxyPairFactory } from '../../../lib/object-observer/factories/set-observer-proxy-pair.factory.type';
import { IObjectPropertyObserverProxyPairManager } from '../../../lib/object-property-observer-proxy-pair-manager.type';
import { ObserverGroup } from '../../../lib/observer-group';
import { IObserver } from '../../../lib/observer.interface';
import { ISetProxyFactory } from '../../../lib/proxies/set-proxy/set-proxy.factory.type';
import { RsXStateManagerInjectionTokens } from '../../../lib/rs-x-state-manager-injection-tokes';
import { RsXStateManagerModule } from '../../../lib/rs-x-state-manager.module';
import { DisposableOwnerMock } from '../../../lib/testing/disposable-owner.mock';

describe('ISetObserverProxyPairFactory tests', () => {
   let setProxyFactory: ISetProxyFactory;
   let disposableOwner: DisposableOwnerMock;
   let observer: IObserver;
   let setObserverProxyPairFactory: ISetObserverProxyPairFactory;

   beforeAll(async () => {
      await InjectionContainer.load(RsXStateManagerModule);
      setProxyFactory = InjectionContainer.get<ISetProxyFactory>(
         RsXStateManagerInjectionTokens.ISetProxyFactory
      );
      setObserverProxyPairFactory =
         InjectionContainer.get<ISetObserverProxyPairFactory>(
            RsXStateManagerInjectionTokens.ISetObserverProxyPairFactory
         );
   });

   afterAll(async () => {
      await InjectionContainer.unload(RsXStateManagerModule);
   });

   beforeEach(() => {
      disposableOwner = new DisposableOwnerMock();
   });

   afterEach(() => {
      if (observer) {
         observer.dispose();
         observer = null;
      }
   });

   it('applies will return true when passed in value is a set', async () => {
      const actual = setObserverProxyPairFactory.applies(new Set());
      expect(actual).toEqual(true);
   });

   it('applies will return false when passed in value is not a set', async () => {
      const actual = setObserverProxyPairFactory.applies({});
      expect(actual).toEqual(false);
   });

   it('create will return  Observergroup without item observers when recursive = false', async () => {
      const objectSet = new Set([{ x: 1 }, { x: 2 }]);
      observer = setObserverProxyPairFactory.create(disposableOwner, {
         target: objectSet,
      }).observer;

      const setProxyId = setProxyFactory.getId({
         set: objectSet,
      });

      const expected = new ObserverGroup(
         disposableOwner,
         objectSet,
         objectSet,
         truePredicate,
         new ErrorLog(),
         undefined,
         () => setProxyFactory.getFromId(setProxyId).observer,
         true
      );
      expect(observer).observerEqualTo(expected);
   });

   it('add will emit change event', async () => {
      const objectSet = new Set([{ x: 1 }, { x: 2 }]);
      observer = setObserverProxyPairFactory.create(disposableOwner, {
         target: objectSet,
      }).observer;
      const setProxyId = setProxyFactory.getId({
         set: objectSet,
      });
      const setProxy = setProxyFactory.getFromId(setProxyId).proxy;

      const actual = await new WaitForEvent(observer, 'changed').wait(() => {
         setProxy.add({ x: 3 });
      });

      const expected: IPropertyChange = {
         arguments: [{ x: 3 }],
         chain: [],
         id: 'add',
         newValue: observer.target,
         target: observer.target,
      };

      expect(actual).toEqual(expected);
   });

   it('items will not be observed when recursive is false', () => {
      const objectSet = new Set([{ x: 1 }, { x: 2 }]);

      const observerProxyPair = setObserverProxyPairFactory.create(
         disposableOwner,
         { target: objectSet }
      );
      observer = observerProxyPair.observer;
      disposableOwner.canDispose.mockReturnValue(true);

      const objectPropertyObserverProxyPairManager =
         InjectionContainer.get<IObjectPropertyObserverProxyPairManager>(
            RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager
         );
      const propertyObserverProxyPairManager =
         objectPropertyObserverProxyPairManager.getFromId(objectSet);

      expect(setProxyFactory.getFromId(observerProxyPair.id)).toBeDefined();
      expect(propertyObserverProxyPairManager).toBeUndefined();
   });

   it('items will not be observed for non-recursive observer', () => {
      const objectSet = new Set([{ x: 1 }, { x: 2 }]);

      const observerProxyPair = setObserverProxyPairFactory.create(
         disposableOwner,
         { target: objectSet }
      );
      observer = observerProxyPair.observer;
      disposableOwner.canDispose.mockReturnValue(true);

      const objectPropertyObserverProxyPairManager =
         InjectionContainer.get<IObjectPropertyObserverProxyPairManager>(
            RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager
         );
      const propertyObserverProxyPairManager =
         objectPropertyObserverProxyPairManager.getFromId(objectSet);

      expect(setProxyFactory.getFromId(observerProxyPair.id)).toBeDefined();
      expect(propertyObserverProxyPairManager).toBeUndefined();
   });

   it('dispose will restore the orginal items', () => {
      const proxyRegistry = InjectionContainer.get<IProxyRegistry>(
         RsXStateManagerInjectionTokens.IProxyRegistry
      );
      const item1 = [1];
      const item2 = [2];
      const objectSet = new Set([item1, item2]);
      const observerProxyPair = setObserverProxyPairFactory.create(
         disposableOwner,
         {
            target: objectSet,
            mustProxify: truePredicate,
         }
      );
      observer = observerProxyPair.observer;
      disposableOwner.canDispose.mockReturnValue(true);

      let values = Array.from(objectSet.values());

      expect(proxyRegistry.isProxy(values[0])).toEqual(true);
      expect(proxyRegistry.isProxy(values[1])).toEqual(true);

      observer.dispose();

      values = Array.from(objectSet.values());

      expect(proxyRegistry.isProxy(values[0])).toEqual(false);
      expect(proxyRegistry.isProxy(values[1])).toEqual(false);
      expect(values[0]).toBe(item1);
      expect(values[1]).toBe(item2);
   });
});
