import { type Observable, Subject } from 'rxjs';

import { type IDisposableOwner, type IPropertyChange, Type } from '@rs-x/core';

import { type IObserver } from './observer.interface';

export abstract class AbstractObserver<
  TTarget = unknown,
  TValue = unknown,
  TId = unknown,
> implements IObserver<TTarget> {
  private _isDisposed = false;
  private readonly _changed: Subject<IPropertyChange>;

  protected constructor(
    private readonly _owner: IDisposableOwner | undefined,
    private _target: TTarget,
    private _value: TValue | undefined,
    changed?: Subject<IPropertyChange>,
    public readonly id?: TId,
  ) {
    this._changed = changed ?? new Subject<IPropertyChange>();
  }

  public get value(): TValue | undefined {
    return this._value;
  }

  protected set value(value: TValue | undefined) {
    this._value = value;
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
      this._target = Type.cast(undefined);
      this._value = Type.cast(undefined);
      this._isDisposed = true;
    }

    this._owner?.release?.();
  }

  protected get isDisposed(): boolean {
    return this._isDisposed;
  }

  protected disposeInternal(): void {}

  protected emitChange(change: IPropertyChange): void {
    this._changed.next(change);
  }
}
