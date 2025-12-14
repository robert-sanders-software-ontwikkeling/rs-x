import {
   Inject,
   Injectable,
   SingletonFactory,
   Type
} from '@rs-x/core';
import { Subject } from 'rxjs';
import { AbstractObserver } from '../../abstract-observer';
import { IDisposableOwner } from '../../disposable-owner.interface';
import { RsXStateManagerInjectionTokens } from '../../rs-x-state-manager-injection-tokes';
import { IProxyRegistry } from '../proxy-registry/proxy-registry.interface';
import {
   IArrayObserverProxyPair,
   IArrayProxyData,
   IArrayProxyFactory,
   IArrayProxyIdData,
} from './array-proxy.factory.type';

type ArrayMethodKeys =
   | 'push'
   | 'shift'
   | 'unshift'
   | 'splice'
   | 'reverse'
   | 'sort'
   | 'fill'
   | 'pop';

class ArrayProxy extends AbstractObserver<unknown[], unknown[], undefined> {
   private _patching = false;
   private readonly updateArray: Record<
      ArrayMethodKeys,
      (orginalArray: unknown[], ...args: unknown[]) => unknown
   >;

   constructor(
      owner: IDisposableOwner,
      initialValue: unknown[],
      private readonly _proxyRegistry: IProxyRegistry
   ) {
      super(owner, null, initialValue, new Subject(), undefined);

      this.updateArray = {
         push: this.pushArray,
         splice: this.spliceArray,
         pop: this.popArray,
         shift: this.shiftArray,
         unshift: this.unshiftArray,
         reverse: this.reverseArray,
         sort: this.sortArray,
         fill: this.fillArray,
      };

      this.target = new Proxy(initialValue, this);
      this._proxyRegistry.register(initialValue, this.target);
   }

   public get(
      originalArray: unknown[],
      property: PropertyKey,
      receiver: unknown
   ): unknown {
      if (property !== 'constructor' && this.updateArray[property]) {
         return (...args: unknown[]) => {
            return this.updateArray[property](originalArray, ...args);
         };
      } else {
         return Reflect.get(originalArray, property, receiver);
      }
   }

   public set(
      originalArray: unknown[],
      property: PropertyKey,
      value: unknown,
      receiver: unknown
   ): boolean {
      if (!this._patching) {
         if (property === 'length') {
            this.setLength(originalArray, value as number);
         } else if (Type.isPositiveInteger(property)) {
            const index = Number(property);
            originalArray[index] = value;

            this.emitSet(originalArray,index, value);
         } else {
            Reflect.set(originalArray, property, value, receiver);
         }
      }
      return true;
   }

   protected override disposeInternal(): void {
      this._proxyRegistry.unregister(this.value);
      this.target = null;
   }

   private pushArray = (orginalArray: unknown[], ...args: unknown[]) => {
      const startIndex = orginalArray.length;
      orginalArray.push(...args);

      this.emitSetForRange(
         orginalArray,
         startIndex,
         args.length,
      );
      return orginalArray.length;
   };

   private spliceArray = (originalArray: unknown[], ...args: unknown[]) => {
      const startIndex = args[0] as number;
      const itemsToAdd = args.length > 2 ? args.slice(2) : [];
      const deleteCount = args[1] as number;
      const before = originalArray.slice();
      const removed = originalArray.splice(startIndex, deleteCount, ...itemsToAdd);

      const after = originalArray;
      const maxLength = Math.max(before.length, after.length);
      for (let i = startIndex; i < maxLength; i++) {
         if (before[i] !== after[i]) {
            this.emitSet(
               originalArray,
               i,
               after[i]
            );
         }
      }

      return removed;
   };

   private popArray = (orginalArray: unknown[]) => {
      const index = orginalArray.length - 1;
      const removedItem = orginalArray.pop();
      this.emitSet(orginalArray, index);
      return removedItem;
   };

   private shiftArray = (orginalArray: unknown[]) => {
      const oldLength = orginalArray.length;
      const result = orginalArray.shift();
      this.emitSetForRange(orginalArray, 0, orginalArray.length);
      this.emitSet(orginalArray, oldLength - 1);
      return result;
   };

   private unshiftArray = (orginalArray: unknown[], ...args: unknown[]) => {
      orginalArray.unshift(...args);
      this.emitSetForRange(orginalArray, 0, orginalArray.length);
      return orginalArray.length;
   };

   private reverseArray = (orginalArray: unknown[]) => {
      const result = orginalArray.reverse();
      this.emitSetForRange(
         orginalArray,
         0,
         orginalArray.length,
      );
      return result;
   };

   private sortArray = (orginalArray: unknown[], ...args: unknown[]) => {
      const result = orginalArray.sort(
         args[0] as (a: unknown, b: unknown) => number
      );

      this.emitSetForRange(
         orginalArray,
         0,
         orginalArray.length,
      );
      return result;
   };

   private fillArray = (orginalArray: unknown[], ...args: unknown[]) => {
      const start = (args[1] ?? 0) as number;
      const end = (args[2] ?? orginalArray.length) as number;
      for (let i = start; i < end; i++) {
         orginalArray[i] = structuredClone(args[0]);
         this.emitSet(orginalArray, i, orginalArray[i]);
      }
      return orginalArray;
   };

   private setLength(array: unknown[], length: number): void {
      if (length < array.length) {
         this.updateArray.splice(array, length, array.length - length);
      } else {
         array.length = length;
      }
   }

   private emitSet(
      originaArray: unknown[],
      index: number,
      value?: unknown
   ): void {
      this.emitChange({
         arguments: [],
         chain: [{ object: originaArray, id: index }],
         id: index,
         target: originaArray,
         newValue: value,
      });
   }

   private emitSetForRange(
      originaArray: unknown[],
      startIndex: number,
      length: number,
   ): void {
      const endIndex = startIndex + length;
      for (let i = startIndex; i < endIndex; i++) {
         this.emitSet(originaArray, i, originaArray[i]);
      }
   }
}

@Injectable()
export class ArrayProxyFactory
   extends SingletonFactory<
      unknown[],
      IArrayProxyData,
      IArrayObserverProxyPair,
      IArrayProxyIdData
   >
   implements IArrayProxyFactory {

   constructor(
      @Inject(RsXStateManagerInjectionTokens.IProxyRegistry)
      private readonly _proxyRegistry: IProxyRegistry
   ) {
      super();
   }

   public override getId(data: IArrayProxyIdData): unknown[] {
      return data.array;
   }

   protected override createId(data: IArrayProxyIdData): unknown[] {
       return data.array;
   }

   protected override createInstance(
      data: IArrayProxyData,
      id: unknown[]
   ): IArrayObserverProxyPair {
      const observer = new ArrayProxy(
         {
            canDispose: () => this.getReferenceCount(id) === 1,
            release: () => {
               this.release(id);
               data.owner?.release();
            },
         },
         data.array,
         this._proxyRegistry
      );
      return {
         observer,
         proxy: observer.target,
         proxyTarget: data.array,
      };
   }


   protected override releaseInstance(
      arrayObserverWithProxy: IArrayObserverProxyPair,
      id: unknown[]
   ): void {
      super.releaseInstance(arrayObserverWithProxy, id);
      arrayObserverWithProxy.observer.dispose();
   }
}
