import { GroupedKeyedInstanceFactory } from '../../lib/keyed-instance-factory/grouped-keyed-instance-factory';

class TestObject {}
interface ITestData {
  groupId: number;
  groupMemberId: number;
}

class TestGroupedKeyedInstanceFactory extends GroupedKeyedInstanceFactory<
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

describe('GroupedKeyedInstanceFactory tests', () => {
  let groupedKeyedInstanceFactory: TestGroupedKeyedInstanceFactory;

  beforeEach(() => {
    groupedKeyedInstanceFactory = new TestGroupedKeyedInstanceFactory();
  });

  it('will create different instances for different group memmbers of the the same group', () => {
    const instance1 = groupedKeyedInstanceFactory.create({
      groupId: 1,
      groupMemberId: 10,
    }).instance;
    const instance2 = groupedKeyedInstanceFactory.create({
      groupId: 1,
      groupMemberId: 11,
    }).instance;

    expect(instance1).toBeInstanceOf(TestObject);
    expect(instance2).toBeInstanceOf(TestObject);
    expect(instance1).not.toBe(instance2);
  });

  it('will create different instances for different groups  but same group id', () => {
    const instance1 = groupedKeyedInstanceFactory.create({
      groupId: 1,
      groupMemberId: 10,
    }).instance;
    const instance2 = groupedKeyedInstanceFactory.create({
      groupId: 2,
      groupMemberId: 10,
    }).instance;

    expect(instance1).toBeInstanceOf(TestObject);
    expect(instance2).toBeInstanceOf(TestObject);
    expect(instance1).not.toBe(instance2);
  });

  it('will create only one instance for the group id and group member id', () => {
    const resul1 = groupedKeyedInstanceFactory.create({
      groupId: 1,
      groupMemberId: 10,
    });
    const resul2 = groupedKeyedInstanceFactory.create({
      groupId: 1,
      groupMemberId: 10,
    });

    expect(resul1.instance).toBeInstanceOf(TestObject);
    expect(resul1.instance).toBe(resul2.instance);
    expect(resul1.referenceCount).toEqual(1);
    expect(resul2.referenceCount).toEqual(2);
  });

  it('can used the returned id to release instance', () => {
    const { id, instance } = groupedKeyedInstanceFactory.create({
      groupId: 1,
      groupMemberId: 10,
    });

    expect(groupedKeyedInstanceFactory.getFromId(id)).toBe(instance);

    groupedKeyedInstanceFactory.release(id);

    expect(groupedKeyedInstanceFactory.getFromId(id)).toBeUndefined();
  });
});
