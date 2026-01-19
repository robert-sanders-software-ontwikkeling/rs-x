import { GuidFactoryMock } from '../../../rs-x-core/lib/testing';
import { ObjectObserverProxyPairManager } from '../../lib/object-observer/object-observer-proxy-pair-manager';
import { ProxyRegistry } from '../../lib/proxies/proxy-registry/proxy-registry';
import { ObjectObserverProxyPairFactoryMock } from '../../lib/testing/object-observer-proxy-pair.factory.mock';
import { ObserverMock } from '../../lib/testing/observer.mock';

describe('ObjectObserverProxyPairManager tests', () => {
   let objectObserverProxyPairFactory: ObjectObserverProxyPairFactoryMock;
   let objectObserverProxyPairManager: ObjectObserverProxyPairManager;
   let guidFactory: GuidFactoryMock;

   beforeEach(async () => {
      objectObserverProxyPairFactory = new ObjectObserverProxyPairFactoryMock();
      guidFactory = new GuidFactoryMock();
      objectObserverProxyPairManager = new ObjectObserverProxyPairManager(
         () => ({ factories: [objectObserverProxyPairFactory] }),
         new ProxyRegistry(),
         guidFactory
      );
   });


   it('will return null for not supported type', () => {
      guidFactory.create.mockReturnValue('myGuid');
      objectObserverProxyPairFactory.applies.mockReturnValue(false);

      const actual = objectObserverProxyPairManager.create({
         target: { x: 1 },
      });

      expect(actual).toEqual({
         id: 'myGuid',
         instance: null,
         referenceCount: 1,
      });
   });

   it('will create an observer for supported type', () => {
      guidFactory.create.mockReturnValue('myGuid');
      const observer = new ObserverMock();
      objectObserverProxyPairFactory.applies.mockReturnValue(true);
      objectObserverProxyPairFactory.create.mockReturnValue(observer);

      const actual = objectObserverProxyPairManager.create({
         target: { x: 1 },
      });

      expect(objectObserverProxyPairFactory.create).toHaveBeenCalledTimes(1);
      expect(objectObserverProxyPairFactory.create).toHaveBeenCalledWith(
         {
            canDispose: expect.any(Function),
            release: expect.any(Function),
         },
         { target: { x: 1 } }
      );
      expect(actual).toEqual({
          id: 'myGuid',
         instance: observer,
         referenceCount: 1,
      });
   });
});
