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
} from '@rs-x-core';

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
   private readonly _startChangeCycly = new Subject<void>();
   private readonly _endChangeCycly = new Subject<void>();
   private readonly _stateChangeSubscriptionManager: StateChangeSubscriptionManager;

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
      private readonly _qualityService: IEqualityService
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

   public get startChangeCycly(): Observable<void> {
      return this._startChangeCycly;
   }

   public get endChangeCycly(): Observable<void> {
      return this._endChangeCycly;
   }

   public isRegistered(
      context: unknown,
      key: unknown,
      mustProxify: MustProxify
   ): boolean {
      const stateChangeSubscriptionsForContextManager =
         this._stateChangeSubscriptionManager.getFromId(context);

      if (!stateChangeSubscriptionsForContextManager) {
         return false;
      }

      const id = stateChangeSubscriptionsForContextManager.getId({
         key,
         mustProxify,
      });
      return stateChangeSubscriptionsForContextManager.has(id);
   }

   public register(
      context: unknown,
      key: unknown,
      mustProxify?: MustProxify
   ): unknown {
      if (!this.isRegistered(context, key, mustProxify)) {
         this.tryToSubscribeToChange(context, key, mustProxify);
         return undefined;
      } else {
         return this.increaseStateReferenceCount(context, key);
      }
   }

   public unregister(
      context: unknown,
      key: unknown,
      mustProxify: MustProxify
   ): void {
      if (!this._objectStateManager.getFromId(context)?.has(key)) {
         return;
      }

      this.internalUnregister(context, key, mustProxify);
   }

   public clear(): void {
      this._stateChangeSubscriptionManager.dispose();
   }

   public getState(context: unknown, key: unknown): unknown {
      return this._objectStateManager.getFromId(context)?.getFromId(key)?.value;
   }

   private getOldValue(context: unknown, key: unknown): unknown {
      return this._objectStateManager.getFromId(context)?.getFromId(key)
         ?.valueCopy;
   }

   private unnsubscribeToObserverEvents(
      context: unknown,
      key: unknown,
      mustProxify: MustProxify
   ): void {
      const subscriptionsForKey =
         this._stateChangeSubscriptionManager.getFromId(context);
      const observer = subscriptionsForKey?.getFromData({ key, mustProxify });
      if (!observer) {
         return;
      }

      observer.dispose();
   }

   private internalUnregister(
      context: unknown,
      key: unknown,
      mustProxify: MustProxify
   ): void {
      if (this.releaseState(context, key)) {
         this.unnsubscribeToObserverEvents(context, key, mustProxify);
      }
   }

   private emitChange(
      context: unknown,
      key: unknown,
      newValue: unknown,
      oldValue: unknown,
      oldContext?: unknown
   ): void {
      if (this._qualityService.isEqual(newValue, oldValue)) {
         return;
      }
      this._changed.next({
         oldContext: oldContext ?? context,
         context,
         key,
         oldValue,
         newValue,
      });
   }

   private updateState(
      newContext: unknown,
      oldContext: unknown,
      key: unknown,
      newValue: unknown
   ): void {
      this._objectStateManager.replaceState(
         key,
         newContext,
         newValue,
         oldContext
      );
   }

   private releaseState(context: unknown, key: unknown): boolean {
      return (
         this._objectStateManager.getFromId(context)?.release(key)
            .referenceCount === 0
      );
   }

   private increaseStateReferenceCount(
      context: unknown,
      key: unknown
   ): unknown {
      const state = this.getState(context, key);
      this._objectStateManager
         .create(context)
         .instance.create({ value: state, key });
      return state;
   }

   private tryToSubscribeToChange(
      context: unknown,
      key: unknown,
      mustProxify: MustProxify,
      transferedValue?: ITransferedValue
   ): void {
      this._stateChangeSubscriptionManager.create(context).instance.create({
         key,
         mustProxify,
         onChanged: (change) => this.onChange(change, mustProxify),
         init: (observer) => {
            if (observer.initialValue !== undefined) {
               this.setInitialValue(
                  context,
                  key,
                  observer.initialValue,
                  transferedValue
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
            const oldValue = oldState.getFromId(id).value;
            const newValue = this.getValue(newContext, id);

            if (this._qualityService.isEqual(oldValue, newValue)) {
               return [];
            }
            const stateInfo = {
               oldContext,
               context: newContext,
               key: id,
               oldValue,
            };
            return newValue === PENDING
               ? [stateInfo]
               : [stateInfo, ...this.getStateChanges(oldValue, newValue)];
         })
         .reduce((a, b) => a.concat(b), []);
   }

   private tryRebindingNestedState(
      change: IPropertyChange,
      oldValue: unknown,
      mustProxify: MustProxify
   ): void {
      const stateChanges = this.getStateChanges(oldValue, change.newValue);

      stateChanges.forEach((stateChange) => {
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

      stateChanges.forEach((stateChange) =>
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
   }

   private setInitialValue(
      context: unknown,
      key: unknown,
      initialValue: unknown,
      transferedValue: ITransferedValue
   ): void {
      if (initialValue !== transferedValue?.value) {
         this.updateState(
            context,
            transferedValue?.context ?? context,
            key,
            initialValue
         );

         this.emitChange(
            context,
            key,
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

   private onChange(change: IPropertyChange, mustProxify: MustProxify): void {
      this._startChangeCycly.next();

      const chainChanges = this.getChainChanges(change.chain);
      if (chainChanges.length === 0) {
         return;
      }

      const chainLeaf = chainChanges[chainChanges.length - 1];
      const currentValue = this.getState(chainLeaf.object, chainLeaf.id);

      this.tryRebindingNestedState(change, currentValue, mustProxify);
      this.updateState(
         chainLeaf.object,
         chainLeaf.object,
         chainLeaf.id,
         chainLeaf.value
      );

      chainChanges.forEach((chainChange) =>
         this.emitChange(
            chainChange.object,
            chainChange.id,
            chainChange.value,
            chainChange.oldValue
         )
      );

      this._endChangeCycly.next();
   }
}
