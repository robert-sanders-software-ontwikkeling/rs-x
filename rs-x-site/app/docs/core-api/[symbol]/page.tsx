import fs from 'node:fs/promises';
import path from 'node:path';

import dedent from 'dedent';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import {
  LeftAccentCard,
  type LeftAccentCardTone,
} from '@rs-x/react-components';

import type { ApiParameterItem } from '../../../../components/ApiParameterList';
import { ApiParameterList } from '../../../../components/ApiParameterList';
import { DocsPageTemplate } from '../../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../../components/SyntaxCodeBlock';
import { resolveSymbolDocumentationLink } from '../../../../lib/type-doc-links';
import { coreApiBySymbol, coreApiItems } from '../core-api.data';

const MODULE_DETAILS: Record<string, string> = {
  'deep-clone':
    'Used by @rs-x/core to deep clone values safely, including proxy-aware cloning and async-value normalization.',
  'dependency-injection.ts': 'Dependency-injection module built on Inversify.',
  'equality-service': 'Checks whether two values are deeply equal.',
  'error-log':
    'Used for logging, diagnostics, and debugging helper output in core services.',
  exceptions: '',
  'function-call-index':
    'Defines contracts and implementations for function-call identities (context + function name + arguments) used by call-result caching.',
  'function-call-result-cache':
    'Caches function-call results to avoid unnecessary recomputation.',
  guid: 'Generates stable unique ids used by runtime services to track and reference instances.',
  'index-value-accessor':
    'Core value-access module: `IndexValueAccessor` selects the first accessor that applies (sorted by priority) and delegates reads/writes to it. Default accessors cover object properties, cached method-call results, arrays, maps, sets, observables, promises, date properties, and `globalThis` fallback.',
  'object-store':
    'Persistent storage module for async key/value reads and writes. Default implementation uses IndexedDB and is exposed through IObjectStorage.',
  'proxy-registry':
    'Maintains raw-target/proxy relationships so runtime services can resolve either side of a proxy mapping.',
  'rs-x-core.injection-tokens.ts':
    'Defines DI tokens for registering and resolving core services.',
  'rs-x-core.module.ts':
    'Defines the default @rs-x/core module registrations and singleton bindings.',
  'sequence-id':
    'Generates deterministic sequence-id handles per context and manages their lifecycle.',
  'keyed-instance-factory': '',
  types:
    'Low-level shared types and utilities used throughout core/state/parser packages.',
  'value-metadata':
    'Value classification module used by runtime services. It finds the first metadata handler in `IValueMetadataList` (sorted by priority) whose `applies(value)` returns true, then uses that handler to evaluate `isAsync(value)` and `needsProxy(value)`.',
  'wait-for-event':
    'Async helper class for waiting on Observable emissions from a target event property. It subscribes, runs a trigger, collects one or more emitted values, and resolves with the event payload (or null on timeout).',
};

const CORE_GITHUB_BASE =
  'https://github.com/robert-sanders-software-ontwikkeling/rs-x/blob/main/rs-x-core/lib';
const INVERSIFY_URL = 'https://inversify.io/';

type SingletonServiceBinding = {
  token: string;
  serviceType: string;
};

const SINGLETON_SERVICE_BINDINGS: Record<string, SingletonServiceBinding> = {
  ArrayIndexAccessor: {
    token: 'IArrayIndexAccessor',
    serviceType: 'IArrayIndexAccessor',
  },
  ArrayMetadata: { token: 'ArrayMetadata', serviceType: 'IValueMetadata' },
  DateMetadata: { token: 'DateMetadata', serviceType: 'IValueMetadata' },
  DatePropertyAccessor: {
    token: 'IDatePropertyAccessor',
    serviceType: 'IDatePropertyAccessor',
  },
  DeepCloneValueExcept: {
    token: 'IDeepCloneExcept',
    serviceType: 'IDeepCloneExcept',
  },
  DefaultDeepClone: { token: 'IDeepClone', serviceType: 'IDeepClone' },
  DummyMetadata: { token: 'DummyMetadata', serviceType: 'IValueMetadata' },
  EqualityService: {
    token: 'IEqualityService',
    serviceType: 'IEqualityService',
  },
  ErrorLog: { token: 'IErrorLog', serviceType: 'IErrorLog' },
  FunctionCallIndexFactory: {
    token: 'IFunctionCallIndexFactory',
    serviceType: 'IFunctionCallIndexFactory',
  },
  FunctionCallResultCache: {
    token: 'IFunctionCallResultCache',
    serviceType: 'IFunctionCallResultCache',
  },
  GlobalIndexAccessor: {
    token: 'IGlobalIndexAccessor',
    serviceType: 'IGlobalIndexAccessor',
  },
  GuidFactory: { token: 'IGuidFactory', serviceType: 'IGuidFactory' },
  IndexValueAccessor: {
    token: 'IIndexValueAccessor',
    serviceType: 'IIndexValueAccessor',
  },
  LodashDeepClone: { token: 'ILodashDeepClone', serviceType: 'IDeepClone' },
  MapKeyAccessor: { token: 'IMapKeyAccessor', serviceType: 'IMapKeyAccessor' },
  MapMetadata: { token: 'MapMetadata', serviceType: 'IValueMetadata' },
  MethodAccessor: { token: 'IMethodAccessor', serviceType: 'IMethodAccessor' },
  ObjectStorage: { token: 'IObjectStorage', serviceType: 'IObjectStorage' },
  ObservableAccessor: {
    token: 'IObservableAccessor',
    serviceType: 'IObservableAccessor',
  },
  ObservableMetadata: {
    token: 'ObservableMetadata',
    serviceType: 'IValueMetadata',
  },
  PromiseAccessor: {
    token: 'IPromiseAccessor',
    serviceType: 'IPromiseAccessor',
  },
  PromiseMetadata: { token: 'PromiseMetadata', serviceType: 'IValueMetadata' },
  PropertyValueAccessor: {
    token: 'IPropertyValueAccessor',
    serviceType: 'IPropertyValueAccessor',
  },
  ProxyRegistry: { token: 'IProxyRegistry', serviceType: 'IProxyRegistry' },
  ResolvedValueCache: {
    token: 'IResolvedValueCache',
    serviceType: 'IResolvedValueCache',
  },
  SequenceIdFactory: {
    token: 'ISequenceIdFactory',
    serviceType: 'ISequenceIdFactory',
  },
  SetKeyAccessor: { token: 'ISetKeyAccessor', serviceType: 'ISetKeyAccessor' },
  SetMetadata: { token: 'SetMetadata', serviceType: 'IValueMetadata' },
  StructuredDeepClone: {
    token: 'IStructuredDeepClone',
    serviceType: 'IDeepClone',
  },
  ValueMetadata: { token: 'IValueMetadata', serviceType: 'IValueMetadata' },
};

function slugify(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

function formatModuleLabel(moduleName: string): string {
  return moduleName.replace(/\.ts$/i, '').replace(/\./g, '-');
}

function defaultWhatItDoes(
  symbol: string,
  kind: string,
  fallback: string,
): string {
  return fallback;
}

type SymbolDocumentation = {
  summary?: string;
  parameters?: ApiParameterItem[];
  returns?: string;
  notes?: string;
  exampleCode?: string;
  constructorInjectionExampleCode?: string;
  fullSignature?: string;
  hideModuleDetail?: boolean;
};

type ApiMemberParameter = {
  name: string;
  type: string;
  optional: boolean;
  rest: boolean;
};

type ApiMember = {
  name: string;
  kind: 'method' | 'property' | 'constructor' | 'index' | 'call';
  signature: string;
  parameters: ApiMemberParameter[];
  returnType?: string;
  optional: boolean;
  readonly: boolean;
  abstract: boolean;
  access?: 'public' | 'protected';
  description: string;
};

const MEMBER_DESCRIPTION_OVERRIDES: Record<string, Record<string, string>> = {
  ArrayIndexAccessor: {
    applies: 'Returns true when the provided context is an Array.',
    getIndexes:
      'Returns the available numeric indexes of the array (same as `array.keys()`).',
    hasValue: 'Returns true when the index exists in the array.',
    getValue: 'Returns the raw value at `array[index]`.',
    getResolvedValue:
      'Returns the resolved value at `array[index]`. For arrays this is the same as `getValue`.',
    setValue: 'Writes `value` to `array[index]`.',
  },
  PropertyValueAccessor: {
    applies:
      'Returns true when the context is an object, the property exists, and the property value is not handled by Date/Observable/Promise accessors.',
    getIndexes:
      'Returns enumerable object property names, excluding function members.',
    hasValue: 'Returns true when the property exists on the object.',
    getValue: 'Returns the raw property value (`object[index]`).',
    getResolvedValue:
      'Returns the resolved property value. For plain properties this is the same as `getValue`.',
    setValue: 'Writes `value` to `object[index]`.',
  },
  MapKeyAccessor: {
    applies: 'Returns true when the context is a Map.',
    getIndexes: 'Returns all keys from the map (`map.keys()`).',
    hasValue: 'Returns true when `map.has(key)` is true.',
    getValue: 'Returns `map.get(key)`.',
    getResolvedValue:
      'Returns the resolved map value. For maps this is the same as `getValue`.',
    setValue: 'Writes the value with `map.set(key, value)`.',
  },
  SetKeyAccessor: {
    applies: 'Returns true when the context is a Set.',
    getIndexes: 'Returns all current set items as iterable indexes.',
    hasValue:
      'Returns true when the set contains the provided key (`set.has(key)`).',
    getValue:
      'Returns the key itself when it exists in the set; otherwise returns undefined.',
    getResolvedValue:
      'Returns the resolved set value. For sets this is the same as `getValue`.',
    setValue:
      'Replaces one existing set item (`key`) with a new item (`value`).',
  },
  DatePropertyAccessor: {
    applies:
      'Returns true when the context is a Date and the index is one of the supported date property names.',
    getIndexes:
      'Returns the supported date property names (for example `year`, `month`, `time`, `utcYear`).',
    hasValue: 'Returns true when the index is a supported date property key.',
    getValue:
      'Reads the value for the selected `DateProperty` key (`year`, `utcYear`, `month`, `utcMonth`, `date`, `utcDate`, `hours`, `utcHours`, `minutes`, `utcMinutes`, `seconds`, `utcSeconds`, `milliseconds`, `utcMilliseconds`, or `time`).',
    getResolvedValue:
      'Returns the resolved date-part value. For Date properties this is the same as `getValue`.',
    setValue:
      'Updates the selected `DateProperty` key using the matching Date setter.',
  },
  GlobalIndexAccessor: {
    applies:
      'Returns true when context is `globalThis` and the key exists on it.',
    getIndexes:
      'Returns no indexes (empty iterator); this accessor resolves known global keys directly.',
    hasValue: 'Returns true when the key exists on `globalThis`.',
    getValue: 'Returns `globalThis[index]`.',
    getResolvedValue:
      'Returns the resolved global value. For globals this is the same as `getValue`.',
    setValue:
      'Throws `UnsupportedException` because this accessor does not allow writing to `globalThis`.',
  },
  ObservableAccessor: {
    applies: 'Returns true when `context[index]` is an Observable.',
    getIndexes:
      'Returns no indexes (empty iterator); this accessor is used for direct observable property access.',
    hasValue:
      'Returns true when a resolved observable value is available (not `PENDING`).',
    getValue:
      'Returns the raw Observable/Subject instance from `context[index]`.',
    getResolvedValue:
      'Returns current `BehaviorSubject.value` or last cached emitted value; returns `PENDING` when no value is available yet.',
    setValue:
      'If `context[index]` is a Subject, pushes `value` by calling `next(value)`.',
    setLastValue:
      'Stores the latest emitted value for an observable so reads can resolve synchronously.',
    clearLastValue: 'Removes the cached emitted value for an observable.',
  },
  PromiseAccessor: {
    applies: 'Returns true when `context[index]` is a Promise.',
    getIndexes:
      'Returns no indexes (empty iterator); this accessor is used for direct promise property access.',
    hasValue:
      'Returns true when a resolved value is cached for the promise and is not `PENDING`.',
    getValue: 'Returns the raw Promise instance from `context[index]`.',
    getResolvedValue:
      'Returns the cached resolved promise value, or `PENDING` when unresolved.',
    setValue:
      'Throws `UnsupportedException` because promise values cannot be assigned through this accessor.',
    setLastValue:
      'Stores the resolved value for a promise so reads can resolve synchronously.',
    clearLastValue: 'Removes the cached resolved value for a promise.',
  },
  MethodAccessor: {
    applies:
      'Returns true when context has a callable member for `index.functionName`.',
    getIndexes:
      'Returns no indexes (empty iterator); method access depends on a function-call index.',
    hasValue:
      'Returns true when a cached call result entry exists for the provided context and function-call index.',
    getValue:
      'Returns the cached function-call result value for the provided function-call index.',
    getResolvedValue:
      'Returns the resolved method value. For method accessor this is the same as `getValue`.',
    setValue:
      'Throws `UnsupportedException`; method-call result values are read from cache, not written through this accessor.',
  },
  IndexValueAccessor: {
    getIndexes:
      'Finds the first matching accessor for `(context, index)` and returns its indexes.',
    hasValue:
      'Finds the first matching accessor and delegates existence check to that accessor.',
    getValue: 'Finds the first matching accessor and returns its raw value.',
    getResolvedValue:
      'Finds the first matching accessor and returns its resolved value.',
    setValue:
      'Finds the first matching accessor and delegates value assignment.',
    applies:
      'Returns true when at least one registered accessor applies. Throws `NoAccessorFoundExeception` when none applies.',
  },
  IDeepClone: {
    priority:
      'Determines strategy order in the deep-clone pipeline. Implementations are sorted by descending priority, so higher numbers run first.',
    clone:
      'Creates a deep copy of the provided value using this strategy. If this strategy cannot handle the value, the next strategy in the ordered list is used.',
  },
  IDeepCloneExcept: {
    except:
      'Transforms a source value during clone when special handling is required (for example unresolved async wrappers or proxy-related substitutions).',
  },
  IValueMetadata: {
    priority:
      'Determines metadata resolver order. Resolvers are evaluated by descending priority until one applies to the value.',
    applies:
      'Returns true when this metadata resolver is responsible for the current value type.',
    isAsync:
      'Reports whether values of this type should be treated as async in runtime access/observation flow.',
    needsProxy:
      'Reports whether values of this type should be wrapped or patched for change tracking.',
  },
  ValueMetadata: {
    priority:
      'Composite service priority. This service delegates to the matching concrete metadata implementation from the injected list.',
    isAsync:
      'Finds the matching metadata handler for the value and returns whether that value type is treated as async.',
    needsProxy:
      'Finds the matching metadata handler for the value and returns whether that value type should be proxied.',
    applies:
      'Returns true when at least one metadata handler in the injected list can handle the value.',
    getValueMetadata:
      'Selects the first matching metadata handler (highest priority first). Throws `UnsupportedException` when none match.',
  },
  ArrayMetadata: {
    priority: 'Priority used in metadata selection order (higher runs first).',
    applies: 'Returns true when the value is an Array.',
    isAsync: 'Returns false; Array is handled as synchronous.',
    needsProxy: 'Returns true; Array should be proxied for change tracking.',
  },
  DateMetadata: {
    priority: 'Priority used in metadata selection order (higher runs first).',
    applies: 'Returns true when the value is a Date.',
    isAsync: 'Returns false; Date is handled as synchronous.',
    needsProxy: 'Returns true; Date should be proxied for change tracking.',
  },
  MapMetadata: {
    priority: 'Priority used in metadata selection order (higher runs first).',
    applies: 'Returns true when the value is a Map.',
    isAsync: 'Returns false; Map is handled as synchronous.',
    needsProxy: 'Returns true; Map should be proxied for change tracking.',
  },
  SetMetadata: {
    priority: 'Priority used in metadata selection order (higher runs first).',
    applies: 'Returns true when the value is a Set.',
    isAsync: 'Returns false; Set is handled as synchronous.',
    needsProxy: 'Returns true; Set should be proxied for change tracking.',
  },
  ObservableMetadata: {
    priority: 'Priority used in metadata selection order (higher runs first).',
    applies: 'Returns true when the value is an RxJS Observable.',
    isAsync: 'Returns true; Observable is handled as asynchronous.',
    needsProxy:
      'Returns true; Observable should be proxied for reactive tracking.',
  },
  PromiseMetadata: {
    priority: 'Priority used in metadata selection order (higher runs first).',
    applies: 'Returns true when the value is a Promise.',
    isAsync: 'Returns true; Promise is handled as asynchronous.',
    needsProxy:
      'Returns true; Promise should be proxied for reactive tracking.',
  },
  DummyMetadata: {
    priority:
      'Lowest fallback priority. This metadata should run only when no specialized metadata type matches.',
    applies: 'Always returns true as the fallback metadata implementation.',
    isAsync: 'Returns false in fallback mode.',
    needsProxy: 'Returns false in fallback mode.',
  },
  IIndexValueAccessor: {
    priority:
      'Determines accessor precedence. Accessors are evaluated by descending priority so the most specific resolver runs first.',
    applies:
      'Checks whether this accessor can resolve the provided context/index combination.',
    hasValue:
      'Checks whether a value exists for the given context/index without mutating state.',
    getValue: 'Reads the raw value for the given context/index.',
    getResolvedValue:
      'Reads a runtime-resolved value (for example last resolved async value) for the given context/index.',
    setValue:
      'Writes a new value at the given context/index through this accessor.',
    getIndexes:
      'Enumerates indexes/keys available for the current context (optionally scoped by an index root).',
  },
  IObservableAccessor: {
    setLastValue:
      'Stores the latest emitted observable value so identifier reads can resolve a synchronous snapshot.',
    clearLastValue:
      'Clears cached observable snapshot data for the provided observable instance.',
  },
  IPromiseAccessor: {
    setLastValue:
      'Stores the latest resolved promise value so expression reads can consume it without awaiting each access.',
    clearLastValue:
      'Clears cached resolved promise value for the provided promise instance.',
  },
  IResolvedValueCache: {
    set: 'Stores the latest resolved value for the given source object.',
    get: 'Gets the cached resolved value for the given source object.',
    delete: 'Removes the cached resolved value for the given source object.',
  },
  ObjectStorage: {
    get: 'Reads and returns the value stored for `key` from IndexedDB.',
    set: 'Stores or replaces `value` under `key` in IndexedDB.',
    close:
      'Closes the cached IndexedDB connection. A later `get`/`set` call opens it again.',
  },
  IProxyRegistry: {
    register:
      'Registers a raw target and its proxy pair so runtime services can move between wrapped and unwrapped references.',
    unregister:
      'Removes a registered proxy/raw mapping for the given raw target.',
    getProxy: 'Gets the proxy instance for a raw target, if registered.',
    getProxyTarget: 'Gets the raw target for a proxy instance, if registered.',
    isProxy:
      'Returns true when the provided object is known as a registered proxy instance.',
  },
  ProxyRegistry: {
    register:
      'Stores or replaces the raw-target -> proxy mapping in the registry.',
    unregister: 'Removes the mapping for the provided raw target.',
    getProxy: 'Returns the proxy mapped to the provided raw target.',
    getProxyTarget:
      'Returns the raw target mapped to the provided proxy by scanning current mappings.',
    isProxy:
      'Returns true when the provided object is currently registered as a proxy.',
  },
  IErrorLog: {
    error: 'Observable stream that emits logged error entries.',
    add: 'Pushes a new error entry into the log stream.',
    clear:
      'Clears internal error state and active subscriptions used by the log.',
  },
  IEqualityService: {
    isEqual:
      'Compares `a` and `b` and returns true if they are equal, otherwise false.',
  },
  IError: {
    message: 'Human-readable error message.',
    code: 'Optional numeric error code for programmatic handling.',
    exception: 'Original exception object when the error wraps a thrown Error.',
    context: 'Domain/runtime context associated with this error.',
    fatal: 'Marks whether the error should be treated as non-recoverable.',
    data: 'Optional extra payload with diagnostics or domain-specific metadata.',
  },
  IKeyedInstanceFactory: {
    isEmpty: 'True when no managed instances are currently registered.',
    create:
      'Creates or reuses an instance for the provided data and returns id/instance/referenceCount details.',
    getOrCreate:
      'Returns an existing instance for the data id, or creates and registers one if missing.',
    release:
      'Decrements reference count for an id and disposes/removes the instance when count reaches zero (or when forced).',
    ids: 'Iterates all currently registered instance ids.',
    getFromId: 'Returns the instance mapped to the provided id.',
    has: 'Returns true when an instance exists for the provided id.',
    getFromData:
      'Resolves id from input data and returns the mapped instance when present.',
    getId: 'Resolves the instance id for the provided data if one exists.',
    getReferenceCount: 'Returns current reference count for the provided id.',
    exists:
      'Returns true when the instance object is currently tracked by this factory.',
    dispose:
      'Disposes and clears all managed instances and internal references.',
  },
  KeyedInstanceFactory: {
    isEmpty: 'Returns true when no instances are currently tracked.',
    ids: 'Returns all currently tracked ids. An id is the key that identifies one singleton instance.',
    getFromId: 'Returns the instance tracked for the provided id.',
    has: 'Returns true when an instance exists for the provided id.',
    getFromData:
      'Resolves an id from the input data and returns the tracked instance for that id when present.',
    getId:
      'Returns the id for the provided data when that id is already known. An id is the key used to track one singleton instance.',
    getOrCreate:
      'Returns the existing instance for the resolved id, or creates and tracks a new one when missing.',
    create:
      'Creates (or reuses) the singleton instance for the resolved id, increments reference count, and returns `{ id, instance, referenceCount }`. The id is the tracking key for that singleton.',
    release:
      'Decrements reference count for the provided id. When reference count reaches 0 (or force=true), the tracked instance for that id is released and removed.',
    getReferenceCount: 'Returns current reference count for the provided id.',
    exists:
      'Returns true when the provided instance object is currently tracked by this factory.',
    createId:
      'Creates an id from input data. The id is the key used to track one singleton instance.',
    createInstance:
      'Creates a new instance when no instance exists yet for the id.',
    getOrCreateId:
      'Returns existing id for the data when available; otherwise creates a new id.',
    updateReferenceCount:
      'Applies +1/-1 reference-count changes for an id and handles release/removal when needed.',
    replaceKey: 'Moves an existing tracked instance from old id to new id.',
    onDisposeInstance:
      'Helper that releases one id reference and calls the provided dispose callback when count reaches 0.',
    dispose:
      'Releases all tracked instances and clears internal id/reference maps.',
  },
  IGroupedKeyedInstanceFactory: {
    isGroupRegistered:
      'Returns true when the factory currently has at least one tracked member in the provided group.',
    instanceGroupInfoEntries:
      'Iterates all active group entries and yields `{ groupId, groupMemberId, id, instance }` for each tracked member.',
  },
  GroupedKeyedInstanceFactory: {
    instanceGroupInfoEntries:
      'Enumerates all active grouped instances with their `groupId`, `groupMemberId`, resolved `id`, and `instance`.',
    getId:
      'Resolves the existing instance id by first deriving `groupId` and `groupMemberId` from input data, then reading the stored mapping.',
    isGroupRegistered:
      'Checks whether the provided group currently exists in the grouped registry.',
    getGroupId:
      'Abstract method that returns the group key used to bucket entries (for example `roomId`, `tenantId`, or `contextId`).',
    getGroupMemberId:
      'Abstract method that returns the member key inside a group (for example `userId`, `itemId`, or `propertyName`).',
    createUniqueId:
      'Abstract method that creates a new unique instance id for a group/member pair when no mapping exists yet.',
    groupIds: 'Protected iterator over all currently registered group keys.',
    getGroup:
      'Protected method that returns the group-member map for a given group key when that group exists.',
    createId:
      'Creates and stores a new id for the resolved group/member pair. Throws `InvalidOperationException` when that pair is already registered.',
    releaseInstance:
      'Removes the id mapping from its group during release and deletes the group when it becomes empty.',
    findGroupMemberId:
      'Internal helper that locates the `(groupId, groupMemberId)` pair for a resolved instance id.',
  },
  IWaitForEventOptions: {
    count:
      'Number of event emissions to collect before resolving. Default is 1.',
    timeout:
      'Maximum wait time in milliseconds before resolving with `null`. Default is 100.',
    ignoreInitialValue:
      'When true, skips the first emitted value (useful for BehaviorSubject initial state). Default is false.',
  },
  WaitForEvent: {
    constructor:
      'Creates a waiter for one Observable event property on a target object and applies wait options (`count`, `timeout`, `ignoreInitialValue`).',
    wait: 'Subscribes to the configured Observable event, executes `trigger`, collects emitted value(s), and resolves with the result. Resolves `null` when timeout is reached before enough events arrive.',
  },
  IDisposableOwner: {
    canDispose:
      'Optional hook that decides whether an owned instance can be disposed on release.',
    release: 'Notifies owner that one reference was released.',
  },
  IFunctionCallIndexData: {
    context: 'Call context object used to scope function-call identity.',
    functionName: 'Function name used for call identity.',
    arguments: 'Raw call arguments used to derive stable call indexing.',
  },
  IFunctionCallIndex: {
    context: 'Call context object used to scope function-call identity.',
    functionName: 'Function name used for call identity.',
    argumentsId: 'Id sequence representation of call arguments.',
    id: 'Unique call index id built from context + function name + arguments sequence.',
  },
  IDisposableFunctionCallIndex: {
    context: 'Call context object used to scope function-call identity.',
    functionName: 'Function name used for call identity.',
    argumentsId: 'Id sequence representation of call arguments.',
    id: 'Unique call index id built from context + function name + arguments sequence.',
    dispose:
      'Releases resources associated with this function-call index instance.',
  },
  IFunctionCallResultIdInfo: {
    arguments:
      'Arguments used for identifying the cached function-call result.',
    functionName:
      'Function name used for identifying the cached function-call result.',
  },
  IFunctionCallResult: {
    arguments:
      'Arguments used for identifying the cached function-call result.',
    functionName:
      'Function name used for identifying the cached function-call result.',
    result: 'Computed function result value stored in cache.',
  },
  IFunctionCallResultCacheEntry: {
    index: 'Function-call index associated with this cached result entry.',
    result: 'Cached function result value.',
    dispose: 'Releases this cached entry and related tracking resources.',
  },
  IFunctionCallResultCache: {
    create:
      'Creates a cache entry when it does not exist; otherwise returns the existing entry and increments its reference count. Always call `dispose()` on the returned entry when finished, to prevent memory leaks.',
    has: 'Checks whether a cached result entry exists for the provided context/index.',
    get: 'Gets cached result entry for the provided context/index.',
  },
  FunctionCallResultCache: {
    create:
      'Creates a cache entry when it does not exist; otherwise returns the existing entry and increments its reference count.',
    has: 'Returns true when a cache entry exists for the given context and function-call index.',
    get: 'Returns the cached entry for the given context and function-call index, or undefined when not cached.',
  },
  PrettyPrinter: {
    toString:
      'Formats a value as a single printable string. Use quoteStrings to control whether string values are wrapped in quotes.',
    toLines:
      'Formats a value as an array of lines (one string per line). Useful when you need custom rendering or post-processing of the output.',
  },
  Assertion: {
    assert:
      'Checks the predicate result. Throws `AssertionError` when the predicate returns false.',
    assertIsFunction:
      'Checks that `value` is a function. Throws `InvalidCastException` when it is not callable.',
    assertNotNullOrUndefined:
      'Checks that `value` is not null or undefined. Throws `NullOrUndefinedException` when validation fails.',
    assertNotNullOrEmpty:
      'Checks that `value` is not null or empty. Throws `NullOrEmptyException` when validation fails.',
  },
  IISequenceWithIdData: {
    sequence: 'Original sequence payload used for id generation.',
    id: 'Deterministic sequence id derived from sequence content.',
  },
  ISequenceIdFactory: {
    create:
      'Creates or returns a sequence-id handle for the provided context + sequence payload. Always dispose/release the handle when finished to prevent memory leaks.',
    get: 'Gets existing sequence-id handle for the provided context + sequence payload.',
    release:
      'Releases one sequence-id reference for the provided context/id pair. Call this (or dispose()) when finished to prevent memory leaks.',
  },
  SequenceIdFactory: {
    create:
      'Creates or returns a sequence-id handle for the provided context + sequence payload. Always call `dispose()` on the returned handle when finished (or call `release(context, id)`) to prevent memory leaks.',
    get: 'Returns the existing sequence-id handle for the provided context + sequence payload, or undefined when none exists.',
    release:
      'Releases one reference for the provided context/id handle and removes it when its reference count reaches zero.',
  },
  IObjectStorage: {
    get: 'Reads the value stored under the provided key.',
    set: 'Stores or replaces the value under the provided key.',
    close: 'Closes the active storage connection/resources.',
  },
  IPropertyDescriptor: {
    type: 'Property descriptor classification used by runtime descriptor handling.',
    descriptor: 'Raw JavaScript PropertyDescriptor payload.',
  },
  IChainPart: {
    context: 'Context object at this chain step.',
    index: 'Index/key used at this chain step.',
  },
  IPropertyChange: {
    chain:
      'Optional context/index chain describing nested traversal to the changed node.',
    target: 'Final target object where change occurred.',
    index: 'Changed index/key/property name.',
    newValue: 'New value written by the mutation.',
    arguments:
      'Call arguments when the change originated from a method invocation.',
    setValue:
      'Optional setter callback for rewriting the changed value during processing.',
  },
  IMultiInjectTokens: {
    serviceToken: 'Optional alias token bound to the same concrete target.',
    multiInjectToken:
      'Token representing the multi-binding list used by multi-inject resolution.',
  },
  IMultiInjectService: {
    target: 'Concrete class constructor to register in singleton scope.',
    token: 'Service token alias that resolves to the registered target.',
  },
  IDisposable: {
    dispose: 'Releases resources held by this instance.',
  },
  IGuidFactory: {
    create: 'Creates a new unique identifier string.',
  },
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function readFullTypeDeclaration(
  symbol: string,
  sourcePath: string,
  kind: string,
): Promise<string | null> {
  const filePath = path.resolve(process.cwd(), '../rs-x-core/lib', sourcePath);
  const fileContent = await fs.readFile(filePath, 'utf8');

  if (kind === 'type') {
    const typeRegex = new RegExp(`export\\s+type\\s+${escapeRegex(symbol)}\\b`);
    const typeMatch = typeRegex.exec(fileContent);
    if (!typeMatch) {
      return null;
    }

    const start = typeMatch.index;
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;
    let angleDepth = 0;
    let inString: '"' | "'" | '`' | null = null;
    let inLineComment = false;
    let inBlockComment = false;
    let escaped = false;

    for (let i = start; i < fileContent.length; i += 1) {
      const char = fileContent[i];
      const next = fileContent[i + 1];

      if (inLineComment) {
        if (char === '\n') {
          inLineComment = false;
        }
        continue;
      }

      if (inBlockComment) {
        if (char === '*' && next === '/') {
          inBlockComment = false;
          i += 1;
        }
        continue;
      }

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === '\\') {
          escaped = true;
          continue;
        }
        if (char === inString) {
          inString = null;
        }
        continue;
      }

      if (char === '/' && next === '/') {
        inLineComment = true;
        i += 1;
        continue;
      }

      if (char === '/' && next === '*') {
        inBlockComment = true;
        i += 1;
        continue;
      }

      if (char === '"' || char === "'" || char === '`') {
        inString = char;
        continue;
      }

      if (char === '(') {
        parenDepth += 1;
      } else if (char === ')' && parenDepth > 0) {
        parenDepth -= 1;
      } else if (char === '[') {
        bracketDepth += 1;
      } else if (char === ']' && bracketDepth > 0) {
        bracketDepth -= 1;
      } else if (char === '{') {
        braceDepth += 1;
      } else if (char === '}' && braceDepth > 0) {
        braceDepth -= 1;
      } else if (char === '<') {
        angleDepth += 1;
      } else if (char === '>' && angleDepth > 0) {
        angleDepth -= 1;
      }

      if (
        char === ';' &&
        parenDepth === 0 &&
        bracketDepth === 0 &&
        braceDepth === 0 &&
        angleDepth === 0
      ) {
        return fileContent.slice(start, i + 1).trim();
      }
    }

    return fileContent.slice(start).trim();
  }

  const declarationRegexByKind: Record<string, RegExp> = {
    interface: new RegExp(`export\\s+interface\\s+${escapeRegex(symbol)}\\b`),
    class: new RegExp(`export\\s+class\\s+${escapeRegex(symbol)}\\b`),
    'abstract class': new RegExp(
      `export\\s+abstract\\s+class\\s+${escapeRegex(symbol)}\\b`,
    ),
  };
  const declarationRegex = declarationRegexByKind[kind];
  if (!declarationRegex) {
    return null;
  }
  const match = declarationRegex.exec(fileContent);
  if (!match) {
    return null;
  }

  const start = match.index;
  let openBraceIndex = -1;
  let angleDepth = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  let inHeaderString: '"' | "'" | '`' | null = null;
  let inHeaderLineComment = false;
  let inHeaderBlockComment = false;
  let headerEscaped = false;

  for (let index = start; index < fileContent.length; index += 1) {
    const char = fileContent[index];
    const next = fileContent[index + 1];

    if (inHeaderLineComment) {
      if (char === '\n') {
        inHeaderLineComment = false;
      }
      continue;
    }

    if (inHeaderBlockComment) {
      if (char === '*' && next === '/') {
        inHeaderBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (inHeaderString) {
      if (headerEscaped) {
        headerEscaped = false;
        continue;
      }
      if (char === '\\') {
        headerEscaped = true;
        continue;
      }
      if (char === inHeaderString) {
        inHeaderString = null;
      }
      continue;
    }

    if (char === '/' && next === '/') {
      inHeaderLineComment = true;
      index += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      inHeaderBlockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inHeaderString = char;
      continue;
    }

    if (char === '<') {
      angleDepth += 1;
      continue;
    }
    if (char === '>' && angleDepth > 0) {
      angleDepth -= 1;
      continue;
    }
    if (char === '(') {
      parenDepth += 1;
      continue;
    }
    if (char === ')' && parenDepth > 0) {
      parenDepth -= 1;
      continue;
    }
    if (char === '[') {
      bracketDepth += 1;
      continue;
    }
    if (char === ']' && bracketDepth > 0) {
      bracketDepth -= 1;
      continue;
    }

    if (
      char === '{' &&
      angleDepth === 0 &&
      parenDepth === 0 &&
      bracketDepth === 0
    ) {
      openBraceIndex = index;
      break;
    }
  }

  if (openBraceIndex < 0) {
    return null;
  }

  let depth = 0;
  let inString: '"' | "'" | '`' | null = null;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;
  let closeBraceIndex = -1;
  for (let index = openBraceIndex; index < fileContent.length; index += 1) {
    const char = fileContent[index];
    const next = fileContent[index + 1];

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === inString) {
        inString = null;
      }
      continue;
    }

    if (char === '/' && next === '/') {
      inLineComment = true;
      index += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      inBlockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = char;
      continue;
    }

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        closeBraceIndex = index;
        break;
      }
    }
  }

  if (closeBraceIndex < 0) {
    return null;
  }

  return fileContent.slice(start, closeBraceIndex + 1).trim();
}

function interfaceBody(declaration: string): string {
  let openBraceIndex = -1;
  let angleDepth = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  let inString: '"' | "'" | '`' | null = null;

  for (let index = 0; index < declaration.length; index += 1) {
    const char = declaration[index];
    const prev = index > 0 ? declaration[index - 1] : '';

    if (inString) {
      if (char === inString && prev !== '\\') {
        inString = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = char;
      continue;
    }

    if (char === '<') {
      angleDepth += 1;
      continue;
    }
    if (char === '>' && angleDepth > 0) {
      angleDepth -= 1;
      continue;
    }
    if (char === '(') {
      parenDepth += 1;
      continue;
    }
    if (char === ')' && parenDepth > 0) {
      parenDepth -= 1;
      continue;
    }
    if (char === '[') {
      bracketDepth += 1;
      continue;
    }
    if (char === ']' && bracketDepth > 0) {
      bracketDepth -= 1;
      continue;
    }

    if (
      char === '{' &&
      angleDepth === 0 &&
      parenDepth === 0 &&
      bracketDepth === 0
    ) {
      openBraceIndex = index;
      break;
    }
  }

  if (openBraceIndex < 0) {
    return '';
  }

  let closeBraceIndex = -1;
  let braceDepth = 0;
  inString = null;
  for (let index = openBraceIndex; index < declaration.length; index += 1) {
    const char = declaration[index];
    const prev = index > openBraceIndex ? declaration[index - 1] : '';

    if (inString) {
      if (char === inString && prev !== '\\') {
        inString = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = char;
      continue;
    }

    if (char === '{') {
      braceDepth += 1;
      continue;
    }
    if (char === '}') {
      braceDepth -= 1;
      if (braceDepth === 0) {
        closeBraceIndex = index;
        break;
      }
    }
  }

  if (closeBraceIndex <= openBraceIndex) {
    return '';
  }

  return declaration.slice(openBraceIndex + 1, closeBraceIndex);
}

function splitInterfaceStatements(body: string): string[] {
  const statements: string[] = [];
  let current = '';
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplateString = false;

  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    const prev = index > 0 ? body[index - 1] : '';

    if (char === "'" && !inDoubleQuote && !inTemplateString && prev !== '\\') {
      inSingleQuote = !inSingleQuote;
    } else if (
      char === '"' &&
      !inSingleQuote &&
      !inTemplateString &&
      prev !== '\\'
    ) {
      inDoubleQuote = !inDoubleQuote;
    } else if (
      char === '`' &&
      !inSingleQuote &&
      !inDoubleQuote &&
      prev !== '\\'
    ) {
      inTemplateString = !inTemplateString;
    }

    if (inSingleQuote || inDoubleQuote || inTemplateString) {
      current += char;
      continue;
    }

    if (char === '(') {
      parenDepth += 1;
    }
    if (char === ')') {
      parenDepth -= 1;
    }
    if (char === '{') {
      braceDepth += 1;
    }
    if (char === '}') {
      braceDepth -= 1;
    }
    if (char === '[') {
      bracketDepth += 1;
    }
    if (char === ']') {
      bracketDepth -= 1;
    }

    if (
      char === ';' &&
      parenDepth === 0 &&
      braceDepth === 0 &&
      bracketDepth === 0
    ) {
      const statement = current.trim();
      if (statement) {
        statements.push(statement);
      }
      current = '';
      continue;
    }

    current += char;
  }

  const last = current.trim();
  if (last) {
    statements.push(last);
  }

  return statements;
}

function splitClassStatements(body: string): string[] {
  const statements: string[] = [];
  let current = '';
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;

  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];

    if (char === '(') {
      parenDepth += 1;
    }
    if (char === ')') {
      parenDepth -= 1;
    }
    if (char === '[') {
      bracketDepth += 1;
    }
    if (char === ']') {
      bracketDepth -= 1;
    }

    if (
      char === ';' &&
      parenDepth === 0 &&
      braceDepth === 0 &&
      bracketDepth === 0
    ) {
      const statement = current.trim();
      if (statement) {
        statements.push(statement);
      }
      current = '';
      continue;
    }

    if (
      char === '{' &&
      parenDepth === 0 &&
      braceDepth === 0 &&
      bracketDepth === 0
    ) {
      const header = current.trim();
      if (header && header.includes('(')) {
        statements.push(header);
      }
      current = '';
      braceDepth = 1;
      continue;
    }

    if (char === '{') {
      braceDepth += 1;
      continue;
    }

    if (char === '}') {
      if (braceDepth > 0) {
        braceDepth -= 1;
      }
      continue;
    }

    if (braceDepth === 0) {
      current += char;
    }
  }

  const tail = current.trim();
  if (tail) {
    statements.push(tail);
  }

  return statements;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeSignature(value: string): string {
  return normalizeWhitespace(value).replace(/,\s*\)/g, ')');
}

function splitTopLevelCsv(value: string): string[] {
  const parts: string[] = [];
  let current = '';
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;
  let angleDepth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplateString = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const prev = index > 0 ? value[index - 1] : '';

    if (char === "'" && !inDoubleQuote && !inTemplateString && prev !== '\\') {
      inSingleQuote = !inSingleQuote;
    } else if (
      char === '"' &&
      !inSingleQuote &&
      !inTemplateString &&
      prev !== '\\'
    ) {
      inDoubleQuote = !inDoubleQuote;
    } else if (
      char === '`' &&
      !inSingleQuote &&
      !inDoubleQuote &&
      prev !== '\\'
    ) {
      inTemplateString = !inTemplateString;
    }

    if (inSingleQuote || inDoubleQuote || inTemplateString) {
      current += char;
      continue;
    }

    if (char === '(') {
      parenDepth += 1;
    }
    if (char === ')') {
      parenDepth -= 1;
    }
    if (char === '{') {
      braceDepth += 1;
    }
    if (char === '}') {
      braceDepth -= 1;
    }
    if (char === '[') {
      bracketDepth += 1;
    }
    if (char === ']') {
      bracketDepth -= 1;
    }
    if (char === '<') {
      angleDepth += 1;
    }
    if (char === '>') {
      angleDepth -= 1;
    }

    if (
      char === ',' &&
      parenDepth === 0 &&
      braceDepth === 0 &&
      bracketDepth === 0 &&
      angleDepth === 0
    ) {
      const part = current.trim();
      if (part) {
        parts.push(part);
      }
      current = '';
      continue;
    }

    current += char;
  }

  const tail = current.trim();
  if (tail) {
    parts.push(tail);
  }

  return parts;
}

function parseMethodParameters(params: string): ApiMemberParameter[] {
  const cleaned = params.trim();
  if (!cleaned) {
    return [];
  }

  return splitTopLevelCsv(cleaned).map((rawParam) => {
    let normalized = rawParam.trim();
    normalized = normalized.replace(/^@\w+(?:\([^)]*\))?\s*/g, '');
    normalized = normalized.replace(
      /^(?:(?:public|private|protected|readonly|override)\s+)+/,
      '',
    );
    const match = normalized.match(
      /^(\.\.\.)?([A-Za-z_$][\w$]*)(\?)?(?:\s*:\s*([^=]+?))?(?:\s*=\s*[\s\S]+)?$/,
    );
    if (match) {
      const [, rest, name, optionalMark, explicitType] = match;
      const hasDefaultValue = /\s=\s/.test(normalized);
      const normalizedType = explicitType?.trim() || 'unknown';
      return {
        name: `${rest ?? ''}${name}`,
        type: normalizedType,
        optional: optionalMark === '?' || hasDefaultValue,
        rest: Boolean(rest),
      };
    }

    return {
      name: normalized,
      type: 'unknown',
      optional: false,
      rest: false,
    };
  });
}

function plainMemberName(name: string): string {
  return name
    .replace(/^readonly\s+/i, '')
    .replace(/\?$/, '')
    .trim();
}

function splitTopLevelCommaList(value: string): string[] {
  const items: string[] = [];
  let current = '';
  let angleDepth = 0;
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;

  for (const char of value) {
    if (char === '<') {
      angleDepth += 1;
      current += char;
      continue;
    }
    if (char === '>' && angleDepth > 0) {
      angleDepth -= 1;
      current += char;
      continue;
    }
    if (char === '(') {
      parenDepth += 1;
      current += char;
      continue;
    }
    if (char === ')' && parenDepth > 0) {
      parenDepth -= 1;
      current += char;
      continue;
    }
    if (char === '{') {
      braceDepth += 1;
      current += char;
      continue;
    }
    if (char === '}' && braceDepth > 0) {
      braceDepth -= 1;
      current += char;
      continue;
    }
    if (char === '[') {
      bracketDepth += 1;
      current += char;
      continue;
    }
    if (char === ']' && bracketDepth > 0) {
      bracketDepth -= 1;
      current += char;
      continue;
    }

    if (
      char === ',' &&
      angleDepth === 0 &&
      parenDepth === 0 &&
      braceDepth === 0 &&
      bracketDepth === 0
    ) {
      const normalized = current.replace(/\s+/g, ' ').trim();
      if (normalized.length > 0) {
        items.push(normalized);
      }
      current = '';
      continue;
    }

    current += char;
  }

  const tail = current.replace(/\s+/g, ' ').trim();
  if (tail.length > 0) {
    items.push(tail);
  }

  return items;
}

function extractBaseClassName(
  kind: string,
  declaration: string,
): string | null {
  if (!['class', 'abstract class'].includes(kind)) {
    return null;
  }

  const headerMatch = declaration.match(
    /(?:abstract\s+)?class\s+[A-Za-z_$][\w$]*(?:\s*<[\s\S]*?>)?\s*([\s\S]*?)\{/,
  );
  if (!headerMatch) {
    return null;
  }

  const heritage = headerMatch[1].replace(/\s+/g, ' ').trim();
  const extendsMatch = heritage.match(
    /\bextends\s+([\s\S]*?)(?:\bimplements\b|$)/,
  );
  if (!extendsMatch) {
    return null;
  }

  const baseClass = extendsMatch[1]?.trim();
  return baseClass && baseClass.length > 0 ? baseClass : null;
}

function extractImplementedInterfaces(
  kind: string,
  declaration: string,
): string[] {
  if (!['class', 'abstract class'].includes(kind)) {
    return [];
  }

  const headerMatch = declaration.match(
    /(?:abstract\s+)?class\s+[A-Za-z_$][\w$]*(?:\s*<[\s\S]*?>)?\s*([\s\S]*?)\{/,
  );
  if (!headerMatch) {
    return [];
  }

  const heritage = headerMatch[1].replace(/\s+/g, ' ').trim();
  const implementsMatch = heritage.match(/\bimplements\s+([\s\S]*)$/);
  if (!implementsMatch) {
    return [];
  }

  return splitTopLevelCommaList(implementsMatch[1]);
}

function extractExtendedInterfaces(
  kind: string,
  declaration: string,
): string[] {
  if (kind !== 'interface') {
    return [];
  }

  const headerMatch = declaration.match(
    /interface\s+[A-Za-z_$][\w$]*(?:\s*<[\s\S]*?>)?\s*extends\s+([\s\S]*?)\{/,
  );
  if (!headerMatch) {
    return [];
  }

  return splitTopLevelCommaList(headerMatch[1]);
}

function renderTypeListWithLinks(
  types: string[],
  currentSymbol?: string,
): ReactNode {
  return types.flatMap((item, index) => {
    const nodes: ReactNode[] = [];
    if (index > 0) {
      nodes.push(<span key={`type-sep-${index}`}>, </span>);
    }
    nodes.push(
      <span key={`type-item-${index}`}>
        {renderTypeWithLinks(item, currentSymbol)}
      </span>,
    );
    return nodes;
  });
}

function formatMemberLabel(name: string): string {
  const normalized = plainMemberName(name).replace(/^_+/, '');
  return normalized
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
}

function joinParamNames(parameters: ApiMemberParameter[]): string {
  const names = parameters.map((item) => item.name.replace(/^\.\.\./, ''));
  if (names.length === 0) {
    return '';
  }
  if (names.length === 1) {
    return names[0];
  }
  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function buildMemberDescription(
  symbolName: string,
  kind: ApiMember['kind'],
  name: string,
  returnType: string | undefined,
  parameters: ApiMemberParameter[],
  optional: boolean,
  readonly: boolean,
): string {
  const baseName = plainMemberName(name);
  const symbolOverrides = MEMBER_DESCRIPTION_OVERRIDES[symbolName];
  const override =
    symbolOverrides &&
    Object.prototype.hasOwnProperty.call(symbolOverrides, baseName)
      ? symbolOverrides[baseName]
      : undefined;
  if (override) {
    return override;
  }
  const memberLabel = formatMemberLabel(baseName);
  const paramList = joinParamNames(parameters);

  if (baseName === 'except') {
    return 'Transforms the source value during clone and returns the value that should be written into the cloned object.';
  }

  if (baseName === 'clone') {
    return 'Creates a cloned value from the source input using the runtime clone strategy.';
  }

  if (baseName === 'dispose') {
    return 'Releases resources, subscriptions, and internal state held by this instance. Always call `dispose()` when you are finished, to prevent memory leaks.';
  }

  if (kind === 'property') {
    const readonlyNote = readonly ? 'Read-only.' : '';
    const optionalNote = optional ? 'Optional.' : '';
    const typeNote = returnType ? `Type: \`${returnType}\`.` : '';
    return [
      `Represents the \`${memberLabel || baseName}\` value on this API.`,
      readonlyNote,
      optionalNote,
      typeNote,
    ]
      .filter(Boolean)
      .join(' ');
  }

  if (kind === 'method') {
    const inputNote =
      parameters.length > 0
        ? `Accepts ${parameters.length === 1 ? 'parameter' : 'parameters'} ${paramList}.`
        : 'Takes no parameters.';
    const returnNote = returnType ? `Returns \`${returnType}\`.` : '';

    if (/^get[A-Z_]/.test(baseName)) {
      return `Reads ${memberLabel.replace(/^get\s+/, '') || 'a value'} from the runtime state. ${inputNote} ${returnNote}`.trim();
    }
    if (/^set[A-Z_]/.test(baseName)) {
      return `Updates ${memberLabel.replace(/^set\s+/, '') || 'a value'} on the runtime state. ${inputNote} ${returnNote}`.trim();
    }
    if (
      /^is[A-Z_]/.test(baseName) ||
      /^has[A-Z_]/.test(baseName) ||
      /^can[A-Z_]/.test(baseName)
    ) {
      return `Checks whether ${memberLabel} is true. ${inputNote} ${returnNote}`.trim();
    }
    if (/^assert[A-Z_]/.test(baseName)) {
      return `Validates ${memberLabel.replace(/^assert\s+/, '') || 'the condition'}. Throws when validation fails. ${inputNote} ${returnNote}`.trim();
    }
    if (/^create[A-Z_]/.test(baseName)) {
      return `Creates ${memberLabel.replace(/^create\s+/, '') || 'an instance'}. ${inputNote} ${returnNote}`.trim();
    }
    if (/^register[A-Z_]/.test(baseName)) {
      return `Registers ${memberLabel.replace(/^register\s+/, '') || 'a dependency'} in the runtime registry. ${inputNote} ${returnNote}`.trim();
    }
    if (/^bind[A-Z_]/.test(baseName)) {
      return `Binds ${memberLabel.replace(/^bind\s+/, '') || 'state'} into the current expression context. ${inputNote} ${returnNote}`.trim();
    }
    if (/^watch[A-Z_]/.test(baseName) || /^observe[A-Z_]/.test(baseName)) {
      return `Subscribes to ${memberLabel.replace(/^(watch|observe)\s+/, '') || 'changes'} and hooks it into the update pipeline. ${inputNote} ${returnNote}`.trim();
    }

    return `Performs \`${memberLabel || baseName}\`. ${inputNote} ${returnNote}`.trim();
  }

  if (kind === 'constructor') {
    const paramCount = parameters.length;
    return paramCount === 0
      ? 'Constructor for creating an instance without parameters.'
      : `Constructor for creating an instance with ${paramCount} parameter${paramCount === 1 ? '' : 's'}.`;
  }

  if (kind === 'index') {
    return returnType
      ? `Allows keyed access and resolves values as type \`${returnType}\`.`
      : 'Allows keyed access on this type.';
  }

  return returnType
    ? `This type can be called like a function and returns \`${returnType}\`.`
    : 'This type can be called like a function.';
}

function memberSortName(name: string): string {
  return name
    .replace(/^readonly\s+/i, '')
    .replace(/[?()[\]]/g, '')
    .trim()
    .toLowerCase();
}

function memberKindRank(kind: ApiMember['kind']): number {
  if (kind === 'constructor') {
    return 0;
  }
  if (kind === 'property') {
    return 1;
  }
  if (kind === 'method') {
    return 2;
  }
  if (kind === 'index') {
    return 3;
  }
  return 4;
}

function memberAccessRank(access?: ApiMember['access']): number {
  if (access === 'public') {
    return 0;
  }
  if (access === 'protected') {
    return 1;
  }
  return 2;
}

function memberAccentTone(kind: ApiMember['kind']): LeftAccentCardTone {
  if (kind === 'constructor') {
    return 'done';
  }
  if (kind === 'method') {
    return 'active';
  }
  if (kind === 'property') {
    return 'mostly';
  }
  return 'brand';
}

function parseDeclarationMembers(
  declaration: string,
  symbolName: string,
): ApiMember[] {
  const body = interfaceBody(declaration);
  if (!body) {
    return [];
  }

  const isClassDeclaration = /^export\s+(?:abstract\s+)?class\b/.test(
    declaration,
  );
  const statements = isClassDeclaration
    ? splitClassStatements(body)
    : splitInterfaceStatements(body);
  const members: ApiMember[] = [];
  const resolveAccess = (
    modifiers: string,
  ): 'public' | 'protected' | undefined => {
    if (!isClassDeclaration) {
      return undefined;
    }
    if (/\bprotected\b/.test(modifiers)) {
      return 'protected';
    }
    return 'public';
  };

  for (const statement of statements) {
    const cleaned = normalizeSignature(statement);
    if (!cleaned) {
      continue;
    }

    const indexMatch = cleaned.match(/^\[([^\]]+)\]\s*:\s*(.+)$/);
    if (indexMatch) {
      members.push({
        name: `[${indexMatch[1]}]`,
        kind: 'index',
        signature: cleaned,
        parameters: [],
        returnType: indexMatch[2],
        optional: false,
        readonly: false,
        abstract: false,
        access: undefined,
        description: buildMemberDescription(
          symbolName,
          'index',
          `[${indexMatch[1]}]`,
          indexMatch[2],
          [],
          false,
          false,
        ),
      });
      continue;
    }

    const methodMatch = cleaned.match(
      /^((?:(?:public|private|protected|static|abstract|readonly|async|override)\s+)*)(constructor|[A-Za-z_$][\w$]*)(?:<[\s\S]+>)?(\?)?\s*\((.*)\)\s*(?::\s*(.+))?$/,
    );
    if (methodMatch) {
      const [, modifiers, name, optionalMark, params, rawReturnType] =
        methodMatch;
      if (isClassDeclaration && /\bprivate\b/.test(modifiers)) {
        continue;
      }
      const optional = optionalMark === '?';
      const isConstructor = name === 'constructor';
      const returnType = isConstructor
        ? undefined
        : (rawReturnType?.trim() ?? 'void');
      const isAbstract = isClassDeclaration && /\babstract\b/.test(modifiers);
      members.push({
        name: optional ? `${name}?` : name,
        kind: isConstructor ? 'constructor' : 'method',
        signature: cleaned,
        parameters: parseMethodParameters(params),
        returnType,
        optional,
        readonly: false,
        abstract: isAbstract,
        access: resolveAccess(modifiers),
        description: buildMemberDescription(
          symbolName,
          isConstructor ? 'constructor' : 'method',
          optional ? `${name}?` : name,
          returnType,
          parseMethodParameters(params),
          optional,
          false,
        ),
      });
      continue;
    }

    const callSignatureMatch = cleaned.match(/^\((.*)\)\s*:\s*(.+)$/);
    if (callSignatureMatch) {
      members.push({
        name: '(call)',
        kind: 'call',
        signature: cleaned,
        parameters: parseMethodParameters(callSignatureMatch[1]),
        returnType: callSignatureMatch[2],
        optional: false,
        readonly: false,
        abstract: false,
        access: undefined,
        description: buildMemberDescription(
          symbolName,
          'call',
          '(call)',
          callSignatureMatch[2],
          parseMethodParameters(callSignatureMatch[1]),
          false,
          false,
        ),
      });
      continue;
    }

    const propertyMatch = cleaned.match(
      /^((?:(?:public|private|protected|static|abstract)\s+)*)(readonly\s+)?([A-Za-z_$][\w$]*)(\?)?\s*:\s*(.+)$/,
    );
    if (propertyMatch) {
      const modifiers = propertyMatch[1];
      if (isClassDeclaration && /\bprivate\b/.test(modifiers)) {
        continue;
      }
      const readonly = Boolean(propertyMatch[2]);
      const name = propertyMatch[3];
      const optional = propertyMatch[4] === '?';
      const type = propertyMatch[5];
      const isAbstract = isClassDeclaration && /\babstract\b/.test(modifiers);
      members.push({
        name: `${readonly ? 'readonly ' : ''}${name}${optional ? '?' : ''}`,
        kind: 'property',
        signature: cleaned,
        parameters: [],
        returnType: type,
        optional,
        readonly,
        abstract: isAbstract,
        access: resolveAccess(modifiers),
        description: buildMemberDescription(
          symbolName,
          'property',
          `${readonly ? 'readonly ' : ''}${name}${optional ? '?' : ''}`,
          type,
          [],
          optional,
          readonly,
        ),
      });
    }
  }

  return members.sort((left, right) => {
    const kindDiff = memberKindRank(left.kind) - memberKindRank(right.kind);
    if (kindDiff !== 0) {
      return kindDiff;
    }
    const accessDiff =
      memberAccessRank(left.access) - memberAccessRank(right.access);
    if (accessDiff !== 0) {
      return accessDiff;
    }
    return memberSortName(left.name).localeCompare(memberSortName(right.name));
  });
}

function memberGroupTitle(kind: ApiMember['kind']): string {
  if (kind === 'property') {
    return 'Properties';
  }
  if (kind === 'method') {
    return 'Methods';
  }
  if (kind === 'constructor') {
    return 'Constructors';
  }
  if (kind === 'index') {
    return 'Index signatures';
  }
  return 'Call signatures';
}

function formatMemberSignatureForDisplay(member: ApiMember): string {
  const signature = member.signature.trim();
  if (!['method', 'constructor', 'call'].includes(member.kind)) {
    return signature;
  }

  const openParen = signature.indexOf('(');
  if (openParen < 0) {
    return signature;
  }

  let closeParen = -1;
  let depth = 0;

  for (let i = openParen; i < signature.length; i += 1) {
    const char = signature[i];
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
      if (depth === 0) {
        closeParen = i;
        break;
      }
    }
  }

  if (closeParen < 0) {
    return signature;
  }

  const before = signature.slice(0, openParen).trimEnd();
  const rawParams = signature.slice(openParen + 1, closeParen).trim();
  const after = signature.slice(closeParen + 1).trim();
  const parameters =
    rawParams.length > 0 ? splitTopLevelCommaList(rawParams) : [];
  const shouldMultiline = parameters.length > 1 || signature.length > 110;

  if (!shouldMultiline) {
    return signature;
  }

  if (parameters.length === 0) {
    return `${before}()${after.length > 0 ? `${after.startsWith(':') ? '' : ' '}${after}` : ''}`;
  }

  const formattedParams = parameters
    .map((parameter, index) => {
      const suffix = index < parameters.length - 1 ? ',' : '';
      return `  ${parameter}${suffix}`;
    })
    .join('\n');

  return `${before}(\n${formattedParams}\n)${after.length > 0 ? `${after.startsWith(':') ? '' : ' '}${after}` : ''}`;
}

function groupMembers(
  members: ApiMember[],
): Array<{ kind: ApiMember['kind']; title: string; members: ApiMember[] }> {
  const order: ApiMember['kind'][] = [
    'constructor',
    'property',
    'method',
    'index',
    'call',
  ];
  return order
    .map((kind) => ({
      kind,
      title: memberGroupTitle(kind),
      members: members.filter((member) => member.kind === kind),
    }))
    .filter((group) => group.members.length > 0);
}

function renderTextWithCoreLinks(
  text: string,
  currentSymbol?: string,
): ReactNode {
  const segments = text.split(/(`[^`]*`)/g);
  const externalWordLinks: Record<string, string> = {
    Inversify: INVERSIFY_URL,
  };
  const plainWordNoLink = new Set(['Type']);

  return segments.flatMap((segment, segmentIndex) => {
    const isCode = segment.startsWith('`') && segment.endsWith('`');
    if (isCode) {
      const codeText = segment.slice(1, -1);
      const href = resolveSymbolDocumentationLink(codeText);

      if (href && codeText !== currentSymbol) {
        if (href.startsWith('http')) {
          return (
            <a
              key={`code-ext-${segmentIndex}`}
              className="codeInline"
              href={href}
              target="_blank"
              rel="noreferrer"
            >
              {codeText}
            </a>
          );
        }

        return (
          <Link
            key={`code-lnk-${segmentIndex}`}
            className="codeInline"
            href={href}
          >
            {codeText}
          </Link>
        );
      }

      return (
        <span key={`code-${segmentIndex}`} className="codeInline">
          {codeText}
        </span>
      );
    }

    const nodes: ReactNode[] = [];
    const identifierRe = /[A-Za-z_][A-Za-z0-9_]*/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = identifierRe.exec(segment)) !== null) {
      const [word] = match;
      const start = match.index;
      const end = start + word.length;

      if (start > lastIndex) {
        nodes.push(
          <span key={`txt-${segmentIndex}-${lastIndex}`}>
            {segment.slice(lastIndex, start)}
          </span>,
        );
      }

      const previousChar = start > 0 ? segment[start - 1] : '';
      const isMemberSegment = previousChar === '.';
      const externalHref = externalWordLinks[word];
      const href = resolveSymbolDocumentationLink(word);

      if (externalHref) {
        nodes.push(
          <a
            key={`ext-${segmentIndex}-${start}`}
            href={externalHref}
            target="_blank"
            rel="noreferrer"
          >
            {word}
          </a>,
        );
        lastIndex = end;
        continue;
      }

      if (
        word === currentSymbol ||
        !href ||
        isMemberSegment ||
        plainWordNoLink.has(word)
      ) {
        nodes.push(<span key={`txt-${segmentIndex}-${start}`}>{word}</span>);
      } else {
        nodes.push(
          <Link key={`lnk-${segmentIndex}-${start}`} href={href}>
            {word}
          </Link>,
        );
      }

      lastIndex = end;
    }

    if (lastIndex < segment.length) {
      nodes.push(
        <span key={`txt-${segmentIndex}-${lastIndex}`}>
          {segment.slice(lastIndex)}
        </span>,
      );
    }

    return nodes;
  });
}

function renderTypeWithLinks(type: string, currentSymbol?: string): ReactNode {
  const nodes: ReactNode[] = [];
  const identifierRe = /[A-Za-z_][A-Za-z0-9_]*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = identifierRe.exec(type)) !== null) {
    const [word] = match;
    const start = match.index;
    const end = start + word.length;

    if (start > lastIndex) {
      nodes.push(
        <span key={`type-txt-${lastIndex}`}>
          {type.slice(lastIndex, start)}
        </span>,
      );
    }

    const href = resolveSymbolDocumentationLink(word);
    if (href && word !== currentSymbol) {
      if (href.startsWith('http')) {
        nodes.push(
          <a
            key={`type-ext-${start}`}
            className="codeInline"
            href={href}
            target="_blank"
            rel="noreferrer"
          >
            {word}
          </a>,
        );
      } else {
        nodes.push(
          <Link key={`type-lnk-${start}`} className="codeInline" href={href}>
            {word}
          </Link>,
        );
      }
    } else {
      nodes.push(
        <span key={`type-word-${start}`} className="codeInline">
          {word}
        </span>,
      );
    }

    lastIndex = end;
  }

  if (lastIndex < type.length) {
    nodes.push(
      <span key={`type-txt-end-${lastIndex}`}>{type.slice(lastIndex)}</span>,
    );
  }

  return nodes;
}

const SYMBOL_DOCS: Record<string, SymbolDocumentation> = {
  ArrayIndexAccessor: {
    summary:
      'Array accessor implementation used by the index-value-accessor pipeline. It handles Array contexts, reads and writes values by numeric index (`array[index]`), reports whether an index has a value, and lists available indexes with `array.keys()`.',
    hideModuleDetail: true,
    exampleCode: dedent`
      import {
        InjectionContainer,
        RsXCoreInjectionTokens,
        RsXCoreModule,
        type IArrayIndexAccessor,
      } from '@rs-x/core';

      await InjectionContainer.load(RsXCoreModule);

      const arrayAccessor = InjectionContainer.get<IArrayIndexAccessor>(
        RsXCoreInjectionTokens.IArrayIndexAccessor,
      );

      const values = ['a', 'b', 'c'];
      const hasSecond = arrayAccessor.hasValue(values, 1);
      const second = arrayAccessor.getValue(values, 1);

      arrayAccessor.setValue(values, 1, 'beta');
      const indexes = [...arrayAccessor.getIndexes(values)];

      console.log(hasSecond); // true
      console.log(second); // b
      console.log(values); // ['a', 'beta', 'c']
      console.log(indexes); // [0, 1, 2]
    `,
  },
  PropertyValueAccessor: {
    summary:
      'Object-property accessor implementation used by the index-value-accessor pipeline. It handles plain object properties, excluding Date, Promise, and Observable property values so more specific accessors can handle those cases.',
    hideModuleDetail: true,
    exampleCode: dedent`
      import {
        InjectionContainer,
        RsXCoreInjectionTokens,
        RsXCoreModule,
        type IPropertyValueAccessor,
      } from '@rs-x/core';

      await InjectionContainer.load(RsXCoreModule);

      const accessor = InjectionContainer.get<IPropertyValueAccessor>(
        RsXCoreInjectionTokens.IPropertyValueAccessor,
      );

      const model = { name: undefined, count: 1, fn: () => 123 };

      console.log(accessor.hasValue(model, 'name')); // true (property exists)
      console.log(accessor.getValue(model, 'count')); // 1

      accessor.setValue(model, 'count', 2);
      console.log(model.count); // 2
      console.log([...accessor.getIndexes(model)]); // ['name', 'count']
    `,
  },
  MapKeyAccessor: {
    summary:
      'Map accessor implementation used by the index-value-accessor pipeline. It reads and writes values by map key and enumerates map keys.',
    hideModuleDetail: true,
    exampleCode: dedent`
      import {
        InjectionContainer,
        RsXCoreInjectionTokens,
        RsXCoreModule,
        type IMapKeyAccessor,
      } from '@rs-x/core';

      await InjectionContainer.load(RsXCoreModule);

      const accessor = InjectionContainer.get<IMapKeyAccessor>(
        RsXCoreInjectionTokens.IMapKeyAccessor,
      );

      const map = new Map<unknown, unknown>([['x', 10]]);

      console.log(accessor.hasValue(map, 'x')); // true
      console.log(accessor.getValue(map, 'x')); // 10

      accessor.setValue(map, 'x', 20);
      console.log(accessor.getValue(map, 'x')); // 20
      console.log([...accessor.getIndexes(map)]); // ['x']
    `,
  },
  SetKeyAccessor: {
    summary:
      'Set accessor implementation used by the index-value-accessor pipeline. It checks membership, reads matching items, and can replace one item with another.',
    hideModuleDetail: true,
    exampleCode: dedent`
      import {
        InjectionContainer,
        RsXCoreInjectionTokens,
        RsXCoreModule,
        type ISetKeyAccessor,
      } from '@rs-x/core';

      await InjectionContainer.load(RsXCoreModule);

      const accessor = InjectionContainer.get<ISetKeyAccessor>(
        RsXCoreInjectionTokens.ISetKeyAccessor,
      );

      const set = new Set<unknown>(['a', 'b']);

      console.log(accessor.hasValue(set, 'b')); // true
      console.log(accessor.getValue(set, 'b')); // 'b'

      accessor.setValue(set, 'b', 'beta');
      console.log(set.has('beta')); // true
      console.log([...accessor.getIndexes(set)]); // ['a', 'beta']
    `,
  },
  DatePropertyAccessor: {
    summary:
      'Date accessor implementation used by the index-value-accessor pipeline. It exposes a fixed set of Date parts (local and UTC variants) as named indexes and supports reading and updating those parts.',
    hideModuleDetail: true,
    exampleCode: dedent`
      import {
        type DateProperty,
        InjectionContainer,
        RsXCoreInjectionTokens,
        RsXCoreModule,
        type IDatePropertyAccessor,
      } from '@rs-x/core';

      await InjectionContainer.load(RsXCoreModule);

      const accessor = InjectionContainer.get<IDatePropertyAccessor>(
        RsXCoreInjectionTokens.IDatePropertyAccessor,
      );

      const date = new Date('2024-01-10T00:00:00.000Z');
      const property: DateProperty = 'utcYear';

      console.log(accessor.getValue(date, property)); // 2024
      accessor.setValue(date, property, 2025);
      console.log(accessor.getValue(date, property)); // 2025
      console.log(accessor.hasValue(date, property)); // true
    `,
  },
  GlobalIndexAccessor: {
    summary:
      'Global fallback accessor used by the index-value-accessor pipeline. It resolves keys from `globalThis` (for example `Math`, `Date`, `console`) when the context is `globalThis`.',
    hideModuleDetail: true,
    exampleCode: dedent`
      import {
        InjectionContainer,
        RsXCoreInjectionTokens,
        RsXCoreModule,
        type IGlobalIndexAccessor,
      } from '@rs-x/core';

      await InjectionContainer.load(RsXCoreModule);

      const accessor = InjectionContainer.get<IGlobalIndexAccessor>(
        RsXCoreInjectionTokens.IGlobalIndexAccessor,
      );

      console.log(accessor.hasValue(globalThis, 'Math')); // true
      const mathObj = accessor.getValue(globalThis, 'Math');
      console.log(typeof mathObj); // object
    `,
  },
  ObservableAccessor: {
    summary:
      'Observable accessor implementation used by the index-value-accessor pipeline. It returns raw observable values and can return the last resolved/emitted value through cache-backed resolved reads.',
    hideModuleDetail: true,
    exampleCode: dedent`
      import { BehaviorSubject } from 'rxjs';
      import {
        InjectionContainer,
        RsXCoreInjectionTokens,
        RsXCoreModule,
        type IObservableAccessor,
      } from '@rs-x/core';

      await InjectionContainer.load(RsXCoreModule);

      const accessor = InjectionContainer.get<IObservableAccessor>(
        RsXCoreInjectionTokens.IObservableAccessor,
      );

      const model = { stream: new BehaviorSubject<number>(10) };

      console.log(accessor.getValue(model, 'stream') instanceof BehaviorSubject); // true
      console.log(accessor.getResolvedValue(model, 'stream')); // 10

      accessor.setValue(model, 'stream', 11);
      console.log(accessor.getResolvedValue(model, 'stream')); // 11
    `,
  },
  PromiseAccessor: {
    summary:
      'Promise accessor implementation used by the index-value-accessor pipeline. It returns raw Promise values and exposes resolved values through cache-backed resolved reads.',
    hideModuleDetail: true,
    exampleCode: dedent`
      import {
        InjectionContainer,
        PENDING,
        RsXCoreInjectionTokens,
        RsXCoreModule,
        type IPromiseAccessor,
      } from '@rs-x/core';

      await InjectionContainer.load(RsXCoreModule);

      const accessor = InjectionContainer.get<IPromiseAccessor>(
        RsXCoreInjectionTokens.IPromiseAccessor,
      );

      const task = Promise.resolve(42);
      const model = { task };

      console.log(accessor.getResolvedValue(model, 'task') === PENDING); // true
      accessor.setLastValue(task, 42);
      console.log(accessor.getResolvedValue(model, 'task')); // 42
      accessor.clearLastValue(task);
    `,
  },
  MethodAccessor: {
    summary:
      'Method-call accessor implementation used by the index-value-accessor pipeline. It reads cached method-call results by function-call index; it does not execute methods directly.',
    hideModuleDetail: true,
    exampleCode: dedent`
      import {
        InjectionContainer,
        RsXCoreInjectionTokens,
        RsXCoreModule,
        type IFunctionCallIndexFactory,
        type IFunctionCallResultCache,
        type IMethodAccessor,
      } from '@rs-x/core';

      await InjectionContainer.load(RsXCoreModule);

      const accessor = InjectionContainer.get<IMethodAccessor>(
        RsXCoreInjectionTokens.IMethodAccessor,
      );
      const indexFactory = InjectionContainer.get<IFunctionCallIndexFactory>(
        RsXCoreInjectionTokens.IFunctionCallIndexFactory,
      );
      const resultCache = InjectionContainer.get<IFunctionCallResultCache>(
        RsXCoreInjectionTokens.IFunctionCallResultCache,
      );

      const context = { sum: (a: number, b: number) => a + b };
      const index = indexFactory.create({
        context,
        functionName: 'sum',
        arguments: [1, 2],
      });

      const entry = resultCache.create(context, {
        functionName: 'sum',
        arguments: [1, 2],
        result: 3,
      });

      console.log(accessor.applies(context, index)); // true
      console.log(accessor.hasValue(context, index)); // true
      console.log(accessor.getValue(context, index)); // 3

      entry.dispose();
      index.dispose();
    `,
  },
  IndexValueAccessor: {
    summary:
      'Composite accessor service that selects the first matching accessor strategy (by priority) and delegates all read/write operations to that strategy.',
    hideModuleDetail: true,
    exampleCode: dedent`
      import {
        InjectionContainer,
        RsXCoreInjectionTokens,
        RsXCoreModule,
        type IIndexValueAccessor,
      } from '@rs-x/core';

      await InjectionContainer.load(RsXCoreModule);

      const accessor = InjectionContainer.get<IIndexValueAccessor>(
        RsXCoreInjectionTokens.IIndexValueAccessor,
      );

      const model = {
        user: { name: 'Ada' },
        list: [10, 20, 30],
        map: new Map([['x', 99]]),
      };

      console.log(accessor.getValue(model.user, 'name')); // Ada
      console.log(accessor.getValue(model.list, 1)); // 20
      console.log(accessor.getValue(model.map, 'x')); // 99
    `,
  },
  IIndexValueAccessor: {
    summary:
      'Accessor service for reading or writing values by context and index.',
    hideModuleDetail: true,
  },
  IArrayIndexAccessor: {
    summary:
      'Type alias for an accessor that reads and writes array items by index.',
    hideModuleDetail: true,
  },
  IPropertyValueAccessor: {
    summary:
      'Type alias for an accessor that reads and writes object properties by key.',
    hideModuleDetail: true,
  },
  IMapKeyAccessor: {
    summary:
      'Type alias for an accessor that reads and writes Map values by key.',
    hideModuleDetail: true,
  },
  ISetKeyAccessor: {
    summary:
      'Type alias for an accessor that checks Set membership and accesses Set items.',
    hideModuleDetail: true,
  },
  IMethodAccessor: {
    summary:
      'Type alias for an accessor that reads and writes method-call results by function-call index.',
    hideModuleDetail: true,
  },
  IDatePropertyAccessor: {
    summary:
      'Type alias for an accessor that reads and writes Date values by DateProperty keys.',
    hideModuleDetail: true,
  },
  IGlobalIndexAccessor: {
    summary:
      'Type alias for an accessor that reads and writes values on globalThis.',
    hideModuleDetail: true,
  },
  IObservableAccessor: {
    summary: 'Accessor service for reading resolved values from observables.',
    hideModuleDetail: true,
  },
  IPromiseAccessor: {
    summary: 'Accessor service for reading resolved values from promises.',
    hideModuleDetail: true,
  },
  IResolvedValueCache: {
    summary:
      'Interface for cache operations that store and retrieve resolved values for async sources.',
    hideModuleDetail: true,
  },
  PENDING: {
    hideModuleDetail: true,
  },
  BindMethod: {
    summary:
      'Type alias for the DI bind function signature. It takes a `ServiceIdentifier<T>` and returns Inversify `BindToFluentSyntax<T>` for fluent binding configuration.',
    hideModuleDetail: true,
    fullSignature: dedent`
      export type BindMethod = <T>(
        serviceIdentifier: ServiceIdentifier<T>,
      ) => BindToFluentSyntax<T>;
    `,
  },
  overrideMultiInjectServices: {
    summary:
      'Replaces the registered implementation list for a multi-inject token. Use it when you want to change default strategy order at runtime.',
    parameters: [
      {
        name: 'container',
        type: 'Container | ContainerModuleLoadOptions',
        description:
          'DI container (or module load context) where multi-inject bindings should be replaced.',
      },
      {
        name: 'multiInjectToken',
        type: 'symbol',
        description:
          'Multi-inject list token whose current bindings should be overridden.',
      },
      {
        name: 'services',
        type: 'readonly IMultiInjectService[]',
        description:
          'New ordered service list. Earlier items are resolved first.',
      },
    ],
    returns: 'void',
    notes:
      'Use during module/bootstrap setup when you need to replace the default strategy list (for example deep-clone or accessor order) with your own ordered implementation set.',
    fullSignature: dedent`
      export function overrideMultiInjectServices(
        container: Container | ContainerModuleLoadOptions,
        multiInjectToken: symbol,
        services: readonly IMultiInjectService[],
      ): void;
    `,
    exampleCode: dedent`
      import {
        InjectionContainer,
        overrideMultiInjectServices,
        RsXCoreInjectionTokens,
        type IMultiInjectService,
      } from '@rs-x/core';

      const customList: IMultiInjectService[] = [
        { target: MyStrategy, token: Symbol('MyStrategy') },
      ];

      overrideMultiInjectServices(
        InjectionContainer,
        RsXCoreInjectionTokens.IDeepCloneList,
        customList,
      );
    `,
  },
  registerMultiInjectService: {
    summary:
      'Registers one class in the container, adds it to the multi-injection list identified by `multiInjectToken`, and optionally binds it under a separate service token.',
    hideModuleDetail: true,
    fullSignature: dedent`
      export function registerMultiInjectService(
        container: Container | ContainerModuleLoadOptions,
        target: Newable<unknown>,
        options: IMultiInjectTokens,
      ): void;
    `,
    parameters: [
      {
        name: 'container',
        type: 'Container | ContainerModuleLoadOptions',
        description:
          'DI container (or module load context) where the service should be registered.',
      },
      {
        name: 'target',
        type: 'Newable<unknown>',
        description: 'Concrete class constructor to bind in singleton scope.',
      },
      {
        name: 'options',
        type: 'IMultiInjectTokens',
        description:
          'Token configuration containing required multiInjectToken and optional serviceToken alias.',
      },
    ],
    returns: 'void',
    exampleCode: dedent`
      import {
        InjectionContainer,
        RsXCoreInjectionTokens,
        registerMultiInjectService,
        type IMultiInjectTokens,
        type IDeepClone,
      } from '@rs-x/core';

      const options: IMultiInjectTokens = {
        multiInjectToken: RsXCoreInjectionTokens.IDeepCloneList,
        serviceToken: Symbol.for('MyDomainDeepClone'),
      };

      registerMultiInjectService(InjectionContainer, MyDomainDeepClone, options);

      // resolve directly via serviceToken
      const direct = InjectionContainer.get<IDeepClone>(options.serviceToken as symbol);

      // resolve from the list token
      const list = InjectionContainer.getAll<IDeepClone>(options.multiInjectToken);
      console.log(direct, list.length);
    `,
  },
  registerMultiInjectServices: {
    summary:
      'Accepts an array of IMultiInjectService entries and registers them as one multi-injected list under `multiInjectToken` (injectable as an array). Each entry also maps `token` to `target`, so the same service can be resolved individually.',
    hideModuleDetail: true,
    fullSignature: dedent`
      export function registerMultiInjectServices(
        container: Container | ContainerModuleLoadOptions,
        multiInjectToken: symbol,
        services: readonly IMultiInjectService[],
      ): void;
    `,
    parameters: [
      {
        name: 'container',
        type: 'Container | ContainerModuleLoadOptions',
        description:
          'DI container (or module load context) where services should be registered.',
      },
      {
        name: 'multiInjectToken',
        type: 'symbol',
        description: 'Multi-inject list token that receives the services.',
      },
      {
        name: 'services',
        type: 'readonly IMultiInjectService[]',
        description:
          'Ordered list of service descriptors. This list is what gets injected as a single array through the multiInjectToken.',
      },
    ],
    returns: 'void',
    exampleCode: dedent`
      import {
        InjectionContainer,
        RsXCoreInjectionTokens,
        registerMultiInjectServices,
        type IDeepClone,
        type IMultiInjectService,
      } from '@rs-x/core';

      const services: IMultiInjectService[] = [
        { target: MyDomainDeepClone, token: Symbol.for('MyDomainDeepClone') },
        { target: MyFallbackDeepClone, token: Symbol.for('MyFallbackDeepClone') },
      ];

      registerMultiInjectServices(
        InjectionContainer,
        RsXCoreInjectionTokens.IDeepCloneList,
        services,
      );

      // injected as array by multiInject token
      const list = InjectionContainer.getAll<IDeepClone>(
        RsXCoreInjectionTokens.IDeepCloneList,
      );

      // each entry can also be resolved by its own token
      const first = InjectionContainer.get<IDeepClone>(services[0].token);
      console.log(list.length, first);
    `,
  },
  IMultiInjectService: {
    summary:
      'Represents one service in a multi-inject list: `target` is the concrete class, and `token` is the alias used to resolve that class.',
    hideModuleDetail: true,
    fullSignature: dedent`
      export interface IMultiInjectService {
        target: Newable<unknown>;
        token: symbol;
      }
    `,
    parameters: [
      {
        name: 'target',
        type: 'Newable<unknown>',
        description: 'Concrete class constructor to bind in the container.',
      },
      {
        name: 'token',
        type: 'symbol',
        description: 'Service token alias resolved via toService(target).',
      },
    ],
    returns: 'Type contract only.',
    exampleCode: dedent`
      import type { IMultiInjectService } from '@rs-x/core';

      const service: IMultiInjectService = {
        target: MyHandler,
        token: Symbol.for('IHandler'),
      };
    `,
  },
  IMultiInjectTokens: {
    summary:
      'Token configuration consumed by `registerMultiInjectService`. The function adds the class to the multi-injection list identified by `multiInjectToken`. If `serviceToken` is provided, the function also binds direct resolution by that token.',
    fullSignature: dedent`
      export interface IMultiInjectTokens {
        serviceToken?: symbol;
        multiInjectToken: symbol;
      }
    `,
    parameters: [
      {
        name: 'multiInjectToken',
        type: 'symbol',
        description: 'Required token that identifies the multi-injection list.',
      },
      {
        name: 'serviceToken?',
        type: 'symbol',
        description:
          'Optional token that registerMultiInjectService uses to bind direct resolution for the same class. If omitted, only the list binding is created.',
      },
    ],
    returns: 'Type contract only.',
    exampleCode: dedent`
      import type { IMultiInjectTokens } from '@rs-x/core';

      const tokens: IMultiInjectTokens = {
        multiInjectToken: Symbol.for('IHandlerList'),
        serviceToken: Symbol.for('IHandler'),
      };
    `,
  },
  IError: {
    summary:
      'Interface that defines one error record: message, context, optional code/exception/data, and fatal flag.',
    hideModuleDetail: true,
  },
  IErrorLog: {
    summary:
      'Describes how errors are handled: subscribe to the `error` stream, add new error entries, and clear existing log output.',
    hideModuleDetail: true,
  },
  Assertion: {
    summary:
      'Static assertion helper for runtime validation. Use its static methods directly; do not instantiate this class.',
    hideModuleDetail: true,
    exampleCode: dedent`
      import { Assertion } from '@rs-x/core';

      Assertion.assert(() => user.id > 0, 'user.id must be > 0');
      Assertion.assertNotNullOrUndefined(user.name, 'user.name');
      Assertion.assertIsFunction(handler, 'handler');
    `,
  },
  printValue: {
    summary: 'Converts a value to readable text and logs it to the console.',
    hideModuleDetail: true,
    parameters: [
      {
        name: 'value',
        type: 'unknown',
        description: 'Value to format and print.',
      },
    ],
    returns: 'void',
    notes:
      'Uses `PrettyPrinter` internally so complex objects, arrays, and nested structures are printed in a readable format.',
  },
  InjectionContainer: {
    summary: 'Global shared Inversify container used by all rs-x packages.',
    notes: 'Load required modules before resolving services.',
    exampleCode: dedent`
      import { InjectionContainer } from '@rs-x/core';
      import { RsXExpressionParserModule } from '@rs-x/expression-parser';

      await InjectionContainer.load(RsXExpressionParserModule);
    `,
  },
  GuidFactory: {
    summary:
      'Default implementation of `IGuidFactory` that creates UUID strings via `crypto.randomUUID()`.',
    hideModuleDetail: true,
    exampleCode: dedent`
      import {
        InjectionContainer,
        RsXCoreInjectionTokens,
        RsXCoreModule,
        type IGuidFactory,
      } from '@rs-x/core';

      await InjectionContainer.load(RsXCoreModule);

      const guidFactory = InjectionContainer.get<IGuidFactory>(
        RsXCoreInjectionTokens.IGuidFactory,
      );

      const id1 = guidFactory.create();
      const id2 = guidFactory.create();
      console.log(id1, id2);
    `,
    constructorInjectionExampleCode: dedent`
      import { Inject, RsXCoreInjectionTokens, type IGuidFactory } from '@rs-x/core';

      class EntityService {
        constructor(
          @Inject(RsXCoreInjectionTokens.IGuidFactory)
          private readonly guidFactory: IGuidFactory,
        ) {}

        createEntity(name: string) {
          return { id: this.guidFactory.create(), name };
        }
      }
    `,
  },
  IKeyedInstanceFactory: {
    summary:
      'Contract defining the public members for a keyed instance factory.',
    hideModuleDetail: true,
    notes:
      '`create(...)` increases the reference count for that key, and `release(...)` decreases it. When the count reaches zero, the instance is removed.',
  },
  KeyedInstanceFactory: {
    summary:
      'Base class for key-scoped singleton lifecycle management (`create`/`release` with reference counting).',
    hideModuleDetail: true,
    notes:
      'This class keeps a reference count for each singleton key. `create(...)` increases the count, and `release(...)` decreases it. When the count reaches 0, the instance is released. It is important that every successful `create(...)` call has a matching `release(...)` call to prevent memory leaks.',
    exampleCode: dedent`
      import { KeyedInstanceFactory } from '@rs-x/core';

      type UserData = { id: string; name: string };

      class MyKeyedInstanceFactory extends KeyedInstanceFactory<string, UserData, UserData, UserData> {
        public getId(data: UserData): string | undefined {
          return data.id;
        }

        protected createId(data: UserData): string {
          return data.id;
        }

        protected createInstance(data: UserData): UserData {
          return { ...data };
        }
      }

      const factory = new MyKeyedInstanceFactory();

      // First create: referenceCount = 1
      const first = factory.create({ id: 'u1', name: 'Ada' });
      console.log(first.id, first.referenceCount); // u1 1

      // Same key: same singleton instance, referenceCount = 2
      const second = factory.create({ id: 'u1', name: 'Ada' });
      console.log(second.id, second.referenceCount); // u1 2

      // Must be matched with release calls
      factory.release('u1');
      factory.release('u1');
    `,
  },
  GroupedKeyedInstanceFactory: {
    summary:
      'Base class for grouped keyed instances where ids are generated per group/member combination.',
    hideModuleDetail: true,
    notes:
      'Use this when your key is derived from a group + member identity (for example room + user). Each successful `create(...)` call must be matched with `release(id)` to prevent memory leaks.',
    exampleCode: dedent`
      import { GroupedKeyedInstanceFactory } from '@rs-x/core';

      type ChatSubscriptionData = {
        roomId: string;
        userId: string;
      };

      class ChatSubscription {
        constructor(
          public readonly roomId: string,
          public readonly userId: string,
        ) {}

        public dispose(): void {
          // teardown logic (unsubscribe/close/etc.)
        }
      }

      class ChatSubscriptionFactory extends GroupedKeyedInstanceFactory<
        string,
        ChatSubscriptionData,
        ChatSubscription
      > {
        protected getGroupId(data: ChatSubscriptionData): unknown {
          return data.roomId;
        }

        protected getGroupMemberId(data: ChatSubscriptionData): unknown {
          return data.userId;
        }

        protected createUniqueId(data: ChatSubscriptionData): string {
          return \`\${data.roomId}:\${data.userId}\`;
        }

        protected createInstance(data: ChatSubscriptionData): ChatSubscription {
          return new ChatSubscription(data.roomId, data.userId);
        }

        protected override releaseInstance(instance: ChatSubscription): void {
          instance.dispose();
        }
      }

      const factory = new ChatSubscriptionFactory();

      const first = factory.create({ roomId: 'room-1', userId: 'u-42' });
      const second = factory.create({ roomId: 'room-1', userId: 'u-42' });

      console.log(first.id === second.id); // true
      console.log(second.referenceCount); // 2

      factory.release(first.id);
      factory.release(first.id);
    `,
  },
  ISequenceIdFactory: {
    summary:
      'Service for creating, reusing, and releasing sequence-id handles for a context + sequence input.',
    hideModuleDetail: true,
    exampleCode: dedent`
      import {
        InjectionContainer,
        RsXCoreInjectionTokens,
        RsXCoreModule,
        type ISequenceIdFactory,
      } from '@rs-x/core';

      await InjectionContainer.load(RsXCoreModule);

      const sequenceIdFactory = InjectionContainer.get<ISequenceIdFactory>(
        RsXCoreInjectionTokens.ISequenceIdFactory,
      );

      const context = {};
      const sequence = ['user', 'profile', 'name'];

      const handle = sequenceIdFactory.create(context, sequence);
      console.log(handle.id);

      const existing = sequenceIdFactory.get(context, sequence);
      console.log(existing?.id === handle.id); // true

      // Always release/dispose when finished to prevent memory leaks.
      handle.dispose();
      // equivalent:
      // sequenceIdFactory.release(context, handle.id);
    `,
    constructorInjectionExampleCode: dedent`
      import {
        Inject,
        RsXCoreInjectionTokens,
        type ISequenceIdFactory,
      } from '@rs-x/core';

      class SequenceConsumer {
        constructor(
          @Inject(RsXCoreInjectionTokens.ISequenceIdFactory)
          private readonly sequenceIdFactory: ISequenceIdFactory,
        ) {}

        track(context: object, sequence: unknown[]): string {
          const handle = this.sequenceIdFactory.create(context, sequence);
          try {
            return handle.id;
          } finally {
            // Always dispose/release when finished to prevent memory leaks.
            handle.dispose();
          }
        }
      }
    `,
    notes:
      'Always call `dispose()` on handles returned from `create()` (or call `release(context, id)`) when finished, to prevent memory leaks.',
  },
  SequenceIdFactory: {
    summary:
      'Default singleton service that returns the same id for matching sequence payloads within a context, reuses existing handles, and tracks reference counts.',
    hideModuleDetail: true,
    exampleCode: dedent`
      import {
        InjectionContainer,
        RsXCoreInjectionTokens,
        RsXCoreModule,
        type ISequenceIdFactory,
      } from '@rs-x/core';

      await InjectionContainer.load(RsXCoreModule);

      const sequenceIdFactory = InjectionContainer.get<ISequenceIdFactory>(
        RsXCoreInjectionTokens.ISequenceIdFactory,
      );

      const context = {};
      const handle = sequenceIdFactory.create(context, ['items', 0]);

      console.log(handle.id);
      handle.dispose(); // Always dispose the handle after use.
    `,
    constructorInjectionExampleCode: dedent`
      import {
        Inject,
        RsXCoreInjectionTokens,
        type ISequenceIdFactory,
      } from '@rs-x/core';

      class SequenceService {
        constructor(
          @Inject(RsXCoreInjectionTokens.ISequenceIdFactory)
          private readonly sequenceIdFactory: ISequenceIdFactory,
        ) {}
      }
    `,
    notes:
      'Use when you need the same id for the same sequence in the same context object. `SequenceIdFactory` maps (context + sequence) to one id handle, so repeated calls with identical input return the same handle/id. After `create(...)`, always call `dispose()` (or `release(context, id)`) when finished to prevent memory leaks.',
  },
  FunctionCallIndexFactory: {
    summary:
      'Factory service that creates and reuses function-call index objects from context, function name, and arguments.',
    hideModuleDetail: true,
    fullSignature: dedent`
      @Injectable()
      export class FunctionCallIndexFactory extends KeyedInstanceFactory<
        IISequenceWithIdData,
        IFunctionCallIndexData,
        IDisposableFunctionCallIndex
      > {
        constructor(
          @Inject(RsXCoreInjectionTokens.ISequenceIdFactory)
          private readonly _sequenceIdFactory: ISequenceIdFactory,
        );
      }
    `,
    exampleCode: dedent`
      import {
        InjectionContainer,
        RsXCoreInjectionTokens,
        RsXCoreModule,
        type IFunctionCallIndexFactory,
      } from '@rs-x/core';

      await InjectionContainer.load(RsXCoreModule);

      const factory = InjectionContainer.get<IFunctionCallIndexFactory>(
        RsXCoreInjectionTokens.IFunctionCallIndexFactory,
      );

      const context = {
        sum(a: number, b: number) {
          return a + b;
        },
      };

      const callIndex = factory.create({
        context,
        functionName: 'sum',
        arguments: [1, 2],
      });

      console.log(callIndex.id);
      callIndex.dispose();
    `,
    constructorInjectionExampleCode: dedent`
      import {
        Inject,
        RsXCoreInjectionTokens,
        type IFunctionCallIndexFactory,
      } from '@rs-x/core';

      class IndexConsumer {
        constructor(
          @Inject(RsXCoreInjectionTokens.IFunctionCallIndexFactory)
          private readonly functionCallIndexFactory: IFunctionCallIndexFactory,
        ) {}
      }
    `,
    notes:
      'Base class: `KeyedInstanceFactory<IISequenceWithIdData, IFunctionCallIndexData, IDisposableFunctionCallIndex>`.',
  },
  FunctionCallResultCache: {
    summary:
      'Cache utility service for function-call results. Entries are keyed by context object and function-call identity (function name + arguments). When you create a cache entry, call `dispose()` on that entry when finished, to release references and prevent memory leaks.',
    hideModuleDetail: true,
    exampleCode: dedent`
      import {
        InjectionContainer,
        RsXCoreInjectionTokens,
        RsXCoreModule,
        type IFunctionCallResultCache,
        type IFunctionCallIndexFactory,
      } from '@rs-x/core';

      await InjectionContainer.load(RsXCoreModule);

      const cache = InjectionContainer.get<IFunctionCallResultCache>(
        RsXCoreInjectionTokens.IFunctionCallResultCache,
      );
      const indexFactory = InjectionContainer.get<IFunctionCallIndexFactory>(
        RsXCoreInjectionTokens.IFunctionCallIndexFactory,
      );

      const context = {
        sum(a: number, b: number) {
          return a + b;
        },
      };

      // Build call identity (function name + arguments)
      const callIndex = indexFactory.create({
        context,
        functionName: 'sum',
        arguments: [2, 3],
      }).instance;

      // Cache computed result
      const entry = cache.create(context, {
        functionName: 'sum',
        arguments: [2, 3],
        result: 5,
      });

      // Later: read from cache
      if (cache.has(context, callIndex)) {
        const cached = cache.get(context, callIndex);
        console.log(cached?.result); // 5
      }

      // Important: release cache-entry references when done
      entry.dispose();
      callIndex.dispose();
    `,
    constructorInjectionExampleCode: dedent`
      import {
        Inject,
        RsXCoreInjectionTokens,
        type IFunctionCallResultCache,
      } from '@rs-x/core';

      class SumService {
        constructor(
          @Inject(RsXCoreInjectionTokens.IFunctionCallResultCache)
          private readonly resultCache: IFunctionCallResultCache,
        ) {}
      }
    `,
  },
  DeepCloneValueExcept: {
    summary:
      'Transforms special values into clone-safe values during deep clone.',
    fullSignature: dedent`
      export class DeepCloneValueExcept implements IDeepCloneExcept {
        constructor(
          @Inject(RsXCoreInjectionTokens.IResolvedValueCache)
          private readonly _resolvedValueCache: IResolvedValueCache,
        );
        except(source: unknown): unknown;
      }
    `,
    parameters: [
      {
        name: 'source',
        type: 'unknown',
        description: 'Current value inspected by cloneDeepWith customizer.',
      },
    ],
    returns:
      'unknown. Return undefined to continue normal deep clone. Return a concrete value to override clone output for that node.',
    notes:
      'This is the default implementation behind the IDeepCloneExcept contract. LodashDeepClone calls except(...) while traversing values and uses the returned value when special clone handling is needed. For Promise and Observable nodes, this strategy reads IResolvedValueCache and substitutes the latest resolved value, or the PENDING sentinel when no resolved value is available yet. Resolve it through the container-managed IDeepCloneExcept flow so its injected dependencies stay aligned with runtime configuration.',
    exampleCode: dedent`
      import {
        InjectionContainer,
        Inject,
        RsXCoreInjectionTokens,
        type IDeepClone,
        type IDeepCloneExcept,
        type IResolvedValueCache,
      } from '@rs-x/core';

      // Default behavior used by LodashDeepClone:
      // Promise/Observable -> resolved cache value (or PENDING)
      const cloneExcept = InjectionContainer.get<IDeepCloneExcept>(
        RsXCoreInjectionTokens.DefaultDeepCloneExcept,
      );

      // Example: manually inspect what except() returns for an async source.
      const cache = InjectionContainer.get<IResolvedValueCache>(
        RsXCoreInjectionTokens.IResolvedValueCache,
      );
      const promise = Promise.resolve(42);
      cache.set(promise, 42);
      const replaced = cloneExcept.except(promise); // 42

      // Deep clone service automatically applies this strategy.
      const deepClone = InjectionContainer.get<IDeepClone>(
        RsXCoreInjectionTokens.IDeepClone,
      );
      const cloned = deepClone.clone({ asyncValue: promise });
      console.log(replaced, cloned);
    `,
    constructorInjectionExampleCode: dedent`
      import {
        Inject,
        RsXCoreInjectionTokens,
        type IDeepCloneExcept,
      } from '@rs-x/core';

      class CloneConsumer {
        constructor(
          @Inject(RsXCoreInjectionTokens.DefaultDeepCloneExcept)
          private readonly cloneExceptByDi: IDeepCloneExcept,
        ) {}
      }
    `,
  },
  IDeepClone: {
    summary: 'Contract for services that create deep copies of values.',
    notes:
      'This interface defines the deep-clone boundary used across rs-x. Implementations receive a source value and return a deeply copied result. Resolve the active implementation through RsXCoreInjectionTokens.IDeepClone so callers use the configured clone strategy rather than depending on a specific implementation.',
    hideModuleDetail: true,
  },
  DefaultDeepClone: {
    summary: 'Selects and runs deep-clone strategies in priority order.',
    notes:
      'This is the default implementation behind the IDeepClone service. By default, it tries StructuredDeepClone first and then LodashDeepClone as fallback. For each input value, it executes the configured IDeepClone strategy list in descending priority order and calls clone(source) on each strategy. The first successful strategy result is returned; if one throws or cannot handle the value, the next strategy is tried. Resolve the default clone service via RsXCoreInjectionTokens.IDeepClone. There is no dedicated RsXCoreInjectionTokens.DefaultDeepClone token.',
    exampleCode: dedent`
      import {
        InjectionContainer,
        RsXCoreInjectionTokens,
        type IDeepClone,
      } from '@rs-x/core';

      // Resolve via container.
      const deepClone = InjectionContainer.get<IDeepClone>(
        RsXCoreInjectionTokens.IDeepClone,
      );

      const cloned = deepClone.clone({ a: 1, b: { c: 2 } });
      console.log(cloned);
    `,
    constructorInjectionExampleCode: dedent`
      import { Inject, RsXCoreInjectionTokens, type IDeepClone } from '@rs-x/core';

      class CloneConsumer {
        constructor(
          @Inject(RsXCoreInjectionTokens.IDeepClone)
          private readonly deepCloneByDi: IDeepClone,
        ) {}
      }
    `,
  },
  LodashDeepClone: {
    summary: 'Clones values with Lodash and rs-x clone-exception handling.',
    notes:
      'This implementation uses Lodash to clone values and calls the clone-exception service when a value needs runtime-specific handling. That allows rs-x to replace values such as Promise or Observable nodes during the clone process. Use RsXCoreInjectionTokens.ILodashDeepClone when you explicitly want this implementation. Use RsXCoreInjectionTokens.IDeepClone when you want the currently configured default clone service.',
    exampleCode: dedent`
      import {
        InjectionContainer,
        RsXCoreInjectionTokens,
        type IDeepClone,
      } from '@rs-x/core';

      // Resolve via container.
      const lodashDeepClone = InjectionContainer.get<IDeepClone>(
        RsXCoreInjectionTokens.ILodashDeepClone,
      );

      const cloned = lodashDeepClone.clone({ a: 1, nested: { b: 2 } });
      console.log(cloned);
    `,
    constructorInjectionExampleCode: dedent`
      import { Inject, RsXCoreInjectionTokens, type IDeepClone } from '@rs-x/core';

      class CloneConsumer {
        constructor(
          @Inject(RsXCoreInjectionTokens.ILodashDeepClone)
          private readonly lodashDeepCloneByDi: IDeepClone,
        ) {}
      }
    `,
  },
  StructuredDeepClone: {
    summary: 'Clones values with the platform structured clone behavior.',
    notes:
      'This implementation delegates to the platform structured clone behavior and is useful when you want a direct structuredClone-style copy without Lodash traversal. Use RsXCoreInjectionTokens.IStructuredDeepClone when you explicitly want this implementation. Use RsXCoreInjectionTokens.IDeepClone when you want the currently configured default clone service.',
    exampleCode: dedent`
      import {
        InjectionContainer,
        RsXCoreInjectionTokens,
        type IDeepClone,
      } from '@rs-x/core';

      // Resolve via container.
      const structuredDeepClone = InjectionContainer.get<IDeepClone>(
        RsXCoreInjectionTokens.IStructuredDeepClone,
      );

      const cloned = structuredDeepClone.clone({ a: 1, nested: { b: 2 } });
      console.log(cloned);
    `,
    constructorInjectionExampleCode: dedent`
      import { Inject, RsXCoreInjectionTokens, type IDeepClone } from '@rs-x/core';

      class CloneConsumer {
        constructor(
          @Inject(RsXCoreInjectionTokens.IStructuredDeepClone)
          private readonly structuredDeepCloneByDi: IDeepClone,
        ) {}
      }
    `,
  },
  defaultDeepCloneList: {
    summary:
      'Default ordered `IMultiInjectService[]` used to register deep-clone implementations for `RsXCoreInjectionTokens.IDeepCloneList`.',
    hideModuleDetail: true,
  },
  defaultIndexValueAccessorList: {
    summary:
      'Default ordered `IMultiInjectService[]` used to register index-value accessor implementations for `RsXCoreInjectionTokens.IIndexValueAccessorList`.',
    hideModuleDetail: true,
  },
  defaultValueMetadataList: {
    summary:
      'Default ordered `IMultiInjectService[]` used to register value-metadata implementations for `RsXCoreInjectionTokens.IValueMetadataList`.',
    hideModuleDetail: true,
  },
  IValueMetadata: {
    summary:
      'Service contract used by value metadata implementations to classify runtime values and report async/proxy behavior.',
    hideModuleDetail: true,
    notes:
      'Implementations define `applies(value)` to select supported value types, then provide `isAsync(value)` and `needsProxy(value)` semantics used by runtime services.',
  },
  ValueMetadata: {
    summary:
      'The ValueMetadata service provides information about how rs-x should handle a value type at runtime: whether it should be proxied and whether it is async.',
    hideModuleDetail: true,
    notes:
      'This service receives `IValueMetadataList`, sorts by descending priority, then selects the first implementation where `applies(value)` is true.',
    exampleCode: dedent`
      import {
        InjectionContainer,
        RsXCoreInjectionTokens,
        RsXCoreModule,
        type IValueMetadata,
      } from '@rs-x/core';

      await InjectionContainer.load(RsXCoreModule);

      const valueMetadata = InjectionContainer.get<IValueMetadata>(
        RsXCoreInjectionTokens.IValueMetadata,
      );

      console.log(valueMetadata.isAsync(Promise.resolve(1))); // true
      console.log(valueMetadata.needsProxy(new Map())); // true
      console.log(valueMetadata.needsProxy(42)); // false (fallback metadata)
    `,
  },
  ArrayMetadata: {
    summary: 'Metadata implementation for Array values.',
    hideModuleDetail: true,
  },
  DateMetadata: {
    summary: 'Metadata implementation for Date values.',
    hideModuleDetail: true,
  },
  MapMetadata: {
    summary: 'Metadata implementation for Map values.',
    hideModuleDetail: true,
  },
  SetMetadata: {
    summary: 'Metadata implementation for Set values.',
    hideModuleDetail: true,
  },
  ObservableMetadata: {
    summary: 'Metadata implementation for Observable values.',
    hideModuleDetail: true,
  },
  PromiseMetadata: {
    summary: 'Metadata implementation for Promise values.',
    hideModuleDetail: true,
  },
  DummyMetadata: {
    summary:
      'Fallback metadata implementation that applies when no specialized metadata matches.',
    hideModuleDetail: true,
  },
  IProxyRegistry: {
    summary:
      'Stores mappings between original objects and proxies, and lets you look up either one from the other.',
    hideModuleDetail: true,
    exampleCode: dedent`
      import type { IProxyRegistry } from '@rs-x/core';

      function isWrapped(registry: IProxyRegistry, value: unknown): boolean {
        return registry.isProxy(value);
      }
    `,
  },
  ProxyRegistry: {
    summary: 'Default singleton in-memory implementation of `IProxyRegistry`.',
    hideModuleDetail: true,
    notes:
      '`register(target, proxy)` adds or replaces a mapping. `getProxy(target)` reads the proxy for a target. `getProxyTarget(proxy)` finds the original target for a proxy. `isProxy(value)` checks whether a value is a registered proxy. `unregister(target)` removes the mapping. This registry is memory-only (not persisted).',
    exampleCode: dedent`
      import {
        InjectionContainer,
        RsXCoreInjectionTokens,
        RsXCoreModule,
        type IProxyRegistry,
      } from '@rs-x/core';

      await InjectionContainer.load(RsXCoreModule);

      const proxyRegistry = InjectionContainer.get<IProxyRegistry>(
        RsXCoreInjectionTokens.IProxyRegistry,
      );

      const target = { id: 1 };
      const proxy = new Proxy(target, {});

      proxyRegistry.register(target, proxy);

      console.log(proxyRegistry.getProxy(target) === proxy); // true
      console.log(proxyRegistry.getProxyTarget(proxy) === target); // true
      console.log(proxyRegistry.isProxy(proxy)); // true

      proxyRegistry.unregister(target);
    `,
    constructorInjectionExampleCode: dedent`
      import { Inject, RsXCoreInjectionTokens, type IProxyRegistry } from '@rs-x/core';

      class ProxyAwareService {
        constructor(
          @Inject(RsXCoreInjectionTokens.IProxyRegistry)
          private readonly proxyRegistry: IProxyRegistry,
        ) {}
      }
    `,
  },
  IObjectStorage: {
    summary:
      'Contract for key/value persistence: `set(key, value)` stores data, `get(key)` retrieves data, and `close()` releases storage resources/connection state.',
    hideModuleDetail: true,
    exampleCode: dedent`
      import type { IObjectStorage } from '@rs-x/core';

      async function saveUser(storage: IObjectStorage) {
        await storage.set('user:1', { id: 1, name: 'Ada' });
      }
    `,
  },
  ObjectStorage: {
    summary: 'Default `IObjectStorage` implementation backed by IndexedDB.',
    hideModuleDetail: true,
    notes:
      'Registered as a singleton service under `RsXCoreInjectionTokens.IObjectStorage`. It opens an IndexedDB database lazily on first use, then reuses the opened connection until `close()` is called. IndexedDB uses the structured-clone algorithm, so persisted values must be structured-clone compatible (for example, functions and DOM nodes are not supported).',
    exampleCode: dedent`
      import {
        InjectionContainer,
        RsXCoreInjectionTokens,
        RsXCoreModule,
        type IObjectStorage,
      } from '@rs-x/core';

      await InjectionContainer.load(RsXCoreModule);

      const objectStorage = InjectionContainer.get<IObjectStorage>(
        RsXCoreInjectionTokens.IObjectStorage,
      );

      await objectStorage.set('session', { token: 'abc123' });
      const session = await objectStorage.get<{ token: string }>('session');
      console.log(session?.token);

      objectStorage.close();
    `,
    constructorInjectionExampleCode: dedent`
      import { Inject, RsXCoreInjectionTokens, type IObjectStorage } from '@rs-x/core';

      class SessionStore {
        constructor(
          @Inject(RsXCoreInjectionTokens.IObjectStorage)
          private readonly storage: IObjectStorage,
        ) {}

        async saveToken(token: string): Promise<void> {
          await this.storage.set('session:token', token);
        }
      }
    `,
  },
  RsXCoreInjectionTokens: {
    summary: 'Object that contains the DI token keys for core services.',
    hideModuleDetail: true,
    notes:
      'Use these keys with `InjectionContainer.get(...)` and `@Inject(...)` to resolve the configured service bindings.',
    exampleCode: dedent`
      import {
        Inject,
        InjectionContainer,
        RsXCoreInjectionTokens,
        RsXCoreModule,
        type IEqualityService,
      } from '@rs-x/core';

      await InjectionContainer.load(RsXCoreModule);

      const equality = InjectionContainer.get<IEqualityService>(
        RsXCoreInjectionTokens.IEqualityService,
      );

      class Consumer {
        constructor(
          @Inject(RsXCoreInjectionTokens.IEqualityService)
          private readonly equalityService: IEqualityService,
        ) {}
      }

      console.log(equality, Consumer);
    `,
  },
  RsXCoreModule: {
    summary:
      'ContainerModule that registers the default @rs-x/core service graph (singletons and multi-inject lists).',
    hideModuleDetail: true,
    exampleCode: dedent`
      import {
        InjectionContainer,
        RsXCoreInjectionTokens,
        RsXCoreModule,
        type IEqualityService,
      } from '@rs-x/core';

      // Load default core registrations into the shared container.
      await InjectionContainer.load(RsXCoreModule);

      const equalityService = InjectionContainer.get<IEqualityService>(
        RsXCoreInjectionTokens.IEqualityService,
      );

      console.log(equalityService.isEqual({ a: 1 }, { a: 1 })); // true
    `,
  },
  WaitForEvent: {
    summary:
      'Utility class for async flows/tests where you trigger logic and wait for one or more Observable event emissions.',
    hideModuleDetail: true,
    parameters: [
      {
        name: 'TTarget',
        type: 'generic type parameter',
        description:
          'Target object type that contains the Observable event property you want to listen to.',
      },
      {
        name: 'TEventName',
        type: 'generic type parameter',
        description:
          'Key of the Observable event property on `TTarget` (for example `message$`).',
      },
      {
        name: 'TValue',
        type: 'generic type parameter',
        description: 'Value type emitted by the selected Observable event.',
      },
    ],
    notes:
      'Configure `count` to wait for multiple emissions, `timeout` to stop waiting after a max duration, and `ignoreInitialValue` when the first emission is just current state.',
    exampleCode: dedent`
      import { Subject } from 'rxjs';
      import { WaitForEvent, type IWaitForEventOptions } from '@rs-x/core';

      const target = {
        message$: new Subject<string>(),
      };

      const options: IWaitForEventOptions<typeof target, 'message$', string> = {
        count: 2,
        timeout: 1000,
      };

      const waiter = new WaitForEvent(target, 'message$', options);

      const result = await waiter.wait(() => {
        target.message$.next('first');
        target.message$.next('second');
      });

      console.log(result); // ['first', 'second']
    `,
  },
  IWaitForEventOptions: {
    summary:
      'Options object that controls how WaitForEvent waits for Observable emissions.',
    hideModuleDetail: true,
    parameters: [
      {
        name: 'TTarget',
        type: 'generic type parameter',
        description:
          'Target object type that contains the Observable event property.',
      },
      {
        name: 'TEventName',
        type: 'generic type parameter',
        description: 'Key of the Observable event property on `TTarget`.',
      },
      {
        name: 'TValue',
        type: 'generic type parameter',
        description: 'Value type emitted by the selected Observable event.',
      },
    ],
  },
  EqualityService: {
    summary:
      'Default implementation of IEqualityService used by @rs-x/core for deep value comparison.',
    notes:
      'Use when you need deep-equality checks in rs-x (for example before emitting updates or committing state changes).',
    exampleCode: dedent`
      import {
        InjectionContainer,
        RsXCoreInjectionTokens,
        RsXCoreModule,
        type IEqualityService,
      } from '@rs-x/core';

      await InjectionContainer.load(RsXCoreModule);

      const equality = InjectionContainer.get<IEqualityService>(
        RsXCoreInjectionTokens.IEqualityService,
      );

      const a = { id: 1, nested: { name: 'Ada' } };
      const b = { id: 1, nested: { name: 'Ada' } };

      console.log(equality.isEqual(a, b)); // true
    `,
  },
};

function isCallableTypeSignature(signature: string): boolean {
  return /^export type\s+\w+\s*=/.test(signature) && signature.includes('=>');
}

function defaultParameters(
  kind: string,
  signature: string,
): ApiParameterItem[] {
  if (kind === 'function' || isCallableTypeSignature(signature)) {
    return [
      {
        name: 'See declaration',
        type: 'Signature-defined',
        description:
          'Parameter names and types are defined in the API declaration block below.',
      },
    ];
  }
  return [];
}

function defaultReturnType(kind: string, signature: string): string {
  if (kind === 'function') {
    const match = signature.match(/\)\s*:\s*([^;{]+)/);
    return match?.[1]?.trim() ?? 'See declaration';
  }
  if (isCallableTypeSignature(signature)) {
    const match = signature.match(/=>\s*([^;]+)/);
    return match?.[1]?.trim() ?? 'See declaration';
  }
  if (kind === 'const') {
    return '';
  }
  if (kind.includes('class')) {
    return 'Class instance when constructed.';
  }
  if (kind === 'interface' || kind === 'type' || kind === 'enum') {
    return 'Type-level contract (no direct runtime return value).';
  }
  return 'See declaration';
}

function defaultExample(symbol: string, kind: string): string {
  if (kind === 'function') {
    return `import { ${symbol} } from '@rs-x/core';\n\n${symbol}(/* arguments */);`;
  }
  if (kind === 'abstract class') {
    return `import { ${symbol} } from '@rs-x/core';\n\nclass My${symbol} extends ${symbol} {\n  // implement abstract members\n}`;
  }
  if (kind.includes('class')) {
    const singletonBinding = SINGLETON_SERVICE_BINDINGS[symbol];
    if (singletonBinding) {
      const variableName = singletonBinding.serviceType.includes('Accessor')
        ? 'accessor'
        : 'service';
      return dedent`
        import { InjectionContainer, RsXCoreInjectionTokens, RsXCoreModule, type ${singletonBinding.serviceType} } from '@rs-x/core';

        await InjectionContainer.load(RsXCoreModule);

        // Resolve from the container singleton (do not use new for this service).
        const ${variableName} = InjectionContainer.get<${singletonBinding.serviceType}>(
          RsXCoreInjectionTokens.${singletonBinding.token},
        );
        console.log(${variableName});
      `;
    }
    return `import { ${symbol} } from '@rs-x/core';\n\nconst instance = new ${symbol}(...args);`;
  }
  if (kind === 'interface') {
    return '';
  }
  if (kind === 'type') {
    return `import type { ${symbol} } from '@rs-x/core';\n\ntype Local${symbol} = ${symbol};`;
  }
  if (kind === 'enum') {
    return `import { ${symbol} } from '@rs-x/core';\n\nconst current = ${symbol}[Object.keys(${symbol})[0] as keyof typeof ${symbol}];`;
  }
  if (kind === 'const') {
    return `import { ${symbol} } from '@rs-x/core';\n\nconsole.log(${symbol});`;
  }
  return `import { ${symbol} } from '@rs-x/core';`;
}

function defaultConstructorInjectionExample(
  symbol: string,
  kind: string,
): string {
  if (!kind.includes('class')) {
    return '';
  }

  const singletonBinding = SINGLETON_SERVICE_BINDINGS[symbol];
  if (!singletonBinding) {
    return '';
  }

  return dedent`
    import { Inject, RsXCoreInjectionTokens, type ${singletonBinding.serviceType} } from '@rs-x/core';

    class MyConsumer {
      constructor(
        @Inject(RsXCoreInjectionTokens.${singletonBinding.token})
        private readonly dependency: ${singletonBinding.serviceType},
      ) {}
    }
  `;
}

function relatedDocs(symbol: string): Array<{ href: string; label: string }> {
  if (symbol === 'IProxyRegistry' || symbol === 'ProxyRegistry') {
    return [{ href: '/docs/iproxy-registry', label: 'IProxyRegistry docs' }];
  }
  if (
    symbol === 'KeyedInstanceFactory' ||
    symbol === 'IKeyedInstanceFactory' ||
    symbol === 'GroupedKeyedInstanceFactory' ||
    symbol === 'GuidKeyedInstanceFactory' ||
    symbol === 'IGroupedKeyedInstanceFactory'
  ) {
    return [
      {
        href: '/docs/keyed-instance-factory',
        label: 'KeyedInstanceFactory docs',
      },
    ];
  }
  return [];
}

export async function generateStaticParams() {
  return coreApiItems.map((item) => ({ symbol: item.symbol }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const entry = coreApiBySymbol.get(decodeURIComponent(symbol));
  if (!entry) {
    return { title: '@rs-x/core API' };
  }
  return {
    title: `@rs-x/core: ${entry.symbol}`,
    description: entry.description,
  };
}

export default async function CoreApiSymbolPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const entry = coreApiBySymbol.get(decodeURIComponent(symbol));
  if (!entry) {
    notFound();
  }

  const usageSnippet =
    entry.kind === 'type' || entry.kind === 'interface'
      ? `import type { ${entry.symbol} } from '@rs-x/core';`
      : `import { ${entry.symbol} } from '@rs-x/core';`;
  const related = relatedDocs(entry.symbol);
  const moduleDetail =
    MODULE_DETAILS[entry.module] ??
    'Core runtime export used by @rs-x internals.';
  const override = SYMBOL_DOCS[entry.symbol];
  const parameterDocs =
    override?.parameters ?? defaultParameters(entry.kind, entry.signature);
  const returnTypeDoc =
    override?.returns ?? defaultReturnType(entry.kind, entry.signature);
  const usageNotes = override?.notes;
  const isTypeLike = ['interface', 'type', 'enum'].includes(entry.kind);
  const usageExample =
    override?.exampleCode ?? defaultExample(entry.symbol, entry.kind);
  const constructorInjectionExample =
    override?.constructorInjectionExampleCode ??
    defaultConstructorInjectionExample(entry.symbol, entry.kind);
  const showExample =
    !['interface', 'type'].includes(entry.kind) &&
    usageExample.trim().length > 0;
  const showConstructorInjectionExample =
    !['interface', 'type'].includes(entry.kind) &&
    constructorInjectionExample.trim().length > 0;
  const showStandardDetailCards = !isTypeLike;
  const showWhenToUse =
    !['interface', 'type'].includes(entry.kind) && Boolean(usageNotes);
  const fullTypeSignature =
    !override?.fullSignature &&
    ['interface', 'class', 'abstract class', 'type'].includes(entry.kind)
      ? await readFullTypeDeclaration(
          entry.symbol,
          entry.sourcePath,
          entry.kind,
        )
      : null;
  const apiSignature =
    override?.fullSignature ?? fullTypeSignature ?? entry.signature;
  const memberDocs = parseDeclarationMembers(apiSignature, entry.symbol);
  const classHasDisposeMethod =
    ['class', 'abstract class'].includes(entry.kind) &&
    memberDocs.some((member) => plainMemberName(member.name) === 'dispose');
  const memberGroups = groupMembers(memberDocs);
  const showMembersCard =
    memberDocs.length > 0 &&
    ['interface', 'class', 'abstract class'].includes(entry.kind);
  const supportsMembers = ['interface', 'class', 'abstract class'].includes(
    entry.kind,
  );
  const showDetailCards = !showMembersCard && showStandardDetailCards;
  const showParametersCard = showDetailCards && parameterDocs.length > 0;
  const showReturnTypeCard =
    showDetailCards &&
    !['class', 'abstract class'].includes(entry.kind) &&
    Boolean(returnTypeDoc?.trim());
  const showDeclaration = !['class', 'abstract class'].includes(entry.kind);
  const whatItDoes =
    override?.summary ??
    defaultWhatItDoes(entry.symbol, entry.kind, entry.description);
  const showModuleDetail = !override?.hideModuleDetail;
  const normalizedModuleDetail = moduleDetail.trim();
  const normalizedWhatItDoes = whatItDoes.trim();
  const hasDistinctModuleDetail =
    normalizedModuleDetail.length > 0 &&
    normalizedModuleDetail !== normalizedWhatItDoes;
  const showDescriptionCard = showModuleDetail && hasDistinctModuleDetail;
  const baseClassName = extractBaseClassName(entry.kind, apiSignature);
  const implementedInterfaces = extractImplementedInterfaces(
    entry.kind,
    apiSignature,
  );
  const extendedInterfaces = extractExtendedInterfaces(
    entry.kind,
    apiSignature,
  );
  const moduleLabel = formatModuleLabel(entry.module);
  const moduleHref = `/docs/core-api/module/${slugify(entry.module)}`;
  const sourceHref = `${CORE_GITHUB_BASE}/${entry.sourcePath}`;

  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <nav className="docsApiBreadcrumbs" aria-label="Breadcrumb">
          <Link href="/docs">Docs</Link>
          <span aria-hidden="true">/</span>
          <Link href="/docs/core-api">@rs-x/core API</Link>
          <span aria-hidden="true">/</span>
          <Link href={moduleHref}>{moduleLabel}</Link>
        </nav>
        <div className="docsApiHeaderRow">
          <div>
            <p className="docsApiEyebrow">API Reference</p>
            <h1 className="sectionTitle docsApiTitle">
              <span>{entry.symbol}</span>
              <span className="docsApiTypeBadge">{entry.kind}</span>
            </h1>
          </div>
        </div>
        <p className="sectionLead docsApiLead">
          {renderTextWithCoreLinks(whatItDoes, entry.symbol)}
        </p>
      </div>

      <div className="docsApiGrid">
        {showDescriptionCard && (
          <article id="overview" className="card docsApiCard">
            <h2 className="cardTitle">Overview</h2>
            {showModuleDetail && (
              <p className="cardText">
                {renderTextWithCoreLinks(moduleDetail, entry.symbol)}
              </p>
            )}
          </article>
        )}

        {showWhenToUse && (
          <article id="usage" className="card docsApiCard">
            <h2 className="cardTitle">When to use</h2>
            {usageNotes && (
              <p className="cardText">
                {renderTextWithCoreLinks(usageNotes, entry.symbol)}
              </p>
            )}
            {usageNotes && related.length > 0 && (
              <p className="cardText">
                Related:{' '}
                {related.map((item, index) => (
                  <span key={item.href}>
                    {index > 0 ? ', ' : ''}
                    <Link href={item.href}>{item.label}</Link>
                  </span>
                ))}
              </p>
            )}
          </article>
        )}

        {classHasDisposeMethod && (
          <article id="dispose-lifecycle" className="card docsApiCard">
            <h2 className="cardTitle">Lifecycle</h2>
            <p className="cardText">
              This class exposes <span className="codeInline">dispose()</span>.
              Always call <span className="codeInline">dispose()</span> when you
              are finished using an instance, to release resources and prevent
              memory leaks.
            </p>
          </article>
        )}

        <aside
          className="qsCodeCard docsApiCode docsApiCodeTop"
          aria-label="API and usage"
        >
          <div className="docsApiSidebarSection">
            <div className="docsApiSidebarTitle">Quick facts</div>
            <dl className="docsApiFacts">
              <div className="docsApiFact">
                <dt>Kind</dt>
                <dd>{entry.kind}</dd>
              </div>
              <div className="docsApiFact">
                <dt>Module</dt>
                <dd>
                  <Link href={moduleHref}>{moduleLabel}</Link>
                </dd>
              </div>
              {baseClassName && (
                <div className="docsApiFact">
                  <dt>Base class</dt>
                  <dd>{renderTypeWithLinks(baseClassName, entry.symbol)}</dd>
                </div>
              )}
              {extendedInterfaces.length > 0 && (
                <div className="docsApiFact">
                  <dt>Extends</dt>
                  <dd>
                    {renderTypeListWithLinks(extendedInterfaces, entry.symbol)}
                  </dd>
                </div>
              )}
              {implementedInterfaces.length > 0 && (
                <div className="docsApiFact">
                  <dt>Implements</dt>
                  <dd>
                    {renderTypeListWithLinks(
                      implementedInterfaces,
                      entry.symbol,
                    )}
                  </dd>
                </div>
              )}
              {supportsMembers && memberDocs.length > 0 && (
                <div className="docsApiFact">
                  <dt>Members</dt>
                  <dd>{memberDocs.length}</dd>
                </div>
              )}
              <div className="docsApiFact">
                <dt>Package</dt>
                <dd>
                  <Link
                    href="https://www.npmjs.com/package/@rs-x/core"
                    target="_blank"
                    rel="noreferrer"
                  >
                    @rs-x/core
                  </Link>
                </dd>
              </div>
              <div className="docsApiFact">
                <dt>Source</dt>
                <dd>
                  <a href={sourceHref} target="_blank" rel="noreferrer">
                    {entry.sourcePath}
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          {showDeclaration && (
            <>
              <div id="declaration" className="qsCodeHeader">
                <div className="qsCodeTitle">Declaration</div>
              </div>
              <SyntaxCodeBlock code={apiSignature} />
            </>
          )}

          <div id="import" className="qsCodeHeader">
            <div className="qsCodeTitle">Import</div>
          </div>
          <SyntaxCodeBlock code={usageSnippet} />

          {showExample && (
            <>
              <div id="example" className="qsCodeHeader">
                <div className="qsCodeTitle">Example</div>
              </div>
              <SyntaxCodeBlock code={usageExample} />
            </>
          )}

          {showConstructorInjectionExample && (
            <>
              <div id="constructor-injection-example" className="qsCodeHeader">
                <div className="qsCodeTitle">Constructor injection example</div>
              </div>
              <SyntaxCodeBlock code={constructorInjectionExample} />
            </>
          )}
        </aside>

        {showParametersCard && (
          <article id="parameters" className="card docsApiCard">
            <h2 className="cardTitle">Parameters</h2>
            <ApiParameterList
              items={parameterDocs}
              currentSymbol={entry.symbol}
            />
          </article>
        )}

        {showReturnTypeCard && (
          <article id="returns" className="card docsApiCard">
            <h2 className="cardTitle">Return type</h2>
            <p className="cardText">
              {renderTextWithCoreLinks(returnTypeDoc, entry.symbol)}
            </p>
          </article>
        )}

        {showMembersCard && (
          <article id="members" className="card docsApiCard apiMembersCard">
            <div className="docsApiSectionTop">
              <div>
                <h2 className="cardTitle">Members</h2>
                <p className="cardText docsApiSectionNote">
                  {memberDocs.length} member{memberDocs.length === 1 ? '' : 's'}{' '}
                  in this {entry.kind}.
                </p>
              </div>
            </div>
            {memberGroups.map((group) => (
              <section
                key={group.kind}
                className="apiMemberGroup"
                id={`members-${group.kind}`}
              >
                <h3 className="coreInlineCodeTitle apiMemberGroupTitle">
                  {group.title}
                </h3>
                <div className="apiMemberList">
                  {group.members.map((member) => (
                    <LeftAccentCard
                      key={`${member.name}-${member.signature}`}
                      as="article"
                      tone={memberAccentTone(member.kind)}
                      className="apiMemberItem"
                    >
                      <div className="apiMemberHead">
                        <span className="apiMemberName codeInline">
                          {member.name}
                        </span>
                        <span className="apiMemberKind">{member.kind}</span>
                        {member.access && (
                          <span className="apiMemberMeta">{member.access}</span>
                        )}
                        {member.abstract && (
                          <span className="apiMemberMeta">abstract</span>
                        )}
                        {member.readonly && (
                          <span className="apiMemberMeta">readonly</span>
                        )}
                        {member.optional && (
                          <span className="apiMemberMeta">optional</span>
                        )}
                      </div>
                      <p className="apiMemberDescription">
                        {member.description}
                      </p>
                      <SyntaxCodeBlock
                        code={formatMemberSignatureForDisplay(member)}
                        className="apiMemberSignature"
                      />

                      {member.kind === 'property' && member.returnType && (
                        <div className="apiMemberSection apiMemberSectionInline">
                          <p className="apiMemberSectionTitle">Type</p>
                          <p className="apiMemberReturn">
                            {renderTypeWithLinks(
                              member.returnType,
                              entry.symbol,
                            )}
                          </p>
                        </div>
                      )}

                      {member.parameters.length > 0 && (
                        <div className="apiMemberSection">
                          <p className="apiMemberSectionTitle">Parameters</p>
                          <dl
                            className="apiMemberParamList"
                            role="table"
                            aria-label={`${member.name} parameters`}
                          >
                            <div className="apiMemberParamHeader" role="row">
                              <dt role="columnheader">Name</dt>
                              <dt role="columnheader">Type</dt>
                              <dt role="columnheader">Required</dt>
                            </div>
                            {member.parameters.map((param) => (
                              <div
                                key={`${member.name}-${param.name}`}
                                className="apiMemberParamItem"
                              >
                                <dt className="apiMemberParamName">
                                  <span className="codeInline">
                                    {param.name}
                                    {param.optional ? '?' : ''}
                                  </span>
                                </dt>
                                <dd className="apiMemberParamType">
                                  {renderTypeWithLinks(
                                    param.type,
                                    entry.symbol,
                                  )}
                                </dd>
                                <dd className="apiMemberParamRequirement">
                                  {param.rest
                                    ? 'variadic'
                                    : param.optional
                                      ? 'optional'
                                      : 'required'}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      )}

                      {(member.kind === 'method' ||
                        member.kind === 'constructor' ||
                        member.kind === 'call') &&
                        member.parameters.length === 0 && (
                          <div className="apiMemberSection">
                            <p className="apiMemberSectionTitle">Parameters</p>
                            <p className="apiMemberReturn">No parameters.</p>
                          </div>
                        )}

                      {member.returnType && member.kind !== 'property' && (
                        <div className="apiMemberSection apiMemberSectionInline">
                          <p className="apiMemberSectionTitle">Returns</p>
                          <p className="apiMemberReturn">
                            {renderTypeWithLinks(
                              member.returnType,
                              entry.symbol,
                            )}
                          </p>
                        </div>
                      )}
                    </LeftAccentCard>
                  ))}
                </div>
              </section>
            ))}
          </article>
        )}
      </div>
    </DocsPageTemplate>
  );
}
