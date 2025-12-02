import {
   echo,
   Inject,
   Injectable,
   SingletonFactoryWithGuid,
   Type,
} from '@rs-x/core';
import { Subject } from 'rxjs';
import { AbstractObserver } from '../../abstract-observer';
import { IDisposableOwner } from '../../disposable-owner.interface';
import { MustProxify } from '../../object-property-observer-proxy-pair-manager.type';
import { RsXStateManagerInjectionTokens } from '../../rs-x-state-manager-injection-tokes';
import { IProxyRegistry } from '../proxy-registry/proxy-registry.interface';
import {
   IArrayObserverProxyPair,
   IArrayProxyData,
   IArrayProxyFactory,
   IArrayProxyIdData,
} from './array-proxy.factory.type';
import { ProcessArrayItem } from './process-array-item.type';

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
   private readonly proxifyItem: ProcessArrayItem;
   private readonly unproxifyItem: ProcessArrayItem;
   private _patching = false;
   private readonly updateArray: Record<
      ArrayMethodKeys,
      (orginalArray: unknown[], ...args: unknown[]) => unknown
   >;

   constructor(
      owner: IDisposableOwner,
      initialValue: unknown[],
      proxifyItem: ProcessArrayItem,
      unproxifyItem: ProcessArrayItem,
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

      this.proxifyItem = proxifyItem ?? echo;
      this.unproxifyItem = unproxifyItem ?? echo;

      this.target = new Proxy(initialValue, this);
      this._proxyRegistry.register(initialValue, this.target);
   }

   public override init(): void {
      if (this.proxifyItem !== echo) {
         this.proxifyItems(this.initialValue, 0, this.initialValue.length);
      }
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
            this.unproxifyItem(originalArray[property], originalArray, index);
            originalArray[property] = value;
            originalArray[property] = this.proxifyItem(
               value,
               originalArray,
               index
            );
            this.emitSet(originalArray, Number(property), value);
         } else {
            Reflect.set(originalArray, property, value, receiver);
         }
      }
      return true;
   }

   protected override disposeInternal(): void {
      this._proxyRegistry.unregister(this.initialValue);
      this.restoreOrginalArray();
      this.target = null;
   }

   private pushArray = (orginalArray: unknown[], ...args: unknown[]) => {
      const oldLength = orginalArray.length;
      const startIndex = orginalArray.length;
      orginalArray.push(...args);
      this.proxifyItems(orginalArray, startIndex, args.length);

      this.emitSetForRange(
         orginalArray,
         startIndex,
         args.length,
         oldLength
      );
      return orginalArray.length;
   };

   private spliceArray = (originalArray: unknown[], ...args: unknown[]) => {
      const startIndex = args[0] as number;
      const itemsToAdd = args.length > 2 ? args.slice(2) : [];
      const deleteCount = args[1] as number;
      const before = originalArray.slice();
      const removed = originalArray
         .splice(startIndex, deleteCount, ...itemsToAdd)
         .map((removedItem, index) =>
            this.unproxifyItem(removedItem, originalArray, startIndex + index)
         );

      this.proxifyItems(originalArray, startIndex, itemsToAdd.length);

      const after = originalArray;
      const maxLength = Math.max(before.length, after.length);
      for (let i = startIndex; i < maxLength; i++) {
         if (before[i] !== after[i]) {
            this.emitSet(
               originalArray,
               i,
               after[i],
               after.length > before.length && i >= before.length
            );
         }
      }

      return removed;
   };

   private popArray = (orginalArray: unknown[]) => {
      const index = orginalArray.length - 1;
      const removedItem = orginalArray.pop();
      this.emitSet(orginalArray, index);
      return this.unproxifyItem(removedItem, orginalArray, index);
   };

   private shiftArray = (orginalArray: unknown[]) => {
      const oldLength = orginalArray.length;
      const removedItem = orginalArray.shift();
      this.emitSetForRange(orginalArray, 0, orginalArray.length, oldLength);
      this.emitSet(orginalArray, oldLength - 1);
      return this.unproxifyItem(removedItem, orginalArray, 0);
   };

   private unshiftArray = (orginalArray: unknown[], ...args: unknown[]) => {
      const oldLength = orginalArray.length;
      orginalArray.unshift(...args);
      this.proxifyItems(orginalArray, 0, args.length);
      this.emitSetForRange(orginalArray, 0, orginalArray.length, oldLength);
      return orginalArray.length;
   };

   private reverseArray = (orginalArray: unknown[]) => {
      const result = orginalArray.reverse();
      this.emitSetForRange(
         orginalArray,
         0,
         orginalArray.length,
         orginalArray.length
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
         orginalArray.length
      );
      return result;
   };
   private fillArray = (orginalArray: unknown[], ...args: unknown[]) => {
      const start = (args[1] ?? 0) as number;
      const end = (args[2] ?? orginalArray.length) as number;
      for (let i = start; i < end; i++) {
         orginalArray[i] = structuredClone(args[0]);
         this.emitSet(orginalArray, i, orginalArray[i]);
         orginalArray[i] = this.proxifyItem(orginalArray[i], orginalArray, i);
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

   private restoreOrginalArray(): void {
      this.initialValue.forEach((item, index) => {
         const unproxifyItem = this.unproxifyItem(
            item,
            this.initialValue,
            index
         );
         this.initialValue[index] = unproxifyItem;
      });
   }

   private proxifyItems(
      array: unknown[],
      startIndex: number,
      length: number
   ): void {
      const endIndex = startIndex + length;
      for (let i = startIndex; i < endIndex; i++) {
         array[i] = this.proxifyItem(array[i], array, i);
      }
   }

   private emitSet(
      originaArray: unknown[],
      index: number,
      value?: unknown,
      isNew?: boolean
   ): void {
      this.emitChange({
         arguments: [],
         chain: [{ object: originaArray, id: index }],
         id: index,
         target: originaArray,
         newValue: value,
         isNew: !!isNew,
      });
   }

   private emitSetForRange(
      originaArray: unknown[],
      startIndex: number,
      length: number,
      oldLength: number
   ): void {
      const endIndex = startIndex + length;
      for (let i = startIndex; i < endIndex; i++) {
         this.emitSet(originaArray, i, originaArray[i], i >= oldLength);
      }
   }
}

@Injectable()
export class ArrayProxyFactory
   extends SingletonFactoryWithGuid<
      IArrayProxyData,
      IArrayObserverProxyPair,
      IArrayProxyIdData
   >
   implements IArrayProxyFactory
{
   constructor(
      @Inject(RsXStateManagerInjectionTokens.IProxyRegistry)
      private readonly _proxyRegistry: IProxyRegistry
   ) {
      super();
   }

   protected override getGroupId(data: IArrayProxyIdData): unknown[] {
      return data.array;
   }

   protected override getGroupMemberId(data: IArrayProxyIdData): MustProxify {
      return data.mustProxify;
   }

   protected override createInstance(
      data: IArrayProxyData,
      id: string
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
         data.proxifyItem && data.mustProxify
            ? (item: unknown, array: unknown[], index: number) => {
                 return this.proxifyItem(
                    item,
                    array,
                    index,
                    data.proxifyItem,
                    data.mustProxify
                 );
              }
            : undefined,
         data.unproxifyItem && data.mustProxify
            ? (item: unknown, array: unknown[], index: number) => {
                 return this.unproxifyItem(
                    item,
                    array,
                    index,
                    data.unproxifyItem,
                    data.mustProxify
                 );
              }
            : undefined,
         this._proxyRegistry
      );
      return {
         observer,
         proxy: observer.target,
         proxyTarget: data.array,
         id,
      };
   }

   private proxifyItem(
      item: unknown,
      array: unknown[],
      index: number,
      proxifyItem: ProcessArrayItem,
      mustProxify: MustProxify
   ): unknown {
      return mustProxify(index, array) ? proxifyItem(item, array, index) : item;
   }

   private unproxifyItem(
      item: unknown,
      array: unknown[],
      index: number,
      unproxifyItem: ProcessArrayItem,
      mustProxify: MustProxify
   ): unknown {
      return mustProxify(index, array)
         ? unproxifyItem(item, array, index)
         : item;
   }

   protected override releaseInstance(
      arrayObserverWithProxy: IArrayObserverProxyPair,
      id: string
   ): void {
      super.releaseInstance(arrayObserverWithProxy, id);
      arrayObserverWithProxy.observer.dispose();
   }
}
