import { DateProperty, IDatePropertyAccessor, IErrorLog, IIndexValueAccessor, Inject, Injectable, RsXCoreInjectionTokens, truePredicate } from '@rs-x/core';
import { IndexObserverProxyPairFactory } from '../indexed-value-observer-proxy-pair/indexed-value-observer-proxy-pair.factory';
import { IDatePropertyObserverManager } from './date-property-observer-manager.type';
import { RsXStateManagerInjectionTokens } from '../../../rs-x-state-manager-injection-tokes';
import { IObjectObserverProxyPairManager } from '../../../object-observer/object-observer-proxy-pair-manager.type';
import { IPropertyInfo } from '../../../object-property-observer-proxy-pair-manager.type';
import { IDatePropertyObserverProxyPairFactory } from './date-property-observer-proxy-pair.factory.type';
import { IProxyRegistry } from '../../../proxies/proxy-registry/proxy-registry.interface';


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
        @Inject(RsXCoreInjectionTokens.IIndexValueAccessor)
        datePropertyAccessor: IIndexValueAccessor,
        @Inject(RsXStateManagerInjectionTokens.IProxyRegistry)
        proxyRegister: IProxyRegistry
    ) {
        super(
            objectObserverManager,
            datePropertyObserverManager,
            errorLog,
            datePropertyAccessor,
            proxyRegister,
            truePredicate
        );
    }

    public override applies(object: unknown, propertyInfo: IPropertyInfo): boolean {
        return this._indexValueAccessor.applies(object, propertyInfo.key);
    }

}