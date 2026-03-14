import dedent from 'dedent';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { LeftAccentCard } from '@rs-x/react-components';

import { DocsBreadcrumbs } from '../../../../components/DocsBreadcrumbs';
import { SyntaxCodeBlock } from '../../../../components/SyntaxCodeBlock';

type ObservationKind =
  | 'plain-object-property'
  | 'array'
  | 'map'
  | 'set'
  | 'date'
  | 'promise'
  | 'observable';

type ObservationStep = {
  title: string;
  sourceLinks?: Array<{
    label: string;
    href: string;
  }>;
  subSteps: Array<{
    title: string;
    description: string;
    code: string;
  }>;
};

type ObservationDoc = {
  title: string;
  lead: string;
  keyPoints: string[];
  steps: ObservationStep[];
};

const GITHUB_MAIN_BASE =
  'https://github.com/robert-sanders-software-ontwikkeling/rs-x/blob/main';

function gh(path: string): string {
  return `${GITHUB_MAIN_BASE}/${path}`;
}

const OBSERVATION_DOCS: Record<ObservationKind, ObservationDoc> = {
  'plain-object-property': {
    title: 'Plain object property observation',
    lead: 'How rs-x tracks plain object fields with descriptor patching, nested value proxying, and lifecycle-safe teardown.',
    keyPoints: [
      'NonIterableObjectPropertyObserverProxyPairFactory is selected for non-collection, non-Date, non-method string properties.',
      'This factory extends IndexObserverProxyPairFactory, so it can observe the property value itself and also rebind nested observers when the value changes.',
      'Descriptor patching is done by ObjectPropertyObserverManager through PropertObserver, with different behavior for fields, methods, and writable accessors.',
      'Readonly accessor-only properties are rejected and throw InvalidOperationException.',
      'Emitted changes include chain + setValue so state can propagate and rebind cleanly.',
      'On dispose, the original descriptor is restored and proxied values are unwrapped back to raw targets.',
    ],
    steps: [
      {
        title: 'Step 1: choose the plain-object property factory',
        subSteps: [
          {
            title: 'Factory registration',
            description:
              'The factory is part of the property observer factory list used by state-manager.',
            code: dedent`
              export const defaultPropertyObserverProxyPairFactoryList = [
                {
                  target: NonIterableObjectPropertyObserverProxyPairFactory,
                  token:
                    RsXStateManagerInjectionTokens.NonIterableObjectPropertyObserverProxyPairFactory,
                },
                {
                  target: CollectionItemObserverProxyPairFactory,
                  token:
                    RsXStateManagerInjectionTokens.ICollectionItemObserverProxyPairFactory,
                },
                {
                  target: DatePropertyObserverProxyPairFactory,
                  token:
                    RsXStateManagerInjectionTokens.IDatePropertyObserverProxyPairFactory,
                },
              ];
            `,
          },
          {
            title: 'Selection rule',
            description:
              'Full implementation of the plain-object property observer factory.',
            code: dedent`
              @Injectable()
              export class NonIterableObjectPropertyObserverProxyPairFactory extends IndexObserverProxyPairFactory<
                object,
                string
              > {
                constructor(
                  @Inject(RsXStateManagerInjectionTokens.IObjectObserverProxyPairManager)
                  objectObserveryManager: IObjectObserverProxyPairManager,
                  @Inject(RsXStateManagerInjectionTokens.IObjectPropertyObserverManager)
                  objectPropertyObserverManager: IObjectPropertyObserverManager,
                  @Inject(RsXCoreInjectionTokens.IErrorLog)
                  errorLog: IErrorLog,
                  @Inject(RsXCoreInjectionTokens.IGuidFactory)
                  guidFactory: IGuidFactory,
                  @Inject(RsXCoreInjectionTokens.IIndexValueAccessor)
                  indexValueAccessor: IIndexValueAccessor,
                  @Inject(RsXCoreInjectionTokens.IProxyRegistry)
                  proxyRegister: IProxyRegistry,
                  @Inject(RsXCoreInjectionTokens.IValueMetadata)
                  valueMetadata: IValueMetadata,
                ) {
                  super(
                    objectObserveryManager,
                    objectPropertyObserverManager,
                    errorLog,
                    guidFactory,
                    indexValueAccessor,
                    proxyRegister,
                    valueMetadata,
                  );
                }

                public applies(object: unknown, propertyInfo: IPropertyInfo): boolean {
                  return (
                    !(
                      Array.isArray(object) ||
                      object instanceof Date ||
                      object instanceof Map ||
                      object instanceof Set
                    ) &&
                    Type.isString(propertyInfo.index) &&
                    !Type.isMethod((Type.toObject(object) ?? {})[propertyInfo.index])
                  );
                }

                protected setIndexValue(
                  object: Record<string, unknown>,
                  key: string,
                  value: unknown,
                ): void {
                  object[key] = value;
                }
              }
            `,
          },
        ],
      },
      {
        title: 'Step 2: create observer group for one property',
        subSteps: [
          {
            title: 'IndexObserverProxyPairFactory pipeline',
            description:
              'The base factory checks if the property value needs nested observation (async or watched index), then creates a group observer for the property.',
            code: dedent`
              const valueAtIndex = this._indexValueAccessor.getValue(object, index);
              const needProxy =
                this._valueMetadata.isAsync(valueAtIndex) ||
                propertyInfo.indexWatchRule?.test?.(index, object);

              const indexValueObserverProxyPair = needProxy
                ? this.createIndexValueProxy(
                    propertyInfo,
                    object,
                    index,
                    valueAtIndex,
                    propertyInfo.indexWatchRule,
                  )
                : undefined;
            `,
          },
          {
            title: 'Nested value proxying',
            description:
              'If a nested proxy is created, rs-x writes the proxy back into the property so later reads stay reactive.',
            code: dedent`
              const observerProxyPair = this._objectObserveryManager.create({
                target,
                indexWatchRule,
                initializeManually,
              }).instance;

              if (observerProxyPair.proxy !== undefined) {
                setValue(observerProxyPair.proxy);
              }
            `,
          },
        ],
      },
      {
        title: 'Step 3: patch property descriptor and emit changes',
        subSteps: [
          {
            title: 'Patch behavior by descriptor type',
            description:
              'PropertObserver patches the property once and chooses function/field/writable-accessor behavior.',
            code: dedent`
              if (descriptorWithTarget.type === PropertyDescriptorType.Function) {
                newDescriptor =
                  this.createFunctionPropertyDescriptor(descriptorWithTarget);
              } else if (!descriptor.get && !descriptor.set) {
                newDescriptor = this.createFieldPropertyDescriptor(descriptorWithTarget);
              } else if (descriptor.set) {
                newDescriptor =
                  this.createWritablePropertyDescriptor(descriptorWithTarget);
              } else {
                throw new InvalidOperationException(
                  \`Property '\${propertyName}' can not be watched because it is readonly\`,
                );
              }
            `,
          },
          {
            title: 'Emit payload structure',
            description:
              'Each property change includes chain, index, and setValue so downstream handlers can rebind nested state.',
            code: dedent`
              super.emitChange({
                arguments: [],
                ...change,
                chain: [{ context: this.target, index: this.id }],
                target: this.target,
                index: id,
                setValue: this.setValue,
              });
            `,
          },
        ],
      },
      {
        title: 'Step 4: rebind nested observers when value changes',
        subSteps: [
          {
            title: 'Handle index update',
            description:
              'When the property value changes, rs-x decides whether to emit immediately and whether a new nested observer chain is needed.',
            code: dedent`
              const isAsync = this._valueMetadata.isAsync(change.newValue);
              const emitValue = Type.isNullOrUndefined(change.newValue) || !isAsync;

              if (emitValue) {
                observerGroup.emitValue(change.newValue);
              }

              const observers = this.getNestedObservers(change, isAsync, indexWatchRule);
              observerGroup.replaceObservers(observers);
            `,
          },
          {
            title: 'Nested observer trigger',
            description:
              'Nested observer creation is re-run when the new value is async or when the watch rule says the index must stay observed.',
            code: dedent`
              if (
                isAsync ||
                (indexWatchRule && indexWatchRule.test(change.index, change.target))
              ) {
                const observerProxyPair = this.proxifyIndexValue(
                  change.newValue,
                  indexWatchRule as IIndexWatchRule,
                  true,
                  change.setValue ??
                    ((value: unknown) => {
                      const obj = Type.toObject(change.target);
                      if (obj) {
                        obj[change.index as string] = value;
                      }
                    }),
                );
              }
            `,
          },
        ],
      },
      {
        title: 'Step 5: teardown and descriptor restore',
        subSteps: [
          {
            title: 'Restore original descriptor',
            description:
              'On final release, the patched descriptor is removed and the original descriptor is restored.',
            code: dedent`
              delete object[propertyName];
              Object.defineProperty(
                this.target,
                propertyName,
                Type.cast(this._propertyDescriptorWithTarget?.descriptor),
              );
            `,
          },
          {
            title: 'Unwrap proxied field values',
            description:
              'For non-function properties, rs-x writes back the raw value from proxy registry before completing dispose.',
            code: dedent`
              if (
                this._propertyDescriptorWithTarget?.type !==
                PropertyDescriptorType.Function
              ) {
                object[propertyName] = this._proxyRegister.getProxyTarget(value) ?? value;
              }
            `,
          },
        ],
      },
    ],
  },
  array: {
    title: 'Array observation',
    lead: 'How rs-x instruments arrays with a proxy that intercepts mutations and emits index-based changes.',
    keyPoints: [
      'ArrayObserverProxyPairFactory has priority 5 and applies to Array targets.',
      'ObjectObserverProxyPairFactoryProvider sorts factories by priority, so array handling is selected before promise/observable/map/set.',
      'ArrayProxyFactory is keyed by the raw array instance, so repeated observation requests reuse one proxy+observer pair.',
      'ArrayProxy intercepts push, splice, pop, shift, unshift, reverse, sort, fill, direct index writes, and length shrink.',
      'Each changed slot emits an IPropertyChange with chain context=index for precise downstream updates.',
      'Dispose unregisters the raw array from proxy registry and releases proxy references.',
    ],
    steps: [
      {
        title: 'Step 1: select array object observer factory',
        subSteps: [
          {
            title: 'Factory priority and applies',
            description:
              'Full implementation of the array observer/proxy pair factory.',
            code: dedent`
              @Injectable()
              export class ArrayObserverProxyPairFactory
                extends AbstractObjectObserverProxyPairFactory<unknown[]>
              {
                constructor(
                  @Inject(RsXStateManagerInjectionTokens.IArrayProxyFactory)
                  private readonly _arrayProxyFactory: IArrayProxyFactory,
                  @Inject(RsXCoreInjectionTokens.IErrorLog)
                  errorLog: IErrorLog,
                  @Inject(RsXCoreInjectionTokens.IArrayIndexAccessor)
                  arrayIndexAccessor: IArrayIndexAccessor,
                  @Inject(
                    RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager,
                  )
                  objectPropertyObserverProxyPairManager: IObjectPropertyObserverProxyPairManager,
                ) {
                  super(
                    5,
                    true,
                    errorLog,
                    arrayIndexAccessor,
                    objectPropertyObserverProxyPairManager,
                  );
                }

                public override applies(object: unknown): boolean {
                  return Array.isArray(object);
                }

                protected override createRootObserver(
                  data: IProxyTarget<unknown[]>,
                ): IArrayObserverProxyPair {
                  return this._arrayProxyFactory.create({
                    array: data.target,
                  }).instance;
                }
              }
            `,
          },
          {
            title: 'Provider sorting',
            description:
              'Factories are sorted descending by priority before matching.',
            code: dedent`
              this.factories = [...factories].sort((a, b) => b.priority - a.priority);
            `,
          },
        ],
      },
      {
        title: 'Step 2: create or reuse one proxy pair per array',
        subSteps: [
          {
            title: 'Root observer creation',
            description:
              'ArrayObserverProxyPairFactory delegates root creation to ArrayProxyFactory.',
            code: dedent`
              protected override createRootObserver(
                data: IProxyTarget<unknown[]>,
              ): IArrayObserverProxyPair {
                return this._arrayProxyFactory.create({
                  array: data.target,
                }).instance;
              }
            `,
          },
          {
            title: 'Factory id and lifecycle owner',
            description: 'Full implementation of ArrayProxyFactory.',
            code: dedent`
              @Injectable()
              export class ArrayProxyFactory
                extends KeyedInstanceFactory<
                  unknown[],
                  IArrayProxyData,
                  IArrayObserverProxyPair,
                  IArrayProxyIdData
                >
                implements IArrayProxyFactory
              {
                constructor(
                  @Inject(RsXCoreInjectionTokens.IProxyRegistry)
                  private readonly _proxyRegistry: IProxyRegistry,
                ) {
                  super();
                }

                public override getId(data: IArrayProxyIdData): unknown[] {
                  return data.array;
                }

                protected override createId(data: IArrayProxyIdData): unknown[] {
                  return data.array;
                }

                protected override createInstance(
                  data: IArrayProxyData,
                  id: unknown[],
                ): IArrayObserverProxyPair {
                  const observer = new ArrayProxy(
                    {
                      canDispose: () => this.getReferenceCount(id) === 1,
                      release: () => {
                        this.release(id);
                        data.owner?.release();
                      },
                    },
                    data.array,
                    this._proxyRegistry,
                  );
                  return {
                    observer,
                    proxy: observer.target,
                    proxyTarget: data.array,
                  };
                }

                protected override releaseInstance(
                  arrayObserverWithProxy: IArrayObserverProxyPair,
                  id: unknown[],
                ): void {
                  super.releaseInstance(arrayObserverWithProxy, id);
                  arrayObserverWithProxy.observer.dispose();
                }
              }
            `,
          },
        ],
      },
      {
        title: 'Step 3: intercept array mutation APIs',
        subSteps: [
          {
            title: 'Method interception in get trap',
            description:
              'Mutating methods are routed through internal handlers so rs-x can emit affected indexes.',
            code: dedent`
              public get(
                originalArray: unknown[],
                property: PropertyKey,
                receiver: unknown,
              ): unknown {
                if (this.isUpdateArrayKey(property)) {
                  return (...args: unknown[]) => {
                    return this.updateArray[property](originalArray, ...args);
                  };
                }

                return Reflect.get(originalArray, property, receiver);
              }
            `,
          },
          {
            title: 'Direct index and length writes',
            description:
              'The set trap handles numeric indexes and length shrink while avoiding recursive patch loops.',
            code: dedent`
              public set(
                originalArray: unknown[],
                property: PropertyKey,
                value: unknown,
                receiver: unknown,
              ): boolean {
                if (!this._patching) {
                  if (property === 'length') {
                    this.setLength(originalArray, value as number);
                  } else if (Type.isPositiveInteger(property)) {
                    const index = Number(property);
                    originalArray[index] = value;
                    this.emitSet(originalArray, index, value);
                  } else {
                    Reflect.set(originalArray, property, value, receiver);
                  }
                }
                return true;
              }
            `,
          },
        ],
      },
      {
        title: 'Step 4: emit index-level change payloads',
        subSteps: [
          {
            title: 'Single index emission',
            description:
              'Every changed slot emits a chain part pointing to that array index.',
            code: dedent`
              private emitSet(
                originaArray: unknown[],
                index: number,
                value?: unknown,
              ): void {
                this.emitChange({
                  arguments: [],
                  chain: [{ context: originaArray, index: index }],
                  index: index,
                  target: originaArray,
                  newValue: value,
                });
              }
            `,
          },
          {
            title: 'Range emission helpers',
            description:
              'Operations such as shift/unshift/reverse/sort/fill emit full affected ranges.',
            code: dedent`
              private emitSetForRange(
                originaArray: unknown[],
                startIndex: number,
                length: number,
              ): void {
                const endIndex = startIndex + length;
                for (let i = startIndex; i < endIndex; i++) {
                  this.emitSet(originaArray, i, originaArray[i]);
                }
              }
            `,
          },
        ],
      },
      {
        title: 'Step 5: release and unregister proxy',
        subSteps: [
          {
            title: 'ArrayProxy dispose path',
            description:
              'Proxy registry mapping is removed and proxy reference is cleared.',
            code: dedent`
              protected override disposeInternal(): void {
                this._proxyRegistry.unregister(this.value);
                this.target = Type.cast(undefined);
              }
            `,
          },
          {
            title: 'Factory release path',
            description:
              'When reference count reaches zero, the observer is disposed.',
            code: dedent`
              protected override releaseInstance(
                arrayObserverWithProxy: IArrayObserverProxyPair,
                id: unknown[],
              ): void {
                super.releaseInstance(arrayObserverWithProxy, id);
                arrayObserverWithProxy.observer.dispose();
              }
            `,
          },
        ],
      },
    ],
  },
  map: {
    title: 'Map observation',
    lead: 'How rs-x observes Map mutations per key and emits key-scoped changes for reactive updates.',
    keyPoints: [
      'MapObserverProxyPairFactory has priority 2 and applies to Map instances.',
      'MapProxyFactory is keyed by the raw Map instance, so one observer/proxy pair is reused per map.',
      'MapProxy intercepts clear, set, and delete while preserving normal method behavior for other members.',
      'Each set/delete emits a change with chain context=index where index is the map key.',
      'clear() emits key-by-key removals through deleteItem so downstream dependencies are updated per key.',
      'Dispose unregisters the map from proxy registry.',
    ],
    steps: [
      {
        title: 'Step 1: select the Map factory',
        subSteps: [
          {
            title: 'Factory registration contract',
            description:
              'Full implementation of the map observer/proxy pair factory.',
            code: dedent`
              @Injectable()
              export class MapObserverProxyPairFactory
                extends AbstractObjectObserverProxyPairFactory<Map<unknown, unknown>>
              {
                constructor(
                  @Inject(RsXStateManagerInjectionTokens.IMapProxyFactory)
                  private readonly _mapProxyFactory: IMapProxyFactory,
                  @Inject(RsXCoreInjectionTokens.IErrorLog)
                  errorLog: IErrorLog,
                  @Inject(RsXCoreInjectionTokens.IMapKeyAccessor)
                  mapKeyAccessor: IMapKeyAccessor,
                  @Inject(
                    RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager,
                  )
                  objectPropertyObserverProxyPairManager: IObjectPropertyObserverProxyPairManager,
                ) {
                  super(
                    2,
                    true,
                    errorLog,
                    mapKeyAccessor,
                    objectPropertyObserverProxyPairManager,
                  );
                }

                public override applies(object: unknown): boolean {
                  return object instanceof Map;
                }

                protected override createRootObserver(
                  data: IProxyTarget<Map<unknown, unknown>>,
                ): IMapObserverProxyPair {
                  return this._mapProxyFactory.create({
                    map: data.target,
                  }).instance;
                }
              }
            `,
          },
          {
            title: 'Root observer creation',
            description:
              'The root observer is the pair returned by MapProxyFactory.',
            code: dedent`
              protected override createRootObserver(
                data: IProxyTarget<Map<unknown, unknown>>,
              ): IMapObserverProxyPair {
                return this._mapProxyFactory.create({
                  map: data.target,
                }).instance;
              }
            `,
          },
        ],
      },
      {
        title: 'Step 2: create or reuse proxy by map id',
        subSteps: [
          {
            title: 'Keyed factory id',
            description: 'The map object itself is the key used for reuse.',
            code: dedent`
              public override getId(data: IMapProxifyData): Map<unknown, unknown> {
                return data.map;
              }

              protected override createId(data: IMapProxifyData): Map<unknown, unknown> {
                return data.map;
              }
            `,
          },
          {
            title: 'Create observer with release owner',
            description: 'Full implementation of MapProxyFactory.',
            code: dedent`
              @Injectable()
              export class MapProxyFactory
                extends KeyedInstanceFactory<
                  Map<unknown, unknown>,
                  IMapProxifyData,
                  IMapObserverProxyPair
                >
                implements IMapProxyFactory
              {
                constructor(
                  @Inject(RsXCoreInjectionTokens.IProxyRegistry)
                  private readonly _proxyRegistry: IProxyRegistry,
                ) {
                  super();
                }

                public override getId(data: IMapProxifyData): Map<unknown, unknown> {
                  return data.map;
                }

                protected override createId(data: IMapProxifyData): Map<unknown, unknown> {
                  return data.map;
                }

                protected override createInstance(
                  data: IMapProxifyData,
                  id: Map<unknown, unknown>,
                ): IMapObserverProxyPair {
                  const observer = new MapProxy(
                    {
                      canDispose: () => this.getReferenceCount(id) === 1,
                      release: () => {
                        this.release(id);
                        data.owner?.release();
                      },
                    },
                    data.map,
                    this._proxyRegistry,
                  );
                  return {
                    observer,
                    proxy: observer.target,
                    proxyTarget: data.map,
                  };
                }

                protected override releaseInstance(
                  mapObserverWithProxy: IMapObserverProxyPair,
                ): void {
                  mapObserverWithProxy.observer.dispose();
                }
              }
            `,
          },
        ],
      },
      {
        title: 'Step 3: intercept Map mutations',
        subSteps: [
          {
            title: 'Method switching in get trap',
            description:
              'Mutating methods are wrapped, while get() and other methods keep normal behavior.',
            code: dedent`
              public get(
                originalMap: Map<unknown, unknown>,
                property: PropertyKey,
              ): unknown {
                if (this.isUpdateMapKey(property)) {
                  return (...args: unknown[]) => {
                    return this.updateMap[property](originalMap, ...args);
                  };
                }

                if (property === 'get') {
                  return (key: unknown) => originalMap.get(key);
                }

                const mapAny = originalMap as unknown as Record<PropertyKey, unknown>;
                return typeof mapAny[property] === 'function'
                  ? (mapAny[property] as Function).bind(originalMap)
                  : mapAny[property];
              }
            `,
          },
          {
            title: 'set/delete/clear behavior',
            description:
              'set emits the new value for that key; clear emits delete for each existing key.',
            code: dedent`
              private setMap = (originalMap: Map<unknown, unknown>, ...args: unknown[]) => {
                const key = args[0];
                const value = args[1];
                originalMap.set(key, value);
                this.emitSet(originalMap, key, value);
                return this.target;
              };

              private clearMap = (originalMap: Map<unknown, unknown>) => {
                for (const key of originalMap.keys()) {
                  this.deleteItem(originalMap, key);
                }
              };
            `,
          },
        ],
      },
      {
        title: 'Step 4: emit key-scoped change payloads',
        subSteps: [
          {
            title: 'Map change payload',
            description:
              'The key is used as index in both chain and index fields.',
            code: dedent`
              private emitSet(
                originalMap: Map<unknown, unknown>,
                key: unknown,
                value?: unknown,
              ): void {
                this.emitChange({
                  arguments: [],
                  chain: [{ context: originalMap, index: key }],
                  index: key,
                  target: originalMap,
                  newValue: value,
                });
              }
            `,
          },
          {
            title: 'Delete handling',
            description:
              'delete emits undefined for removed keys and returns false when key was absent.',
            code: dedent`
              private deleteItem(
                originalMap: Map<unknown, unknown>,
                key: unknown,
              ): boolean {
                const item = originalMap.get(key);
                if (item === undefined) {
                  return false;
                }

                originalMap.delete(key);
                this.emitSet(originalMap, key);
                return true;
              }
            `,
          },
        ],
      },
      {
        title: 'Step 5: dispose map observer',
        subSteps: [
          {
            title: 'Unregister raw map',
            description: 'MapProxy dispose removes proxy registry mapping.',
            code: dedent`
              protected override disposeInternal(): void {
                this._proxyRegistry.unregister(this.value);
              }
            `,
          },
          {
            title: 'Factory release cleanup',
            description: 'Release path disposes the observer instance.',
            code: dedent`
              protected override releaseInstance(
                mapObserverWithProxy: IMapObserverProxyPair,
              ): void {
                mapObserverWithProxy.observer.dispose();
              }
            `,
          },
        ],
      },
    ],
  },
  set: {
    title: 'Set observation',
    lead: 'How rs-x tracks Set membership changes and emits updates keyed by the changed member value.',
    keyPoints: [
      'SetObserverProxyPairFactory has priority 1 and applies to Set instances.',
      'SetProxyFactory is keyed by the raw Set instance for one shared observer/proxy pair.',
      'SetProxy intercepts add, delete, clear, and has; add/delete/clear produce change notifications.',
      'Each emission uses the set member as the index key in the change chain.',
      'Collection-item property observers can then subscribe to one member key and react when membership changes.',
      'Dispose unregisters the set from proxy registry.',
    ],
    steps: [
      {
        title: 'Step 1: choose Set factory and create root observer',
        subSteps: [
          {
            title: 'Set factory match',
            description:
              'Full implementation of the set observer/proxy pair factory.',
            code: dedent`
              @Injectable()
              export class SetObserverProxyPairFactory
                extends AbstractObjectObserverProxyPairFactory<Set<unknown>>
              {
                constructor(
                  @Inject(RsXStateManagerInjectionTokens.ISetProxyFactory)
                  private readonly _setProxyFactory: ISetProxyFactory,
                  @Inject(RsXCoreInjectionTokens.IErrorLog)
                  errorLog: IErrorLog,
                  @Inject(RsXCoreInjectionTokens.ISetKeyAccessor)
                  setKeyAccessor: ISetKeyAccessor,
                  @Inject(
                    RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager,
                  )
                  objectPropertyObserverProxyPairManager: IObjectPropertyObserverProxyPairManager,
                ) {
                  super(
                    1,
                    true,
                    errorLog,
                    setKeyAccessor,
                    objectPropertyObserverProxyPairManager,
                  );
                }

                public override applies(object: unknown): boolean {
                  return object instanceof Set;
                }

                protected override createRootObserver(
                  data: IProxyTarget<Set<unknown>>,
                ): ISetObserverProxyPair {
                  return this._setProxyFactory.create({
                    set: data.target,
                  }).instance;
                }
              }
            `,
          },
          {
            title: 'Root observer creation',
            description:
              'The root observer/proxy pair is created by SetProxyFactory.',
            code: dedent`
              protected override createRootObserver(
                data: IProxyTarget<Set<unknown>>,
              ): ISetObserverProxyPair {
                return this._setProxyFactory.create({
                  set: data.target,
                }).instance;
              }
            `,
          },
        ],
      },
      {
        title: 'Step 2: create or reuse per Set instance',
        subSteps: [
          {
            title: 'Set id strategy',
            description: 'SetProxyFactory uses the set object as id.',
            code: dedent`
              public override getId(data: ISetProxifyIdData): Set<unknown> {
                return data.set;
              }

              protected override createId(data: ISetProxifyIdData): Set<unknown> {
                return data.set;
              }
            `,
          },
          {
            title: 'Owner release path',
            description: 'Full implementation of SetProxyFactory.',
            code: dedent`
              @Injectable()
              export class SetProxyFactory
                extends KeyedInstanceFactory<
                  Set<unknown>,
                  ISetProxifyData,
                  ISetObserverProxyPair,
                  ISetProxifyIdData
                >
                implements ISetProxyFactory
              {
                constructor(
                  @Inject(RsXCoreInjectionTokens.IProxyRegistry)
                  private readonly _proxyRegistry: IProxyRegistry,
                ) {
                  super();
                }

                public override getId(data: ISetProxifyIdData): Set<unknown> {
                  return data.set;
                }

                protected override createId(data: ISetProxifyIdData): Set<unknown> {
                  return data.set;
                }

                protected override createInstance(
                  data: ISetProxifyData,
                  id: Set<unknown>,
                ): ISetObserverProxyPair {
                  const observer = new SetProxy(
                    {
                      canDispose: () => this.getReferenceCount(id) === 1,
                      release: () => {
                        this.release(id);
                        data.owner?.release();
                      },
                    },
                    data.set,
                    this._proxyRegistry,
                  );
                  return {
                    observer,
                    proxy: observer.target,
                    proxyTarget: data.set,
                  };
                }

                protected override releaseInstance(
                  setObserverWithProxy: ISetObserverProxyPair,
                ): void {
                  setObserverWithProxy.observer.dispose();
                }
              }
            `,
          },
        ],
      },
      {
        title: 'Step 3: intercept membership operations',
        subSteps: [
          {
            title: 'get trap for Set APIs',
            description:
              'SetProxy routes mutating methods through custom handlers and binds other methods to the original set.',
            code: dedent`
              public get(originalSet: Set<unknown>, property: PropertyKey): unknown {
                const target = originalSet as unknown as Record<PropertyKey, unknown>;

                if (property !== 'constructor' && property in this.updateSet) {
                  return (...args: unknown[]) =>
                    (this.updateSet as Record<PropertyKey, Function>)[property](
                      originalSet,
                      ...args,
                    );
                }

                const value = target[property];
                return typeof value === 'function'
                  ? (value as Function).bind(originalSet)
                  : value;
              }
            `,
          },
          {
            title: 'add/delete/clear behavior',
            description:
              'add emits new member value; delete emits undefined for that member; clear iterates all values.',
            code: dedent`
              private addSet = (originalSet: Set<unknown>, ...args: unknown[]) => {
                originalSet.add(args[0]);
                this.emitValueChange(originalSet, args[0], args[0]);
                return this.target;
              };

              private deleteSet = (originalSet: Set<unknown>, ...args: unknown[]) => {
                const result = originalSet.delete(args[0]);
                this.emitValueChange(originalSet, args[0], undefined);
                return result;
              };
            `,
          },
        ],
      },
      {
        title: 'Step 4: emit Set member change payloads',
        subSteps: [
          {
            title: 'Change payload shape',
            description:
              'Set emissions use the member id as index in chain and index fields.',
            code: dedent`
              private emitValueChange(
                originalSet: Set<unknown>,
                id: unknown,
                value: unknown,
              ): void {
                this.emitChange({
                  arguments: [],
                  chain: [{ context: originalSet, index: id }],
                  index: id,
                  target: originalSet,
                  newValue: value,
                });
              }
            `,
          },
          {
            title: 'Collection-level observers',
            description:
              'CollectionItemObserverManager listens to these member-keyed events and forwards only matching indexes.',
            code: dedent`
              private onChanged = (change: IPropertyChange) => {
                if (change.index !== this.id) {
                  return;
                }

                if (!this._indexValueAccessor.hasValue(this.target, this.id)) {
                  this.value = undefined;
                  this.emitChange(change);
                  return;
                }

                if (!this._equalityService.isEqual(this.value, change.newValue)) {
                  this.value = change.newValue;
                  this.emitChange(change);
                }
              };
            `,
          },
        ],
      },
      {
        title: 'Step 5: cleanup Set observer resources',
        subSteps: [
          {
            title: 'Proxy disposal',
            description: 'Dispose unregisters raw set/proxy mapping.',
            code: dedent`
              protected override disposeInternal(): void {
                this._proxyRegistry.unregister(this.value);
              }
            `,
          },
          {
            title: 'Factory release',
            description: 'Release path disposes the observer instance.',
            code: dedent`
              protected override releaseInstance(
                setObserverWithProxy: ISetObserverProxyPair,
              ): void {
                setObserverWithProxy.observer.dispose();
              }
            `,
          },
        ],
      },
    ],
  },
  date: {
    title: 'Date observation',
    lead: 'How rs-x tracks Date mutations with grouped watchers and emits precise date-part updates.',
    keyPoints: [
      'DateObserverProxyPairFactory has priority 6 and applies to Date instances.',
      'DateProxyFactory extends GuidKeyedInstanceFactory and groups by (date object + indexWatchRule), so one Date can have multiple scoped observers.',
      'DateProxy wraps setter methods (setFullYear, setMonth, setTime, etc.) and compares timestamp before/after mutation.',
      'When indexWatchRule is set, DateProxy emits only changed date properties that pass the watch rule.',
      'DatePropertyObserverManager builds per-property observers backed by DateProxy + IndexWatchRule.',
      'Dispose unregisters date proxies and unsubscribes property observers safely.',
    ],
    steps: [
      {
        title: 'Step 1: select date observer strategy',
        subSteps: [
          {
            title: 'Date object factory',
            description: 'Full implementation of DateObserverProxyPairFactory.',
            code: dedent`
              @Injectable()
              export class DateObserverProxyPairFactory implements IDateObserverProxyPairFactory {
                public readonly priority = 6;

                constructor(
                  @Inject(RsXStateManagerInjectionTokens.IDateProxyFactory)
                  private readonly _dateProxyFactory: IDateProxyFactory,
                ) {}

                public create(
                  owner: IDisposableOwner,
                  proxyTarget: IProxyTarget<Date>,
                ): IDateOserverProxyPair {
                  return this._dateProxyFactory.create({
                    owner,
                    date: proxyTarget.target,
                  }).instance;
                }

                public applies(object: object): boolean {
                  return object instanceof Date;
                }
              }
            `,
          },
          {
            title: 'Date property observer factory',
            description:
              'Full implementation of DatePropertyObserverProxyPairFactory.',
            code: dedent`
              @Injectable()
              export class DatePropertyObserverProxyPairFactory
                extends IndexObserverProxyPairFactory<Date, DateProperty>
              {
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
                  @Inject(RsXCoreInjectionTokens.IProxyRegistry)
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
                    truePredicate,
                  );
                }

                public override applies(object: unknown): boolean {
                  return object instanceof Date;
                }
              }
            `,
          },
        ],
      },
      {
        title: 'Step 2: group ids by date + watch rule',
        subSteps: [
          {
            title: 'Grouped id strategy',
            description:
              'DateProxyFactory reuses instances by date and indexWatchRule group member.',
            code: dedent`
              protected override getGroupId(data: IDateProxyIdData): Date {
                return data.date;
              }

              protected override getGroupMemberId(
                data: IDateProxyIdData,
              ): IIndexWatchRule | undefined {
                return data.indexWatchRule;
              }
            `,
          },
          {
            title: 'Create DateProxy instance',
            description:
              'Full implementation of DateProxyFactory (group id + instance creation).',
            code: dedent`
              @Injectable()
              export class DateProxyFactory
                extends GuidKeyedInstanceFactory<
                  IDateProxyData,
                  IDateObserverProxyPair,
                  IDateProxyIdData
                >
                implements IDateProxyFactory
              {
                constructor(
                  @Inject(RsXCoreInjectionTokens.IGuidFactory)
                  guidFactory: IGuidFactory,
                  @Inject(RsXCoreInjectionTokens.IProxyRegistry)
                  private readonly _proxyRegistry: IProxyRegistry,
                ) {
                  super(guidFactory);
                }

                protected override getGroupId(data: IDateProxyIdData): Date {
                  return data.date;
                }

                protected override getGroupMemberId(
                  data: IDateProxyIdData,
                ): IIndexWatchRule | undefined {
                  return data.indexWatchRule;
                }

                protected override createInstance(
                  dateProxyData: IDateProxyData,
                  id: string,
                ): IDateObserverProxyPair {
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
                    dateProxyData.indexWatchRule,
                  );
                  return {
                    observer,
                    proxy: observer.target,
                    proxyTarget: dateProxyData.date,
                  };
                }
              }
            `,
          },
        ],
      },
      {
        title: 'Step 3: intercept Date setters and emit targeted changes',
        subSteps: [
          {
            title: 'Setter metadata mapping',
            description:
              'DateProxy maps each Date setter to a logical DateProperty + getter pair.',
            code: dedent`
              private readonly _dateSetterMetadata: Map<DateSetterName, ISetterMetaData> =
                new Map([
                  ['setFullYear', { name: 'year', getterName: 'getFullYear', setterName: 'setFullYear' }],
                  ['setUTCFullYear', { name: 'utcYear', getterName: 'getUTCFullYear', setterName: 'setUTCFullYear' }],
                  ['setMonth', { name: 'month', getterName: 'getMonth', setterName: 'setMonth' }],
                  ['setTime', { name: 'time', getterName: 'getTime', setterName: 'setTime' }],
                ]);
            `,
          },
          {
            title: 'Setter wrapping and change emission',
            description:
              'When timestamp changed, DateProxy emits either one generic change or filtered per-property changes.',
            code: dedent`
              return (...args: unknown[]) => {
                const oldTimeStamp = target.getTime();
                const setter = value as (...args: unknown[]) => unknown;
                const result = setter.apply(target, args);
                if (oldTimeStamp !== target.getTime()) {
                  this.emitChanges(oldTimeStamp, target, setterMetadata.name);
                }
                return result;
              };
            `,
          },
        ],
      },
      {
        title: 'Step 4: watch one DateProperty value',
        subSteps: [
          {
            title: 'Property-specific IndexWatchRule',
            description:
              'DatePropertyObserverManager creates a rule that matches one property on one Date instance.',
            code: dedent`
              const indexWatchPredicate = (targetIndex, target, context) =>
                targetIndex === index && target === context;

              const indexWatchRule = new IndexWatchRule(this._date, indexWatchPredicate);
              const dateObserver = this._dateProxyFactory.create({
                date: this._date,
                indexWatchRule,
              }).instance.observer;
            `,
          },
          {
            title: 'Deduplicate property emissions',
            description:
              'DatePropertyObserver keeps old value and emits only when the watched property changes.',
            code: dedent`
              private onDateChanged = (change: IPropertyChange) => {
                if (change.index !== this.id || change.newValue === this._oldValue) {
                  return;
                }

                this.emitChange(change);
                this._oldValue = change.newValue;
              };
            `,
          },
        ],
      },
      {
        title: 'Step 5: dispose Date observers',
        subSteps: [
          {
            title: 'DateProxy cleanup',
            description:
              'Dispose unregisters the Date target from proxy registry.',
            code: dedent`
              protected override disposeInternal(): void {
                this._proxyRegistry.unregister(this.value);
                this.target = Type.cast(undefined);
              }
            `,
          },
          {
            title: 'DatePropertyObserver cleanup',
            description:
              'Property observer dispose releases inner Date observer and subscription.',
            code: dedent`
              protected override disposeInternal(): void {
                this._dateObserver.dispose();
                this._dateChangeSubscription.unsubscribe();
              }
            `,
          },
        ],
      },
    ],
  },
  promise: {
    title: 'Promise observation',
    lead: 'How rs-x turns promise resolution into observable state changes using PromiseObserver and PromiseAccessor cache.',
    keyPoints: [
      'PromiseObserverProxyPairFactory has priority 4 and applies to Promise values.',
      'PromiseProxyFactory is keyed by Promise instance and reuses one PromiseObserver per promise.',
      'No proxy object is created for Promise; observer pair returns proxy: undefined.',
      'PromiseObserver attaches target.then(...) and emits once the promise resolves.',
      'Resolved values are cached in PromiseAccessor through IResolvedValueCache (WeakMap-backed).',
      'PromiseAccessor returns PENDING until resolution cache is available and clears cache on dispose.',
    ],
    steps: [
      {
        title: 'Step 1: select Promise object observer factory',
        subSteps: [
          {
            title: 'Factory match',
            description:
              'Full implementation of PromiseObserverProxyPairFactory.',
            code: dedent`
              @Injectable()
              export class PromiseObserverProxyPairFactory
                implements IObjectObserverProxyPairFactory<Promise<unknown>>
              {
                public readonly priority = 4;

                constructor(
                  @Inject(RsXStateManagerInjectionTokens.IPromiseProxyFactory)
                  private readonly _promiseProxyFactory: IPromiseProxyFactory,
                ) {}

                public create(
                  owner: IDisposableOwner,
                  proxyTarget: IProxyTarget<Promise<unknown>>,
                ): IPromiseObserverProxyPair {
                  return this._promiseProxyFactory.create({
                    promise: proxyTarget.target,
                    owner,
                  }).instance;
                }

                public applies(object: unknown): boolean {
                  return object instanceof Promise;
                }
              }
            `,
          },
          {
            title: 'Factory id reuse',
            description:
              'PromiseProxyFactory key is the promise object itself.',
            code: dedent`
              public override getId(data: IPromiseProxyData): Promise<unknown> {
                return data.promise;
              }

              protected override createId(data: IPromiseProxyData): Promise<unknown> {
                return data.promise;
              }
            `,
          },
        ],
      },
      {
        title: 'Step 2: create PromiseObserver and attach then()',
        subSteps: [
          {
            title: 'Observer construction',
            description: 'Full implementation of PromiseObserver.',
            code: dedent`
              class PromiseObserver extends AbstractObserver<
                Promise<unknown>,
                undefined,
                undefined
              > {
                constructor(
                  owner: IDisposableOwner,
                  target: Promise<unknown>,
                  private readonly _promiseAccessor: IPromiseAccessor,
                ) {
                  super(owner, target, undefined, new ReplaySubject<IPropertyChange>(1));
                  target.then(this.onValueResolved);
                }

                protected override disposeInternal(): void {
                  this._promiseAccessor.clearLastValue(this.target);
                }

                private onValueResolved = (newValue: unknown): void => {
                  if (this.isDisposed) {
                    return;
                  }

                  this._promiseAccessor.setLastValue(this.target, newValue);
                  this.emitChange({
                    arguments: [],
                    chain: [],
                    target: this.target,
                    newValue,
                  });
                };
              }
            `,
          },
          {
            title: 'Observer pair shape',
            description: 'Full implementation of PromiseProxyFactory.',
            code: dedent`
              @Injectable()
              export class PromiseProxyFactory
                extends KeyedInstanceFactory<
                  Promise<unknown>,
                  IPromiseProxyData,
                  IPromiseObserverProxyPair
                >
                implements IPromiseProxyFactory
              {
                constructor(
                  @Inject(RsXCoreInjectionTokens.IPromiseAccessor)
                  private readonly _promiseAccessor: IPromiseAccessor,
                ) {
                  super();
                }

                public override getId(data: IPromiseProxyData): Promise<unknown> {
                  return data.promise;
                }

                protected override createId(data: IPromiseProxyData): Promise<unknown> {
                  return data.promise;
                }

                protected override createInstance(
                  data: IPromiseProxyData,
                  id: Promise<unknown>,
                ): IPromiseObserverProxyPair {
                  const observer = new PromiseObserver(
                    {
                      canDispose: () => this.getReferenceCount(id) === 1,
                      release: () => {
                        this.release(id);
                        data.owner?.release();
                      },
                    },
                    data.promise,
                    this._promiseAccessor,
                  );
                  return {
                    observer,
                    proxy: undefined,
                    proxyTarget: data.promise,
                  };
                }

                protected override releaseInstance(
                  promiseObserverWithProxy: IPromiseObserverProxyPair,
                ): void {
                  promiseObserverWithProxy.observer.dispose();
                }
              }
            `,
          },
        ],
      },
      {
        title: 'Step 3: store resolved value and emit change',
        subSteps: [
          {
            title: 'Resolution handler',
            description:
              'Resolved value is cached and emitted as an observer change payload.',
            code: dedent`
              private onValueResolved = (newValue: unknown): void => {
                if (this.isDisposed) {
                  return;
                }

                this._promiseAccessor.setLastValue(this.target, newValue);
                this.emitChange({
                  arguments: [],
                  chain: [],
                  target: this.target,
                  newValue,
                });
              };
            `,
          },
          {
            title: 'Resolved value cache',
            description:
              'PromiseAccessor stores values in IResolvedValueCache (WeakMap-backed).',
            code: dedent`
              public setLastValue(promise: Promise<unknown>, value: unknown): void {
                this._resolvedValueCache.set(promise, value);
              }

              public getResolvedValue(context: unknown, index: string): unknown {
                const val = this.getIndexedValue(context, index);
                return this.isCacheable(val)
                  ? (this._resolvedValueCache.get(val) ?? PENDING)
                  : PENDING;
              }
            `,
          },
        ],
      },
      {
        title: 'Step 4: PromiseAccessor read semantics',
        subSteps: [
          {
            title: 'hasValue behavior',
            description:
              'hasValue returns true only when cached value exists and is not PENDING.',
            code: dedent`
              public hasValue(context: unknown, index: string): boolean {
                const val = this.getIndexedValue(context, index);
                return (
                  this.isCacheable(val) && this._resolvedValueCache.get(val) !== PENDING
                );
              }
            `,
          },
          {
            title: 'setValue is blocked',
            description: 'PromiseAccessor does not allow direct writes.',
            code: dedent`
              public setValue(): void {
                throw new UnsupportedException('Cannot set value for a Promise');
              }
            `,
          },
        ],
      },
      {
        title: 'Step 5: cleanup Promise observer resources',
        subSteps: [
          {
            title: 'Observer dispose',
            description: 'Disposing PromiseObserver clears cached last value.',
            code: dedent`
              protected override disposeInternal(): void {
                this._promiseAccessor.clearLastValue(this.target);
              }
            `,
          },
          {
            title: 'Factory release path',
            description: 'On final release the promise observer is disposed.',
            code: dedent`
              protected override releaseInstance(
                promiseObserverWithProxy: IPromiseObserverProxyPair,
              ): void {
                promiseObserverWithProxy.observer.dispose();
              }
            `,
          },
        ],
      },
    ],
  },
  observable: {
    title: 'Observable observation',
    lead: 'How rs-x subscribes to observables, caches latest emission, and forwards emission changes through state tracking.',
    keyPoints: [
      'ObservableObserverProxyPairFactory has priority 3 and applies via isObservable().',
      'ObservableProxyFactory is keyed by observable instance and reuses one ObservableProxy per observable.',
      'No proxy replacement object is returned; observer pair carries proxy: undefined.',
      'ObservableProxy starts subscription on init() and keeps one subscription handle.',
      'Emissions are deduplicated by previous value and ignored after dispose.',
      'ObservableAccessor stores last value in IResolvedValueCache and supports Subject.next(...) for setValue.',
    ],
    steps: [
      {
        title: 'Step 1: choose observable factory',
        subSteps: [
          {
            title: 'Factory selection',
            description:
              'Full implementation of ObservableObserverProxyPairFactory.',
            code: dedent`
              @Injectable()
              export class ObservableObserverProxyPairFactory
                implements IObjectObserverProxyPairFactory<Observable<unknown>>
              {
                public readonly priority = 3;

                constructor(
                  @Inject(RsXStateManagerInjectionTokens.IObservableProxyFactory)
                  private readonly _observableProxyFactory: IObservableProxyFactory,
                ) {}

                public create(
                  owner: IDisposableOwner,
                  objectObserverInfo: IProxyTarget<Observable<unknown>>,
                ): IObservableObserverProxyPair {
                  return this._observableProxyFactory.create({
                    observable: objectObserverInfo.target,
                    owner,
                  }).instance;
                }

                public applies(object: unknown): boolean {
                  return isObservable(object);
                }
              }
            `,
          },
          {
            title: 'Factory id reuse',
            description:
              'ObservableProxyFactory key is the observable object itself.',
            code: dedent`
              public override getId(data: IObservableProxyData): Observable<unknown> {
                return data.observable;
              }

              protected override createId(data: IObservableProxyData): Observable<unknown> {
                return data.observable;
              }
            `,
          },
        ],
      },
      {
        title: 'Step 2: subscribe once on init',
        subSteps: [
          {
            title: 'Deferred subscription model',
            description: 'Full implementation of ObservableProxy.',
            code: dedent`
              class ObservableProxy extends AbstractObserver<
                Observable<unknown>,
                undefined,
                undefined
              > {
                private _observableSubscription: Subscription | undefined;
                private _oldValue: unknown;

                constructor(
                  owner: IDisposableOwner,
                  target: Observable<unknown>,
                  private readonly _observableAccessor: IObservableAccessor,
                ) {
                  super(owner, target, undefined, new ReplaySubject<IPropertyChange>(1));
                }

                public override init(): void {
                  if (this._observableSubscription) {
                    return;
                  }
                  this._observableSubscription = this.target.subscribe(
                    this.emitObservableChange,
                  );
                }

                protected override disposeInternal(): void {
                  this._observableSubscription?.unsubscribe();
                  this._observableAccessor.clearLastValue(this.target);
                  this._observableSubscription = undefined;
                  this._oldValue = null;
                }

                private emitObservableChange = (newValue: unknown): void => {
                  if (newValue === this._oldValue || this.isDisposed) {
                    return;
                  }

                  this._oldValue = newValue;
                  this._observableAccessor.setLastValue(this.target, newValue);

                  this.emitChange({
                    arguments: [],
                    chain: [],
                    target: this.target,
                    index: this.id,
                    newValue,
                  });
                };
              }
            `,
          },
          {
            title: 'Observer pair shape',
            description: 'Full implementation of ObservableProxyFactory.',
            code: dedent`
              @Injectable()
              export class ObservableProxyFactory
                extends KeyedInstanceFactory<
                  Observable<unknown>,
                  IObservableProxyData,
                  IObservableObserverProxyPair
                >
                implements IObservableProxyFactory
              {
                constructor(
                  @Inject(RsXCoreInjectionTokens.IObservableAccessor)
                  private readonly _observableAccessor: IObservableAccessor,
                ) {
                  super();
                }

                public override getId(data: IObservableProxyData): Observable<unknown> {
                  return data.observable;
                }

                protected override createId(data: IObservableProxyData): Observable<unknown> {
                  return data.observable;
                }

                protected override createInstance(
                  data: IObservableProxyData,
                  id: Observable<unknown>,
                ): IObservableObserverProxyPair {
                  const observer = new ObservableProxy(
                    {
                      canDispose: () => this.getReferenceCount(id) === 1,
                      release: () => {
                        this.release(id);
                        data.owner?.release();
                      },
                    },
                    data.observable,
                    this._observableAccessor,
                  );
                  return {
                    observer,
                    proxy: undefined,
                    proxyTarget: data.observable,
                  };
                }

                protected override releaseInstance(
                  observableObserverWithProxy: IObservableObserverProxyPair,
                ): void {
                  observableObserverWithProxy.observer.dispose();
                }
              }
            `,
          },
        ],
      },
      {
        title: 'Step 3: cache and emit on each next()',
        subSteps: [
          {
            title: 'Emission dedupe and guard',
            description:
              'The observer skips duplicate consecutive values and skips emissions after dispose.',
            code: dedent`
              private emitObservableChange = (newValue: unknown): void => {
                if (newValue === this._oldValue || this.isDisposed) {
                  return;
                }

                this._oldValue = newValue;
                this._observableAccessor.setLastValue(this.target, newValue);

                this.emitChange({
                  arguments: [],
                  chain: [],
                  target: this.target,
                  index: this.id,
                  newValue,
                });
              };
            `,
          },
          {
            title: 'Accessor cache implementation',
            description:
              'ObservableAccessor writes values to resolved-value cache keyed by observable object.',
            code: dedent`
              public setLastValue(observable: LastValueObservable, value: unknown): void {
                this._resolvedValueCache.set(observable, value);
              }

              public clearLastValue(observable: LastValueObservable): void {
                this._resolvedValueCache.delete(observable);
              }
            `,
          },
        ],
      },
      {
        title: 'Step 4: read/write behavior through ObservableAccessor',
        subSteps: [
          {
            title: 'Resolved read behavior',
            description:
              'BehaviorSubject returns context.value directly; other observables use cache and fallback to PENDING.',
            code: dedent`
              public getResolvedValue(context: unknown, index: string): unknown {
                if (context instanceof BehaviorSubject) return context.value;

                const val = this.getIndexedValue(context, index);
                if ((val && typeof val === 'object') || typeof val === 'function') {
                  return this._resolvedValueCache.get(val) ?? PENDING;
                }

                return PENDING;
              }
            `,
          },
          {
            title: 'Write behavior for Subject',
            description:
              'setValue forwards to next(value) when the observed value is a Subject.',
            code: dedent`
              public setValue(context: unknown, index: string, value: unknown): void {
                const val = this.getIndexedValue(context, index);
                if (val instanceof Subject) {
                  val.next(value);
                  return;
                }
              }
            `,
          },
        ],
      },
      {
        title: 'Step 5: cleanup and unsubscribe',
        subSteps: [
          {
            title: 'ObservableProxy dispose',
            description:
              'Dispose unsubscribes and clears cache value for this observable.',
            code: dedent`
              protected override disposeInternal(): void {
                this._observableSubscription?.unsubscribe();
                this._observableAccessor.clearLastValue(this.target);
                this._observableSubscription = undefined;
                this._oldValue = null;
              }
            `,
          },
          {
            title: 'Factory release',
            description: 'On final release the observer is disposed.',
            code: dedent`
              protected override releaseInstance(
                observableObserverWithProxy: IObservableObserverProxyPair,
              ): void {
                observableObserverWithProxy.observer.dispose();
              }
            `,
          },
        ],
      },
    ],
  },
};

const STEP_SOURCE_LINKS_BY_TITLE: Record<
  string,
  Array<{ label: string; href: string }>
> = {
  'Step 1: choose the plain-object property factory': [
    {
      label: 'NonIterableObjectPropertyObserverProxyPairFactory',
      href: gh(
        'rs-x-state-manager/lib/property-observer/factories/non-iterable-object-property/non-iterable-object-property-observer-proxy-pair.factory.ts',
      ),
    },
    {
      label: 'RsXStateManagerModule',
      href: gh('rs-x-state-manager/lib/rs-x-state-manager.module.ts'),
    },
  ],
  'Step 2: create observer group for one property': [
    {
      label: 'IndexObserverProxyPairFactory',
      href: gh(
        'rs-x-state-manager/lib/property-observer/factories/indexed-value-observer-proxy-pair/indexed-value-observer-proxy-pair.factory.ts',
      ),
    },
  ],
  'Step 3: patch property descriptor and emit changes': [
    {
      label: 'ObjectPropertyObserverManager',
      href: gh(
        'rs-x-state-manager/lib/property-observer/factories/non-iterable-object-property/object-property-observer-manager.ts',
      ),
    },
  ],
  'Step 4: rebind nested observers when value changes': [
    {
      label: 'IndexObserverProxyPairFactory',
      href: gh(
        'rs-x-state-manager/lib/property-observer/factories/indexed-value-observer-proxy-pair/indexed-value-observer-proxy-pair.factory.ts',
      ),
    },
  ],
  'Step 5: teardown and descriptor restore': [
    {
      label: 'ObjectPropertyObserverManager',
      href: gh(
        'rs-x-state-manager/lib/property-observer/factories/non-iterable-object-property/object-property-observer-manager.ts',
      ),
    },
  ],

  'Step 1: select array object observer factory': [
    {
      label: 'ArrayObserverProxyPairFactory',
      href: gh(
        'rs-x-state-manager/lib/object-observer/factories/array-observer-proxy-pair.factory.ts',
      ),
    },
    {
      label: 'ObjectObserverProxyPairFactoryProvider',
      href: gh(
        'rs-x-state-manager/lib/object-observer/object-observer-proxy-pair-factory.provider.ts',
      ),
    },
  ],
  'Step 2: create or reuse one proxy pair per array': [
    {
      label: 'ArrayProxyFactory',
      href: gh(
        'rs-x-state-manager/lib/proxies/array-proxy/array-proxy.factory.ts',
      ),
    },
  ],
  'Step 3: intercept array mutation APIs': [
    {
      label: 'ArrayProxy',
      href: gh(
        'rs-x-state-manager/lib/proxies/array-proxy/array-proxy.factory.ts',
      ),
    },
  ],
  'Step 4: emit index-level change payloads': [
    {
      label: 'ArrayProxy',
      href: gh(
        'rs-x-state-manager/lib/proxies/array-proxy/array-proxy.factory.ts',
      ),
    },
  ],
  'Step 5: release and unregister proxy': [
    {
      label: 'ArrayProxyFactory',
      href: gh(
        'rs-x-state-manager/lib/proxies/array-proxy/array-proxy.factory.ts',
      ),
    },
  ],

  'Step 1: select the Map factory': [
    {
      label: 'MapObserverProxyPairFactory',
      href: gh(
        'rs-x-state-manager/lib/object-observer/factories/map-observer-proxy-pair.factory.ts',
      ),
    },
  ],
  'Step 2: create or reuse proxy by map id': [
    {
      label: 'MapProxyFactory',
      href: gh('rs-x-state-manager/lib/proxies/map-proxy/map-proxy.factory.ts'),
    },
  ],
  'Step 3: intercept Map mutations': [
    {
      label: 'MapProxy',
      href: gh('rs-x-state-manager/lib/proxies/map-proxy/map-proxy.factory.ts'),
    },
  ],
  'Step 4: emit key-scoped change payloads': [
    {
      label: 'MapProxy',
      href: gh('rs-x-state-manager/lib/proxies/map-proxy/map-proxy.factory.ts'),
    },
  ],
  'Step 5: dispose map observer': [
    {
      label: 'MapProxyFactory',
      href: gh('rs-x-state-manager/lib/proxies/map-proxy/map-proxy.factory.ts'),
    },
  ],

  'Step 1: choose Set factory and create root observer': [
    {
      label: 'SetObserverProxyPairFactory',
      href: gh(
        'rs-x-state-manager/lib/object-observer/factories/set-observer-proxy-pair.factory.ts',
      ),
    },
  ],
  'Step 2: create or reuse per Set instance': [
    {
      label: 'SetProxyFactory',
      href: gh('rs-x-state-manager/lib/proxies/set-proxy/set-proxy.factory.ts'),
    },
  ],
  'Step 3: intercept membership operations': [
    {
      label: 'SetProxy',
      href: gh('rs-x-state-manager/lib/proxies/set-proxy/set-proxy.factory.ts'),
    },
  ],
  'Step 4: emit Set member change payloads': [
    {
      label: 'SetProxy + CollectionItemObserverManager',
      href: gh(
        'rs-x-state-manager/lib/property-observer/factories/collection-item/collection-item-observer-manager.ts',
      ),
    },
  ],
  'Step 5: cleanup Set observer resources': [
    {
      label: 'PromiseProxyFactory',
      href: gh(
        'rs-x-state-manager/lib/proxies/promise-proxy/promise-proxy.factory.ts',
      ),
    },
  ],

  'Step 1: select date observer strategy': [
    {
      label: 'DateObserverProxyPairFactory',
      href: gh(
        'rs-x-state-manager/lib/object-observer/factories/date-observer-proxy-pair.factory.ts',
      ),
    },
    {
      label: 'DatePropertyObserverProxyPairFactory',
      href: gh(
        'rs-x-state-manager/lib/property-observer/factories/date-property/date-property-observer-proxy-pair.factory.ts',
      ),
    },
  ],
  'Step 2: group ids by date + watch rule': [
    {
      label: 'DateProxyFactory',
      href: gh(
        'rs-x-state-manager/lib/proxies/date-proxy/date-proxy.factory.ts',
      ),
    },
  ],
  'Step 3: intercept Date setters and emit targeted changes': [
    {
      label: 'DateProxy',
      href: gh(
        'rs-x-state-manager/lib/proxies/date-proxy/date-proxy.factory.ts',
      ),
    },
  ],
  'Step 4: watch one DateProperty value': [
    {
      label: 'DatePropertyObserverManager',
      href: gh(
        'rs-x-state-manager/lib/property-observer/factories/date-property/data-property-observer-manager.ts',
      ),
    },
  ],
  'Step 5: dispose Date observers': [
    {
      label: 'DateProxy + DatePropertyObserver',
      href: gh(
        'rs-x-state-manager/lib/property-observer/factories/date-property/data-property-observer-manager.ts',
      ),
    },
  ],

  'Step 1: select Promise object observer factory': [
    {
      label: 'PromiseObserverProxyPairFactory',
      href: gh(
        'rs-x-state-manager/lib/object-observer/factories/promise-observer-proxy-pair.factory.ts',
      ),
    },
  ],
  'Step 2: create PromiseObserver and attach then()': [
    {
      label: 'PromiseProxyFactory + PromiseObserver',
      href: gh(
        'rs-x-state-manager/lib/proxies/promise-proxy/promise-proxy.factory.ts',
      ),
    },
  ],
  'Step 3: store resolved value and emit change': [
    {
      label: 'PromiseProxyFactory + PromiseObserver',
      href: gh(
        'rs-x-state-manager/lib/proxies/promise-proxy/promise-proxy.factory.ts',
      ),
    },
    {
      label: 'PromiseAccessor',
      href: gh('rs-x-core/lib/index-value-accessor/promise-accessor.ts'),
    },
  ],
  'Step 4: PromiseAccessor read semantics': [
    {
      label: 'PromiseAccessor',
      href: gh('rs-x-core/lib/index-value-accessor/promise-accessor.ts'),
    },
    {
      label: 'ResolvedValueCache',
      href: gh('rs-x-core/lib/index-value-accessor/resolved-value-cache.ts'),
    },
  ],

  'Step 5: cleanup Promise observer resources': [
    {
      label: 'PromiseProxyFactory + PromiseObserver',
      href: gh(
        'rs-x-state-manager/lib/proxies/promise-proxy/promise-proxy.factory.ts',
      ),
    },
  ],

  'Step 1: choose observable factory': [
    {
      label: 'ObservableObserverProxyPairFactory',
      href: gh(
        'rs-x-state-manager/lib/object-observer/factories/observable-observer-proxy-pair.factory.ts',
      ),
    },
  ],
  'Step 2: subscribe once on init': [
    {
      label: 'ObservableProxyFactory + ObservableProxy',
      href: gh(
        'rs-x-state-manager/lib/proxies/observable-proxy/observable-proxy.factory.ts',
      ),
    },
  ],
  'Step 3: cache and emit on each next()': [
    {
      label: 'ObservableProxy',
      href: gh(
        'rs-x-state-manager/lib/proxies/observable-proxy/observable-proxy.factory.ts',
      ),
    },
    {
      label: 'ObservableAccessor',
      href: gh('rs-x-core/lib/index-value-accessor/observable-accessor.ts'),
    },
  ],
  'Step 4: read/write behavior through ObservableAccessor': [
    {
      label: 'ObservableAccessor',
      href: gh('rs-x-core/lib/index-value-accessor/observable-accessor.ts'),
    },
    {
      label: 'ResolvedValueCache',
      href: gh('rs-x-core/lib/index-value-accessor/resolved-value-cache.ts'),
    },
  ],
  'Step 5: cleanup and unsubscribe': [
    {
      label: 'ObservableProxyFactory + ObservableProxy',
      href: gh(
        'rs-x-state-manager/lib/proxies/observable-proxy/observable-proxy.factory.ts',
      ),
    },
  ],
};

for (const entry of Object.values(OBSERVATION_DOCS)) {
  entry.steps = entry.steps.map((step) => ({
    ...step,
    sourceLinks: STEP_SOURCE_LINKS_BY_TITLE[step.title] ?? [],
  }));
}

export function generateStaticParams(): Array<{ kind: ObservationKind }> {
  return (Object.keys(OBSERVATION_DOCS) as ObservationKind[]).map((kind) => ({
    kind,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  const entry = OBSERVATION_DOCS[kind as ObservationKind];
  if (!entry) {
    return { title: 'Observation details' };
  }

  return {
    title: `Advanced: ${entry.title}`,
    description: entry.lead,
  };
}

export default async function ObservationDetailPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  const entry = OBSERVATION_DOCS[kind as ObservationKind];
  if (!entry) {
    notFound();
  }

  return (
    <main id="content" className="main">
      <section className="section docsApiSection">
        <div className="container">
          <div className="docsApiHeader">
            <div>
              <DocsBreadcrumbs
                items={[
                  { label: 'Docs', href: '/docs' },
                  {
                    label: 'Observation by data type',
                    href: '/docs/observation',
                  },
                  { label: entry.title },
                ]}
              />
              <p className="docsApiEyebrow">Advanced</p>
              <h1 className="sectionTitle">{entry.title}</h1>
              <p className="sectionLead">{entry.lead}</p>
            </div>
          </div>

          <div className="docsApiGrid">
            <article className="card docsApiCard">
              <h2 className="cardTitle">Detailed notes</h2>
              <ul className="advancedTopicList">
                {entry.keyPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </article>

            <aside
              className="qsCodeCard docsApiCode"
              aria-label="Technical flow steps"
            >
              <div className="advancedCodeStepList">
                {entry.steps.map((step) => (
                  <LeftAccentCard
                    key={step.title}
                    as="section"
                    tone="brand"
                    className="advancedCodeStep advancedCodeStepWithOuterEdge"
                  >
                    <header className="advancedCodeStepHeader">
                      <h3 className="advancedCodeStepTitle">{step.title}</h3>
                    </header>
                    {step.sourceLinks && step.sourceLinks.length > 0 && (
                      <p className="cardText">
                        Code links:{' '}
                        {step.sourceLinks.map((source, sourceIndex) => (
                          <span key={`${step.title}-${source.label}`}>
                            {sourceIndex > 0 ? ' · ' : ''}
                            <Link
                              href={source.href}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {source.label}
                            </Link>
                          </span>
                        ))}
                      </p>
                    )}
                    <div className="advancedCodeSubStepList">
                      {step.subSteps.map((subStep) => (
                        <div
                          key={`${step.title}-${subStep.title}`}
                          className="advancedCodeSubStep"
                        >
                          <div className="qsCodeHeader">
                            <div className="qsCodeTitle">{subStep.title}</div>
                          </div>
                          <p className="cardText advancedCodeSubStepDescription">
                            {subStep.description}
                          </p>
                          <SyntaxCodeBlock code={subStep.code} />
                        </div>
                      ))}
                    </div>
                  </LeftAccentCard>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
