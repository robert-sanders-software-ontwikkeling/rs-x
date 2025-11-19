import { IErrorLog, IPropertyChange, Type } from '@rs-x/core';
import { ReplaySubject, Subscription } from 'rxjs';
import { AbstractObserver } from './abstract-observer';
import { IDisposableOwner } from './disposable-owner.interface';
import { IObserver } from './observer.interface';

export class ObserverGroup extends AbstractObserver {
   private readonly _subscriptions = new Map<IObserver, Subscription>();
   private _rootChangeSubscription: Subscription;
   private readonly _observers: IObserver[] = [];
   private readonly mustHandleChange: (change: IPropertyChange) => boolean;
   private _rootObserver: IObserver;
   private _isInitialized = false;

   protected _parent: ObserverGroup;

   constructor(
      owner: IDisposableOwner,
      target: unknown,
      initialValue: unknown,
      mustHandleChange: (change: IPropertyChange) => boolean,
      private readonly _errorLog: IErrorLog,
      id?: unknown,
      private readonly getRootObserver?: () => IObserver,
      private readonly _observeRootObserver?: boolean
   ) {
      super(owner, target, initialValue, new ReplaySubject(1), id);
      this.mustHandleChange = mustHandleChange ?? (() => true);
   }

   public get rootObserver(): IObserver {
      if (!this._rootObserver && this.getRootObserver) {
         this._rootObserver = this.getRootObserver();
      }
      return this._rootObserver;
   }

   public override init(): void {
      if (this._isInitialized) {
         return;
      }

      this._isInitialized = true;
      this.rootObserver?.init();
      this._observers.forEach((observer) => observer.init());

      if (this._observeRootObserver && this.rootObserver) {
         this._rootChangeSubscription = this._rootObserver.changed.subscribe({
            next: this.emitChange,
            error: (e) =>
               this._errorLog.add({
                  message: `Failed to handle change for ${this._rootObserver.target.constructor.name}[${this._rootObserver.id}]`,
                  exception: e,
                  context: this._rootObserver.target,
                  fatal: true,
               }),
         });
      }
   }

   public addObservers(observers: IObserver[]): ObserverGroup {
      this._observers.push(...observers);

      observers
         .filter((observer) => observer instanceof ObserverGroup)
         .forEach((observer) => (observer._parent = this));

      observers.forEach((observer) =>
         this._subscriptions.set(
            observer,
            observer.changed.subscribe({
               next: this.emitChange,
               error: (e) =>
                  this._errorLog.add({
                     message: 'Failed to handle change emitted',
                     exception: e,
                     context: this,
                     fatal: true,
                  }),
            })
         )
      );
      return this;
   }

   public setValue(
      newValue: unknown,
      observers: IObserver[],
      emitChange: boolean
   ): void {
      this.unsubscribeToObservers();
      this.addObservers(observers);

      this._observers.forEach((observer) => observer.init());

      if (!emitChange) {
         return;
      }

      this.emitChange({
         arguments: [],
         target: this.target,
         chain: [{ object: this.target, id: this.id }],
         id: this.id,
         hasRebindNested: this._observers.length > 0,
         newValue,
      });
   }

   public removeObserver(target: unknown, id: unknown): void {
      const index = this._observers.findIndex(
         (observer) => observer.target === target && observer.id === id
      );
      if (index === -1) {
         return;
      }

      const subscription = this._subscriptions.get(this._observers[index]);
      if (subscription) {
         subscription.unsubscribe();
         this._subscriptions.delete(this._observers[index]);
      }

      this._observers.splice(index, 1);
   }

   protected override disposeInternal(): void {
      this.rootObserver?.dispose();
      this.unsubscribeToObservers();
   }

   protected override emitChange = (change: IPropertyChange) => {
      if (!change || !this.mustHandleChange(change)) {
         return;
      }

      const isThisTarget = change.target === this.target;
      const chain =
         isThisTarget || Type.isNullOrUndefined(this.id)
            ? change.chain
            : [{ object: this.target, id: this.id }, ...(change.chain ?? [])];
      super.emitChange({
         ...change,
         chain,
      });
   };

   private unsubscribeToObservers(): void {
      this._subscriptions.forEach((subscription) => subscription.unsubscribe());
      this._subscriptions.clear();
      this._observers.forEach((observer) => observer.dispose());
      this._observers.length = 0;
      this._rootChangeSubscription?.unsubscribe();
   }
}
