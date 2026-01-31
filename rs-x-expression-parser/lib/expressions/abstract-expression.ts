import { type Observable, ReplaySubject, type Subscription } from 'rxjs';

import { type IDisposableOwner, type IGuidFactory, type IIndexValueAccessor, type IValueMetadata, PENDING } from '@rs-x/core';
import { type IStateManager, type ShouldWatchIndex } from '@rs-x/state-manager';

import { type IExpressionChangeCommitHandler, type IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';
import type { IExpressionServices } from '../expression-services/expression-services.interface';

import type { IExpressionBindConfiguration } from './expression-bind-configuration.type';
import { type ExpressionType, type IExpression } from './expression-parser.interface';

export interface IShouldWatchLeafPredicate {
   createShouldWatchLeafPredicate: (() => ShouldWatchIndex) | undefined;
   releaseShouldWatchLeafPredicate: (() => void) | undefined;
}

export abstract class AbstractExpression<T = unknown, PT = unknown>
   implements IExpression<T> {

   protected readonly _childExpressions: AbstractExpression[] = [];
   private readonly _changed = new ReplaySubject<IExpression>(1);
   private _parent: AbstractExpression<PT> | undefined;
   protected _value: T | undefined;
   private _isDisposed = false;
   private _oldValue: unknown;
   private _commitedSubscription: Subscription | undefined;
   private _owner: IDisposableOwner | undefined;
   private _services!:IExpressionServices;

   protected constructor(
      public readonly type: ExpressionType,
      public readonly expressionString: string,
      ...childExpressions: AbstractExpression[]
   ) {
      if (!expressionString) {
         this.expressionString = this.toString();
      }
      this.addChildExpressions(
         childExpressions.filter((childExpression) => childExpression)
      );
   }


   public abstract clone(): this;

   public bind(settings: IExpressionBindConfiguration): AbstractExpression {
      this._services = settings.services;
      if (!this._parent && this.transactionManager) {
         this._owner = settings.owner;
         this._commitedSubscription = this.transactionManager.commited.subscribe(this.onCommited);
      }

      return this;
   }

   public get value(): T | undefined {
      return this._value;
   }

   public get isRoot(): boolean {
      return !this.parent;
   }

   public get changed(): Observable<IExpression> {
      return this._changed;
   }

   public get childExpressions(): readonly IExpression[] {
      return this._childExpressions;
   }

   public get parent(): AbstractExpression<PT> | undefined {
      return this._parent;
   }

   public dispose(): void {
      if (this._isDisposed) {
         return;
      }

      if (!this._owner?.canDispose || this._owner?.canDispose()) {
         this.internalDispose();
      }

      this._owner?.release?.();
   }

   public toString(): string {
      return this.expressionString;
   }

   protected get services(): IExpressionServices {
      return this._services;
   }

   protected get guidFactory(): IGuidFactory {
      return this._services?.guidFactory;
   }

   protected get stateManager(): IStateManager {
      return this._services?.stateManager;
   }

   protected get indexValueAccessor(): IIndexValueAccessor {
      return this._services?.indexValueAccessor;
   }

   protected get transactionManager(): IExpressionChangeTransactionManager {
      return this._services?.transactionManager;
   }

   protected get valueMetadata(): IValueMetadata {
      return this._services?.valueMetadata;
   }

   protected get root(): AbstractExpression {
      return this.parent ? this.parent.root : this;
   }

   protected static setValue(
      expression: AbstractExpression,
      evaluate: () => unknown
   ): void {
      expression._value = evaluate();
   }

   protected static setParent(
      expression: AbstractExpression,
      parent: AbstractExpression
   ): void {
      expression._parent = parent;
   }

   protected static clearValue(expression: AbstractExpression): void {
      expression._value = undefined;
   }

   protected abstract evaluate(sender: AbstractExpression, root: AbstractExpression): T | undefined;

   protected internalDispose(): void {
      this._commitedSubscription?.unsubscribe();
      this._commitedSubscription = undefined;
      this._childExpressions.forEach((childExpression) =>
         childExpression.dispose()
      );
      this._isDisposed = true;
   }

   protected prepareReevaluation(sender: AbstractExpression, root: AbstractExpression, pendingCommits: Set<IExpressionChangeCommitHandler>): boolean {
      if (this._parent) {
         return this._parent.prepareReevaluation(sender, root, pendingCommits);
      }
      return true;
   }

   protected reevaluated(sender: AbstractExpression, root: AbstractExpression, pendingCommits: Set<IExpressionChangeCommitHandler>): boolean {
      return this.prepareReevaluation(sender, root, pendingCommits)
         ? this.evaluateBottomToTop(sender, root, pendingCommits)
         : false;
   }

   protected evaluateBottomToTop(sender: AbstractExpression, root: AbstractExpression, pendingCommits: Set<IExpressionChangeCommitHandler>): boolean {
      const value = this.evaluate(sender, root);
      if (value === PENDING) {
         return false;
      }
      this._value = value;

      if (this.parent) {
         return this.parent.reevaluated(this, root, pendingCommits);
      }
      return true;
   }

   protected isCommitTarget(sender: AbstractExpression): boolean {
      return sender === this || sender.root === sender;
   }

   private onCommited = (sender: AbstractExpression) => {
      if (this.isCommitTarget(sender) && this._oldValue !== this.value) {
         this._oldValue = this._value;
         this._changed.next(this);
      }
   };

   private addChildExpressions(expressions: AbstractExpression[]): void {
      this._childExpressions.push(...expressions);
      expressions.forEach((expression) => (expression._parent = this));
   }
}
