import { IStateManager, MustProxify } from '@rs-x/state-manager';
import { Observable, ReplaySubject, Subscription } from 'rxjs';
import { ExpressionType, IExpression } from './interfaces';

export interface IMustProxifyHandler {
   createMustProxifyHandler: () => MustProxify;
   releaseMustProxifyHandler: () => void;
}

export interface IExpressionInitializeConfig {
   stateManager: IStateManager;
   context?: unknown;
   mustProxifyHandler?: IMustProxifyHandler;
}

export abstract class AbstractExpression<T = unknown, PT = unknown>
   implements IExpression<T>
{
   protected readonly _childExpressions: AbstractExpression[] = [];
   private readonly _changed = new ReplaySubject<IExpression>(1);
   private _startChangeCycleSubscription: Subscription;
   private _endChangeCycleSubscription: Subscription;
   private _oldValue: unknown;
   private _parent: AbstractExpression<PT>;
   protected _value: T;
   private _isDisposed = false;

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
      if (this.parent || !settings.stateManager) {
         return;
      }

      if (this._startChangeCycleSubscription) {
         return;
      }

      this._startChangeCycleSubscription =
         settings.stateManager.startChangeCycly.subscribe(
            this.onStartChangeCycle
         );
      this._endChangeCycleSubscription =
         settings.stateManager.endChangeCycly.subscribe(this.onEndChangeCycle);
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

   public get rootExpressionString(): string {
      return this._parent?.rootExpressionString ?? this.expressionString;
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
      this._isDisposed = true;
      this._childExpressions.forEach((childExpression) =>
         childExpression.dispose()
      );

      this._startChangeCycleSubscription?.unsubscribe();
      this._endChangeCycleSubscription?.unsubscribe();
      this._startChangeCycleSubscription = undefined;
      this._endChangeCycleSubscription = undefined;
   }

   public toString(): string {
      return this.expressionString;
   }

   private onStartChangeCycle = (): void => {
      this._oldValue = this._value;
   };

   private onEndChangeCycle = (): void => {
      this.emitChange(this._oldValue);
   };

   private addChildExpressions(expressions: AbstractExpression[]): void {
      this._childExpressions.push(...expressions);
      expressions.forEach((expression) => (expression._parent = this));
   }

   protected abstract evaluateExpression(
      sender: AbstractExpression,
      ...args: unknown[]
   ): T;

   protected static setValue(
      expression: AbstractExpression,
      evaluate: () => unknown
   ): void {
      expression._value = evaluate();
   }

   protected static clearValue(expression: AbstractExpression): void {
      expression._value = undefined;
   }

   protected static setParent(
      expression: AbstractExpression,
      parent: AbstractExpression
   ): void {
      expression._parent = parent;
   }

   protected emitChange(oldValue: unknown): void {
      if (this._value === oldValue) {
         return;
      }
      this._oldValue = this.value;
      this._changed.next(this);
   }

   protected evaluate(sender: AbstractExpression, ...args: unknown[]): void {
      AbstractExpression.setValue(this, () =>
         this.evaluateExpression(sender, ...args)
      );

      this.propergateUpdate();
   }

   private propergateUpdate(): void {
      if (this.parent) {
         this.parent.evaluate(this);
      } else {
         this.emitChange(this._oldValue);
      }
   }
}
