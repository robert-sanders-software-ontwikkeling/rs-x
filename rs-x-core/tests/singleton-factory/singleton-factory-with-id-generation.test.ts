import { SingletonFactoryWithIdGeneration } from '../../lib/singleton-factory/singleton-factory-with-id-generation';

class TestObject {}
interface ITestData {
   groupId: number;
   groupMemberId: number;
}

class TestGroupedSingletonFactory extends SingletonFactoryWithIdGeneration<
   string,
   ITestData,
   TestObject
> {
   constructor() {
      super();
   }

   protected createUniqueId(data: ITestData): string {
      return `${data.groupId}${data.groupMemberId}`;
   }

   protected getGroupId(data: ITestData): unknown {
      return data.groupId;
   }
   protected getGroupMemberId(data: ITestData): unknown {
      return data.groupMemberId;
   }
   protected createInstance(): TestObject {
      return new TestObject();
   }
}

describe('GroupedSingletonFactory tests', () => {
   let groupedSingletonFactory: TestGroupedSingletonFactory;

   beforeEach(() => {
      groupedSingletonFactory = new TestGroupedSingletonFactory();
   });

   it('will create different instances for different group memmbers of the the same group', () => {
      const instance1 = groupedSingletonFactory.create({
         groupId: 1,
         groupMemberId: 10,
      }).instance;
      const instance2 = groupedSingletonFactory.create({
         groupId: 1,
         groupMemberId: 11,
      }).instance;

      expect(instance1).toBeInstanceOf(TestObject);
      expect(instance2).toBeInstanceOf(TestObject);
      expect(instance1).not.toBe(instance2);
   });

   it('will create different instances for different groups  but same group id', () => {
      const instance1 = groupedSingletonFactory.create({
         groupId: 1,
         groupMemberId: 10,
      }).instance;
      const instance2 = groupedSingletonFactory.create({
         groupId: 2,
         groupMemberId: 10,
      }).instance;

      expect(instance1).toBeInstanceOf(TestObject);
      expect(instance2).toBeInstanceOf(TestObject);
      expect(instance1).not.toBe(instance2);
   });

   it('will create only one instance for the group id and group member id', () => {
      const resul1 = groupedSingletonFactory.create({
         groupId: 1,
         groupMemberId: 10,
      });
      const resul2 = groupedSingletonFactory.create({
         groupId: 1,
         groupMemberId: 10,
      });

      expect(resul1.instance).toBeInstanceOf(TestObject);
      expect(resul1.instance).toBe(resul2.instance);
      expect(resul1.referenceCount).toEqual(1);
      expect(resul2.referenceCount).toEqual(2);
   });

   it('can used the returned id to release instance', () => {
      const { id, instance } = groupedSingletonFactory.create({
         groupId: 1,
         groupMemberId: 10,
      });

      expect(groupedSingletonFactory.getFromId(id)).toBe(instance);

      groupedSingletonFactory.release(id);

      expect(groupedSingletonFactory.getFromId(id)).toBeUndefined();
   });
});
