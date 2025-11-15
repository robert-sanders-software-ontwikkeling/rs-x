import {
   Inject,
   Injectable,
   SingletonFactoryWithGuid,
   SingletonFactoryWithIdGeneration,
   UnexpectedException,
} from '@rs-x/core';
import {
   IContextChanged,
   IStateChange,
   IStateManager,
   MustProxify,
   RsXStateManagerInjectionTokens,
} from '@rs-x/state-manager';
import { Observable, ReplaySubject, Subscription } from 'rxjs';
import { RsXExpressionParserInjectionTokens } from '../rs-x-expression-parser-injection-tokes';
import { IIdentifierOwnerResolver } from './identifier-owner-resolver.interface';
import {
   IIndexForContextInfo,
   IIndexInfo,
   IIndexValueObserverManager,
   IIndexValueObserversForContextManager,
} from './index-value-manager-observer.type';
import { IIndexValueObserver } from './index-value-observer.interface';

class IndexValueObserver implements IIndexValueObserver {
   private readonly _changeSubscription: Subscription;
   private readonly _contextChangeSubscription: Subscription;
   private readonly _changed = new ReplaySubject<IStateChange>(1);
   private _isDisposed = false;

   constructor(
      private _context: unknown,
      private readonly _key: unknown,
      mustProxify: MustProxify,
      private readonly _stateManager: IStateManager,
      private readonly onDisposed: () => void
   ) {
      this._changeSubscription = this._stateManager.changed.subscribe(
         this.emitChange
      );

      this._contextChangeSubscription =
         this._stateManager.contextChanged.subscribe(this.onContextCHanged);
      this._stateManager.register(this._context, this._key, mustProxify);
   }

   public get changed(): Observable<IStateChange> {
      return this._changed;
   }

   public dispose(): void {
      if (this._isDisposed) {
         return;
      }
      this._changeSubscription.unsubscribe();
      this._contextChangeSubscription.unsubscribe();
      this._stateManager.unregister(this._context, this._key);
      this._isDisposed = true;
      this.onDisposed();
   }

   public getValue(context: unknown, key: unknown): unknown {
      return this._stateManager.getState(context, key);
   }

   public setValue(_context: unknown, _key: unknown, _value: unknown): void {
      // TODO implement
   }

   private onContextCHanged = (change: IContextChanged) => {
      if (this._context === change.oldContext && change.key === this._key) {
         this._context = change.context;
      }
   };

   private emitChange = (change: IStateChange) => {
      if (this._context === change.context && change.key === this._key) {
         this._changed.next(change);
      }
   };
}

class IndexValueObserversForContextManager
   extends SingletonFactoryWithGuid<IIndexForContextInfo, IIndexValueObserver>
   implements IIndexValueObserversForContextManager
{
   constructor(
      private readonly _identifierOwner: unknown,
      private readonly _stateManager: IStateManager,
      private readonly releaseContext: () => void
   ) {
      super();
   }

   protected override getGroupId(data: IIndexForContextInfo): unknown {
      return data.index;
   }

   protected override getGroupMemberId(
      data: IIndexForContextInfo
   ): MustProxify {
      return data.mustProxify;
   }

   protected override createInstance(
      identifierForContextInfo: IIndexForContextInfo,
      id: string
   ): IIndexValueObserver {
      return new IndexValueObserver(
         this._identifierOwner,
         identifierForContextInfo.index,
         identifierForContextInfo.mustProxify,
         this._stateManager,
         () => this.release(id)
      );
   }

   protected override onReleased(): void {
      if (this.isEmpty) {
         this.releaseContext();
      }
   }
}

@Injectable()
export class IndexValueObserverManager
   extends SingletonFactoryWithIdGeneration<
      unknown,
      IIndexInfo,
      IIndexValueObserversForContextManager
   >
   implements IIndexValueObserverManager
{
   constructor(
      @Inject(RsXExpressionParserInjectionTokens.IdentifierOwnerResolver)
      private readonly _indentifierOwnerResolver: IIdentifierOwnerResolver,
      @Inject(RsXStateManagerInjectionTokens.IStateManager)
      private readonly _stateManager: IStateManager
   ) {
      super();
   }

   protected override createUniqueId(identifierInfo: IIndexInfo): unknown {
      const resolvedContext = this._indentifierOwnerResolver.resolve(
         identifierInfo.index,
         identifierInfo.context
      );

      if (!resolvedContext) {
         throw new UnexpectedException(
            `Failed to resolved  index '${identifierInfo.index}' om the give context`
         );
      }

      return resolvedContext;
   }

   protected override getGroupId(data: IIndexInfo): unknown {
      return data.context;
   }

   protected override getGroupMemberId(data: IIndexInfo): unknown {
      return data.index;
   }

   protected override createInstance(
      _identifierInfo: IIndexInfo,
      id: unknown
   ): IIndexValueObserversForContextManager {
      return new IndexValueObserversForContextManager(
         id,
         this._stateManager,
         () => this.release(id)
      );
   }

   protected override releaseInstance(
      instance: IIndexValueObserversForContextManager,
      id: unknown
   ): void {
      super.releaseInstance(instance, id);
      instance.dispose();
   }
}
