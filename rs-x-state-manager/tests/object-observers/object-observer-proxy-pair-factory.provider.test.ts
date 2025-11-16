import { InjectionContainer } from '@rs-x/core';
import { IObjectObserverProxyPairFactoryProvider } from '../../lib/object-observer/object-observer-proxy-pair-factory.provider.interface';
import { RsXStateManagerInjectionTokens } from '../../lib/rs-x-state-manager-injection-tokes';
import { RsXStateManagerModule } from '../../lib/rs-x-state-manager.module';

describe('ObjectObserverProxyPairFactoryProvider tests', () => {
   let objectObserverFactoryProvider: IObjectObserverProxyPairFactoryProvider;

   beforeAll(async () => {
      await InjectionContainer.load(RsXStateManagerModule);
      objectObserverFactoryProvider =
         InjectionContainer.get<IObjectObserverProxyPairFactoryProvider>(
            RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryProvider
         );
   });

   afterAll(async () => {
      await InjectionContainer.unload(RsXStateManagerModule);
   });

   it('will provide the correct factories', () => {

      const expected = InjectionContainer.getAll(
         RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryList
      );

       expect(objectObserverFactoryProvider.factories.length).toEqual(6)
      expect(objectObserverFactoryProvider.factories[0]).toBe(expected[0]);
      expect(objectObserverFactoryProvider.factories[1]).toBe(expected[1]);
      expect(objectObserverFactoryProvider.factories[2]).toBe(expected[2]);
      expect(objectObserverFactoryProvider.factories[3]).toBe(expected[3]);
      expect(objectObserverFactoryProvider.factories[4]).toBe(expected[4]);
      expect(objectObserverFactoryProvider.factories[5]).toBe(expected[5]);
   });
});
