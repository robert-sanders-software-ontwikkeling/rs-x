import { ObjectObserverProxyPairManager } from '../../lib/object-observer/object-observer-proxy-pair-manager';
import { ProxyRegistry } from '../../lib/proxies/proxy-registry/proxy-registry';
import { ObjectObserverProxyPairFactoryMock } from '../../lib/testing/object-observer-proxy-pair.factory.mock';
import { ObserverMock } from '../../lib/testing/observer.mock';

describe('ObjectObserverProxyPairManager tests', () => {
   let objectObserverProxyPairFactory: ObjectObserverProxyPairFactoryMock;
   let objectObserverProxyPairManager: ObjectObserverProxyPairManager;

   beforeAll(async () => {
      objectObserverProxyPairFactory = new ObjectObserverProxyPairFactoryMock();
      objectObserverProxyPairManager = new ObjectObserverProxyPairManager(
         () => ({ factories: [objectObserverProxyPairFactory] }),
         new ProxyRegistry()
      );
   });

   it('get id will return the passed in target', () => {
      const proxyTarget = { target: {} };

      const actual = objectObserverProxyPairManager.getId(proxyTarget);

      expect(actual).toBe(proxyTarget.target);
   });

   it('will return null for not supported type', () => {
      objectObserverProxyPairFactory.applies.mockReturnValue(false);

      const actual = objectObserverProxyPairManager.create({
         target: { x: 1 },
      });

      expect(actual).toEqual({
         id: { x: 1 },
         instance: null,
         referenceCount: 1,
      });
   });

   it('will create an observer for supported type', () => {
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
         id: { x: 1 },
         instance: observer,
         referenceCount: 1,
      });
   });
});
