import { IPropertyChange } from '@rs-x/core';
import { Observable, Subject } from 'rxjs';
import { IObserver } from './observer.interface';
import { IDisposableOwner } from './disposable-owner.interface';

export abstract class AbstractObserver<
   TTarget = unknown,
   TInitialValue = unknown,
   TId = unknown,
> implements IObserver<TTarget>
{
   private _isDisposed = false;
   private readonly _changed: Subject<IPropertyChange>;

   protected constructor(
      private readonly _owner: IDisposableOwner,
      private _target: TTarget,
      private _initialValue: TInitialValue,
      changed?: Subject<IPropertyChange>,
      public readonly id?: TId
   ) {
      this._changed = changed ?? new Subject<IPropertyChange>();
   }

   public get initialValue(): TInitialValue {
      return this._initialValue;
   }

   protected get isDisposed(): boolean {
      return this._isDisposed;
   }

   protected set initialValue(value: TInitialValue) {
      this._initialValue = value;
   }

   public get target(): TTarget {
      return this._target;
   }

   protected set target(value: TTarget) {
      this._target = value;
   }

   public get changed(): Observable<IPropertyChange> {
      return this._changed;
   }

   public init(): void {}

   public dispose(): void {
      if (this._isDisposed) {
         return;
      }

      if (!this._owner?.canDispose || this._owner.canDispose()) {
         this.disposeInternal();
         this._target = null;
         this._initialValue = null;
         this._isDisposed = true;
      }

      this._owner?.release?.();
   }

   protected abstract disposeInternal(): void;

   protected emitChange(change: IPropertyChange): void {
      this._changed.next(change);
   }
}
