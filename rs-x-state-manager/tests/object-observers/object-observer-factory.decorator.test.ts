import { InjectionContainer } from '@rs-x/core';

import { ObjectObserverFactory } from '../../lib/object-observer/object-observer-factory.decorator';
import { IObjectObserverProxyPairFactory } from '../../lib/object-observer/object-observer-proxy-pair.factory.interface';
import { IDisposableOwner } from '../../lib/disposable-owner.interface';
import { IProxyTarget } from '../../lib/object-observer/object-observer-proxy-pair-manager.type';
import { IObserverProxyPair } from '../../lib/object-property-observer-proxy-pair-manager.type';
import { RsXStateManagerModule } from '../../lib/rs-x-state-manager.module';
import { RsXStateManagerInjectionTokens } from '../../lib/rs-x-state-manager-injection-tokes';
import { PlainObjectObserverProxyPairFactory } from '../../lib/object-observer/factories/plain-object-observer-proxy-pair.factory';
import { ArrayObserverProxyPairFactory } from '../../lib/object-observer/factories/array-observer-proxy-pair.factory';
import { PromiseObserverProxyPairFactory } from '../../lib/object-observer/factories/promise-observer-proxy-pair.factory';
import { ObservableObserverProxyPairFactory } from '../../lib/object-observer/factories/observable-observer-proxy-pair.factory';
import { MapObserverProxyPairFactory } from '../../lib/object-observer/factories/map-observer-proxy-pair.factory';
import { SetObserverProxyPairFactory } from '../../lib/object-observer/factories/set-observer-proxy-pair.factory';

describe('ObjectObserverFactory test', () => {

    @ObjectObserverFactory()
    class CustomObjectObserverFactory1  implements IObjectObserverProxyPairFactory{
        public create(_owner: IDisposableOwner, _proxyTarget: IProxyTarget<unknown>): IObserverProxyPair<unknown, unknown> {
            throw new Error('Method not implemented.');
        }

        public applies(_object: unknown): boolean {
            throw new Error('Method not implemented.');
        }

    }

    @ObjectObserverFactory()
    class CustomObjectObserverFactory2  implements IObjectObserverProxyPairFactory{
        public create(_owner: IDisposableOwner, _proxyTarget: IProxyTarget<unknown>): IObserverProxyPair<unknown, unknown> {
            throw new Error('Method not implemented.');
        }

        public applies(_object: unknown): boolean {
            throw new Error('Method not implemented.');
        }
    }

    beforeAll(async () => {
        await InjectionContainer.load(RsXStateManagerModule);
    })

    afterAll(async() => {
       await InjectionContainer.unbindAll()
    });

    it('can bind new IObjectObserverProxyPairFactory' ,() => {
        const actual = InjectionContainer.getAll(RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryList);

        expect(actual.length).toEqual(8);
        expect(actual[0]).toBeInstanceOf(CustomObjectObserverFactory1);
        expect(actual[1]).toBeInstanceOf(CustomObjectObserverFactory2);
        expect(actual[2]).toBeInstanceOf(PlainObjectObserverProxyPairFactory);
        expect(actual[3]).toBeInstanceOf(ArrayObserverProxyPairFactory);
        expect(actual[4]).toBeInstanceOf(PromiseObserverProxyPairFactory);
        expect(actual[5]).toBeInstanceOf(ObservableObserverProxyPairFactory);
        expect(actual[6]).toBeInstanceOf(MapObserverProxyPairFactory);
        expect(actual[7]).toBeInstanceOf(SetObserverProxyPairFactory);
    });
})