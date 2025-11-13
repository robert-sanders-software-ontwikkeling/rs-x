import { UnsupportedException } from '@rs-x/core';
import { ObjectPropertyObserverProxyPairManager } from '../../lib/object-property-observer-proxy-pair-manager';
import { IPropertyObserverProxyPairManager } from '../../lib/object-property-observer-proxy-pair-manager.type';
import { ObserverMock } from '../../lib/testing/observer.mock';
import { PropertyObserverProxyPairFactoryMock } from '../../lib/testing/property-observer-proxy-pair.factory.mock';

describe('PropertyObserverProxyPairManager tests', () => {
   let object: object;
   let propertyObserverManager: IPropertyObserverProxyPairManager;
   let observerFactories: PropertyObserverProxyPairFactoryMock[];

   beforeEach(() => {
      object = {
         x: new Date(),
      };

      observerFactories = [
         new PropertyObserverProxyPairFactoryMock(),
         new PropertyObserverProxyPairFactoryMock(),
      ];

      propertyObserverManager = new ObjectPropertyObserverProxyPairManager(
         () => ({ factories: observerFactories })
      ).create(object).instance;
   });

   it('will throw an error for unsupported type', () => {
      expect(() => propertyObserverManager.create({ key: 'x' })).toThrow(
         new UnsupportedException(
            'No observer factory found for given object of type Object for given id x'
         )
      );
   });

   it('will try to find property observer factory for give type ', () => {
      observerFactories[1].applies.mockReturnValue(true);

      propertyObserverManager.create({ key: 'x' });

      expect(observerFactories[0].applies).toHaveBeenCalledTimes(1);
      expect(observerFactories[0].applies).toHaveBeenCalledWith(object, {
         key: 'x',
      });

      expect(observerFactories[1].applies).toHaveBeenCalledTimes(1);
      expect(observerFactories[1].applies).toHaveBeenCalledWith(object, {
         key: 'x',
      });
   });

   it('create will call create on applying factory', () => {
      observerFactories[0].applies.mockReturnValue(true);
      const expected = {
         observer: null,
         proxy: null,
      };
      observerFactories[0].create.mockReturnValue(expected);

      const actual = propertyObserverManager.create({ key: 'x' }).instance;

      expect(observerFactories[0].create).toHaveBeenCalledTimes(1);
      expect(observerFactories[0].create).toHaveBeenCalledWith(
         {
            canDispose: expect.any(Function),
            release: expect.any(Function),
         },
         object,
         { key: 'x' }
      );
      expect(observerFactories[1].create).not.toHaveBeenCalled();
      expect(actual).toBe(expected);
   });

   it('release will call dispose on applying observer', () => {
      const observerProxyPair = {
         observer: new ObserverMock(),
         proxy: null,
      };
      observerFactories[0].applies.mockReturnValue(true);
      observerFactories[0].create.mockReturnValue(observerProxyPair);
      const { id } = propertyObserverManager.create({ key: 'x' });

      propertyObserverManager.release(id);

      expect(observerProxyPair.observer.dispose).toHaveBeenCalledTimes(1);
   });
});
