export interface StateManagerApiItem {
  symbol: string;
  kind: string;
  module: string;
  description: string;
  sourcePath: string;
  signature: string;
}

export const stateManagerApiItems: StateManagerApiItem[] = [
  {
    "symbol": "ArrayObserverProxyPairFactory",
    "kind": "class",
    "module": "object-observer/factories",
    "description": "Class exported from object-observer/factories.",
    "sourcePath": "object-observer/factories/array-observer-proxy-pair.factory.ts",
    "signature": "export class ArrayObserverProxyPairFactory"
  },
  {
    "symbol": "ArrayProxyFactory",
    "kind": "class",
    "module": "proxies/array-proxy",
    "description": "Creates array proxies that emit index-scoped changes for array mutations.",
    "sourcePath": "proxies/array-proxy/array-proxy.factory.ts",
    "signature": "export class ArrayProxyFactory"
  },
  {
    "symbol": "Collection",
    "kind": "type",
    "module": "property-observer/factories/collection-item",
    "description": "Type exported from property-observer/factories/collection-item.",
    "sourcePath": "property-observer/factories/collection-item/collection-item-observer-manager.type.ts",
    "signature": "export type Collection = Map<unknown, unknown> | Array<unknown> | Set<unknown>;"
  },
  {
    "symbol": "CollectionItemObserverManager",
    "kind": "class",
    "module": "property-observer/factories/collection-item",
    "description": "Class exported from property-observer/factories/collection-item.",
    "sourcePath": "property-observer/factories/collection-item/collection-item-observer-manager.ts",
    "signature": "export class CollectionItemObserverManager"
  },
  {
    "symbol": "CollectionItemObserverProxyPairFactory",
    "kind": "class",
    "module": "property-observer/factories/collection-item",
    "description": "Class exported from property-observer/factories/collection-item.",
    "sourcePath": "property-observer/factories/collection-item/collection-item-observer-proxy-pair.factory.ts",
    "signature": "export class CollectionItemObserverProxyPairFactory extends IndexObserverProxyPairFactory<"
  },
  {
    "symbol": "DateObserverProxyPairFactory",
    "kind": "class",
    "module": "object-observer/factories",
    "description": "Class exported from object-observer/factories.",
    "sourcePath": "object-observer/factories/date-observer-proxy-pair.factory.ts",
    "signature": "export class DateObserverProxyPairFactory implements IDateObserverProxyPairFactory {"
  },
  {
    "symbol": "DatePropertyObserverManager",
    "kind": "class",
    "module": "property-observer/factories/date-property",
    "description": "Class exported from property-observer/factories/date-property.",
    "sourcePath": "property-observer/factories/date-property/data-property-observer-manager.ts",
    "signature": "export class DatePropertyObserverManager"
  },
  {
    "symbol": "DatePropertyObserverProxyPairFactory",
    "kind": "class",
    "module": "property-observer/factories/date-property",
    "description": "Class exported from property-observer/factories/date-property.",
    "sourcePath": "property-observer/factories/date-property/date-property-observer-proxy-pair.factory.ts",
    "signature": "export class DatePropertyObserverProxyPairFactory"
  },
  {
    "symbol": "DateProxyFactory",
    "kind": "class",
    "module": "proxies/date-proxy",
    "description": "Creates date proxies that map setter calls to semantic date-part change events.",
    "sourcePath": "proxies/date-proxy/date-proxy.factory.ts",
    "signature": "export class DateProxyFactory"
  },
  {
    "symbol": "defaultObjectObserverProxyPairFactoryList",
    "kind": "const",
    "module": "rs-x-state-manager.module",
    "description": "Const exported from rs-x-state-manager.module.",
    "sourcePath": "rs-x-state-manager.module.ts",
    "signature": "export const defaultObjectObserverProxyPairFactoryList: readonly IMultiInjectService[] ="
  },
  {
    "symbol": "defaultPropertyObserverProxyPairFactoryList",
    "kind": "const",
    "module": "rs-x-state-manager.module",
    "description": "Const exported from rs-x-state-manager.module.",
    "sourcePath": "rs-x-state-manager.module.ts",
    "signature": "export const defaultPropertyObserverProxyPairFactoryList: readonly IMultiInjectService[] ="
  },
  {
    "symbol": "IArrayObserverProxyPair",
    "kind": "type",
    "module": "proxies/array-proxy",
    "description": "Type exported from proxies/array-proxy.",
    "sourcePath": "proxies/array-proxy/array-proxy.factory.type.ts",
    "signature": "export type IArrayObserverProxyPair = IObserverProxyPair<unknown[]>;"
  },
  {
    "symbol": "IArrayObserverProxyPairFactory",
    "kind": "type",
    "module": "object-observer/factories",
    "description": "Type exported from object-observer/factories.",
    "sourcePath": "object-observer/factories/array-observer-proxy-pair.factory.type.ts",
    "signature": "export type IArrayObserverProxyPairFactory = IObjectObserverProxyPairFactory<"
  },
  {
    "symbol": "IArrayProxyData",
    "kind": "interface",
    "module": "proxies/array-proxy",
    "description": "Interface exported from proxies/array-proxy.",
    "sourcePath": "proxies/array-proxy/array-proxy.factory.type.ts",
    "signature": "export interface IArrayProxyData extends IArrayProxyIdData {"
  },
  {
    "symbol": "IArrayProxyFactory",
    "kind": "type",
    "module": "proxies/array-proxy",
    "description": "Type exported from proxies/array-proxy.",
    "sourcePath": "proxies/array-proxy/array-proxy.factory.type.ts",
    "signature": "export type IArrayProxyFactory = IKeyedInstanceFactory<"
  },
  {
    "symbol": "IArrayProxyIdData",
    "kind": "interface",
    "module": "proxies/array-proxy",
    "description": "Interface exported from proxies/array-proxy.",
    "sourcePath": "proxies/array-proxy/array-proxy.factory.type.ts",
    "signature": "export interface IArrayProxyIdData {"
  },
  {
    "symbol": "IChangeSubscriptionsCreateMethods",
    "kind": "interface",
    "module": "grouped-change-subscriptions-for-context-manager",
    "description": "Interface exported from grouped-change-subscriptions-for-context-manager.",
    "sourcePath": "grouped-change-subscriptions-for-context-manager.ts",
    "signature": "export interface IChangeSubscriptionsCreateMethods {"
  },
  {
    "symbol": "ICollectionIdexObserverIdInfo",
    "kind": "type",
    "module": "property-observer/factories/collection-item",
    "description": "Type exported from property-observer/factories/collection-item.",
    "sourcePath": "property-observer/factories/collection-item/collection-item-observer-manager.type.ts",
    "signature": "export type ICollectionIdexObserverIdInfo = IIndexObserverIdInfo<unknown>;"
  },
  {
    "symbol": "ICollectionIndexObserverManager",
    "kind": "type",
    "module": "property-observer/factories/collection-item",
    "description": "Type exported from property-observer/factories/collection-item.",
    "sourcePath": "property-observer/factories/collection-item/collection-item-observer-manager.type.ts",
    "signature": "export type ICollectionIndexObserverManager = IKeyedInstanceFactory<"
  },
  {
    "symbol": "ICollectionItemObserverManager",
    "kind": "type",
    "module": "property-observer/factories/collection-item",
    "description": "Type exported from property-observer/factories/collection-item.",
    "sourcePath": "property-observer/factories/collection-item/collection-item-observer-manager.type.ts",
    "signature": "export type ICollectionItemObserverManager = IKeyedInstanceFactory<"
  },
  {
    "symbol": "ICollectionItemObserverProxyPairFactory",
    "kind": "type",
    "module": "property-observer/factories/collection-item",
    "description": "Type exported from property-observer/factories/collection-item.",
    "sourcePath": "property-observer/factories/collection-item/collection-item-observer-proxy-pair.factory.type.ts",
    "signature": "export type ICollectionItemObserverProxyPairFactory ="
  },
  {
    "symbol": "IContextChanged",
    "kind": "interface",
    "module": "state-manager",
    "description": "Payload emitted when a watched index is rebound from one context object to another.",
    "sourcePath": "state-manager/state-manager.interface.ts",
    "signature": "export interface IContextChanged {"
  },
  {
    "symbol": "IDateObserverProxyPair",
    "kind": "type",
    "module": "proxies/date-proxy",
    "description": "Type exported from proxies/date-proxy.",
    "sourcePath": "proxies/date-proxy/date-proxy.factory.type.ts",
    "signature": "export type IDateObserverProxyPair = IObserverProxyPair<Date>;"
  },
  {
    "symbol": "IDateObserverProxyPairFactory",
    "kind": "type",
    "module": "object-observer/factories",
    "description": "Type exported from object-observer/factories.",
    "sourcePath": "object-observer/factories/date-observer-proxy-pair.factory.type.ts",
    "signature": "export type IDateObserverProxyPairFactory ="
  },
  {
    "symbol": "IDateOserverProxyPair",
    "kind": "type",
    "module": "object-observer/factories",
    "description": "Type exported from object-observer/factories.",
    "sourcePath": "object-observer/factories/date-observer-proxy-pair.factory.type.ts",
    "signature": "export type IDateOserverProxyPair = IObserverProxyPair<Date>;"
  },
  {
    "symbol": "IDatePropertyObserverIdInfo",
    "kind": "type",
    "module": "property-observer/factories/date-property",
    "description": "Type exported from property-observer/factories/date-property.",
    "sourcePath": "property-observer/factories/date-property/date-property-observer-manager.type.ts",
    "signature": "export type IDatePropertyObserverIdInfo = IIndexObserverIdInfo<DateProperty>;"
  },
  {
    "symbol": "IDatePropertyObserverInfo",
    "kind": "type",
    "module": "property-observer/factories/date-property",
    "description": "Type exported from property-observer/factories/date-property.",
    "sourcePath": "property-observer/factories/date-property/date-property-observer-manager.type.ts",
    "signature": "export type IDatePropertyObserverInfo = IIndexObserverInfo<DateProperty>;"
  },
  {
    "symbol": "IDatePropertyObserverManager",
    "kind": "type",
    "module": "property-observer/factories/date-property",
    "description": "Type exported from property-observer/factories/date-property.",
    "sourcePath": "property-observer/factories/date-property/date-property-observer-manager.type.ts",
    "signature": "export type IDatePropertyObserverManager = IKeyedInstanceFactory<"
  },
  {
    "symbol": "IDatePropertyObserverProxyPairFactory",
    "kind": "type",
    "module": "property-observer/factories/date-property",
    "description": "Type exported from property-observer/factories/date-property.",
    "sourcePath": "property-observer/factories/date-property/date-property-observer-proxy-pair.factory.type.ts",
    "signature": "export type IDatePropertyObserverProxyPairFactory ="
  },
  {
    "symbol": "IDateProxyData",
    "kind": "interface",
    "module": "proxies/date-proxy",
    "description": "Interface exported from proxies/date-proxy.",
    "sourcePath": "proxies/date-proxy/date-proxy.factory.type.ts",
    "signature": "export interface IDateProxyData extends IDateProxyIdData {"
  },
  {
    "symbol": "IDateProxyFactory",
    "kind": "type",
    "module": "proxies/date-proxy",
    "description": "Type exported from proxies/date-proxy.",
    "sourcePath": "proxies/date-proxy/date-proxy.factory.type.ts",
    "signature": "export type IDateProxyFactory = IKeyedInstanceFactory<"
  },
  {
    "symbol": "IDateProxyIdData",
    "kind": "interface",
    "module": "proxies/date-proxy",
    "description": "Interface exported from proxies/date-proxy.",
    "sourcePath": "proxies/date-proxy/date-proxy.factory.type.ts",
    "signature": "export interface IDateProxyIdData {"
  },
  {
    "symbol": "IGroupedChangeSubscriptionsForContextManager",
    "kind": "interface",
    "module": "grouped-change-subscriptions-for-context-manager",
    "description": "Interface exported from grouped-change-subscriptions-for-context-manager.",
    "sourcePath": "grouped-change-subscriptions-for-context-manager.ts",
    "signature": "export interface IGroupedChangeSubscriptionsForContextManager<"
  },
  {
    "symbol": "IIndexChangeSubscriptionsForContextManager",
    "kind": "type",
    "module": "property-observer/factories/indexed-value-observer-proxy-pair",
    "description": "Type exported from property-observer/factories/indexed-value-observer-proxy-pair.",
    "sourcePath": "property-observer/factories/indexed-value-observer-proxy-pair/index-change-subscription-manager.ts",
    "signature": "export type IIndexChangeSubscriptionsForContextManager<TIndex> ="
  },
  {
    "symbol": "IIndexInfo",
    "kind": "interface",
    "module": "object-property-observer-proxy-pair-manager",
    "description": "Interface exported from object-property-observer-proxy-pair-manager.",
    "sourcePath": "object-property-observer-proxy-pair-manager.type.ts",
    "signature": "export interface IIndexInfo {"
  },
  {
    "symbol": "IIndexObserverIdInfo",
    "kind": "interface",
    "module": "property-observer/factories",
    "description": "Interface exported from property-observer/factories.",
    "sourcePath": "property-observer/factories/index-observer-info.interface.ts",
    "signature": "export interface IIndexObserverIdInfo<TIndex = unknown> {"
  },
  {
    "symbol": "IIndexObserverInfo",
    "kind": "interface",
    "module": "property-observer/factories",
    "description": "Interface exported from property-observer/factories.",
    "sourcePath": "property-observer/factories/index-observer-info.interface.ts",
    "signature": "export interface IIndexObserverInfo<"
  },
  {
    "symbol": "IIndexObserverProxyPairFactory",
    "kind": "interface",
    "module": "property-observer",
    "description": "Interface exported from property-observer.",
    "sourcePath": "property-observer/index-observer-proxy-pair.factory.interface.ts",
    "signature": "export interface IIndexObserverProxyPairFactory<"
  },
  {
    "symbol": "IIndexSetObserverManager",
    "kind": "type",
    "module": "property-observer/factories/indexed-value-observer-proxy-pair",
    "description": "Type exported from property-observer/factories/indexed-value-observer-proxy-pair.",
    "sourcePath": "property-observer/factories/indexed-value-observer-proxy-pair/index-change-subscription-manager.ts",
    "signature": "export type IIndexSetObserverManager<TIndex> = IKeyedInstanceFactory<"
  },
  {
    "symbol": "IIndexWatchRule",
    "kind": "interface",
    "module": "index-watch-rule-registry",
    "description": "Predicate contract for deciding whether nested indexes should be watched.",
    "sourcePath": "index-watch-rule-registry/index-watch-rule.interface.ts",
    "signature": "export interface IIndexWatchRule {"
  },
  {
    "symbol": "IMapObserverProxyPair",
    "kind": "type",
    "module": "proxies/map-proxy",
    "description": "Type exported from proxies/map-proxy.",
    "sourcePath": "proxies/map-proxy/map-proxy.factory.type.ts",
    "signature": "export type IMapObserverProxyPair = IObserverProxyPair<Map<unknown, unknown>>;"
  },
  {
    "symbol": "IMapObserverProxyPairFactory",
    "kind": "type",
    "module": "object-observer/factories",
    "description": "Type exported from object-observer/factories.",
    "sourcePath": "object-observer/factories/map-observer-proxy-pair.factory.type.ts",
    "signature": "export type IMapObserverProxyPairFactory = IObjectObserverProxyPairFactory<"
  },
  {
    "symbol": "IMapProxifyData",
    "kind": "interface",
    "module": "proxies/map-proxy",
    "description": "Interface exported from proxies/map-proxy.",
    "sourcePath": "proxies/map-proxy/map-proxy.factory.type.ts",
    "signature": "export interface IMapProxifyData extends IMapProxifyIdData {"
  },
  {
    "symbol": "IMapProxifyIdData",
    "kind": "interface",
    "module": "proxies/map-proxy",
    "description": "Interface exported from proxies/map-proxy.",
    "sourcePath": "proxies/map-proxy/map-proxy.factory.type.ts",
    "signature": "export interface IMapProxifyIdData {"
  },
  {
    "symbol": "IMapProxyFactory",
    "kind": "type",
    "module": "proxies/map-proxy",
    "description": "Type exported from proxies/map-proxy.",
    "sourcePath": "proxies/map-proxy/map-proxy.factory.type.ts",
    "signature": "export type IMapProxyFactory = IKeyedInstanceFactory<"
  },
  {
    "symbol": "IndexChangeSubscriptionForContext",
    "kind": "interface",
    "module": "property-observer/factories/indexed-value-observer-proxy-pair",
    "description": "Interface exported from property-observer/factories/indexed-value-observer-proxy-pair.",
    "sourcePath": "property-observer/factories/indexed-value-observer-proxy-pair/index-change-subscription-manager.ts",
    "signature": "export interface IndexChangeSubscriptionForContext<TIndex> {"
  },
  {
    "symbol": "IndexChangeSubscriptionManager",
    "kind": "class",
    "module": "property-observer/factories/indexed-value-observer-proxy-pair",
    "description": "Class exported from property-observer/factories/indexed-value-observer-proxy-pair.",
    "sourcePath": "property-observer/factories/indexed-value-observer-proxy-pair/index-change-subscription-manager.ts",
    "signature": "export class IndexChangeSubscriptionManager<"
  },
  {
    "symbol": "IndexWatchRule",
    "kind": "class",
    "module": "index-watch-rule-registry",
    "description": "Context-aware rule wrapper used to enable recursive branch watching for selected indexes.",
    "sourcePath": "index-watch-rule-registry/index-watch-rule.ts",
    "signature": "export class IndexWatchRule implements IIndexWatchRule {"
  },
  {
    "symbol": "IObjectChange",
    "kind": "interface",
    "module": "object-change",
    "description": "Interface exported from object-change.",
    "sourcePath": "object-change.interface.ts",
    "signature": "export interface IObjectChange {"
  },
  {
    "symbol": "IObjectObserverProxyPairFactory",
    "kind": "interface",
    "module": "object-observer",
    "description": "Interface exported from object-observer.",
    "sourcePath": "object-observer/object-observer-proxy-pair.factory.interface.ts",
    "signature": "export interface IObjectObserverProxyPairFactory<TTarget = unknown> {"
  },
  {
    "symbol": "IObjectObserverProxyPairFactoryProvider",
    "kind": "interface",
    "module": "object-observer",
    "description": "Interface exported from object-observer.",
    "sourcePath": "object-observer/object-observer-proxy-pair-factory.provider.interface.ts",
    "signature": "export interface IObjectObserverProxyPairFactoryProvider {"
  },
  {
    "symbol": "IObjectObserverProxyPairManager",
    "kind": "type",
    "module": "object-observer",
    "description": "Type exported from object-observer.",
    "sourcePath": "object-observer/object-observer-proxy-pair-manager.type.ts",
    "signature": "export type IObjectObserverProxyPairManager<TTarget = unknown> ="
  },
  {
    "symbol": "IObjectPropertyObserverManager",
    "kind": "type",
    "module": "property-observer/factories/non-iterable-object-property",
    "description": "Type exported from property-observer/factories/non-iterable-object-property.",
    "sourcePath": "property-observer/factories/non-iterable-object-property/object-property-observer-manager.type.ts",
    "signature": "export type IObjectPropertyObserverManager = IKeyedInstanceFactory<"
  },
  {
    "symbol": "IObjectPropertyObserverProxyPairManager",
    "kind": "type",
    "module": "object-property-observer-proxy-pair-manager",
    "description": "Type exported from object-property-observer-proxy-pair-manager.",
    "sourcePath": "object-property-observer-proxy-pair-manager.type.ts",
    "signature": "export type IObjectPropertyObserverProxyPairManager = IKeyedInstanceFactory<"
  },
  {
    "symbol": "IObjectStateManager",
    "kind": "interface",
    "module": "state-manager",
    "description": "Interface exported from state-manager.",
    "sourcePath": "state-manager/object-state-manager.interface.ts",
    "signature": "export interface IObjectStateManager extends IKeyedInstanceFactory<"
  },
  {
    "symbol": "IObservableObserverProxyPair",
    "kind": "type",
    "module": "proxies/observable-proxy",
    "description": "Type exported from proxies/observable-proxy.",
    "sourcePath": "proxies/observable-proxy/observable-proxy.factory.type.ts",
    "signature": "export type IObservableObserverProxyPair = IObserverProxyPair<"
  },
  {
    "symbol": "IObservableProxyData",
    "kind": "interface",
    "module": "proxies/observable-proxy",
    "description": "Interface exported from proxies/observable-proxy.",
    "sourcePath": "proxies/observable-proxy/observable-proxy.factory.type.ts",
    "signature": "export interface IObservableProxyData {"
  },
  {
    "symbol": "IObservableProxyFactory",
    "kind": "type",
    "module": "proxies/observable-proxy",
    "description": "Type exported from proxies/observable-proxy.",
    "sourcePath": "proxies/observable-proxy/observable-proxy.factory.type.ts",
    "signature": "export type IObservableProxyFactory = IKeyedInstanceFactory<"
  },
  {
    "symbol": "IObserver",
    "kind": "interface",
    "module": "observer.interface",
    "description": "Interface exported from observer.interface.",
    "sourcePath": "observer.interface.ts",
    "signature": "export interface IObserver<T = unknown> extends IDisposable {"
  },
  {
    "symbol": "IObserverProxyPair",
    "kind": "interface",
    "module": "object-property-observer-proxy-pair-manager",
    "description": "Interface exported from object-property-observer-proxy-pair-manager.",
    "sourcePath": "object-property-observer-proxy-pair-manager.type.ts",
    "signature": "export interface IObserverProxyPair<TProxy = unknown> {"
  },
  {
    "symbol": "IPlainObjectObserverProxyPairFactory",
    "kind": "type",
    "module": "object-observer/factories",
    "description": "Type exported from object-observer/factories.",
    "sourcePath": "object-observer/factories/plain-object-observer-proxy-pair.factory.type.ts",
    "signature": "export type IPlainObjectObserverProxyPairFactory ="
  },
  {
    "symbol": "IPromiseObserverProxyPair",
    "kind": "type",
    "module": "proxies/promise-proxy",
    "description": "Type exported from proxies/promise-proxy.",
    "sourcePath": "proxies/promise-proxy/promise-proxy.factory.type.ts",
    "signature": "export type IPromiseObserverProxyPair = IObserverProxyPair<Promise<unknown>>;"
  },
  {
    "symbol": "IPromiseProxyData",
    "kind": "interface",
    "module": "proxies/promise-proxy",
    "description": "Interface exported from proxies/promise-proxy.",
    "sourcePath": "proxies/promise-proxy/promise-proxy.factory.type.ts",
    "signature": "export interface IPromiseProxyData {"
  },
  {
    "symbol": "IPromiseProxyFactory",
    "kind": "type",
    "module": "proxies/promise-proxy",
    "description": "Type exported from proxies/promise-proxy.",
    "sourcePath": "proxies/promise-proxy/promise-proxy.factory.type.ts",
    "signature": "export type IPromiseProxyFactory = IKeyedInstanceFactory<"
  },
  {
    "symbol": "IProperForDataObserverManager",
    "kind": "type",
    "module": "property-observer/factories/date-property",
    "description": "Type exported from property-observer/factories/date-property.",
    "sourcePath": "property-observer/factories/date-property/date-property-observer-manager.type.ts",
    "signature": "export type IProperForDataObserverManager = IKeyedInstanceFactory<"
  },
  {
    "symbol": "IPropertyInfo",
    "kind": "interface",
    "module": "object-property-observer-proxy-pair-manager",
    "description": "Interface exported from object-property-observer-proxy-pair-manager.",
    "sourcePath": "object-property-observer-proxy-pair-manager.type.ts",
    "signature": "export interface IPropertyInfo extends IIndexInfo {"
  },
  {
    "symbol": "IPropertyObserverIdInfo",
    "kind": "type",
    "module": "property-observer/factories/non-iterable-object-property",
    "description": "Type exported from property-observer/factories/non-iterable-object-property.",
    "sourcePath": "property-observer/factories/non-iterable-object-property/object-property-observer-manager.type.ts",
    "signature": "export type IPropertyObserverIdInfo = IIndexObserverIdInfo<string>;"
  },
  {
    "symbol": "IPropertyObserverInfo",
    "kind": "type",
    "module": "property-observer/factories/non-iterable-object-property",
    "description": "Type exported from property-observer/factories/non-iterable-object-property.",
    "sourcePath": "property-observer/factories/non-iterable-object-property/object-property-observer-manager.type.ts",
    "signature": "export type IPropertyObserverInfo = IIndexObserverInfo<string>;"
  },
  {
    "symbol": "IPropertyObserverManager",
    "kind": "type",
    "module": "property-observer/factories/non-iterable-object-property",
    "description": "Type exported from property-observer/factories/non-iterable-object-property.",
    "sourcePath": "property-observer/factories/non-iterable-object-property/object-property-observer-manager.type.ts",
    "signature": "export type IPropertyObserverManager = IKeyedInstanceFactory<"
  },
  {
    "symbol": "IPropertyObserverProxyPairManager",
    "kind": "type",
    "module": "object-property-observer-proxy-pair-manager",
    "description": "Type exported from object-property-observer-proxy-pair-manager.",
    "sourcePath": "object-property-observer-proxy-pair-manager.type.ts",
    "signature": "export type IPropertyObserverProxyPairManager = IKeyedInstanceFactory<"
  },
  {
    "symbol": "IProxyTarget",
    "kind": "interface",
    "module": "object-observer",
    "description": "Interface exported from object-observer.",
    "sourcePath": "object-observer/object-observer-proxy-pair-manager.type.ts",
    "signature": "export interface IProxyTarget<TTarget> {"
  },
  {
    "symbol": "ISetObserverProxyPair",
    "kind": "type",
    "module": "proxies/set-proxy",
    "description": "Type exported from proxies/set-proxy.",
    "sourcePath": "proxies/set-proxy/set-proxy.factory.type.ts",
    "signature": "export type ISetObserverProxyPair = IObserverProxyPair<Set<unknown>>;"
  },
  {
    "symbol": "ISetObserverProxyPairFactory",
    "kind": "type",
    "module": "object-observer/factories",
    "description": "Type exported from object-observer/factories.",
    "sourcePath": "object-observer/factories/set-observer-proxy-pair.factory.type.ts",
    "signature": "export type ISetObserverProxyPairFactory = IObjectObserverProxyPairFactory<"
  },
  {
    "symbol": "ISetProxifyData",
    "kind": "interface",
    "module": "proxies/set-proxy",
    "description": "Interface exported from proxies/set-proxy.",
    "sourcePath": "proxies/set-proxy/set-proxy.factory.type.ts",
    "signature": "export interface ISetProxifyData extends ISetProxifyIdData {"
  },
  {
    "symbol": "ISetProxifyIdData",
    "kind": "interface",
    "module": "proxies/set-proxy",
    "description": "Interface exported from proxies/set-proxy.",
    "sourcePath": "proxies/set-proxy/set-proxy.factory.type.ts",
    "signature": "export interface ISetProxifyIdData {"
  },
  {
    "symbol": "ISetProxyFactory",
    "kind": "type",
    "module": "proxies/set-proxy",
    "description": "Type exported from proxies/set-proxy.",
    "sourcePath": "proxies/set-proxy/set-proxy.factory.type.ts",
    "signature": "export type ISetProxyFactory = IKeyedInstanceFactory<"
  },
  {
    "symbol": "IState",
    "kind": "interface",
    "module": "state-manager",
    "description": "Interface exported from state-manager.",
    "sourcePath": "state-manager/object-state-manager.interface.ts",
    "signature": "export interface IState {"
  },
  {
    "symbol": "IStateChange",
    "kind": "interface",
    "module": "state-manager",
    "description": "Payload emitted when a watched state index changes.",
    "sourcePath": "state-manager/state-manager.interface.ts",
    "signature": "export interface IStateChange extends IContextChanged {"
  },
  {
    "symbol": "IStateChangeObserverInfo",
    "kind": "interface",
    "module": "state-manager/state-change-subscription-manager",
    "description": "Interface exported from state-manager/state-change-subscription-manager.",
    "sourcePath": "state-manager/state-change-subscription-manager/state-change-subsription-manager.interface.ts",
    "signature": "export interface IStateChangeObserverInfo {"
  },
  {
    "symbol": "IStateChangeSubscriptionIdInfo",
    "kind": "interface",
    "module": "state-manager/state-change-subscription-manager",
    "description": "Interface exported from state-manager/state-change-subscription-manager.",
    "sourcePath": "state-manager/state-change-subscription-manager/state-change-subsription-manager.interface.ts",
    "signature": "export interface IStateChangeSubscriptionIdInfo {"
  },
  {
    "symbol": "IStateChangeSubscriptionInfo",
    "kind": "interface",
    "module": "state-manager/state-change-subscription-manager",
    "description": "Interface exported from state-manager/state-change-subscription-manager.",
    "sourcePath": "state-manager/state-change-subscription-manager/state-change-subsription-manager.interface.ts",
    "signature": "export interface IStateChangeSubscriptionInfo extends IStateChangeSubscriptionIdInfo {"
  },
  {
    "symbol": "IStateChangeSubscriptionManager",
    "kind": "interface",
    "module": "state-manager/state-change-subscription-manager",
    "description": "Interface exported from state-manager/state-change-subscription-manager.",
    "sourcePath": "state-manager/state-change-subscription-manager/state-change-subsription-manager.interface.ts",
    "signature": "export interface IStateChangeSubscriptionManager extends IKeyedInstanceFactory<"
  },
  {
    "symbol": "IStateChangeSubscriptionsForContextManager",
    "kind": "type",
    "module": "state-manager/state-change-subscription-manager",
    "description": "Type exported from state-manager/state-change-subscription-manager.",
    "sourcePath": "state-manager/state-change-subscription-manager/state-change-subsription-manager.interface.ts",
    "signature": "export type IStateChangeSubscriptionsForContextManager ="
  },
  {
    "symbol": "IStateEventListener",
    "kind": "interface",
    "module": "state-manager",
    "description": "Keyed callback listener for state and context rebind notifications.",
    "sourcePath": "state-manager/state-manager.interface.ts",
    "signature": "export interface IStateEventListener {"
  },
  {
    "symbol": "IStateForObjectManager",
    "kind": "interface",
    "module": "state-manager",
    "description": "Interface exported from state-manager.",
    "sourcePath": "state-manager/object-state-manager.interface.ts",
    "signature": "export interface IStateForObjectManager extends IKeyedInstanceFactory<"
  },
  {
    "symbol": "IStateManager",
    "kind": "interface",
    "module": "state-manager",
    "description": "Main state manager contract used by expression runtime services.",
    "sourcePath": "state-manager/state-manager.interface.ts",
    "signature": "export interface IStateManager {"
  },
  {
    "symbol": "IStateOptions",
    "kind": "interface",
    "module": "state-manager",
    "description": "Watch options for ownerId and recursive indexWatchRule configuration.",
    "sourcePath": "state-manager/state-manager.interface.ts",
    "signature": "export interface IStateOptions {"
  },
  {
    "symbol": "ISubscriptionIdInfo",
    "kind": "interface",
    "module": "property-observer/factories/indexed-value-observer-proxy-pair",
    "description": "Interface exported from property-observer/factories/indexed-value-observer-proxy-pair.",
    "sourcePath": "property-observer/factories/indexed-value-observer-proxy-pair/index-change-subscription-manager.ts",
    "signature": "export interface ISubscriptionIdInfo<TIndex> {"
  },
  {
    "symbol": "ISubscriptionInfo",
    "kind": "interface",
    "module": "property-observer/factories/indexed-value-observer-proxy-pair",
    "description": "Interface exported from property-observer/factories/indexed-value-observer-proxy-pair.",
    "sourcePath": "property-observer/factories/indexed-value-observer-proxy-pair/index-change-subscription-manager.ts",
    "signature": "export interface ISubscriptionInfo<TIndex>"
  },
  {
    "symbol": "ISubscriptionWithData",
    "kind": "interface",
    "module": "grouped-change-subscriptions-for-context-manager",
    "description": "Interface exported from grouped-change-subscriptions-for-context-manager.",
    "sourcePath": "grouped-change-subscriptions-for-context-manager.ts",
    "signature": "export interface ISubscriptionWithData<TSubscriptionData> {"
  },
  {
    "symbol": "IValueKey",
    "kind": "interface",
    "module": "state-manager",
    "description": "Interface exported from state-manager.",
    "sourcePath": "state-manager/object-state-manager.interface.ts",
    "signature": "export interface IValueKey {"
  },
  {
    "symbol": "IValueWithKey",
    "kind": "interface",
    "module": "state-manager",
    "description": "Interface exported from state-manager.",
    "sourcePath": "state-manager/object-state-manager.interface.ts",
    "signature": "export interface IValueWithKey extends IValueKey {"
  },
  {
    "symbol": "MapObserverProxyPairFactory",
    "kind": "class",
    "module": "object-observer/factories",
    "description": "Class exported from object-observer/factories.",
    "sourcePath": "object-observer/factories/map-observer-proxy-pair.factory.ts",
    "signature": "export class MapObserverProxyPairFactory"
  },
  {
    "symbol": "MapProxy",
    "kind": "class",
    "module": "proxies/map-proxy",
    "description": "Class exported from proxies/map-proxy.",
    "sourcePath": "proxies/map-proxy/map-proxy.factory.ts",
    "signature": "export class MapProxy extends AbstractObserver<"
  },
  {
    "symbol": "MapProxyFactory",
    "kind": "class",
    "module": "proxies/map-proxy",
    "description": "Creates map proxies that emit key-scoped changes for set/delete/clear operations.",
    "sourcePath": "proxies/map-proxy/map-proxy.factory.ts",
    "signature": "export class MapProxyFactory"
  },
  {
    "symbol": "NonIterableObjectPropertyObserverProxyPairFactory",
    "kind": "class",
    "module": "property-observer/factories/non-iterable-object-property",
    "description": "Class exported from property-observer/factories/non-iterable-object-property.",
    "sourcePath": "property-observer/factories/non-iterable-object-property/non-iterable-object-property-observer-proxy-pair.factory.ts",
    "signature": "export class NonIterableObjectPropertyObserverProxyPairFactory extends IndexObserverProxyPairFactory<"
  },
  {
    "symbol": "ObjectObserverProxyPairFactoryProvider",
    "kind": "class",
    "module": "object-observer",
    "description": "Class exported from object-observer.",
    "sourcePath": "object-observer/object-observer-proxy-pair-factory.provider.ts",
    "signature": "export class ObjectObserverProxyPairFactoryProvider implements IObjectObserverProxyPairFactoryProvider {"
  },
  {
    "symbol": "ObjectObserverProxyPairManager",
    "kind": "class",
    "module": "object-observer",
    "description": "Chooses an object observer/proxy factory by type and priority.",
    "sourcePath": "object-observer/object-observer-proxy-pair-manager.ts",
    "signature": "export class ObjectObserverProxyPairManager"
  },
  {
    "symbol": "ObjectPropertyObserverManager",
    "kind": "class",
    "module": "property-observer/factories/non-iterable-object-property",
    "description": "Class exported from property-observer/factories/non-iterable-object-property.",
    "sourcePath": "property-observer/factories/non-iterable-object-property/object-property-observer-manager.ts",
    "signature": "export class ObjectPropertyObserverManager"
  },
  {
    "symbol": "ObjectPropertyObserverProxyPairManager",
    "kind": "class",
    "module": "object-property-observer-proxy-pair-manager",
    "description": "Creates per-property observers and proxy pairs for a given object context.",
    "sourcePath": "object-property-observer-proxy-pair-manager.ts",
    "signature": "export class ObjectPropertyObserverProxyPairManager"
  },
  {
    "symbol": "ObjectStateManager",
    "kind": "class",
    "module": "state-manager",
    "description": "Stores tracked state per context/index with cloned old-value snapshots.",
    "sourcePath": "state-manager/object-state-manager.ts",
    "signature": "export class ObjectStateManager"
  },
  {
    "symbol": "ObservableObserverProxyPairFactory",
    "kind": "class",
    "module": "object-observer/factories",
    "description": "Class exported from object-observer/factories.",
    "sourcePath": "object-observer/factories/observable-observer-proxy-pair.factory.ts",
    "signature": "export class ObservableObserverProxyPairFactory implements IObjectObserverProxyPairFactory<"
  },
  {
    "symbol": "ObservableProxyFactory",
    "kind": "class",
    "module": "proxies/observable-proxy",
    "description": "Creates observable observers that emit distinct latest values through observable-accessor caching.",
    "sourcePath": "proxies/observable-proxy/observable-proxy.factory.ts",
    "signature": "export class ObservableProxyFactory"
  },
  {
    "symbol": "ObserverGroup",
    "kind": "class",
    "module": "observer-group",
    "description": "Composes multiple observers and emits a single unified change stream.",
    "sourcePath": "observer-group.ts",
    "signature": "export class ObserverGroup extends AbstractObserver {"
  },
  {
    "symbol": "PlainObjectObserverProxyPairFactory",
    "kind": "class",
    "module": "object-observer/factories",
    "description": "Class exported from object-observer/factories.",
    "sourcePath": "object-observer/factories/plain-object-observer-proxy-pair.factory.ts",
    "signature": "export class PlainObjectObserverProxyPairFactory"
  },
  {
    "symbol": "PromiseObserverProxyPairFactory",
    "kind": "class",
    "module": "object-observer/factories",
    "description": "Class exported from object-observer/factories.",
    "sourcePath": "object-observer/factories/promise-observer-proxy-pair.factory.ts",
    "signature": "export class PromiseObserverProxyPairFactory implements IObjectObserverProxyPairFactory<"
  },
  {
    "symbol": "PromiseProxyFactory",
    "kind": "class",
    "module": "proxies/promise-proxy",
    "description": "Creates promise observers that emit resolved values through promise-accessor caching.",
    "sourcePath": "proxies/promise-proxy/promise-proxy.factory.ts",
    "signature": "export class PromiseProxyFactory"
  },
  {
    "symbol": "RsXStateManagerInjectionTokens",
    "kind": "const",
    "module": "rs-x-state-manager-injection-tokens",
    "description": "Injection token map for all state-manager services and factory lists.",
    "sourcePath": "rs-x-state-manager-injection-tokens.ts",
    "signature": "export const RsXStateManagerInjectionTokens = {"
  },
  {
    "symbol": "RsXStateManagerModule",
    "kind": "const",
    "module": "rs-x-state-manager.module",
    "description": "Container module that wires default state-manager services, factories, and proxy implementations.",
    "sourcePath": "rs-x-state-manager.module.ts",
    "signature": "export const RsXStateManagerModule = new ContainerModule((options) => {"
  },
  {
    "symbol": "SetObserverProxyPairFactory",
    "kind": "class",
    "module": "object-observer/factories",
    "description": "Class exported from object-observer/factories.",
    "sourcePath": "object-observer/factories/set-observer-proxy-pair.factory.ts",
    "signature": "export class SetObserverProxyPairFactory"
  },
  {
    "symbol": "SetProxy",
    "kind": "class",
    "module": "proxies/set-proxy",
    "description": "Class exported from proxies/set-proxy.",
    "sourcePath": "proxies/set-proxy/set-proxy.factory.ts",
    "signature": "export class SetProxy extends AbstractObserver<"
  },
  {
    "symbol": "SetProxyFactory",
    "kind": "class",
    "module": "proxies/set-proxy",
    "description": "Creates set proxies that emit member-scoped changes for add/delete/clear operations.",
    "sourcePath": "proxies/set-proxy/set-proxy.factory.ts",
    "signature": "export class SetProxyFactory"
  },
  {
    "symbol": "ShouldWatchIndexPredicate",
    "kind": "type",
    "module": "index-watch-rule-registry",
    "description": "Type exported from index-watch-rule-registry.",
    "sourcePath": "index-watch-rule-registry/index-watch-rule.interface.ts",
    "signature": "export type ShouldWatchIndexPredicate = ("
  },
  {
    "symbol": "StateChangeSubscriptionManager",
    "kind": "class",
    "module": "state-manager/state-change-subscription-manager",
    "description": "Maintains grouped observer subscriptions for watched indexes per context.",
    "sourcePath": "state-manager/state-change-subscription-manager/state-change-subsription-manager.ts",
    "signature": "export class StateChangeSubscriptionManager"
  },
  {
    "symbol": "StateForObjectManager",
    "kind": "class",
    "module": "state-manager",
    "description": "Per-context state container with reference-counted state entries.",
    "sourcePath": "state-manager/object-state-manager.ts",
    "signature": "export class StateForObjectManager"
  },
  {
    "symbol": "StateManager",
    "kind": "class",
    "module": "state-manager",
    "description": "Default runtime implementation that tracks watched state and emits changed/contextChanged cycles.",
    "sourcePath": "state-manager/state-manager.ts",
    "signature": "export class StateManager implements IStateManager {"
  },
  {
    "symbol": "unloadRsXStateManagerModule",
    "kind": "function",
    "module": "rs-x-state-manager.module",
    "description": "Unloads state-manager and dependent core module registrations from the DI container.",
    "sourcePath": "rs-x-state-manager.module.ts",
    "signature": "export async function unloadRsXStateManagerModule(): Promise<void> {"
  },
  {
    "symbol": "watchIndexRecursiveRule",
    "kind": "const",
    "module": "index-watch-rule-registry",
    "description": "Default recursive watch rule that accepts every nested index.",
    "sourcePath": "index-watch-rule-registry/index-watch-rule.ts",
    "signature": "export const watchIndexRecursiveRule = new IndexWatchRule("
  }
];
