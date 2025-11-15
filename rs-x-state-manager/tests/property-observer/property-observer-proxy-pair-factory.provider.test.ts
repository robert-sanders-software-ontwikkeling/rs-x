import { InjectionContainer } from '@rs-x/core';
import { IPropertyObserverProxyPairFactoryProvider } from '../../lib/property-observer/property-observer-proxy-factory.provider.interface';
import { RsXStateManagerInjectionTokens } from '../../lib/rs-x-state-manager-injection-tokes';
import { RsXStateManagerModule } from '../../lib/rs-x-state-manager.module';

describe('PropertyObserverProxyPairFactoryProvider tests', () => {
   let propertyObserverProxyPairFactoryProvider: IPropertyObserverProxyPairFactoryProvider;

   beforeAll(async () => {
      await InjectionContainer.load(RsXStateManagerModule);
      propertyObserverProxyPairFactoryProvider =
         InjectionContainer.get<IPropertyObserverProxyPairFactoryProvider>(
            RsXStateManagerInjectionTokens.IPropertyObserverProxyPairFactoryProvider
         );
   });

   afterAll(async () => {
      await InjectionContainer.unload(RsXStateManagerModule);
   });

   it('will provide the correct factories', () => {
      expect(propertyObserverProxyPairFactoryProvider.factories).toEqual([
         InjectionContainer.get(
            RsXStateManagerInjectionTokens.NonIterableObjectPropertyObserverProxyPairFactory
         ),
         InjectionContainer.get(
            RsXStateManagerInjectionTokens.ArrayItemObserverProxyPairFactory
         ),
         InjectionContainer.get(
            RsXStateManagerInjectionTokens.MapItemObserverProxyPairFactory
         ),
         InjectionContainer.get(
            RsXStateManagerInjectionTokens.SetItemObserverProxyPairFactory
         ),
      ]);
   });
});
