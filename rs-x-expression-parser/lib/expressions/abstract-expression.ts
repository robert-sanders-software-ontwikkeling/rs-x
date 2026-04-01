import { type Observable, ReplaySubject } from 'rxjs';

import {
  type IDisposableOwner,
  type IGuidFactory,
  type IIndexValueAccessor,
  type IValueMetadata,
  PENDING,
} from '@rs-x/core';
import type {
  IIndexWatchRule,
  IStateManager,
  IWatchFactory,
} from '@rs-x/state-manager';

import {
  type IEvaluateManagerForExpression,
  type IExpressionEvaluateManager,
} from '../expression-evaluate-manager/expression-evaluate-manager.interface';
import { type IExpressionEvaluateUnit } from '../expression-evaluate-manager/expression-evaluate-unit.interface';
import type { IExpressionServices } from '../expression-services/expression-services.interface';
import { type IIdentifierOwnerResolver } from '../identifier-owner-resolver/identifier-owner-resolver.interface';

import type { IIdentifierWatchRuleFactory } from './identifier-index-watch-rule/identifier-watch-rule.factory.interface';
import type { IExpressionBindConfiguration } from './expression-bind-configuration.type';
import {
  type ChangeHook,
  type ExpressionType,
  type IExpression,
  type IExpressionTree,
} from './expression-parser.interface';

export abstract class AbstractExpression<
  T = unknown,
  PT = unknown,
> implements IExpressionTree<T> {
  private _changed: ReplaySubject<IExpression> | undefined;
  private _lastChangedValue: IExpression | undefined;
  private _parent: AbstractExpression<PT> | undefined;
  private _id!: string;
  private _isDisposed = false;
  private _owner: IDisposableOwner | undefined;
  private _services!: IExpressionServices;
  private _leafIndexWatchRule?: IIndexWatchRule | undefined;
  private _changeHook?: ChangeHook;
  private _evaluateManagerForExpression?: IEvaluateManagerForExpression;
  private _hidden: boolean;
  protected readonly _childExpressions!: AbstractExpression[];
  private _value: T | undefined;
  private _oldValue: unknown;
  private _isDirty = false;
  private _pendingDirtyCount = 0;

  private static readonly _EMPTY_CHILDREN: AbstractExpression[] = [];

  protected constructor(
    public readonly type: ExpressionType,
    public readonly expressionString: string,
    children?: AbstractExpression[],
  ) {
    if (!expressionString) {
      this.expressionString = this.toString();
    }
    this._hidden = false;

    if (children?.length) {
      const arr: AbstractExpression[] = [];
      for (let i = 0; i < children.length; i++) {
        const expr = children[i];
        if (expr) {
          arr.push(expr);
          expr._parent = this;
        }
      }
      this._childExpressions = arr;
    } else {
      this._childExpressions = AbstractExpression._EMPTY_CHILDREN;
    }
  }

  public get hidden(): boolean {
    return this._hidden;
  }

  public get id(): string {
    if (!this._id) {
      this._id = this._services?.expressionIdProvider?.getId?.(this);
    }
    return this._id;
  }

  public get isAsync(): boolean | undefined {
    return false;
  }

  public get isDisposed(): boolean {
    return this._isDisposed;
  }

  public get changeHook(): ChangeHook | undefined {
    return this._changeHook;
  }

  public set changeHook(value: ChangeHook | undefined) {
    this._changeHook = value;
    this._childExpressions.forEach(
      (childExpression) => (childExpression.changeHook = value),
    );

    if (this._changeHook && this.value !== undefined) {
      this._changeHook(this, undefined);
    }
  }

  public get value(): T | undefined {
    return this._value;
  }

  protected set value(value: T | undefined) {
    this._oldValue = this._value;
    this._value = value;
    const isChanged = !Object.is(this._oldValue, this._value);

    this._isDirty = !this._parent && (this._isDirty || isChanged);
  }

  public get isRoot(): boolean {
    return !this._parent;
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

  public get childExpressions(): readonly IExpressionTree[] {
    return this._childExpressions;
  }

  public get parent(): AbstractExpression<PT> | undefined {
    return this._parent;
  }

  public abstract clone(): this;

  public bind(settings: IExpressionBindConfiguration): AbstractExpression {
    this._services = settings.services;
    this._leafIndexWatchRule = settings.leafIndexWatchRule;

    this.bindChildren(settings);

    this.onBind(settings);

    if (!this._parent) {
      this._owner = settings.owner;
    }
    return this;
  }

  public dispose(): void {
    if (this._isDisposed) {
      return;
    }

    if (!this._owner?.canDispose || this._owner?.canDispose()) {
      if (this._evaluateManagerForExpression && this.isEvaluationBoundary) {
        this._services?.expressionEvaluateManager?.release(this.onCommit);
      }
      this._evaluateManagerForExpression = undefined;
      this.internalDispose();
    }

    this._owner?.release?.();
  }

  public toString(): string {
    return this.expressionString;
  }

  protected get root(): AbstractExpression {
    return this._parent ? this._parent.root : this;
  }

  protected get services(): IExpressionServices {
    return this._services;
  }

  protected get guidFactory(): IGuidFactory {
    return this._services?.guidFactory;
  }

  protected get leafIndexWatchRule(): IIndexWatchRule | undefined {
    return this._leafIndexWatchRule;
  }

  protected get stateManager(): IStateManager {
    return this._services?.stateManager;
  }

  protected get indexValueAccessor(): IIndexValueAccessor {
    return this._services?.indexValueAccessor;
  }

  protected get identifierOwnerResolver(): IIdentifierOwnerResolver {
    return this._services?.identifierOwnerResolver;
  }

  protected get expressionEvaluateManager(): IExpressionEvaluateManager {
    return this._services?.expressionEvaluateManager;
  }

  protected get identifierWatchRuleFactory(): IIdentifierWatchRuleFactory {
    return this._services?.identifierWatchRuleFactory;
  }

  protected get watchFactory(): IWatchFactory {
    return this._services?.watchFactory;
  }

  protected get valueMetadata(): IValueMetadata {
    return this._services?.valueMetadata;
  }

  protected get absoluteRoot(): AbstractExpression {
    return this._parent ? this._parent.absoluteRoot : this;
  }

  protected get isEvaluationBoundary(): boolean {
    return this.isRoot;
  }

  protected get evaluateManagerForExpression(): IEvaluateManagerForExpression {
    if (!this._evaluateManagerForExpression) {
      this._evaluateManagerForExpression = this.isEvaluationBoundary
        ? this.createEvaluateManagerForExpression()
        : this.parent
          ? this.parent.evaluateManagerForExpression
          : undefined;
    }
    return this._evaluateManagerForExpression as IEvaluateManagerForExpression;
  }
  protected get expressionEvaluateUnit(): IExpressionEvaluateUnit | undefined {
    return undefined;
  }

  protected bindChildren(settings: IExpressionBindConfiguration): void {
    for (let i = 0; i < this._childExpressions.length; i++) {
      this._childExpressions[i].bind(settings);
    }
  }

  protected onBind(_: IExpressionBindConfiguration): void {
    if (!this.parent) {
      this.evaluateManagerForExpression.initialize();
    }
  }

  protected createEvaluateManagerForExpression(): IEvaluateManagerForExpression {
    return this.expressionEvaluateManager.createAndGetInstance(this.onCommit);
  }

  private onCommit = (initialized: boolean) => {
    if (initialized) {
      this.tryEmitChanged();
    } else {
      this.evalateTopToBottom();
    }
  };

  protected static getExpressionEvaluateUnit(
    expression: AbstractExpression,
  ): IExpressionEvaluateUnit | undefined {
    return expression.expressionEvaluateUnit;
  }

  protected static evaluateExpression(expression: AbstractExpression): unknown {
    return expression.evaluate();
  }

  protected static setHidden<T extends AbstractExpression>(target: T): T {
    target._hidden = true;
    return target;
  }

  protected static setValue(
    expression: AbstractExpression,
    evaluate: () => unknown,
  ): void {
    expression._value = evaluate();
  }

  protected static setParent(
    expression: AbstractExpression,
    parent: AbstractExpression,
  ): void {
    expression._parent = parent;
  }

  protected static clearValue(expression: AbstractExpression): void {
    expression._value = undefined;
  }

  protected abstract evaluate(): T | undefined;

  protected internalDispose(): void {
    for (let i = 0; i < this._childExpressions.length; i++) {
      this._childExpressions[i].dispose();
    }
    this._isDisposed = true;
  }

  protected canEvaluate(): boolean {
    return true;
  }

  protected reevaluated = (): boolean => {
    return this.canEvaluate() ? this.evaluateBottomToTop() : false;
  };

  /**
   * Walk from this node up to the root, incrementing each ancestor's
   * `_pendingDirtyCount` by 1. If an ancestor's count was already > 0
   * its parent is already registered — stop early to avoid double-counting.
   * Used by batch-aware evaluate units before committing so that shared
   * ancestor nodes wait for all dirty children before re-evaluating.
   */
  protected incrementAncestorPendingCounts(): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let node: AbstractExpression = this;
    while (node._parent !== undefined) {
      const parent = node._parent as AbstractExpression;
      parent._pendingDirtyCount++;
      if (parent._pendingDirtyCount > 1) {
        // Parent is already on a dirty path; its own parent is already counted.
        break;
      }
      node = parent;
    }
  }

  protected evaluateBottomToTop(): boolean {
    const value = this.evaluate();

    if (value === PENDING) {
      // Release our slot in the parent's pending count so the batch stays clean.
      if (this._parent) {
        const parent = this._parent as AbstractExpression;
        if (parent._pendingDirtyCount > 0) {
          parent._pendingDirtyCount--;
          if (parent._pendingDirtyCount === 0) {
            parent.reevaluated();
          }
        }
      }
      return false;
    }

    this.value = value;

    if (this.changeHook) {
      this.changeHook(this, this._oldValue);
    }

    if (this._parent) {
      const parent = this._parent as AbstractExpression;
      if (parent._pendingDirtyCount > 0) {
        parent._pendingDirtyCount--;
        if (parent._pendingDirtyCount > 0) {
          return true; // More dirty children still pending — defer parent evaluation.
        }
      }
      return parent.reevaluated();
    }
    return true;
  }

  protected evalateTopToBottom(): void {
    for (let i = 0; i < this._childExpressions.length; i++) {
      const childExpression = this._childExpressions[i];
      childExpression.evalateTopToBottom();
      const value = childExpression.value;
      if (this.shouldAbortTopDownEvaluation(childExpression, value)) {
        return;
      }
    }
    this.value = this.evaluate();
    this.tryEmitChanged();
  }

  protected shouldAbortTopDownEvaluation(
    _childExpression: AbstractExpression,
    value: unknown,
  ): boolean {
    return value === undefined;
  }

  protected markRootDirty(): void {
    this.absoluteRoot._isDirty = true;
  }

  private tryEmitChanged = () => {
    if (this._isDirty) {
      this._isDirty = false;
      this._lastChangedValue = this;
      this._changed?.next(this);
    }
  };

}
