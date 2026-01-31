import {
    type DateProperty,
    type IErrorLog,
    type IGuidFactory,
    type IIndexValueAccessor,
    Inject,
    Injectable,
    type IValueMetadata,
    RsXCoreInjectionTokens,
    truePredicate
} from '@rs-x/core';

import type { IObjectObserverProxyPairManager } from '../../../object-observer/object-observer-proxy-pair-manager.type';
import type { IProxyRegistry } from '../../../proxies/proxy-registry/proxy-registry.interface';
import { RsXStateManagerInjectionTokens } from '../../../rs-x-state-manager-injection-tokens';
import { IndexObserverProxyPairFactory } from '../indexed-value-observer-proxy-pair/indexed-value-observer-proxy-pair.factory';

import type { IDatePropertyObserverManager } from './date-property-observer-manager.type';
import type { IDatePropertyObserverProxyPairFactory } from './date-property-observer-proxy-pair.factory.type';

@Injectable()
export class DatePropertyObserverProxyPairFactory
    extends IndexObserverProxyPairFactory<Date, DateProperty>
    implements IDatePropertyObserverProxyPairFactory {

    constructor(
        @Inject(RsXStateManagerInjectionTokens.IObjectObserverProxyPairManager)
        objectObserverManager: IObjectObserverProxyPairManager,
        @Inject(RsXStateManagerInjectionTokens.IDatePropertyObserverManager)
        datePropertyObserverManager: IDatePropertyObserverManager,
        @Inject(RsXCoreInjectionTokens.IErrorLog)
        errorLog: IErrorLog,
        @Inject(RsXCoreInjectionTokens.IGuidFactory)
        guidFactory: IGuidFactory,
        @Inject(RsXCoreInjectionTokens.IIndexValueAccessor)
        datePropertyAccessor: IIndexValueAccessor,
        @Inject(RsXStateManagerInjectionTokens.IProxyRegistry)
        proxyRegister: IProxyRegistry,
        @Inject(RsXCoreInjectionTokens.IValueMetadata)
        valueMetadata: IValueMetadata,
    ) {
        super(
            objectObserverManager,
            datePropertyObserverManager,
            errorLog,
            guidFactory,
            datePropertyAccessor,
            proxyRegister,
            valueMetadata,
            truePredicate
        );
    }

    public override applies(object: unknown): boolean {
        return object instanceof Date;
    }

}