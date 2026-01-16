import { IDisposableOwner, PENDING } from '@rs-x/core';
import { MustProxify } from '@rs-x/state-manager';
import { Observable, ReplaySubject, Subscription } from 'rxjs';
import { IExpressionChangeCommitHandler, IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';
import { ExpressionType, IExpression } from './interfaces';

export interface IMustProxifyHandler {
   createMustProxifyHandler: () => MustProxify;
   releaseMustProxifyHandler: () => void;
}

export interface IExpressionInitializeConfig {
   context?: unknown;
   mustProxifyHandler?: IMustProxifyHandler;
   transactionManager?: IExpressionChangeTransactionManager
   owner?: IDisposableOwner
}

export abstract class AbstractExpression<T = unknown, PT = unknown>
   implements IExpression<T> {

   protected readonly _childExpressions: AbstractExpression[] = [];
   private readonly _changed = new ReplaySubject<IExpression>(1);
   private _parent: AbstractExpression<PT>;
   protected _value: T;
   private _isDisposed = false;
   private _oldValue: unknown;
   private _commitedSubscription: Subscription;
   private _owner: IDisposableOwner;

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

   public initialize(
      settings: IExpressionInitializeConfig
   ): AbstractExpression {


      if (!this._parent && settings.transactionManager) {
         this._owner = settings.owner;
         this._commitedSubscription = settings.transactionManager.commited.subscribe(this.onCommited);
      }

      return this;
   }

   public get value(): T {
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

   public get parent(): AbstractExpression<PT> {
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

   protected abstract evaluate(sender: AbstractExpression, root: AbstractExpression): T;

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

   protected evaluateBottomToTop(sender: AbstractExpression, root: AbstractExpression,  pendingCommits: Set<IExpressionChangeCommitHandler>): boolean {
      const value = this.evaluate(sender, root);
      if (value === PENDING) {
         return false;
      }
      this._value = value;

      if (this.parent) {
         return this.parent.reevaluated(this, root, pendingCommits)
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
   }

   private addChildExpressions(expressions: AbstractExpression[]): void {
      this._childExpressions.push(...expressions);
      expressions.forEach((expression) => (expression._parent = this));
   }
}
