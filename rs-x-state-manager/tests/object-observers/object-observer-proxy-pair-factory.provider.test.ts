import { InjectionContainer } from '@rs-x-core';
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
      expect(objectObserverFactoryProvider.factories).toEqual([
         InjectionContainer.get(
            RsXStateManagerInjectionTokens.PlainObjectObserverProxyPairFactory
         ),
         InjectionContainer.get(
            RsXStateManagerInjectionTokens.IArrayObserverProxyPairFactory
         ),
         InjectionContainer.get(
            RsXStateManagerInjectionTokens.PromiseObserverProxyPairFactory
         ),
         InjectionContainer.get(
            RsXStateManagerInjectionTokens.ObservableObserverProxyPairFactory
         ),
         InjectionContainer.get(
            RsXStateManagerInjectionTokens.IMapObserverProxyPairFactory
         ),
         InjectionContainer.get(
            RsXStateManagerInjectionTokens.ISetObserverProxyPairFactory
         ),
      ]);
   });
});
