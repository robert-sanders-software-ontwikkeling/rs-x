import { type Observable, ReplaySubject } from 'rxjs';

import { type IDisposableOwner, PENDING } from '@rs-x/core';
import { type IIndexWatchRule } from '@rs-x/state-manager';

import {
  FunctionExpressionEvaluateUnit,
  type IEvaluateManagerForExpression,
  type IExpressionEvaluateUnit,
} from '../expression-evaluate-manager';
import type { IExpressionServices } from '../expression-services/expression-services.interface';
import type { IExpressionBindConfiguration } from '../expressions/expression-bind-configuration.type';
import {
  type ChangeHook,
  ExpressionType,
  type IExpression,
  type IExpressionTree,
} from '../expressions/expression-parser.interface';

import { CompiledDependencyEvaluateUnit } from './compiled-dependency-evaluate-unit';
import type { ICompiledExpressionPlan } from './compiled-expression.compiler.interface';

class PendingDependencyValueError extends Error {}
const UNRESOLVED = Symbol('compiled-expression-unresolved');
const NOOP_COMMIT = () => {};

export class CompiledExpression implements IExpressionTree {
  public readonly isRoot = true;
  public get parent(): IExpressionTree | undefined {
    return undefined;
  }

  public get childExpressions(): readonly IExpressionTree[] {
    return [];
  }

  public get hidden(): boolean {
    return false;
  }
  private _id = '';
  private _changed: ReplaySubject<IExpression> | undefined;
  private _lastChangedValue: IExpression | undefined;
  private _changeHook: ChangeHook | undefined;
  private _isAsync: boolean | undefined;
  private _isAsyncComputed = false;
  private _value: unknown;
  private _oldValue: unknown;
  private _isDirty = false;
  private _isDisposed = false;
  private _owner: IDisposableOwner | undefined;
  private _leafIndexWatchRule: IIndexWatchRule | undefined;
  private _evaluateManagerForExpression:
    | IEvaluateManagerForExpression
    | undefined;
  private _evaluateUnit: IExpressionEvaluateUnit | undefined;
  private _dependencyUnits: CompiledDependencyEvaluateUnit[] = [];
  private _watchDependencies: ICompiledExpressionPlan['watchDependencies'] = [];
  private readonly _hasOwnerPathDependencies: boolean;
  private readonly _needsResolvedMemberProxyInPlan: boolean;
  private readonly _isSingleRootIdentifierExpression: boolean;
  private readonly _requiresDependencyUnitByName: boolean;
  private readonly _identifierDependencyName: string | undefined;
  private _identifierDependencyUnit: CompiledDependencyEvaluateUnit | undefined;
  // Pre-computed per-dependency flags (index-aligned with _plan.watchDependencies).
  private readonly _depIsRootIdentifierDependency: readonly boolean[];
  private readonly _depShouldForceDirty: readonly boolean[];
  private readonly _depRequiresWatchRuleStatically: readonly boolean[];
  private _dependencyUnitByName = new Map<
    string,
    CompiledDependencyEvaluateUnit
  >();
  private _dependencyUnitByPath = new Map<
    string,
    CompiledDependencyEvaluateUnit
  >();
  private _dependencyWatchRules: IIndexWatchRule[] = [];
  private _dirtyDependencyNames = new Set<string>();
  private readonly _readValue = (ctx: unknown, idx: unknown): unknown =>
    this._cachedIndexValueAccessor!.getValue(ctx, idx);
  private readonly _isDeferredValue = (val: unknown): boolean =>
    this._cachedValueMetadata!.isAsync(val);
  private _sequenceOperandValues: unknown[] | undefined;
  private _sequenceDependencySnapshot = new Map<string, unknown>();
  private _proxyByObject: WeakMap<object, unknown> | undefined;
  private _needsResolvedMemberProxy = false;
  private _shouldRefreshDependencyContexts = false;
  private _bindContext: unknown;
  private _runtimeServices: IExpressionServices | undefined;
  private _cachedIndexValueAccessor:
    | IExpressionServices['indexValueAccessor']
    | undefined;
  private _cachedIdentifierOwnerResolver:
    | IExpressionServices['identifierOwnerResolver']
    | undefined;
  private _cachedIdentifierWatchRuleFactory:
    | IExpressionServices['identifierWatchRuleFactory']
    | undefined;
  private _cachedWatchFactory: IExpressionServices['watchFactory'] | undefined;
  private _cachedValueMetadata:
    | IExpressionServices['valueMetadata']
    | undefined;

  constructor(private readonly _plan: ICompiledExpressionPlan) {
    this._watchDependencies = _plan.watchDependencies;
    this._hasOwnerPathDependencies = _plan.watchDependencies.some(
      (dependency) => dependency.ownerPath.length > 0,
    );
    this._needsResolvedMemberProxyInPlan = _plan.watchDependencies.some(
      (dependency) =>
        dependency.ownerPath.length > 0 || dependency.isMemberExpressionSegment,
    );
    this._isSingleRootIdentifierExpression =
      _plan.expressionType === ExpressionType.Identifier &&
      _plan.watchDependencies.length === 1 &&
      _plan.watchDependencies[0].ownerPath.length === 0;
    this._identifierDependencyName = this._isSingleRootIdentifierExpression
      ? _plan.dependencyNames[0]
      : undefined;
    this._requiresDependencyUnitByName =
      _plan.expressionType === ExpressionType.Identifier ||
      _plan.memberChain !== undefined ||
      (_plan.sequenceOperands !== undefined &&
        _plan.sequenceOperands.length > 0);

    const isIdentifier = _plan.expressionType === ExpressionType.Identifier;
    const isSingle = _plan.dependencyNames.length === 1;
    const expressionTypeRequiresWatchRule =
      _plan.expressionType === ExpressionType.Array ||
      _plan.expressionType === ExpressionType.Object ||
      _plan.expressionType === ExpressionType.Member ||
      _plan.expressionType === ExpressionType.Function ||
      _plan.expressionType === ExpressionType.Sequence;
    const memberChain = _plan.memberChain;
    const memberChainLastIsStatic =
      _plan.expressionType === ExpressionType.Member &&
      memberChain !== undefined &&
      memberChain.segments.length > 0 &&
      memberChain.segments[memberChain.segments.length - 1].kind === 'static';
    const memberChainRoot = memberChain?.rootIdentifier;

    const deps = _plan.watchDependencies;
    const depCount = deps.length;
    const depIsRootIdentifier = new Array<boolean>(depCount);
    const depShouldForceDirty = new Array<boolean>(depCount);
    const depRequiresWatchRule = new Array<boolean>(depCount);
    for (let i = 0; i < depCount; i++) {
      const dep = deps[i];
      const isRootPath = dep.ownerPath.length === 0;
      const isRootIdentifierDep = isIdentifier && isRootPath && isSingle;
      const shouldForceDirtyForMemberLeaf =
        memberChainLastIsStatic && isRootPath && dep.name === memberChainRoot;
      const shouldForceDirty =
        (isIdentifier && isRootPath) || shouldForceDirtyForMemberLeaf;
      depIsRootIdentifier[i] = isRootIdentifierDep;
      depShouldForceDirty[i] = shouldForceDirty;
      depRequiresWatchRule[i] =
        expressionTypeRequiresWatchRule ||
        shouldForceDirty ||
        !isRootPath ||
        dep.isMemberExpressionSegment;
    }
    this._depIsRootIdentifierDependency = depIsRootIdentifier;
    this._depShouldForceDirty = depShouldForceDirty;
    this._depRequiresWatchRuleStatically = depRequiresWatchRule;
  }

  public get type(): ExpressionType {
    return this._plan.expressionType;
  }

  public get expressionString(): string {
    return this._plan.expressionString;
  }

  public get id(): string {
    if (!this._id) {
      this._id = this.runtimeServices.guidFactory.create();
    }
    return this._id;
  }

  public get changed(): Observable<IExpression> {
    if (!this._changed) {
      this._changed = new ReplaySubject<IExpression>(1);
      if (this._lastChangedValue) {
        this._changed.next(this._lastChangedValue);
      }
    }
    return this._changed;
  }

  public get isDisposed(): boolean {
    return this._isDisposed;
  }

  public get changeHook(): ChangeHook | undefined {
    return this._changeHook;
  }

  public set changeHook(value: ChangeHook | undefined) {
    this._changeHook = value;
    if (this._changeHook && this.value !== undefined) {
      this._changeHook(this, undefined);
    }
  }

  public clone(): this {
    return new CompiledExpression(this._plan) as this;
  }

  public get isAsync(): boolean | undefined {
    if (this.type !== ExpressionType.Identifier) {
      return false;
    }

    if (this._bindContext === undefined) {
      return undefined;
    }

    if (!this._isAsyncComputed) {
      this._isAsyncComputed = true;
      const dependencyName = this._plan.dependencyNames[0];
      if (dependencyName) {
        const rawValue = this.readDependencyRawValue(
          dependencyName,
          true,
        ).value;
        this._isAsync =
          rawValue !== UNRESOLVED &&
          this.runtimeValueMetadata.isAsync(rawValue);
      } else {
        this._isAsync = false;
      }
    }

    return this._isAsync;
  }

  public toString(): string {
    return this.expressionString;
  }

  public bind(settings: IExpressionBindConfiguration): IExpression {
    this.initializeRuntimeBinding(settings);
    this.resetBindState();

    const context = settings.context;
    this._bindContext = context;
    if (context === undefined) {
      this.initializeEvaluateManager();
      return this;
    }

    this.bindDependencyUnits(context);
    this._evaluateUnit = this.createEvaluateUnit(context);
    if (!this._evaluateManagerForExpression) {
      this._evaluateManagerForExpression =
        this.runtimeServices.expressionEvaluateManager.createAndGetInstance(
          this.onCommit,
        );
    }
    this._evaluateManagerForExpression.register(this._evaluateUnit);
    this._evaluateManagerForExpression.initialize();
    return this;
  }

  private initializeRuntimeBinding(
    settings: IExpressionBindConfiguration,
  ): void {
    this._runtimeServices = settings.services;
    this._cachedIndexValueAccessor = settings.services.indexValueAccessor;
    this._cachedIdentifierOwnerResolver =
      settings.services.identifierOwnerResolver;
    this._cachedIdentifierWatchRuleFactory =
      settings.services.identifierWatchRuleFactory;
    this._cachedWatchFactory = settings.services.watchFactory;
    this._cachedValueMetadata = settings.services.valueMetadata;
    this._leafIndexWatchRule = settings.leafIndexWatchRule;
    this._owner = settings.owner;
  }

  private resetBindState(): void {
    this._dependencyUnits = [];
    if (this._requiresDependencyUnitByName) {
      this._dependencyUnitByName.clear();
    }
    if (this._hasOwnerPathDependencies) {
      this._dependencyUnitByPath.clear();
    }
    this._dependencyWatchRules = [];
    this._watchDependencies = this._plan.watchDependencies;
    this._dirtyDependencyNames.clear();
    this._sequenceOperandValues = undefined;
    this._sequenceDependencySnapshot.clear();
    this._proxyByObject = undefined;
    this._isAsync = undefined;
    this._isAsyncComputed = false;
    this._shouldRefreshDependencyContexts = this._hasOwnerPathDependencies;
    this._needsResolvedMemberProxy = this._needsResolvedMemberProxyInPlan;
    this._identifierDependencyUnit = undefined;
  }

  private bindDependencyUnits(context: unknown): void {
    if (this._isSingleRootIdentifierExpression) {
      const dependency = this._plan.watchDependencies[0];
      const dependencyUnit = this.createDependencyUnit(dependency, 0, context);
      this._dependencyUnits.push(dependencyUnit);
      this._dependencyUnitByName.set(dependency.name, dependencyUnit);
      this._identifierDependencyUnit = dependencyUnit;
      return;
    }

    for (let i = 0; i < this._plan.watchDependencies.length; i++) {
      const dependency = this._plan.watchDependencies[i];
      const dependencyUnit = this.createDependencyUnit(dependency, i, context);
      this._dependencyUnits.push(dependencyUnit);
      if (this._hasOwnerPathDependencies) {
        const dependencyPath = this.createDependencyPathKey(
          dependency.ownerPath,
          dependency.name,
        );
        this._dependencyUnitByPath.set(dependencyPath, dependencyUnit);
      }

      if (
        this._requiresDependencyUnitByName &&
        !this._dependencyUnitByName.has(dependency.name) &&
        dependency.ownerPath.length === 0
      ) {
        this._dependencyUnitByName.set(dependency.name, dependencyUnit);
      }
    }
  }

  private createDependencyUnit(
    dependency: ICompiledExpressionPlan['watchDependencies'][number],
    depIndex: number,
    context: unknown,
  ): CompiledDependencyEvaluateUnit {
    const dependencyName = dependency.name;
    const ownerContext = this.resolveOwnerContext(
      dependencyName,
      dependency.ownerPath,
      context,
    );
    const shouldForceDirty = this._depShouldForceDirty[depIndex];
    const requiresWatchRule =
      this._depRequiresWatchRuleStatically[depIndex] ||
      this.leafIndexWatchRule !== undefined;
    const watchRule = requiresWatchRule
      ? this.runtimeIdentifierWatchRuleFactory.create(ownerContext, {
          index: dependencyName,
          isLeaf: dependency.isLeaf,
          isMemberExpressionSegment: dependency.isMemberExpressionSegment,
          indexWatchRule: this.leafIndexWatchRule,
        })
      : undefined;

    if (watchRule) {
      this._dependencyWatchRules.push(watchRule);
    }

    return new CompiledDependencyEvaluateUnit(
      dependencyName,
      ownerContext,
      this.runtimeWatchFactory,
      watchRule,
      this._depIsRootIdentifierDependency[depIndex]
        ? this.commitIdentifierValue
        : NOOP_COMMIT,
      this.id,
      this._readValue,
      this._isDeferredValue,
      shouldForceDirty,
    );
  }

  private createEvaluateUnit(context: unknown): IExpressionEvaluateUnit {
    if (
      this.type === ExpressionType.Identifier &&
      this._dependencyUnits.length === 1
    ) {
      return this._dependencyUnits[0];
    }

    return new FunctionExpressionEvaluateUnit(
      this.expressionString,
      context,
      this._dependencyUnits,
      this.evaluateCompiledValue,
      this.commitValue,
      this.onDependencyDirty,
    );
  }

  public dispose(): void {
    if (this._isDisposed) {
      return;
    }
    if (!this._owner?.canDispose || this._owner?.canDispose()) {
      if (this._evaluateManagerForExpression) {
        this.runtimeServices.expressionEvaluateManager.release(this.onCommit);
      }
      this._evaluateManagerForExpression = undefined;
      this.internalDispose();
    }
    this._owner?.release?.();
  }

  public get value(): unknown {
    return this._value;
  }

  private internalDispose(): void {
    for (let i = 0; i < this._dependencyWatchRules.length; i++) {
      this._dependencyWatchRules[i].dispose();
    }
    this._dependencyWatchRules = [];
    this._dependencyUnits = [];
    if (this._requiresDependencyUnitByName) {
      this._dependencyUnitByName.clear();
    }
    if (this._hasOwnerPathDependencies) {
      this._dependencyUnitByPath.clear();
    }
    this._dirtyDependencyNames.clear();
    this._sequenceOperandValues = undefined;
    this._sequenceDependencySnapshot.clear();
    this._proxyByObject = undefined;
    this._needsResolvedMemberProxy = false;
    this._shouldRefreshDependencyContexts = false;
    this._bindContext = undefined;
    this._runtimeServices = undefined;
    this._cachedIndexValueAccessor = undefined;
    this._cachedIdentifierOwnerResolver = undefined;
    this._cachedIdentifierWatchRuleFactory = undefined;
    this._cachedWatchFactory = undefined;
    this._cachedValueMetadata = undefined;
    this._evaluateUnit = undefined;
    this._isAsync = undefined;
    this._isAsyncComputed = false;
    this._isDisposed = true;
  }

  private evaluateCompiledValue = (): unknown => {
    if (this._shouldRefreshDependencyContexts) {
      this.refreshDependencyContexts();
      this._shouldRefreshDependencyContexts = false;
    }

    if (this.type === ExpressionType.Identifier) {
      const identifierName = this._identifierDependencyName;
      if (identifierName) {
        const rootDependencyUnit =
          this._identifierDependencyUnit ?? this._dependencyUnits[0];
        if (rootDependencyUnit?.value !== undefined) {
          return rootDependencyUnit.value;
        }
        const resolved = this.resolveDependencyValue(identifierName, false);
        return resolved === UNRESOLVED ? PENDING : resolved;
      }
    }

    const sequenceOperands = this._plan.sequenceOperands;
    if (sequenceOperands !== undefined && sequenceOperands.length > 0) {
      return this.evaluateSequence(sequenceOperands);
    }

    const dependencyNames = this._plan.dependencyNames;
    const memberChain = this._plan.memberChain;
    if (memberChain !== undefined) {
      const args = this.resolveDependencyArguments(dependencyNames, false);
      if (args === PENDING) {
        return PENDING;
      }
      return this.evaluateMemberChain(memberChain, dependencyNames, args);
    }

    const args = this.resolveDependencyArguments(dependencyNames, false);
    if (args === PENDING) {
      return PENDING;
    }

    try {
      if (this._plan.evaluateResolvedDependencies) {
        return this._plan.evaluateResolvedDependencies(
          this._bindContext,
          this.runtimeIdentifierOwnerResolver,
          this.runtimeIndexValueAccessor,
          (value: unknown, ownerContext: unknown) =>
            this.normalizeDependencyValue(value, ownerContext),
          (value: unknown) => this.wrapForRuntimeEvaluation(value),
        );
      }

      return this._plan.evaluate(...args);
    } catch (error) {
      if (error instanceof PendingDependencyValueError) {
        return PENDING;
      }
      return undefined;
    }
  };

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    if (value === null || typeof value !== 'object') {
      return false;
    }
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }

  private commitValue = (): void => {
    let forceDirty = false;
    for (let i = 0; i < this._dependencyUnits.length; i++) {
      if (this._dependencyUnits[i].consumeForceDirtyCommit()) {
        forceDirty = true;
      }
    }

    if (forceDirty) {
      this.markRootDirty();
    }

    this.evaluateBottomToTop();
    this._dirtyDependencyNames.clear();
  };

  private commitIdentifierValue = (_: unknown, forceDirty?: boolean): void => {
    if (forceDirty) {
      this.markRootDirty();
    }
    this.evaluateBottomToTop();
    this._dirtyDependencyNames.clear();
  };

  private onDependencyDirty = (evaluateUnit: IExpressionEvaluateUnit): void => {
    if (typeof evaluateUnit.index === 'string') {
      this._dirtyDependencyNames.add(evaluateUnit.index);
    }
    if (this._hasOwnerPathDependencies) {
      this._shouldRefreshDependencyContexts = true;
    }
  };

  private resolveOwnerContext(
    dependencyName: string,
    ownerPath: readonly string[],
    context: unknown,
  ): unknown {
    if (ownerPath.length > 0) {
      let currentContext = context;
      const path: string[] = [];
      for (let i = 0; i < ownerPath.length; i++) {
        path.push(ownerPath[i]);
        const ownerDependencyUnit = this._dependencyUnitByPath.get(
          path.join('.'),
        );
        if (ownerDependencyUnit?.value !== undefined) {
          currentContext = ownerDependencyUnit.value;
          continue;
        }

        if (currentContext === undefined || currentContext === null) {
          return undefined;
        }
        try {
          currentContext = this.runtimeIndexValueAccessor.getValue(
            currentContext,
            ownerPath[i],
          );
        } catch {
          return undefined;
        }
      }
      if (
        !this.runtimeIndexValueAccessor.applies(currentContext, dependencyName)
      ) {
        return undefined;
      }
      return currentContext;
    }

    if (
      dependencyName.includes('.') ||
      dependencyName.includes('[') ||
      dependencyName.includes('(')
    ) {
      return context;
    }

    const resolvedContext =
      this.runtimeIdentifierOwnerResolver.resolve(dependencyName, context) ??
      context;
    if (
      !this.runtimeIndexValueAccessor.applies(resolvedContext, dependencyName)
    ) {
      return undefined;
    }
    return resolvedContext;
  }

  private refreshDependencyContexts(): void {
    if (this._bindContext === undefined) {
      return;
    }

    for (let i = 0; i < this._dependencyUnits.length; i++) {
      const dependency = this._watchDependencies[i];
      const dependencyUnit = this._dependencyUnits[i];
      const ownerContext = this.resolveOwnerContext(
        dependency.name,
        dependency.ownerPath,
        this._bindContext,
      );
      if (dependencyUnit.context !== ownerContext) {
        dependencyUnit.context = ownerContext;
      }
    }
  }

  private createDependencyPathKey(
    ownerPath: readonly string[],
    dependencyName: string,
  ): string {
    return [...ownerPath, dependencyName].join('.');
  }

  private normalizeDependencyValue(
    value: unknown,
    ownerContext: unknown,
  ): unknown {
    if (
      typeof value === 'function' &&
      ownerContext &&
      typeof ownerContext === 'object'
    ) {
      return value.bind(ownerContext);
    }
    return value;
  }

  private resolveDependencyArguments(
    dependencyNames: readonly string[],
    directFromContext: boolean,
  ): unknown[] | typeof PENDING {
    const args = new Array<unknown>(dependencyNames.length);
    for (let i = 0; i < dependencyNames.length; i++) {
      const dependency = this.resolveDependencyValue(
        dependencyNames[i],
        directFromContext,
      );
      if (dependency === UNRESOLVED) {
        return PENDING;
      }

      args[i] = dependency;
    }
    return args;
  }

  private resolveDependencyValue(
    dependencyName: string,
    directFromContext: boolean,
  ): unknown | typeof UNRESOLVED {
    const resolved = this.readDependencyRawValue(
      dependencyName,
      directFromContext,
    );
    const rawValue = resolved.value;
    if (rawValue === UNRESOLVED) {
      return UNRESOLVED;
    }

    const normalized = this.normalizeDependencyValue(
      rawValue,
      resolved.ownerContext,
    );
    return this.wrapForRuntimeEvaluation(normalized);
  }

  private readDependencyRawValue(
    dependencyName: string,
    directFromContext: boolean,
  ): { value: unknown | typeof UNRESOLVED; ownerContext: unknown } {
    if (this._bindContext === undefined) {
      return { value: UNRESOLVED, ownerContext: undefined };
    }

    const watchedUnit = !directFromContext
      ? this._dependencyUnitByName.get(dependencyName)
      : undefined;
    const ownerContext = watchedUnit
      ? watchedUnit.context
      : (this.runtimeIdentifierOwnerResolver.resolve(
          dependencyName,
          this._bindContext,
        ) ?? this._bindContext);

    let rawValue: unknown;
    if (watchedUnit && watchedUnit.value !== undefined) {
      rawValue = watchedUnit.value;
    } else {
      if (ownerContext !== null && ownerContext !== undefined) {
        if (Array.isArray(ownerContext) || this.isPlainObject(ownerContext)) {
          rawValue = (ownerContext as Record<string, unknown>)[dependencyName];
        } else {
          try {
            rawValue = this.runtimeIndexValueAccessor.getValue(
              ownerContext,
              dependencyName,
            );
          } catch {
            rawValue = undefined;
          }
        }
      } else {
        rawValue = undefined;
      }
    }

    if (rawValue === PENDING) {
      return { value: UNRESOLVED, ownerContext };
    }

    return { value: rawValue, ownerContext };
  }

  private wrapForRuntimeEvaluation(value: unknown): unknown {
    if (!this._needsResolvedMemberProxy) {
      return value;
    }

    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value !== 'object') {
      return value;
    }

    const target = value as object;
    this._proxyByObject ??= new WeakMap<object, unknown>();
    const cachedProxy = this._proxyByObject.get(target);
    if (cachedProxy !== undefined) {
      return cachedProxy;
    }

    const proxy = new Proxy(target, {
      get: (innerTarget, property, receiver) => {
        if (typeof property === 'symbol') {
          return Reflect.get(innerTarget, property, receiver);
        }

        let resolvedValue: unknown;
        try {
          resolvedValue = this.runtimeIndexValueAccessor.getResolvedValue(
            innerTarget,
            property,
          );
        } catch {
          resolvedValue = Reflect.get(innerTarget, property, receiver);
        }

        if (resolvedValue === PENDING) {
          throw new PendingDependencyValueError();
        }

        if (typeof resolvedValue === 'function') {
          return resolvedValue.bind(innerTarget);
        }

        return this.wrapForRuntimeEvaluation(resolvedValue);
      },
    });

    this._proxyByObject.set(target, proxy);
    return proxy;
  }

  private evaluateSequence(
    sequenceOperands: NonNullable<ICompiledExpressionPlan['sequenceOperands']>,
  ): unknown {
    const dependencyNames = this._plan.dependencyNames;
    const initialRun = this._sequenceOperandValues === undefined;

    if (initialRun) {
      this._sequenceOperandValues = new Array(sequenceOperands.length);
      for (let i = 0; i < dependencyNames.length; i++) {
        const raw = this.readDependencyRawValue(dependencyNames[i], true).value;
        this._sequenceDependencySnapshot.set(dependencyNames[i], raw);
      }
    }

    const changedDependencies = initialRun
      ? new Set(dependencyNames)
      : this.collectActuallyChangedDependencies(this._dirtyDependencyNames);

    for (let i = 0; i < sequenceOperands.length; i++) {
      const operand = sequenceOperands[i];
      const shouldEvaluate =
        initialRun ||
        this.hasCommonDependency(changedDependencies, operand.dependencyNames);
      if (!shouldEvaluate) {
        continue;
      }

      const args = this.resolveDependencyArguments(
        operand.dependencyNames,
        true,
      );
      if (args === PENDING) {
        return PENDING;
      }

      try {
        this._sequenceOperandValues![i] = operand.evaluate(...args);
      } catch (error) {
        if (error instanceof PendingDependencyValueError) {
          return PENDING;
        }
        this._sequenceOperandValues![i] = undefined;
      }

      this.trackSequenceDependencyMutations(changedDependencies);
    }

    return this._sequenceOperandValues![
      this._sequenceOperandValues!.length - 1
    ];
  }

  private hasCommonDependency(
    changedDependencies: Set<string>,
    dependencyNames: readonly string[],
  ): boolean {
    for (let i = 0; i < dependencyNames.length; i++) {
      if (changedDependencies.has(dependencyNames[i])) {
        return true;
      }
    }
    return false;
  }

  private collectActuallyChangedDependencies(
    dirtyDependencies: Set<string>,
  ): Set<string> {
    const changedDependencies = new Set<string>();
    dirtyDependencies.forEach((dependencyName) => {
      const nextValue = this.readDependencyRawValue(dependencyName, true).value;
      const previousValue =
        this._sequenceDependencySnapshot.get(dependencyName);
      if (!Object.is(previousValue, nextValue)) {
        this._sequenceDependencySnapshot.set(dependencyName, nextValue);
        changedDependencies.add(dependencyName);
      }
    });
    return changedDependencies;
  }

  private trackSequenceDependencyMutations(
    changedDependencies: Set<string>,
  ): void {
    const dependencyNames = this._plan.dependencyNames;
    for (let i = 0; i < dependencyNames.length; i++) {
      const dependencyName = dependencyNames[i];
      const nextValue = this.readDependencyRawValue(dependencyName, true).value;
      const previousValue =
        this._sequenceDependencySnapshot.get(dependencyName);
      if (!Object.is(previousValue, nextValue)) {
        this._sequenceDependencySnapshot.set(dependencyName, nextValue);
        changedDependencies.add(dependencyName);
      }
    }
  }

  private evaluateMemberChain(
    memberChain: NonNullable<ICompiledExpressionPlan['memberChain']>,
    dependencyNames: readonly string[],
    dependencyValues: readonly unknown[],
  ): unknown {
    const rootIndex = dependencyNames.indexOf(memberChain.rootIdentifier);
    if (rootIndex < 0) {
      return undefined;
    }

    let current: unknown = dependencyValues[rootIndex];

    if (current === undefined || current === PENDING) {
      return PENDING;
    }

    for (let i = 0; i < memberChain.segments.length; i++) {
      const segment = memberChain.segments[i];
      let index: unknown;
      try {
        index =
          segment.kind === 'computed'
            ? segment.evaluateIndex?.(...dependencyValues)
            : segment.key;
      } catch (error) {
        if (error instanceof PendingDependencyValueError) {
          return PENDING;
        }
        return undefined;
      }
      if (index === undefined || current === undefined || current === null) {
        return undefined;
      }

      try {
        if (typeof current === 'object' && current !== null) {
          if (Array.isArray(current) && typeof index === 'number') {
            current = current[index];
          } else if (typeof index === 'string') {
            const proto = Object.getPrototypeOf(current);
            if (proto === Object.prototype || proto === null) {
              current = (current as Record<string, unknown>)[index];
            } else {
              current = this.runtimeIndexValueAccessor.getResolvedValue(
                current,
                index,
              );
            }
          } else {
            current = this.runtimeIndexValueAccessor.getResolvedValue(
              current,
              index,
            );
          }
        } else {
          return undefined;
        }
      } catch {
        return undefined;
      }

      if (current === PENDING) {
        return PENDING;
      }

      if (current === undefined) {
        return undefined;
      }
    }

    return current;
  }

  private get runtimeIndexValueAccessor() {
    return this._cachedIndexValueAccessor!;
  }

  private get runtimeIdentifierOwnerResolver() {
    return this._cachedIdentifierOwnerResolver!;
  }

  private get runtimeIdentifierWatchRuleFactory() {
    return this._cachedIdentifierWatchRuleFactory!;
  }

  private get runtimeWatchFactory() {
    return this._cachedWatchFactory!;
  }

  private get runtimeValueMetadata() {
    return this._cachedValueMetadata!;
  }

  private get runtimeServices(): IExpressionServices {
    return this._runtimeServices as IExpressionServices;
  }

  private get leafIndexWatchRule(): IIndexWatchRule | undefined {
    return this._leafIndexWatchRule;
  }

  private initializeEvaluateManager(): void {
    if (!this._evaluateManagerForExpression) {
      this._evaluateManagerForExpression =
        this.runtimeServices.expressionEvaluateManager.createAndGetInstance(
          this.onCommit,
        );
    }
    this._evaluateManagerForExpression.initialize();
  }

  private evaluateBottomToTop(): boolean {
    const value = this.evaluateCompiledValue();
    if (value === PENDING) {
      return false;
    }

    this._oldValue = this._value;
    this._value = value;
    if (!Object.is(this._oldValue, this._value)) {
      this._isDirty = true;
    }

    if (this._changeHook) {
      this._changeHook(this, this._oldValue);
    }
    return true;
  }

  private markRootDirty(): void {
    this._isDirty = true;
  }

  private tryEmitChanged = (): void => {
    if (this._isDirty) {
      this._isDirty = false;
      this._lastChangedValue = this;
      this._changed?.next(this);
    }
  };

  private evalateTopToBottom = (): void => {
    this._oldValue = this._value;
    this._value = this.evaluateCompiledValue();
    if (!Object.is(this._oldValue, this._value)) {
      this._isDirty = true;
    }
    this.tryEmitChanged();
  };

  private onCommit = (initialized: boolean): void => {
    if (initialized) {
      this.tryEmitChanged();
    } else {
      this.evalateTopToBottom();
    }
  };
}
