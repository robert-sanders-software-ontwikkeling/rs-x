import {
    CheckValidKey,
    DateProperty,
    Inject,
    Injectable,
    SingletonFactoryWithGuid
} from '@rs-x/core';
import { Subject } from 'rxjs';
import { AbstractObserver } from '../../abstract-observer';
import { IDisposableOwner } from '../../disposable-owner.interface';
import { MustProxify } from '../../object-property-observer-proxy-pair-manager.type';
import { RsXStateManagerInjectionTokens } from '../../rs-x-state-manager-injection-tokes';
import { IProxyRegistry } from '../proxy-registry/proxy-registry.interface';
import { IDateObserverProxyPair, IDateProxyData, IDateProxyFactory, IDateProxyIdData } from './date-proxy.factory.type';

type DateSetterName = CheckValidKey<
    Date,
    | 'setFullYear'
    | 'setUTCFullYear'
    | 'setMonth'
    | 'setUTCMonth'
    | 'setDate'
    | 'setUTCDate'
    | 'setHours'
    | 'setUTCHours'
    | 'setMinutes'
    | 'setUTCMinutes'
    | 'setSeconds'
    | 'setUTCSeconds'
    | 'setMilliseconds'
    | 'setUTCMilliseconds'
    | 'setTime'
>;

type DateGetterName = CheckValidKey<
    Date,
    | "getFullYear"
    | "getUTCFullYear"
    | "getMonth"
    | "getUTCMonth"
    | "getDate"
    | "getUTCDate"
    | "getHours"
    | "getUTCHours"
    | "getMinutes"
    | "getUTCMinutes"
    | "getSeconds"
    | "getUTCSeconds"
    | "getMilliseconds"
    | "getUTCMilliseconds"
    | "getTime"
>;

interface ISetterMetaData {
    name: DateProperty;
    getterName: DateGetterName;
    setterName: DateSetterName
}

class DateProxy extends AbstractObserver<Date, Date, undefined> {
    private readonly _dateSetterMetadata: Map<DateSetterName, ISetterMetaData> = new Map([
        [
            'setFullYear',
            {
                name: 'year',
                getterName: 'getFullYear',
                setterName: 'setFullYear'
            },
        ],
        [
            'setUTCFullYear',
            {
                name: 'utcYear',
                getterName: 'getUTCFullYear',
                setterName: 'setUTCFullYear'
            },
        ],
        [
            'setMonth',
            {
                name: 'month',
                getterName: 'getMonth',
                setterName: 'setMonth'
            }
        ],
        [
            'setUTCMonth',
            {
                name: 'utcMonth',
                getterName: 'getUTCMonth',
                setterName: 'setUTCMonth'
            }
        ],
        [
            'setDate',
            {
                name: 'date',
                getterName: 'getDate',
                setterName: 'setDate'
            }
        ],
        [
            'setUTCDate',
            {
                name: 'utcDate',
                getterName: 'getUTCDate',
                setterName: 'setUTCDate'
            }
        ],
        [
            'setHours',
            {
                name: 'hours',
                getterName: 'getHours',
                setterName: 'setHours'
            }
        ],
        [
            'setUTCHours',
            {
                name: 'utcHours',
                getterName: 'getUTCHours',
                setterName: 'setUTCHours'
            }
        ],
        [
            'setMinutes',
            {
                name: 'minutes',
                getterName: 'getMinutes',
                setterName: 'setMinutes'
            }
        ],
        [
            'setUTCMinutes',
            {
                name: 'utcMinutes',
                getterName: 'getUTCMinutes',
                setterName: 'setUTCMinutes'
            }
        ],
        [
            'setSeconds',
            {
                name: 'seconds',
                getterName: 'getSeconds',
                setterName: 'setSeconds'
            }
        ],
        [
            'setUTCSeconds',
            {
                name: 'utcSeconds',
                getterName: 'getUTCSeconds',
                setterName: 'setUTCSeconds'
            }
        ],
        [
            'setMilliseconds',
            {
                name: 'milliseconds',
                getterName: 'getMilliseconds',
                setterName: 'setMilliseconds'
            }
        ],
        [
            'setUTCMilliseconds',
            {
                name: 'utcMilliseconds',
                getterName: 'getUTCMilliseconds',
                setterName: 'setUTCMilliseconds'
            }
        ],
        [
            'setTime',
            {
                name: 'time',
                getterName: 'getTime',
                setterName: 'setTime'
            }
        ]
    ]);

    constructor(
        owner: IDisposableOwner,
        initialValue: Date,
        private readonly _proxyRegistry: IProxyRegistry,
        private readonly _filter?: (propertyName: DateProperty) => boolean) {
        super(owner, null, initialValue, new Subject(), undefined);

        this.target = new Proxy(initialValue, this);
        this._proxyRegistry.register(initialValue, this.target);
    }

    public get(target: Date, property: PropertyKey, receiver: unknown): unknown {
        const value = Reflect.get(target, property, receiver);

        if (typeof property === 'string') {
            const setterMetadata = this._dateSetterMetadata.get(property as DateSetterName);
            if (!setterMetadata) {
                return typeof value === 'function' ? value.bind(target) : value;
            }

            return (...args: unknown[]) => {
                const oldTimeStamp = target.getTime();
                const setter = value as (...args: unknown[]) => unknown;
                const result = setter.apply(target, args);
                if (oldTimeStamp !== target.getTime()) {
                    this.emitChanges(oldTimeStamp, target, setterMetadata.name);
                }
                return result;
            };
        }
        return value;
    }

    private emitChanges(oldTimestamp: number, newDate: Date, propertyName: string): void {
        const oldDate = new Date(oldTimestamp);

        if (!this._filter) {
            this.emitChange({
                arguments: [],
                chain: [{ object: newDate, id: propertyName }],
                id: propertyName,
                target: newDate,
                newValue: newDate
            });
            return;
        }


        for (const setterMetaData of this._dateSetterMetadata.values()) {
            if (!this._filter(setterMetaData.name)) {
                continue
            }
            const oldValue = oldDate[setterMetaData.getterName].call(oldDate);
            const newValue = newDate[setterMetaData.getterName].call(newDate);
            if (oldValue !== newValue) {
                this.emitChange({
                    arguments: [],
                    chain: [{ object: newDate, id: setterMetaData.name }],
                    id: setterMetaData.name,
                    target: newDate,
                    newValue: newValue
                });
            }
        }
    }

    public set(target: Date, property: PropertyKey, value: unknown, receiver: unknown): boolean {
        const oldTimeStamp = target.getTime();
        const result = Reflect.set(target, property, value, receiver);
        if (oldTimeStamp !== target.getTime()) {
            this.emitChange({
                arguments: [value],
                chain: [{ object: target, id: 0 }],
                id: 0,
                target,
                newValue: target
            });
        }
        return result;
    }

    protected override disposeInternal(): void {
        this._proxyRegistry.unregister(this.initialValue);
        this.target = null;
    }
}
@Injectable()
export class DateProxyFactory
    extends SingletonFactoryWithGuid<
        IDateProxyData,
        IDateObserverProxyPair,
        IDateProxyIdData
    >
    implements IDateProxyFactory {

    constructor(
        @Inject(RsXStateManagerInjectionTokens.IProxyRegistry)
        private readonly _proxyRegistry: IProxyRegistry
    ) {
        super();
    }

    protected override getGroupId(data: IDateProxyIdData): Date {
        return data.date;
    }

    protected override getGroupMemberId(data: IDateProxyIdData): MustProxify {
        return data.mustProxify;
    }

    protected override createInstance(dateProxyData: IDateProxyData, id: string): IDateObserverProxyPair {
        const observer = new DateProxy(
            {
                canDispose: () => this.getReferenceCount(id) === 1,
                release: () => {
                    this.release(id);
                    dateProxyData.owner?.release();
                },
            },
            dateProxyData.date,
            this._proxyRegistry,
            dateProxyData.mustProxify
        );
        return {
            observer,
            proxy: observer.target,
            proxyTarget: dateProxyData.date,
            id,
        };
    }
}