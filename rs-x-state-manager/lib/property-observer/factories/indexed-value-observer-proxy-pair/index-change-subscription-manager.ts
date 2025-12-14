import {
   IErrorLog,
   IPropertyChange,
   ISingletonFactory,
   SingletonFactory,
} from '@rs-x/core';
import { IDisposableOwner } from '../../../disposable-owner.interface';
import {
   GroupedChangeSubscriptionsForContextManager,
   IChangeSubscriptionsCreateMethods,
   IGroupedChangeSubscriptionsForContextManager,
} from '../../../grouped-change-subscriptions-for-context-manager';
import { MustProxify } from '../../../object-property-observer-proxy-pair-manager.type';
import { ObserverGroup } from '../../../observer-group';
import { IObserver } from '../../../observer.interface';
import { IIndexObserverInfo } from '../index-observer-info.interface';

export interface ISubscriptionIdInfo<TIndex> {
   index: TIndex;
   mustProxify?: MustProxify;
}
export interface ISubscriptionInfo<TIndex>
   extends ISubscriptionIdInfo<TIndex>,
      IChangeSubscriptionsCreateMethods {
   initialValue?: unknown;
   indexValueObserver?: IObserver;
   owner: IDisposableOwner;
   initializeManually: boolean;
   mustHandleChange?: (change: IPropertyChange) => boolean;
}

export interface IndexChangeSubscriptionForContext<TIndex> {
   context: unknown;
   index: TIndex;
}

export type IIndexSetObserverManager<TIndex> = ISingletonFactory<
   unknown,
   unknown,
   ISingletonFactory<
      MustProxify | TIndex,
      IIndexObserverInfo<TIndex>,
      IObserver,
      ISubscriptionIdInfo<TIndex>
   >
>;
export type IIndexChangeSubscriptionsForContextManager<TIndex> =
   IGroupedChangeSubscriptionsForContextManager<
      ObserverGroup,
      ISubscriptionInfo<TIndex>,
      ISubscriptionIdInfo<TIndex>
   >;

class IndexChangeSubscriptionsForContextManager<TIndex>
   extends GroupedChangeSubscriptionsForContextManager<
      ObserverGroup,
      ISubscriptionInfo<TIndex>,
      ISubscriptionIdInfo<TIndex>
   >
   implements IIndexChangeSubscriptionsForContextManager<TIndex>
{
   constructor(
      context: unknown,
      releaseContext: () => void,
      private readonly _indexSetObserverManager: IIndexSetObserverManager<unknown>,
      errorLog: IErrorLog
   ) {
      super(context, releaseContext, errorLog);
   }

   protected getGroupId(data: ISubscriptionIdInfo<TIndex>): TIndex {
      return data.index;
   }

   protected getGroupMemberId(data: ISubscriptionIdInfo<TIndex>): MustProxify {
      return data.mustProxify;
   }

   protected createObserver(
      context: unknown,
      data: ISubscriptionInfo<TIndex>,
      id: string
   ): { subscriptionData: ObserverGroup; observer: IObserver } {
      const indexSetObserver = this._indexSetObserverManager
         .create(context)
         .instance.create({
            index: data.index,
            initialValue: data.initialValue,
         }).instance;

      const group = this.createGroupObserver(data, indexSetObserver, id);

      return { subscriptionData: group, observer: indexSetObserver };
   }

   private createGroupObserver(
      data: ISubscriptionInfo<TIndex>,
      indexSetObserver: IObserver,
      id: string
   ): ObserverGroup {
      const observer = new ObserverGroup(
         {
            ...data.owner,
            release: () => {
               data.owner.release();
               this.release(id);
            },
         },
         this._context,
         data.initialValue,
         data.mustHandleChange,
         this._errorLog,
         data.index,
         () => indexSetObserver
      ).addObservers(data.indexValueObserver ? [data.indexValueObserver] : []);

      if (!data.initializeManually) {
         observer.init();
      }

      return observer;
   }
}

export class IndexChangeSubscriptionManager<TIndex> extends SingletonFactory<
   unknown,
   unknown,
   IIndexChangeSubscriptionsForContextManager<TIndex>
> {
   constructor(
      private readonly _indexSetObserverManager: IIndexSetObserverManager<unknown>,
      private readonly _errorLog: IErrorLog
   ) {
      super();
   }

   public getId(context: unknown): unknown {
      return context;
   }

   protected createId(context: unknown): unknown {
      return context;
   }

   protected override createInstance(
      context: unknown
   ): IIndexChangeSubscriptionsForContextManager<TIndex> {
      return new IndexChangeSubscriptionsForContextManager(
         context,
         () => this.release(context),
         this._indexSetObserverManager,
         this._errorLog
      );
   }

   protected override releaseInstance(
      instance: IIndexChangeSubscriptionsForContextManager<TIndex>,
      id: string
   ): void {
      super.releaseInstance(instance, id);
      instance.dispose();
   }
}
