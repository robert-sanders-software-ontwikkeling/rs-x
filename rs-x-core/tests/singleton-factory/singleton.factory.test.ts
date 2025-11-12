import { SingletonFactory } from '../../lib/singleton-factory/singleton.factory';

class TestObject {}
class TestSingletonFactory extends SingletonFactory<
   string,
   string,
   TestObject
> {
   constructor() {
      super();
   }

   public getId(data: string): string {
      return data;
   }

   protected createId(data: string): string {
      return data;
   }

   protected createInstance(): TestObject {
      return new TestObject();
   }
}

describe('SingletonFactory tests', () => {
   let testSingletonFactory: TestSingletonFactory;

   beforeEach(() => {
      testSingletonFactory = new TestSingletonFactory();
   });

   it('will return id  id', () => {
      const expected = '1';

      const { id: actual } = testSingletonFactory.create(expected);

      expect(actual).toEqual(expected);
   });

   it('will only create one instance per id', () => {
      const key = '1';

      const actual1 = testSingletonFactory.create(key);
      const actual2 = testSingletonFactory.create(key);

      expect(actual1.instance).toBe(actual2.instance);
      expect(actual1.referenceCount).toEqual(1);
      expect(actual2.referenceCount).toEqual(2);
   });

   it('will  create different instances for different ids', () => {
      const actual1 = testSingletonFactory.create('1');
      const actual2 = testSingletonFactory.create('2');

      expect(actual1.instance).not.toBe(actual2.instance);
      expect(actual1.referenceCount).toEqual(1);
      expect(actual2.referenceCount).toEqual(1);
   });

   it('release will decrement the reference count', () => {
      const key = '1';

      const actual1 = testSingletonFactory.create(key);
      const actual2 = testSingletonFactory.create(key);
      testSingletonFactory.release(key);
      testSingletonFactory.release(key);
      const actual3 = testSingletonFactory.create(key);

      expect(actual1.referenceCount).toEqual(1);
      expect(actual2.referenceCount).toEqual(2);
      expect(actual3.referenceCount).toEqual(1);
   });

   it('dispose will clear all registered instances', () => {
      const key1 = '1';
      const key2 = '2';
      testSingletonFactory.create(key1);
      testSingletonFactory.create(key2);

      testSingletonFactory.dispose();

      const actual1 = testSingletonFactory.create(key1);
      const actual2 = testSingletonFactory.create(key2);

      expect(actual1.referenceCount).toEqual(1);
      expect(actual2.referenceCount).toEqual(1);
   });

   it('get will return created instance for given id ', () => {
      const key1 = '1';
      const key2 = '2';
      testSingletonFactory.create(key1);
      const { instance: expected } = testSingletonFactory.create(key2);

      const actual = testSingletonFactory.getFromId(key2);

      expect(actual).toBe(expected);
   });

   it('get will return undefined if no instance exists for given id ', () => {
      const key1 = '1';
      const key2 = '2';
      testSingletonFactory.create(key1);

      const actual = testSingletonFactory.getFromId(key2);

      expect(actual).toBeUndefined();
   });

   it('getOrCreate will return created instance for given id ', () => {
      const key1 = '1';

      testSingletonFactory.create(key1);
      const { instance: expected } = testSingletonFactory.create(key1);

      const actual = testSingletonFactory.getOrCreate(key1);

      expect(actual).toBe(expected);
   });

   it('getOrCreate will  created instance if no instance exists for given id ', () => {
      const actual = testSingletonFactory.getOrCreate('1');
      expect(actual).toBeInstanceOf(TestObject);
   });
});
