import {
   IDisposableOwner,
   Inject,
   Injectable,
   IPromiseAccessor,
   IPropertyChange,
   RsXCoreInjectionTokens,
   SingletonFactory,
} from '@rs-x/core';
import { ReplaySubject } from 'rxjs';
import { AbstractObserver } from '../../abstract-observer';
import {
   IPromiseObserverProxyPair,
   IPromiseProxyData,
   IPromiseProxyFactory,
} from './promise-proxy.factory.type';

class PromiseObserver extends AbstractObserver<
   Promise<unknown>,
   undefined,
   undefined
> {
   constructor(
      owner: IDisposableOwner,
      target: Promise<unknown>,
      private readonly _promiseAccessor: IPromiseAccessor
   ) {
      super(owner, target, undefined, new ReplaySubject<IPropertyChange>(1));
      target.then(this.onValueResolved);
   }

   protected override disposeInternal(): void {
      this._promiseAccessor.clearLastValue(this.target);
   }

   private onValueResolved = (newValue: unknown): void => {
      if (this.isDisposed) {
         return;
      }

      this._promiseAccessor.setLastValue(this.target, newValue);
      this.emitChange({
         arguments: [],
         chain: [],
         target: this.target,
         newValue,
      });
   };
}
@Injectable()
export class PromiseProxyFactory
   extends SingletonFactory<
      Promise<unknown>,
      IPromiseProxyData,
      IPromiseObserverProxyPair
   >
   implements IPromiseProxyFactory
{
   constructor(
      @Inject(RsXCoreInjectionTokens.IPromiseAccessor)
      private readonly _promiseAccessor: IPromiseAccessor
   ) {
      super();
   }

   public override getId(data: IPromiseProxyData): Promise<unknown> {
      return data.promise;
   }

   protected override createId(data: IPromiseProxyData): Promise<unknown> {
      return data.promise;
   }

   protected override createInstance(
      data: IPromiseProxyData,
      id: Promise<unknown>
   ): IPromiseObserverProxyPair {
      const observer = new PromiseObserver(
         {
            canDispose: () => this.getReferenceCount(id) === 1,
            release: () => {
               this.release(id);
               data.owner?.release();
            },
         },
         data.promise,
         this._promiseAccessor
      );
      return {
         observer,
         proxy: undefined,
         proxyTarget: data.promise,
      };
   }

   protected override releaseInstance(
      promiseObserverWithProxy: IPromiseObserverProxyPair
   ): void {
      promiseObserverWithProxy.observer.dispose();
   }
}
