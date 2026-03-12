export interface CoreApiItem {
  symbol: string;
  kind: string;
  module: string;
  description: string;
  sourcePath: string;
  signature: string;
}

export const coreApiItems: CoreApiItem[] = [
  {
    symbol: 'AnyFunction',
    kind: 'type',
    module: 'types',
    description: 'Shared runtime and type utilities.',
    sourcePath: 'types/type.ts',
    signature: 'export type AnyFunction = (...args: unknown[]) => unknown;',
  },
  {
    symbol: 'ArgumentException',
    kind: 'class',
    module: 'exceptions',
    description:
      'Thrown when an argument value is invalid for the current operation.',
    sourcePath: 'exceptions/argument-exception.ts',
    signature: 'export class ArgumentException extends CustomError {',
  },
  {
    symbol: 'ArrayIndexAccessor',
    kind: 'class',
    module: 'index-value-accessor',
    description:
      'Handles Array contexts: reads and writes values by numeric index (array[index]), reports index existence, and exposes available indexes via array.keys().',
    sourcePath: 'index-value-accessor/array-index-accessor.ts',
    signature:
      'export class ArrayIndexAccessor implements IArrayIndexAccessor {',
  },
  {
    symbol: 'ArrayMetadata',
    kind: 'class',
    module: 'value-metadata',
    description:
      'Metadata service for Array values (applies to arrays, marks them as non-async, and indicates they need proxying).',
    sourcePath: 'value-metadata/array-metadata.ts',
    signature: 'export class ArrayMetadata implements IValueMetadata {',
  },
  {
    symbol: 'Assertion',
    kind: 'class',
    module: 'exceptions',
    description:
      'Static assertion helper with runtime guards for predicates, function checks, and null/empty validation.',
    sourcePath: 'exceptions/assertion.ts',
    signature: 'export class Assertion {',
  },
  {
    symbol: 'AssertionError',
    kind: 'class',
    module: 'exceptions',
    description: 'Thrown when Assertion.assert(...) fails.',
    sourcePath: 'exceptions/assert-exception.ts',
    signature: 'export class AssertionError extends CustomError {',
  },
  {
    symbol: 'BindMethod',
    kind: 'type',
    module: 'dependency-injection.ts',
    description:
      'Type alias for the DI bind function signature (ServiceIdentifier<T> -> BindToFluentSyntax<T>).',
    sourcePath: 'dependency-injection.ts',
    signature: 'export type BindMethod = <T>(',
  },
  {
    symbol: 'CheckValidKey',
    kind: 'type',
    module: 'types',
    description: 'Shared runtime and type utilities.',
    sourcePath: 'types/type.ts',
    signature: 'export type CheckValidKey<T, U extends keyof T> = U;',
  },
  {
    symbol: 'ConstructorType',
    kind: 'type',
    module: 'types',
    description: 'Shared runtime and type utilities.',
    sourcePath: 'types/constructor.type.ts',
    signature:
      'export type ConstructorType<T = unknown> = new (...args: unknown[]) => T;',
  },
  {
    symbol: 'CustomError',
    kind: 'class',
    module: 'exceptions',
    description:
      'Base error class used by rs-x exceptions to set a stable custom error name.',
    sourcePath: 'exceptions/custome-error.ts',
    signature: 'export class CustomError extends Error {',
  },
  {
    symbol: 'dataProperties',
    kind: 'const',
    module: 'index-value-accessor',
    description:
      'List of supported Date property keys handled by DatePropertyAccessor.',
    sourcePath: 'index-value-accessor/date-property-accessor.interface.ts',
    signature: 'export const dataProperties: readonly DateProperty[] = [',
  },
  {
    symbol: 'DateMetadata',
    kind: 'class',
    module: 'value-metadata',
    description:
      'Metadata service for Date values (applies to Date instances, marks them as non-async, and indicates they need proxying).',
    sourcePath: 'value-metadata/date-metadata.ts',
    signature: 'export class DateMetadata implements IValueMetadata {',
  },
  {
    symbol: 'DateProperty',
    kind: 'type',
    module: 'index-value-accessor',
    description:
      'Union type of Date property names that can be accessed reactively.',
    sourcePath: 'index-value-accessor/date-property-accessor.interface.ts',
    signature: 'export type DateProperty =',
  },
  {
    symbol: 'DatePropertyAccessor',
    kind: 'class',
    module: 'index-value-accessor',
    description:
      'Reads and updates supported Date parts (local and UTC variants such as year, month, and time) by named index.',
    sourcePath: 'index-value-accessor/date-property-accessor.ts',
    signature:
      'export class DatePropertyAccessor implements IDatePropertyAccessor {',
  },
  {
    symbol: 'DeepCloneValueExcept',
    kind: 'class',
    module: 'deep-clone',
    description:
      'Handles special-case value substitutions during deep cloning (for example resolved async values).',
    sourcePath: 'deep-clone/deep-clone-except.ts',
    signature:
      'export class DeepCloneValueExcept implements IDeepCloneExcept {',
  },
  {
    symbol: 'defaultDeepCloneList',
    kind: 'const',
    module: 'rs-x-core.module.ts',
    description: 'Default ordered deep-clone implementation list.',
    sourcePath: 'rs-x-core.module.ts',
    signature:
      'export const defaultDeepCloneList: readonly IMultiInjectService[] = [',
  },
  {
    symbol: 'DefaultDeepClone',
    kind: 'class',
    module: 'deep-clone',
    description:
      'Coordinates the deep-clone pipeline and returns the first successful clone result.',
    sourcePath: 'deep-clone/default-deep-clone.ts',
    signature: 'export class DefaultDeepClone implements IDeepClone {',
  },
  {
    symbol: 'defaultIndexValueAccessorList',
    kind: 'const',
    module: 'rs-x-core.module.ts',
    description: 'Default ordered index-value-accessor implementation list.',
    sourcePath: 'rs-x-core.module.ts',
    signature:
      'export const defaultIndexValueAccessorList: readonly IMultiInjectService[] = [',
  },
  {
    symbol: 'defaultValueMetadataList',
    kind: 'const',
    module: 'rs-x-core.module.ts',
    description:
      'Default value-metadata registration list used to wire metadata services into `IValueMetadataList`.',
    sourcePath: 'rs-x-core.module.ts',
    signature:
      'export const defaultValueMetadataList: readonly IMultiInjectService[] = [',
  },
  {
    symbol: 'DummyMetadata',
    kind: 'class',
    module: 'value-metadata',
    description:
      'Fallback metadata service that applies to any value when no specialized metadata service matches.',
    sourcePath: 'value-metadata/dummy-metadata.ts',
    signature: 'export class DummyMetadata implements IValueMetadata {',
  },
  {
    symbol: 'echo',
    kind: 'const',
    module: 'types',
    description: 'Shared runtime and type utilities.',
    sourcePath: 'types/type.ts',
    signature: 'export const echo = <T = unknown>(value: T) => value;',
  },
  {
    symbol: 'emptyFunction',
    kind: 'const',
    module: 'types',
    description: 'Shared runtime and type utilities.',
    sourcePath: 'types/type.ts',
    signature: 'export const emptyFunction = () => {};',
  },
  {
    symbol: 'emptyValue',
    kind: 'const',
    module: 'types',
    description: 'Shared runtime and type utilities.',
    sourcePath: 'types/type.ts',
    signature: "export const emptyValue = Symbol('empty');",
  },
  {
    symbol: 'EqualityService',
    kind: 'class',
    module: 'equality-service',
    description: 'Value equality and comparison services.',
    sourcePath: 'equality-service/equality-service.ts',
    signature: 'export class EqualityService implements IEqualityService {',
  },
  {
    symbol: 'ErrorLog',
    kind: 'class',
    module: 'error-log',
    description:
      'Default implementation of IErrorLog for recording and streaming runtime errors.',
    sourcePath: 'error-log/error-log.ts',
    signature: 'export class ErrorLog implements IErrorLog {',
  },
  {
    symbol: 'FunctionCallIndex',
    kind: 'class',
    module: 'function-call-index',
    description:
      'Represents one tracked function call identity (context + function name + arguments id).',
    sourcePath: 'function-call-index/function-call-index.ts',
    signature:
      'export class FunctionCallIndex implements IDisposableFunctionCallIndex {',
  },
  {
    symbol: 'FunctionCallIndexFactory',
    kind: 'class',
    module: 'function-call-index',
    description:
      'Creates and reuses function-call index instances so the same call maps to the same id.',
    sourcePath: 'function-call-index/function-call-index.factory.ts',
    signature:
      'export class FunctionCallIndexFactory extends KeyedInstanceFactory<',
  },
  {
    symbol: 'FunctionCallResultCache',
    kind: 'class',
    module: 'function-call-result-cache',
    description:
      'Stores and retrieves cached function-call results using the context object and function-call identity (function name + arguments).',
    sourcePath: 'function-call-result-cache/function-call-result-cache.ts',
    signature:
      'export class FunctionCallResultCache implements IFunctionCallResultCache {',
  },
  {
    symbol: 'GetFunction',
    kind: 'type',
    module: 'types',
    description: 'Shared runtime and type utilities.',
    sourcePath: 'types/type.ts',
    signature: 'export type GetFunction<T> = () => T;',
  },
  {
    symbol: 'GlobalIndexAccessor',
    kind: 'class',
    module: 'index-value-accessor',
    description:
      'Global fallback accessor that resolves existing keys from globalThis (for example Math, Date, console).',
    sourcePath: 'index-value-accessor/global-index-accesor.ts',
    signature:
      'export class GlobalIndexAccessor implements IGlobalIndexAccessor {',
  },
  {
    symbol: 'GuidFactory',
    kind: 'class',
    module: 'guid',
    description: 'Guid creation services.',
    sourcePath: 'guid/guid.factory.ts',
    signature: 'export class GuidFactory implements IGuidFactory {',
  },
  {
    symbol: 'IArrayIndexAccessor',
    kind: 'type',
    module: 'index-value-accessor',
    description:
      'Accessor service for reading and writing Array values by index.',
    sourcePath: 'index-value-accessor/array-index-accessor.type.ts',
    signature:
      'export type IArrayIndexAccessor = IIndexValueAccessor<unknown[], number>;',
  },
  {
    symbol: 'IChainPart',
    kind: 'interface',
    module: 'types',
    description: 'Shared runtime and type utilities.',
    sourcePath: 'types/property-change.interface.ts',
    signature: 'export interface IChainPart {',
  },
  {
    symbol: 'IDatePropertyAccessor',
    kind: 'type',
    module: 'index-value-accessor',
    description:
      'Accessor service for reading and writing Date values by DateProperty keys (for example year, utcYear, month, and time).',
    sourcePath: 'index-value-accessor/date-property-accessor.interface.ts',
    signature:
      'export type IDatePropertyAccessor = IIndexValueAccessor<Date, DateProperty>;',
  },
  {
    symbol: 'IDeepClone',
    kind: 'interface',
    module: 'deep-clone',
    description: 'Service for creating deep copies of values.',
    sourcePath: 'deep-clone/deep-clone.interface.ts',
    signature: 'export interface IDeepClone {',
  },
  {
    symbol: 'IDeepCloneExcept',
    kind: 'interface',
    module: 'deep-clone',
    description:
      'Service for special-case value substitutions during deep cloning.',
    sourcePath: 'deep-clone/deep-clone-except.interface.ts',
    signature: 'export interface IDeepCloneExcept {',
  },
  {
    symbol: 'IDisposable',
    kind: 'interface',
    module: 'types',
    description: 'Shared runtime and type utilities.',
    sourcePath: 'types/disposable.interface.ts',
    signature: 'export interface IDisposable {',
  },
  {
    symbol: 'IDisposableFunctionCallIndex',
    kind: 'interface',
    module: 'function-call-index',
    description:
      'Function-call index with dispose support for releasing tracked call resources.',
    sourcePath: 'function-call-index/function-call-index.interface.ts',
    signature: 'export interface IDisposableFunctionCallIndex',
  },
  {
    symbol: 'IDisposableOwner',
    kind: 'interface',
    module: 'keyed-instance-factory',
    description:
      'Owner hook interface used by keyed-instance-factory instances to coordinate release/dispose behavior.',
    sourcePath: 'keyed-instance-factory/disposable-owner.interface.ts',
    signature: 'export interface IDisposableOwner {',
  },
  {
    symbol: 'IEqualityService',
    kind: 'interface',
    module: 'equality-service',
    description: 'Value equality and comparison services.',
    sourcePath: 'equality-service/equality-service.interface.ts',
    signature: 'export interface IEqualityService {',
  },
  {
    symbol: 'IError',
    kind: 'interface',
    module: 'error-log',
    description:
      'Error record shape: message, context, optional details, and fatal flag.',
    sourcePath: 'error-log/error.interface.ts',
    signature: 'export interface IError {',
  },
  {
    symbol: 'IErrorLog',
    kind: 'interface',
    module: 'error-log',
    description:
      'Service for adding errors, observing the error stream, and clearing output.',
    sourcePath: 'error-log/error-log.interface.ts',
    signature: 'export interface IErrorLog {',
  },
  {
    symbol: 'IFunctionCallIndex',
    kind: 'interface',
    module: 'function-call-index',
    description:
      'Service for a computed function-call identity used by caching and change tracking.',
    sourcePath: 'function-call-index/function-call-index.interface.ts',
    signature: 'export interface IFunctionCallIndex {',
  },
  {
    symbol: 'IFunctionCallIndexData',
    kind: 'interface',
    module: 'function-call-index',
    description:
      'Input shape (context, function name, arguments) used to build a function-call identity.',
    sourcePath: 'function-call-index/function-call-index.interface.ts',
    signature: 'export interface IFunctionCallIndexData {',
  },
  {
    symbol: 'IFunctionCallIndexFactory',
    kind: 'type',
    module: 'function-call-index',
    description:
      'Type alias for the factory service used to create, resolve, and release function-call index entries.',
    sourcePath: 'function-call-index/function-call-index.factory.type.ts',
    signature: 'export type IFunctionCallIndexFactory = IKeyedInstanceFactory<',
  },
  {
    symbol: 'IFunctionCallResult',
    kind: 'interface',
    module: 'function-call-result-cache',
    description:
      'Input payload for one cached call result: function name, arguments, and computed result value.',
    sourcePath:
      'function-call-result-cache/function-call-result-cache.interface.ts',
    signature:
      'export interface IFunctionCallResult extends IFunctionCallResultIdInfo {',
  },
  {
    symbol: 'IFunctionCallResultCacheEntry',
    kind: 'interface',
    module: 'function-call-result-cache',
    description:
      'Represents one cache entry with its call index, result value, and dispose lifecycle.',
    sourcePath:
      'function-call-result-cache/function-call-result-cache.interface.ts',
    signature:
      'export interface IFunctionCallResultCacheEntry extends IDisposable {',
  },
  {
    symbol: 'IFunctionCallResultCache',
    kind: 'interface',
    module: 'function-call-result-cache',
    description:
      'Service for creating, checking, and reading cached call results by context object and function-call identity (function name + arguments).',
    sourcePath:
      'function-call-result-cache/function-call-result-cache.interface.ts',
    signature: 'export interface IFunctionCallResultCache {',
  },
  {
    symbol: 'IFunctionCallResultIdInfo',
    kind: 'interface',
    module: 'function-call-result-cache',
    description:
      'Interface that defines the call-identity payload used for cache lookup: functionName and arguments.',
    sourcePath:
      'function-call-result-cache/function-call-result-cache.interface.ts',
    signature: 'export interface IFunctionCallResultIdInfo {',
  },
  {
    symbol: 'IGlobalIndexAccessor',
    kind: 'type',
    module: 'index-value-accessor',
    description:
      'Accessor service for reading and writing values on globalThis by key.',
    sourcePath: 'index-value-accessor/global-index-accesor.type.ts',
    signature: 'export type IGlobalIndexAccessor = IIndexValueAccessor<',
  },
  {
    symbol: 'IGuidFactory',
    kind: 'interface',
    module: 'guid',
    description: 'Guid creation services.',
    sourcePath: 'guid/guid.factory.interface.ts',
    signature: 'export interface IGuidFactory {',
  },
  {
    symbol: 'IIndexValueAccessor',
    kind: 'interface',
    module: 'index-value-accessor',
    description:
      'Accessor service for reading or writing values for a given context and index.',
    sourcePath: 'index-value-accessor/index-value-accessor.interface.ts',
    signature:
      'export interface IIndexValueAccessor<TContext = unknown, TIndex = unknown> {',
  },
  {
    symbol: 'IInstanceGroupInfo',
    kind: 'type',
    module: 'keyed-instance-factory',
    description:
      'Type alias describing one registered instance group entry and its resolved id mapping.',
    sourcePath:
      'keyed-instance-factory/grouped-keyed-instance-factory.interface.ts',
    signature: 'export type IInstanceGroupInfo<TId, TInstance> = {',
  },
  {
    symbol: 'IISequenceWithIdData',
    kind: 'interface',
    module: 'sequence-id',
    description: 'Data shape that pairs a sequence payload with its id.',
    sourcePath: 'sequence-id/sequence-id-factory.interface.ts',
    signature: 'export interface IISequenceWithIdData {',
  },
  {
    symbol: 'IMapKeyAccessor',
    kind: 'type',
    module: 'index-value-accessor',
    description: 'Accessor service for reading and writing Map values by key.',
    sourcePath: 'index-value-accessor/map-key-accessor.type.ts',
    signature: 'export type IMapKeyAccessor = IIndexValueAccessor<',
  },
  {
    symbol: 'IMethodAccessor',
    kind: 'type',
    module: 'index-value-accessor',
    description:
      'Accessor service for method-call contexts using function-name indexes.',
    sourcePath: 'index-value-accessor/method-accessor.type.ts',
    signature: 'export type IMethodAccessor = IIndexValueAccessor<',
  },
  {
    symbol: 'IMultiInjectService',
    kind: 'interface',
    module: 'dependency-injection.ts',
    description: 'Describes one class entry in a multi-inject service list.',
    sourcePath: 'dependency-injection.ts',
    signature: 'export interface IMultiInjectService {',
  },
  {
    symbol: 'IMultiInjectTokens',
    kind: 'interface',
    module: 'dependency-injection.ts',
    description:
      'Defines token options used when registering a service in a multi-inject list.',
    sourcePath: 'dependency-injection.ts',
    signature: 'export interface IMultiInjectTokens {',
  },
  {
    symbol: 'IndexValueAccessor',
    kind: 'class',
    module: 'index-value-accessor',
    description:
      'Composite accessor that picks the first matching accessor by priority and delegates read/write operations to it.',
    sourcePath: 'index-value-accessor/index-value-accessor.ts',
    signature:
      'export class IndexValueAccessor implements IIndexValueAccessor {',
  },
  {
    symbol: 'InjectionContainer',
    kind: 'const',
    module: 'dependency-injection.ts',
    description:
      'Shared Inversify container instance used to register and resolve services.',
    sourcePath: 'dependency-injection.ts',
    signature: 'export const InjectionContainer = new Container();',
  },
  {
    symbol: 'InvalidCastException',
    kind: 'class',
    module: 'exceptions',
    description: 'Thrown when a value cannot be treated as the required type.',
    sourcePath: 'exceptions/invalid-cast-exception.ts',
    signature: 'export class InvalidCastException extends CustomError {',
  },
  {
    symbol: 'InvalidOperationException',
    kind: 'class',
    module: 'exceptions',
    description:
      'Thrown when an operation is called in an invalid state or context.',
    sourcePath: 'exceptions/invalid-operation-exception.ts',
    signature: 'export class InvalidOperationException extends CustomError {',
  },
  {
    symbol: 'IObjectStorage',
    kind: 'interface',
    module: 'object-store',
    description:
      'Service for async key/value persistence with get, set, and close operations.',
    sourcePath: 'object-store/object-storage.interface.ts',
    signature: 'export interface IObjectStorage {',
  },
  {
    symbol: 'IObservableAccessor',
    kind: 'interface',
    module: 'index-value-accessor',
    description:
      'Accessor service for reading resolved values from observable contexts.',
    sourcePath: 'index-value-accessor/observable-accessor.interface.ts',
    signature:
      'export interface IObservableAccessor extends IIndexValueAccessor<',
  },
  {
    symbol: 'IPromiseAccessor',
    kind: 'interface',
    module: 'index-value-accessor',
    description:
      'Accessor service for reading resolved values from promise contexts.',
    sourcePath: 'index-value-accessor/promise-accessor.interface.ts',
    signature: 'export interface IPromiseAccessor extends IIndexValueAccessor<',
  },
  {
    symbol: 'IPropertyChange',
    kind: 'interface',
    module: 'types',
    description: 'Shared runtime and type utilities.',
    sourcePath: 'types/property-change.interface.ts',
    signature: 'export interface IPropertyChange {',
  },
  {
    symbol: 'IPropertyDescriptor',
    kind: 'interface',
    module: 'types',
    description: 'Shared runtime and type utilities.',
    sourcePath: 'types/property-descriptor.interface.ts',
    signature: 'export interface IPropertyDescriptor {',
  },
  {
    symbol: 'IPropertyValueAccessor',
    kind: 'type',
    module: 'index-value-accessor',
    description:
      'Accessor service for reading and writing object values by property name.',
    sourcePath: 'index-value-accessor/property-value-accessor.type.ts',
    signature:
      'export type IPropertyValueAccessor = IIndexValueAccessor<object, string>;',
  },
  {
    symbol: 'IProxyRegistry',
    kind: 'interface',
    module: 'proxy-registry',
    description:
      'Stores mappings between original objects and proxies, and lets you look up either one from the other.',
    sourcePath: 'proxy-registry/proxy-registry.interface.ts',
    signature: 'export interface IProxyRegistry {',
  },
  {
    symbol: 'IResolvedValueCache',
    kind: 'interface',
    module: 'index-value-accessor',
    description:
      'Cache service that stores resolved Promise/Observable values for synchronous reads.',
    sourcePath: 'index-value-accessor/resolved-value-cache.interface.ts',
    signature: 'export interface IResolvedValueCache {',
  },
  {
    symbol: 'ISequenceIdFactory',
    kind: 'interface',
    module: 'sequence-id',
    description:
      'Service that returns the same id handle for the same sequence in a given context, reuses existing handles for matching input, and releases them when no longer needed. Always dispose/release handles when finished to prevent memory leaks.',
    sourcePath: 'sequence-id/sequence-id-factory.interface.ts',
    signature: 'export interface ISequenceIdFactory {',
  },
  {
    symbol: 'ISequenceWithId',
    kind: 'interface',
    module: 'sequence-id',
    description:
      'Represents one sequence payload and its generated id, with dispose support. Always call dispose() when finished to prevent memory leaks.',
    sourcePath: 'sequence-id/sequence-id-factory.interface.ts',
    signature:
      'export interface ISequenceWithId extends IISequenceWithIdData, IDisposable {}',
  },
  {
    symbol: 'ISetKeyAccessor',
    kind: 'type',
    module: 'index-value-accessor',
    description:
      'Accessor service for Set contexts, including membership checks and item access.',
    sourcePath: 'index-value-accessor/set-key-accessor.type.ts',
    signature:
      'export type ISetKeyAccessor = IIndexValueAccessor<Set<unknown>, unknown>;',
  },
  {
    symbol: 'IKeyedInstanceFactory',
    kind: 'interface',
    module: 'keyed-instance-factory',
    description:
      'Contract defining the public members for a keyed instance factory.',
    sourcePath: 'keyed-instance-factory/keyed-instance.factory.interface.ts',
    signature: 'export interface IKeyedInstanceFactory<',
  },
  {
    symbol: 'IGroupedKeyedInstanceFactory',
    kind: 'interface',
    module: 'keyed-instance-factory',
    description:
      'Extended keyed-instance-factory contract that supports generated group/member ids and grouped lookup.',
    sourcePath:
      'keyed-instance-factory/grouped-keyed-instance-factory.interface.ts',
    signature: 'export interface IGroupedKeyedInstanceFactory<',
  },
  {
    symbol: 'IValueMetadata',
    kind: 'interface',
    module: 'value-metadata',
    description:
      'Service contract for classifying runtime values: priority, applicability, async behavior, and proxy requirement.',
    sourcePath: 'value-metadata/value-metadata.interface.ts',
    signature: 'export interface IValueMetadata {',
  },
  {
    symbol: 'LastValueObservable',
    kind: 'type',
    module: 'index-value-accessor',
    description:
      'Observable type accepted by ObservableAccessor for last-value caching.',
    sourcePath: 'index-value-accessor/observable-accessor.interface.ts',
    signature:
      'export type LastValueObservable = Subject<unknown> | Observable<unknown>;',
  },
  {
    symbol: 'LodashDeepClone',
    kind: 'class',
    module: 'deep-clone',
    description:
      'Deep-clone service implementation that uses lodash to clone values.',
    sourcePath: 'deep-clone/lodash-deep-clone.ts',
    signature: 'export class LodashDeepClone implements IDeepClone {',
  },
  {
    symbol: 'MapKeyAccessor',
    kind: 'class',
    module: 'index-value-accessor',
    description:
      'Handles Map contexts: checks key existence, reads values, writes values, and enumerates keys.',
    sourcePath: 'index-value-accessor/map-key-accessor.ts',
    signature: 'export class MapKeyAccessor implements IMapKeyAccessor {',
  },
  {
    symbol: 'MapMetadata',
    kind: 'class',
    module: 'value-metadata',
    description:
      'Metadata service for Map values (applies to Map instances, marks them as non-async, and indicates they need proxying).',
    sourcePath: 'value-metadata/map-metadata.ts',
    signature: 'export class MapMetadata implements IValueMetadata {',
  },
  {
    symbol: 'MethodAccessor',
    kind: 'class',
    module: 'index-value-accessor',
    description:
      'Resolves cached method-call results by function-call index; it does not execute methods directly.',
    sourcePath: 'index-value-accessor/method-accessor.ts',
    signature: 'export class MethodAccessor implements IMethodAccessor {',
  },
  {
    symbol: 'NoAccessorFoundExeception',
    kind: 'class',
    module: 'exceptions',
    description:
      'Thrown when no accessor can resolve the requested index/key from the provided context.',
    sourcePath: 'exceptions/no-accessor-found-exception.ts',
    signature:
      'export class NoAccessorFoundExeception<TContext, TIndex> extends CustomError {',
  },
  {
    symbol: 'NullOrEmptyException',
    kind: 'class',
    module: 'exceptions',
    description: 'Thrown when a required value is null, undefined, or empty.',
    sourcePath: 'exceptions/null-or-empty-exception.ts',
    signature: 'export class NullOrEmptyException extends CustomError {',
  },
  {
    symbol: 'NullOrUndefinedException',
    kind: 'class',
    module: 'exceptions',
    description: 'Thrown when a required value is null or undefined.',
    sourcePath: 'exceptions/null-or-undefined-exception.ts',
    signature: 'export class NullOrUndefinedException extends CustomError {',
  },
  {
    symbol: 'ObjectStorage',
    kind: 'class',
    module: 'object-store',
    description:
      'Default IndexedDB-backed implementation of IObjectStorage used by @rs-x/core.',
    sourcePath: 'object-store/object-storage.ts',
    signature: 'export class ObjectStorage implements IObjectStorage {',
  },
  {
    symbol: 'ObservableAccessor',
    kind: 'class',
    module: 'index-value-accessor',
    description:
      'Handles observable properties by returning the raw observable and resolving the latest emitted value from cache.',
    sourcePath: 'index-value-accessor/observable-accessor.ts',
    signature:
      'export class ObservableAccessor implements IObservableAccessor {',
  },
  {
    symbol: 'ObservableMetadata',
    kind: 'class',
    module: 'value-metadata',
    description:
      'Metadata service for Observable values (applies to Observable instances, marks them as async, and indicates they need proxying).',
    sourcePath: 'value-metadata/observable-metadata.ts',
    signature: 'export class ObservableMetadata implements IValueMetadata {',
  },
  {
    symbol: 'overrideMultiInjectServices',
    kind: 'function',
    module: 'dependency-injection.ts',
    description:
      'Replaces all registered entries for one multi-inject token with a new ordered list.',
    sourcePath: 'dependency-injection.ts',
    signature: 'export function overrideMultiInjectServices(',
  },
  {
    symbol: 'ParserException',
    kind: 'class',
    module: 'exceptions',
    description:
      'Thrown for invalid expressions; includes expression text and optional position.',
    sourcePath: 'exceptions/parser-exception.ts',
    signature: 'export class ParserException extends CustomError {',
  },
  {
    symbol: 'PENDING',
    kind: 'const',
    module: 'index-value-accessor',
    description: 'Sentinel symbol used when async values are not resolved yet.',
    sourcePath: 'index-value-accessor/pending.ts',
    signature: "export const PENDING = Symbol('pending');",
  },
  {
    symbol: 'PrettyPrinter',
    kind: 'class',
    module: 'error-log',
    description:
      'Formats values into readable text for diagnostics and debug output.',
    sourcePath: 'error-log/pretty-printer.ts',
    signature: 'export class PrettyPrinter {',
  },
  {
    symbol: 'printValue',
    kind: 'function',
    module: 'error-log',
    description:
      'Formats a value as readable text and writes it to the console.',
    sourcePath: 'error-log/print-value.ts',
    signature: 'export function printValue(value: unknown): void {',
  },
  {
    symbol: 'PromiseAccessor',
    kind: 'class',
    module: 'index-value-accessor',
    description:
      'Handles promise properties by returning the raw Promise and resolving its cached settled value.',
    sourcePath: 'index-value-accessor/promise-accessor.ts',
    signature: 'export class PromiseAccessor implements IPromiseAccessor {',
  },
  {
    symbol: 'PromiseMetadata',
    kind: 'class',
    module: 'value-metadata',
    description:
      'Metadata service for Promise values (applies to Promise instances, marks them as async, and indicates they need proxying).',
    sourcePath: 'value-metadata/promise-metadata.ts',
    signature: 'export class PromiseMetadata implements IValueMetadata {',
  },
  {
    symbol: 'PropertyDescriptorType',
    kind: 'enum',
    module: 'types',
    description: 'Shared runtime and type utilities.',
    sourcePath: 'types/property-descriptor-type.enum.ts',
    signature: 'export enum PropertyDescriptorType {',
  },
  {
    symbol: 'PropertyValueAccessor',
    kind: 'class',
    module: 'index-value-accessor',
    description:
      'Handles plain object properties by key, with existence-based checks and read/write support.',
    sourcePath: 'index-value-accessor/property-value-accessor.ts',
    signature:
      'export class PropertyValueAccessor implements IPropertyValueAccessor {',
  },
  {
    symbol: 'ProxyRegistry',
    kind: 'class',
    module: 'proxy-registry',
    description:
      'Default singleton in-memory implementation of IProxyRegistry for target/proxy mappings.',
    sourcePath: 'proxy-registry/proxy-registry.ts',
    signature: 'export class ProxyRegistry implements IProxyRegistry {',
  },
  {
    symbol: 'registerMultiInjectService',
    kind: 'function',
    module: 'dependency-injection.ts',
    description:
      'Registers one class in a multi-inject list and optionally as a standalone service.',
    sourcePath: 'dependency-injection.ts',
    signature: 'export function registerMultiInjectService(',
  },
  {
    symbol: 'registerMultiInjectServices',
    kind: 'function',
    module: 'dependency-injection.ts',
    description:
      'Registers multiple classes in the same multi-inject list in one call.',
    sourcePath: 'dependency-injection.ts',
    signature: 'export function registerMultiInjectServices(',
  },
  {
    symbol: 'replaceSetItemAt',
    kind: 'function',
    module: 'types',
    description: 'Shared runtime and type utilities.',
    sourcePath: 'types/set.ts',
    signature: 'export function replaceSetItemAt<T = unknown>(',
  },
  {
    symbol: 'ResolvedValueCache',
    kind: 'class',
    module: 'index-value-accessor',
    description:
      'Stores last resolved async values (Promise/Observable) used by accessors.',
    sourcePath: 'index-value-accessor/resolved-value-cache.ts',
    signature:
      'export class ResolvedValueCache implements IResolvedValueCache {',
  },
  {
    symbol: 'RsXCoreInjectionTokens',
    kind: 'const',
    module: 'rs-x-core.injection-tokens.ts',
    description:
      'Object that contains the DI token keys used to register and resolve core services.',
    sourcePath: 'rs-x-core.injection-tokens.ts',
    signature: 'export const RsXCoreInjectionTokens = {',
  },
  {
    symbol: 'RsXCoreModule',
    kind: 'const',
    module: 'rs-x-core.module.ts',
    description: 'Default core module registrations.',
    sourcePath: 'rs-x-core.module.ts',
    signature:
      'export const RsXCoreModule = new ContainerModule((options) => {',
  },
  {
    symbol: 'SequenceIdFactory',
    kind: 'class',
    module: 'sequence-id',
    description:
      'Default singleton service that returns the same sequence id per context for matching input, reuses handles, and tracks references. Always release/dispose handles when finished to prevent memory leaks.',
    sourcePath: 'sequence-id/sequence-id.factory.ts',
    signature: 'export class SequenceIdFactory implements ISequenceIdFactory {',
  },
  {
    symbol: 'SequenceWithId',
    kind: 'class',
    module: 'sequence-id',
    description:
      'Default sequence-id handle containing the source sequence and generated id. Always call dispose() when finished to prevent memory leaks.',
    sourcePath: 'sequence-id/sequence-id.factory.ts',
    signature: 'export class SequenceWithId implements ISequenceWithId {',
  },
  {
    symbol: 'SetFunction',
    kind: 'type',
    module: 'types',
    description: 'Shared runtime and type utilities.',
    sourcePath: 'types/type.ts',
    signature: 'export type SetFunction<T> = (value: T) => void;',
  },
  {
    symbol: 'SetKeyAccessor',
    kind: 'class',
    module: 'index-value-accessor',
    description:
      'Handles Set contexts: checks membership, resolves matching items, replaces items, and enumerates current set values.',
    sourcePath: 'index-value-accessor/set-key-accessor.ts',
    signature: 'export class SetKeyAccessor implements ISetKeyAccessor {',
  },
  {
    symbol: 'SetMetadata',
    kind: 'class',
    module: 'value-metadata',
    description:
      'Metadata service for Set values (applies to Set instances, marks them as non-async, and indicates they need proxying).',
    sourcePath: 'value-metadata/set-metadata.ts',
    signature: 'export class SetMetadata implements IValueMetadata {',
  },
  {
    symbol: 'KeyedInstanceFactory',
    kind: 'abstract class',
    module: 'keyed-instance-factory',
    description:
      'Base class for key-scoped singleton lifecycle management. For each key, it keeps one active instance and a reference count: `create(...)` increments the count, `release(...)` decrements it, and when the count reaches 0 the instance is released. Every `create(...)` call must have a matching `release(...)` call to prevent memory leaks.',
    sourcePath: 'keyed-instance-factory/keyed-instance.factory.ts',
    signature: 'export abstract class KeyedInstanceFactory<',
  },
  {
    symbol: 'GuidKeyedInstanceFactory',
    kind: 'abstract class',
    module: 'keyed-instance-factory',
    description:
      'KeyedInstanceFactory variant that adds generated id support for grouped instances.',
    sourcePath: 'keyed-instance-factory/guid-keyed-instance-factory.ts',
    signature: 'export abstract class GuidKeyedInstanceFactory<',
  },
  {
    symbol: 'GroupedKeyedInstanceFactory',
    kind: 'abstract class',
    module: 'keyed-instance-factory',
    description:
      'KeyedInstanceFactory variant with id-generation helpers for grouped instance management.',
    sourcePath: 'keyed-instance-factory/grouped-keyed-instance-factory.ts',
    signature: 'export abstract class GroupedKeyedInstanceFactory<',
  },
  {
    symbol: 'StructuredDeepClone',
    kind: 'class',
    module: 'deep-clone',
    description:
      'Deep-clone service implementation that uses native structuredClone.',
    sourcePath: 'deep-clone/structured-deep-clone.ts',
    signature: 'export class StructuredDeepClone implements IDeepClone {',
  },
  {
    symbol: 'truePredicate',
    kind: 'const',
    module: 'types',
    description: 'Shared runtime and type utilities.',
    sourcePath: 'types/type.ts',
    signature: 'export const truePredicate = () => true;',
  },
  {
    symbol: 'Type',
    kind: 'class',
    module: 'types',
    description: 'Shared runtime and type utilities.',
    sourcePath: 'types/type.ts',
    signature: 'export class Type {',
  },
  {
    symbol: 'UnexpectedException',
    kind: 'class',
    module: 'exceptions',
    description: 'Thrown when an unexpected runtime condition occurs.',
    sourcePath: 'exceptions/unexpected-exception.ts',
    signature: 'export class UnexpectedException extends CustomError {',
  },
  {
    symbol: 'UnsupportedException',
    kind: 'class',
    module: 'exceptions',
    description:
      'Thrown when a feature, value type, or operation is not supported.',
    sourcePath: 'exceptions/unsupported-exception.ts',
    signature: 'export class UnsupportedException extends CustomError {',
  },
  {
    symbol: 'utCDate',
    kind: 'function',
    module: 'types',
    description: 'Shared runtime and type utilities.',
    sourcePath: 'types/utc-date.ts',
    signature: 'export function utCDate(',
  },
  {
    symbol: 'ValueMetadata',
    kind: 'class',
    module: 'value-metadata',
    description:
      'Composite metadata service that resolves the first matching metadata handler from `IValueMetadataList` (sorted by priority) and delegates `isAsync`, `needsProxy`, and `applies` checks.',
    sourcePath: 'value-metadata/value-metadata.ts',
    signature: 'export class ValueMetadata implements IValueMetadata {',
  },
  {
    symbol: 'IWaitForEventOptions',
    kind: 'interface',
    module: 'wait-for-event',
    description:
      'Configuration for WaitForEvent: how many emissions to wait for, timeout, and whether to skip the first emission.',
    sourcePath: 'wait-for-event.ts',
    signature: 'export interface IWaitForEventOptions<',
  },
  {
    symbol: 'WaitForEvent',
    kind: 'class',
    module: 'wait-for-event',
    description:
      'Waits for one or more Observable event emissions after running a trigger; resolves event value(s) or null on timeout.',
    sourcePath: 'wait-for-event.ts',
    signature: 'export class WaitForEvent<',
  },
];

export const coreApiBySymbol = new Map(
  coreApiItems.map((item) => [item.symbol, item]),
);
