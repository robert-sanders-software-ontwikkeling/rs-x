import {
   IChainPart,
   IEqualityService,
   IErrorLog,
   IIndexValueAccessor,
   Inject,
   Injectable,
   IPropertyChange,
   PENDING,
   RsXCoreInjectionTokens,
} from '@rs-x/core';

import { Observable, Subject } from 'rxjs';
import {
   IObjectPropertyObserverProxyPairManager,
   MustProxify,
} from '../object-property-observer-proxy-pair-manager.type';
import { RsXStateManagerInjectionTokens } from '../rs-x-state-manager-injection-tokes';
import { IObjectStateManager } from './object-state-manager.interface';
import { StateChangeSubscriptionManager } from './state-change-subscription-manager/state-change-subsription-manager';
import {
   IContextChanged,
   IStateChange,
   IStateManager,
} from './state-manager.interface';

interface ITransferedValue {
   value: unknown;
   context: unknown;
}

interface IChainPartChange extends IChainPart {
   oldValue: unknown;
   value: unknown;
}

@Injectable()
export class StateManager implements IStateManager {
   private readonly _changed = new Subject<IStateChange>();
   private readonly _contextChanged = new Subject<IContextChanged>();
   private readonly _startChangeCycle = new Subject<void>();
   private readonly _endChangeCycle = new Subject<void>();
   private readonly _stateChangeSubscriptionManager: StateChangeSubscriptionManager;
   private readonly _pending = new Map<unknown, unknown>();

   constructor(
      @Inject(
         RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager
      )
      objectObserverManager: IObjectPropertyObserverProxyPairManager,
      @Inject(RsXStateManagerInjectionTokens.IObjectStateManager)
      private readonly _objectStateManager: IObjectStateManager,
      @Inject(RsXCoreInjectionTokens.IErrorLog)
      errorLog: IErrorLog,
      @Inject(RsXCoreInjectionTokens.IIndexValueAccessor)
      private readonly _indexValueAccessor: IIndexValueAccessor,
      @Inject(RsXCoreInjectionTokens.IEqualityService)
      private readonly _equalityService: IEqualityService,
   ) {
      this._stateChangeSubscriptionManager = new StateChangeSubscriptionManager(
         objectObserverManager,
         errorLog
      );
   }

   public get changed(): Observable<IStateChange> {
      return this._changed;
   }

   public get contextChanged(): Observable<IContextChanged> {
      return this._contextChanged;
   }

   public get startChangeCycle(): Observable<void> {
      return this._startChangeCycle;
   }

   public get endChangeCycle(): Observable<void> {
      return this._endChangeCycle;
   }

   public toString(): string {
      return this._objectStateManager.toString();
   }

   public isRegistered(
      context: unknown,
      index: unknown,
      mustProxify: MustProxify
   ): boolean {

      const stateChangeSubscriptionsForContextManager =
         this._stateChangeSubscriptionManager.getFromId(context);

      if (!stateChangeSubscriptionsForContextManager) {
         return false;
      }

      const id = stateChangeSubscriptionsForContextManager.getId({
         key: index,
         mustProxify,
      });
      return stateChangeSubscriptionsForContextManager.has(id);
   }

   public watchState(
      context: unknown,
      index: unknown,
      mustProxify?: MustProxify
   ): unknown {
      if (!this.isRegistered(context, index, mustProxify)) {
         this.tryToSubscribeToChange(context, index, mustProxify);
         return undefined;
      } else {
         return this.increaseStateReferenceCount(context, index, true);
      }
   }

   public releaseState(
      context: unknown,
      index: unknown,
      mustProxify: MustProxify
   ): void {
      if (!this._objectStateManager.getFromId(context)?.has(index)) {
         return;
      }

      this.internalUnregister(context, index, mustProxify);
   }

   public clear(): void {
      this._stateChangeSubscriptionManager.dispose();
      this._objectStateManager.dispose();
   }

   public getState<T>(context: unknown, index: unknown): T {
      return this._objectStateManager.getFromId(context)?.getFromId(index)?.value as T;
   }

   public setState<T>(context: unknown, index: unknown, value: T): void {
      try {
         this.internalSetState(context, index, value, {
         context,
         value: this.getState(context, index)
      });
      
      } finally {
         this._endChangeCycle.next();
      } 
   }

   private internalSetState(context: unknown, index: unknown, value: unknown, transferValue: ITransferedValue) {
      this._startChangeCycle.next();
      this.tryRebindingNestedState(value, transferValue.value)
      this._objectStateManager.replaceState(index, context, value, transferValue.context, false);
      this.emitChange(context, index, value, transferValue.value, transferValue.context);
   }

   private getOldValue(context: unknown, index: unknown): unknown {
      return this._objectStateManager.getFromId(context)?.getFromId(index)
         ?.valueCopy;
   }

   private unnsubscribeToObserverEvents(
      context: unknown,
      index: unknown,
      mustProxify: MustProxify
   ): void {
      const subscriptionsForKey =
         this._stateChangeSubscriptionManager.getFromId(context);
      const observer = subscriptionsForKey?.getFromData({ key: index, mustProxify });
      if (!observer) {
         return;
      }

      observer.dispose();
   }

   private internalUnregister(
      context: unknown,
      index: unknown,
      mustProxify: MustProxify
   ): void {
      if (this.internalReleaseState(context, index)) {
         this.unnsubscribeToObserverEvents(context, index, mustProxify);
      }
   }

   private emitChange(
      context: unknown,
      index: unknown,
      newValue: unknown,
      oldValue: unknown,
      oldContext?: unknown
   ): void {
      if (this._equalityService.isEqual(newValue, oldValue)) {
         return;
      }
      this._changed.next({
         oldContext: oldContext ?? context,
         context,
         key: index,
         oldValue,
         newValue,
      });
   }

   private updateState(
      newContext: unknown,
      oldContext: unknown,
      index: unknown,
      newValue: unknown,
      watched: boolean
   ): void {
      this._objectStateManager.replaceState(
         index,
         newContext,
         newValue,
         oldContext,
         watched
      );
   }

   private internalReleaseState(context: unknown, key: unknown): boolean {
      return (
         this._objectStateManager.getFromId(context)?.release(key)
            .referenceCount === 0
      );
   }

   private increaseStateReferenceCount(
      context: unknown,
      index: unknown,
      watched: boolean
   ): unknown {
      const state = this.getState(context, index);
      this._objectStateManager
         .create(context)
         .instance.create({ value: state, key: index, watched });
      return state;
   }

   private tryToSubscribeToChange(
      context: unknown,
      index: unknown,
      mustProxify: MustProxify,
      transferedValue?: ITransferedValue
   ): void {
      this._stateChangeSubscriptionManager.create(context).instance.create({
         key: index,
         mustProxify,
         onChanged: (change) => this.onChange(change, mustProxify, true),
         init: (observer) => {
            if (observer.value !== undefined) {
               this.setInitialValue(
                  context,
                  index,
                  observer.value,
                  transferedValue,
                  true,

               );
            }
            observer.init();
         },
      });
   }

   private getValue(context: unknown, key: unknown): unknown {
      return this._indexValueAccessor.getResolvedValue(context, key);
   }

   private getStateChanges(
      oldContext: unknown,
      newContext: unknown
   ): IStateChange[] {
      const oldState = this._objectStateManager.getFromId(oldContext);
      if (!oldState) {
         return [];
      }

      return Array.from(oldState.ids())
         .map((id) => {
            const { value: oldValue, watched } = oldState.getFromId(id);
            const newValue = this.getValue(newContext, id);

            if (oldContext === newContext && this._equalityService.isEqual(oldValue, newValue)) {
               return [];
            }


            let pendingId: string;
            if (newValue === PENDING) {

               this._pending.set(newContext, oldValue);

            }
            const stateInfo = {
               oldContext,
               context: newContext,
               key: id,
               oldValue,
               newValue: pendingId ?? newValue,
               watched
            };
            return newValue === PENDING
               ? [stateInfo]
               : [stateInfo, ...this.getStateChanges(oldValue, newValue)];
         })
         .reduce((a, b) => a.concat(b), []);
   }

   private tryRebindingNestedState(
      newValue: unknown,
      oldValue: unknown,
      mustProxify?: MustProxify,
   ): void {
      const stateChanges = this.getStateChanges(oldValue, newValue);

      stateChanges
         .forEach((stateChange) => {
            this.internalUnregister(
               stateChange.oldContext,
               stateChange.key,
               mustProxify
            );
         });

      stateChanges
         .filter(
            (stateChange) => stateChange.context !== stateChange.oldContext
         )
         .forEach((stateChange) =>
            this._contextChanged.next({
               context: stateChange.context,
               oldContext: stateChange.oldContext,
               key: stateChange.key,
            })
         );


      stateChanges
         .filter(stateChange => stateChange.watched && stateChange.newValue === PENDING)
         .forEach((stateChange) =>
            this._objectStateManager.replaceState(stateChange.key, stateChange.context, stateChange.newValue, stateChange.oldContext, false)
         );

      stateChanges
         .filter(stateChange => stateChange.watched)
         .forEach((stateChange) =>
            this.tryToSubscribeToChange(
               stateChange.context,
               stateChange.key,
               mustProxify,
               {
                  context: stateChange.oldContext,
                  value: stateChange.oldValue,
               }
            )
         );

      stateChanges
         .filter(stateChange => !stateChange.watched)
         .forEach((stateChange) =>
            this.internalSetState(stateChange.context, stateChange.key, stateChange.newValue, {
               context: stateChange.oldContext,
               value: stateChange.oldValue
            })
         );
   }

   private setInitialValue(
      context: unknown,
      index: unknown,
      initialValue: unknown,
      transferedValue: ITransferedValue,
      watched: boolean,
   ): void {
      if (initialValue !== transferedValue?.value) {
         this.updateState(
            context,
            transferedValue?.context ?? context,
            index,
            initialValue,
            watched
         );
         this.emitChange(
            context,
            index,
            initialValue,
            transferedValue?.value,
            transferedValue?.context
         );
      }
   }

   private getChainChanges(chain: IChainPart[]): IChainPartChange[] {
      const registeredChainParts = chain.filter((chainPart) =>
         this._stateChangeSubscriptionManager.isRegistered(
            chainPart.object,
            chainPart.id
         )
      );

      return registeredChainParts.map((chainPart) => ({
         ...chainPart,
         oldValue: this.getOldValue(chainPart.object, chainPart.id),
         value: this.getValue(chainPart.object, chainPart.id),
      }));
   }

   private getCurrentValue(context: unknown, id: unknown): unknown {
      const value = this._pending.get(context);
      if (value !== undefined) {
         this._pending.delete(context);
         return value;
      }

      return this.getState(context, id);
   }

   private onChange(change: IPropertyChange, mustProxify: MustProxify, watched: boolean): void {
      const chainChanges = this.getChainChanges(change.chain);
      if (chainChanges.length === 0) {
         return;
      }

      this._startChangeCycle.next();

      try {
         const chainLeaf = chainChanges[chainChanges.length - 1];
         const currentValue = this.getCurrentValue(chainLeaf.object, chainLeaf.id);

         this.tryRebindingNestedState(change.newValue, currentValue, mustProxify);
         this.updateState(
            chainLeaf.object,
            chainLeaf.object,
            chainLeaf.id,
            chainLeaf.value,
            watched
         );

         chainChanges.forEach((chainChange) =>
            this.emitChange(
               chainChange.object,
               chainChange.id,
               chainChange.value,
               chainChange.oldValue
            )
         );
      }
      finally {
         this._endChangeCycle.next();
      }
   }
}