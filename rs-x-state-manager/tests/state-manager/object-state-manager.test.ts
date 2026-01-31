import { InjectionContainer } from '@rs-x/core';

import { RsXStateManagerModule, unloadRsXStateManagerModule } from '../../lib/rs-x-state-manager.module';
import { RsXStateManagerInjectionTokens } from '../../lib/rs-x-state-manager-injection-tokens';
import { type IObjectStateManager } from '../../lib/state-manager/object-state-manager.interface';


describe('ObjectStateManager tests', () => {
   let objectStateManager: IObjectStateManager;
   beforeAll(async () => {
      await InjectionContainer.load(RsXStateManagerModule);
      objectStateManager = InjectionContainer.get(RsXStateManagerInjectionTokens.IObjectStateManager);
   });
   afterAll(async() => {
      await unloadRsXStateManagerModule();
   });

   afterEach(() => {
     objectStateManager.dispose();
   });

   it('set state will create a copy of a value', () => {
      const object = {
         x: {
            y: 1,
         },
      };

      objectStateManager.create(object).instance.set('x', object.x, false);
      const { value, valueCopy } = objectStateManager
         ?.getFromId(object)
         ?.getFromId('x') ?? {};

      expect(value).not.toBe(valueCopy);
      expect(value).toEqual(valueCopy);
   });

   it('replace state will remove old state and replace it with new state', () => {
      const oldObject = {
         x: {
            y: 1,
         },
      };
      const newObject = {
         x: {
            y: 2,
         },
      };

      objectStateManager.create(oldObject).instance.set('x', oldObject.x, false);

      objectStateManager.replaceState('x', newObject, newObject.x, oldObject, false);

      expect(objectStateManager.has(oldObject)).toEqual(false);
      expect(objectStateManager.has(newObject)).toEqual(true);
      expect(
         objectStateManager?.getFromId(newObject)?.getFromId('x')?.value
      ).toEqual({
         y: 2,
      });
   });

   it('replace state will update state if old and new context are the same', () => {
      const object = {
         x: {
            y: 1,
         },
      };
      objectStateManager.create(object).instance.set('x', object.x, false);

      objectStateManager.replaceState('x', object, { y: 2 }, object, false);

      expect(objectStateManager.has(object)).toEqual(true);
      expect(objectStateManager?.getFromId(object)?.getFromId('x')?.value).toEqual(
         {
            y: 2,
         }
      );
   });

   it('replace state will create new state if it does not exists', () => {
      const object = {
         x: {
            y: 1,
         },
      };

      objectStateManager.replaceState('x', object, { y: 2 }, object, false);
      expect(objectStateManager.has(object)).toEqual(true);
      expect(objectStateManager?.getFromId(object)?.getFromId('x')?.value).toEqual(
         {
            y: 2,
         }
      );
   });
});
