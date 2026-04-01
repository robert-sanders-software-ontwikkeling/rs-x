import { ProxyRegistryMock } from '@rs-x/core/testing';

import { ObjectObserverProxyPairManager } from '../../lib/object-observer/object-observer-proxy-pair-manager';
import { ObjectObserverProxyPairFactoryMock } from '../../lib/testing/object-observer-proxy-pair.factory.mock';
import { ObserverMock } from '../../lib/testing/observer.mock';

describe('ObjectObserverProxyPairManager tests', () => {
  let objectObserverProxyPairFactory: ObjectObserverProxyPairFactoryMock;
  let objectObserverProxyPairManager: ObjectObserverProxyPairManager;

  beforeEach(async () => {
    objectObserverProxyPairFactory = new ObjectObserverProxyPairFactoryMock();
    objectObserverProxyPairManager = new ObjectObserverProxyPairManager(
      () => ({ factories: [objectObserverProxyPairFactory] }),
      new ProxyRegistryMock(),
    );
  });

  it('will return null for not supported type', () => {
    objectObserverProxyPairFactory.applies.mockReturnValue(false);

    const actual = objectObserverProxyPairManager.create({
      target: { x: 1 },
    });

    expect(actual).toEqual({
      id: 0,
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
      { target: { x: 1 } },
    );
    expect(actual).toEqual({
      id: 0,
      instance: observer,
      referenceCount: 1,
    });
  });
});
