import { DeepClone } from '@rs-x-core';
import { ObjectStateManager } from '../../lib/state-manager/object-state-manager';

describe('ObjectStateManager tests', () => {
   let objectStateManager: ObjectStateManager;

   beforeEach(() => {
      objectStateManager = new ObjectStateManager(new DeepClone());
   });

   it('set state will create a copy of a value', () => {
      const object = {
         x: {
            y: 1,
         },
      };

      objectStateManager.create(object).instance.set('x', object.x);
      const { value, valueCopy } = objectStateManager
         .getFromId(object)
         .getFromId('x');

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

      objectStateManager.create(oldObject).instance.set('x', oldObject.x);

      objectStateManager.replaceState('x', newObject, newObject.x, oldObject);

      expect(objectStateManager.has(oldObject)).toEqual(false);
      expect(objectStateManager.has(newObject)).toEqual(true);
      expect(
         objectStateManager.getFromId(newObject).getFromId('x').value
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
      objectStateManager.create(object).instance.set('x', object.x);

      objectStateManager.replaceState('x', object, { y: 2 }, object);

      expect(objectStateManager.has(object)).toEqual(true);
      expect(objectStateManager.getFromId(object).getFromId('x').value).toEqual(
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

      objectStateManager.replaceState('x', object, { y: 2 }, object);
      expect(objectStateManager.has(object)).toEqual(true);
      expect(objectStateManager.getFromId(object).getFromId('x').value).toEqual(
         {
            y: 2,
         }
      );
   });
});
