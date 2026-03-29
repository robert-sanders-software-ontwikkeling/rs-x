import { PENDING } from '@rs-x/core';
import { type IIndexWatchRule } from '@rs-x/state-manager';

import {
  FunctionExpressionEvaluateUnit,
  IdentifierExpressionEvaluateUnit,
  type IExpressionEvaluateUnit,
} from '../expression-evaluate-manager';
import { ArrayExpression } from '../expressions/array-expression';
import { AbstractExpression } from '../expressions/abstract-expression';
import type { IExpressionBindConfiguration } from '../expressions/expression-bind-configuration.type';
import {
  ExpressionType,
  type IExpression,
} from '../expressions/expression-parser.interface';

import type { ICompiledExpressionPlan } from './compiled-expression.compiler.interface';

class PendingDependencyValueError extends Error {}
const UNRESOLVED = Symbol('compiled-expression-unresolved');

class CompiledVirtualExpression extends AbstractExpression {
  constructor(
    type: ExpressionType,
    expressionString: string,
    private readonly _evaluateValue: () => unknown,
    children?: AbstractExpression[],
  ) {
    super(type, expressionString, children);
  }

  public override clone(): this {
    return new CompiledVirtualExpression(
      this.type,
      this.expressionString,
      this._evaluateValue,
      this._childExpressions.map((child) => child.clone()),
    ) as this;
  }

  public override get value(): unknown {
    return this.evaluate();
  }

  protected override evaluate(): unknown {
    return this._evaluateValue();
  }

  protected override shouldAbortTopDownEvaluation(): boolean {
    return false;
  }
}

export class CompiledExpression extends AbstractExpression {
  private _evaluateUnit: IExpressionEvaluateUnit | undefined;
  private _dependencyUnits: IdentifierExpressionEvaluateUnit[] = [];
  private _watchDependencies: ICompiledExpressionPlan['watchDependencies'] = [];
  private _dependencyUnitByName = new Map<string, IdentifierExpressionEvaluateUnit>();
  private _dependencyUnitByPath = new Map<string, IdentifierExpressionEvaluateUnit>();
  private _dependencyWatchRules: IIndexWatchRule[] = [];
  private _dirtyDependencyNames = new Set<string>();
  private _sequenceOperandValues: unknown[] | undefined;
  private _sequenceDependencySnapshot = new Map<string, unknown>();
  private _proxyByObject = new WeakMap<object, unknown>();
  private _needsResolvedMemberProxy = false;
  private _contractChildren: AbstractExpression[] = [];
  private _bindContext: unknown;

  constructor(private readonly _plan: ICompiledExpressionPlan) {
    super(
      _plan.expressionType,
      _plan.expressionString,
      _plan.hasHiddenArgumentArray
        ? [AbstractExpression.setHidden(new ArrayExpression([]))]
        : undefined,
    );
    this._watchDependencies = _plan.watchDependencies;
    this._contractChildren = this.createContractChildren();
    for (let i = 0; i < this._contractChildren.length; i++) {
      AbstractExpression.setParent(this._contractChildren[i], this);
    }
  }

  public override clone(): this {
    return new CompiledExpression(this._plan) as this;
  }

  public override get childExpressions(): readonly IExpression[] {
    if (this._contractChildren.length === 0) {
      return super.childExpressions;
    }

    return [...super.childExpressions, ...this._contractChildren];
  }

  protected override get expressionEvaluateUnit():
    | IExpressionEvaluateUnit
    | undefined {
    return this._evaluateUnit;
  }

  protected override onBind(settings: IExpressionBindConfiguration): void {
    this._dependencyUnits = [];
    this._dependencyUnitByName.clear();
    this._dependencyUnitByPath.clear();
    this._dependencyWatchRules = [];
    this._watchDependencies = this._plan.watchDependencies;
    this._dirtyDependencyNames.clear();
    this._sequenceOperandValues = undefined;
    this._sequenceDependencySnapshot.clear();
    this._proxyByObject = new WeakMap<object, unknown>();
    this._needsResolvedMemberProxy = this._watchDependencies.some(
      (dependency) =>
        dependency.ownerPath.length > 0 || dependency.isMemberExpressionSegment,
    );

    const context = settings.context;
    this._bindContext = context;
    if (context === undefined) {
      super.onBind(settings);
      return;
    }

    const watchDependencies = this._plan.watchDependencies;
    for (let i = 0; i < watchDependencies.length; i++) {
      const dependency = watchDependencies[i];
      const dependencyName = dependency.name;
      const dependencyPath = this.createDependencyPathKey(
        dependency.ownerPath,
        dependencyName,
      );
      const ownerContext = this.resolveOwnerContext(
        dependencyName,
        dependency.ownerPath,
        context,
      );
      const watchRule = this.identifierWatchRuleFactory.create(ownerContext, {
        index: dependencyName,
        isLeaf: dependency.isLeaf,
        isMemberExpressionSegment: dependency.isMemberExpressionSegment,
        indexWatchRule: this.leafIndexWatchRule,
      });
      this._dependencyWatchRules.push(watchRule);
      const dependencyUnit = new IdentifierExpressionEvaluateUnit(
        dependencyName,
        ownerContext,
        this.watchFactory,
        watchRule,
        () => {},
        this.root,
        (valueContext, index) =>
          this.indexValueAccessor.getValue(valueContext, index),
        (value) => this.valueMetadata.isAsync(value),
        this.type === 'identifier' && dependency.ownerPath.length === 0,
        this.shouldForceDirtyForStaticMemberLeaf(dependency),
      );
      this._dependencyUnits.push(dependencyUnit);
      this._dependencyUnitByPath.set(dependencyPath, dependencyUnit);
      if (
        this._plan.dependencyNames.includes(dependencyName) &&
        !this._dependencyUnitByName.has(dependencyName) &&
        dependency.ownerPath.length === 0
      ) {
        this._dependencyUnitByName.set(dependencyName, dependencyUnit);
      }
    }

    this._evaluateUnit = new FunctionExpressionEvaluateUnit(
      this.expressionString,
      context,
      this._dependencyUnits,
      this.evaluateCompiledValue,
      this.commitValue,
      this.onDependencyDirty,
    );
    this.evaluateManagerForExpression.register(this._evaluateUnit);

    for (let i = 0; i < this._contractChildren.length; i++) {
      this._contractChildren[i].bind(settings);
    }

    super.onBind(settings);
  }

  protected override evaluate(): unknown {
    if (this._evaluateUnit) {
      const value = this._evaluateUnit.value;
      if (value !== undefined) {
        return value;
      }
      const eagerValue = this.evaluateCompiledValue();
      return eagerValue === PENDING ? undefined : eagerValue;
    }
    return this.evaluateCompiledValue();
  }

  protected override internalDispose(): void {
    for (let i = 0; i < this._dependencyWatchRules.length; i++) {
      this._dependencyWatchRules[i].dispose();
    }
    this._dependencyWatchRules = [];
    this._dependencyUnits = [];
    this._dependencyUnitByName.clear();
    this._dependencyUnitByPath.clear();
    this._dirtyDependencyNames.clear();
    this._sequenceOperandValues = undefined;
    this._sequenceDependencySnapshot.clear();
    this._proxyByObject = new WeakMap<object, unknown>();
    this._needsResolvedMemberProxy = false;
    for (let i = 0; i < this._contractChildren.length; i++) {
      this._contractChildren[i].dispose();
    }
    this._contractChildren = [];
    this._bindContext = undefined;
    this._evaluateUnit = undefined;
    super.internalDispose();
  }

  private evaluateCompiledValue = (): unknown => {
    this.refreshDependencyContexts();

    const sequenceOperands = this._plan.sequenceOperands;
    if (sequenceOperands !== undefined && sequenceOperands.length > 0) {
      return this.evaluateSequence(sequenceOperands);
    }

    const dependencyNames = this._plan.dependencyNames;
    const args = this.resolveDependencyArguments(dependencyNames, false);
    if (args === PENDING) {
      return PENDING;
    }

    const memberChain = this._plan.memberChain;
    if (memberChain !== undefined) {
      return this.evaluateMemberChain(memberChain, dependencyNames, args);
    }

    try {
      return this._plan.evaluate(...args);
    } catch (error) {
      if (error instanceof PendingDependencyValueError) {
        return PENDING;
      }
      return undefined;
    }
  };

  private commitValue = (): void => {
    let forceDirty = false;
    for (let i = 0; i < this._dependencyUnits.length; i++) {
      const unit = this._dependencyUnits[i] as IdentifierExpressionEvaluateUnit & {
        consumeForceDirtyCommit?: () => boolean;
      };
      if (unit.consumeForceDirtyCommit?.()) {
        forceDirty = true;
      }
    }

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
        const ownerDependencyUnit = this._dependencyUnitByPath.get(path.join('.'));
        if (ownerDependencyUnit?.value !== undefined) {
          currentContext = ownerDependencyUnit.value;
          continue;
        }

        if (currentContext === undefined || currentContext === null) {
          return undefined;
        }
        try {
          currentContext = this.indexValueAccessor.getValue(
            currentContext,
            ownerPath[i],
          );
        } catch {
          return undefined;
        }
      }
      if (!this.indexValueAccessor.applies(currentContext, dependencyName)) {
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
      this.identifierOwnerResolver.resolve(dependencyName, context) ?? context;
    if (!this.indexValueAccessor.applies(resolvedContext, dependencyName)) {
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
    if (typeof value === 'function' && ownerContext && typeof ownerContext === 'object') {
      return value.bind(ownerContext);
    }
    return value;
  }

  private shouldForceDirtyForStaticMemberLeaf(
    dependency: ICompiledExpressionPlan['watchDependencies'][number],
  ): boolean {
    if (this.type !== ExpressionType.Member) {
      return false;
    }

    const memberChain = this._plan.memberChain;
    if (!memberChain || memberChain.segments.length === 0) {
      return false;
    }

    const lastSegment = memberChain.segments[memberChain.segments.length - 1];
    return (
      lastSegment.kind === 'static' &&
      dependency.ownerPath.length === 0 &&
      dependency.name === memberChain.rootIdentifier
    );
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
    const resolved = this.readDependencyRawValue(dependencyName, directFromContext);
    const rawValue = resolved.value;
    if (rawValue === UNRESOLVED) {
      return UNRESOLVED;
    }

    const normalized = this.normalizeDependencyValue(rawValue, resolved.ownerContext);
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
      : this.identifierOwnerResolver.resolve(dependencyName, this._bindContext) ??
        this._bindContext;

    let rawValue: unknown;
    if (watchedUnit && watchedUnit.value !== undefined) {
      rawValue = watchedUnit.value;
    } else {
      try {
        rawValue = this.indexValueAccessor.getValue(ownerContext, dependencyName);
      } catch {
        rawValue =
          ownerContext !== null &&
          ownerContext !== undefined &&
          typeof ownerContext === 'object'
            ? (ownerContext as Record<string, unknown>)[dependencyName]
            : undefined;
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
          resolvedValue = this.indexValueAccessor.getResolvedValue(
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
      : new Set(this._dirtyDependencyNames);

    for (let i = 0; i < sequenceOperands.length; i++) {
      const operand = sequenceOperands[i];
      const shouldEvaluate =
        initialRun ||
        this.hasCommonDependency(changedDependencies, operand.dependencyNames);
      if (!shouldEvaluate) {
        continue;
      }

      const args = this.resolveDependencyArguments(operand.dependencyNames, true);
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

    return this._sequenceOperandValues![this._sequenceOperandValues!.length - 1];
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

  private trackSequenceDependencyMutations(
    changedDependencies: Set<string>,
  ): void {
    const dependencyNames = this._plan.dependencyNames;
    for (let i = 0; i < dependencyNames.length; i++) {
      const dependencyName = dependencyNames[i];
      const nextValue = this.readDependencyRawValue(dependencyName, true).value;
      const previousValue = this._sequenceDependencySnapshot.get(dependencyName);
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
        current = this.indexValueAccessor.getResolvedValue(current, index);
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

  private createContractChildren(): AbstractExpression[] {
    const memberChain = this._plan.memberChain;
    if (!memberChain) {
      return [];
    }

    const segments: AbstractExpression[] = [];
    segments.push(
      new CompiledVirtualExpression(
        ExpressionType.Identifier,
        memberChain.rootIdentifier,
        () => {
          const value = this.readDependencyRawValue(
            memberChain.rootIdentifier,
            true,
          ).value;
          return value === UNRESOLVED ? undefined : value;
        },
      ),
    );

    for (let i = 0; i < memberChain.segments.length; i++) {
      const segment = memberChain.segments[i];
      if (segment.kind === 'static') {
        segments.push(
          new CompiledVirtualExpression(
            ExpressionType.Identifier,
            String(segment.key ?? ''),
            () => segment.key,
          ),
        );
        continue;
      }

      const dependencyNames = segment.dependencyNames ?? [];
      const dependencyChildren = dependencyNames.map(
        (dependencyName) =>
          new CompiledVirtualExpression(
            ExpressionType.Identifier,
            dependencyName,
            () => {
              const value = this.readDependencyRawValue(
                dependencyName,
                true,
              ).value;
              return value === UNRESOLVED ? undefined : value;
            },
          ),
      );

      segments.push(
        new CompiledVirtualExpression(
          ExpressionType.ComputedIndex,
          segment.expressionString ?? '[computed]',
          () => {
            const args = dependencyNames.map((dependencyName) => {
              const value = this.readDependencyRawValue(dependencyName, true).value;
              return value === UNRESOLVED ? undefined : value;
            });
            try {
              if (segment.evaluateIndexByOwnDependencies) {
                return segment.evaluateIndexByOwnDependencies(...args);
              }
              return segment.evaluateIndex?.(...args);
            } catch {
              return undefined;
            }
          },
          dependencyChildren,
        ),
      );
    }

    return segments;
  }
}
