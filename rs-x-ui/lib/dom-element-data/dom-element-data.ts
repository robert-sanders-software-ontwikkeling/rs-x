import {
   Inject,
   Injectable,
   PreDestroy,
   Type
} from '@rs-x/core';
import { Subscription } from 'rxjs';
import { IDomQuery } from '../dom-query/dom-query.interface';
import { IElementRemovedObserver } from '../element-removed-observer/element-removed-observer.interface';
import { RsXUIInjectionTokens } from '../rx-x-ui.injection-tokens';
import { IInputContext } from '../web-component/decorators/input/input-context.interface';
import { IDomElementData } from './dom-element-data.interface';

@Injectable()
export class DomElementData implements IDomElementData {
   private readonly _data = new Map<Node, Record<string | symbol, unknown>>();
   private _removedSubscription!: Subscription | null;

   constructor(
      @Inject(RsXUIInjectionTokens.IDomQuery)
      private readonly _domQuery: IDomQuery,
      @Inject(RsXUIInjectionTokens.IElementRemovedObserver)
      private readonly _elementRemovedObserver: IElementRemovedObserver,
      @Inject(RsXUIInjectionTokens.IInputContext)
      private readonly _inputContext: IInputContext
   ) {}

   @PreDestroy()
   public dispose(): void {
      this._data.clear();
      this.stopWatchForRemoved();
   }

   public getData<T>(element: Node, key: string | symbol): T {
      return this._data.get(element)?.[key] as T;
   }

   public register(element: Node, key: string | symbol, data: unknown): void {
      this.startWatchForRemoved();
      let elementData = this._data.get(element);
      if (!elementData) {
         elementData = {};
         this._data.set(element, elementData);
      }
      elementData[key] = data;
   }

   public unregister(node: Node, key?: string | symbol): void {
      const elementData = this._data.get(node);
      if (!elementData) {
         return;
      }

      if (key) {
         this.deleteField(node, key);
      }

      if (this._data.size === 0) {
         this.stopWatchForRemoved();
      }
   }

   public resolveContext(element: Node, fieldName: string): object | undefined {
      const elementData = this._data.get(element);
      const dataKey = this.tryGetDataKey(elementData, fieldName);

      const result =  dataKey
         ? (elementData?.[dataKey] as object)
         : this.tryToResolveOnParent(element, fieldName);

      if(result) {
         return result;
      }

      if (Type.hasProperty(element, fieldName)) {
         return element;
      }

      return undefined;
   }

   private tryGetDataKey(
      elementData: unknown,
      fieldName: string
   ): string | symbol | undefined {
      return elementData
         ? [
              ...Object.keys(elementData),
              ...Object.getOwnPropertySymbols(elementData),
           ].find(
              (key) =>
                 Type.hasProperty(elementData[key], fieldName) ||
                 this._inputContext.getInputInfo(
                    elementData[key].constructor,
                    fieldName
                 )
           )
         : undefined;
   }

   private tryToResolveOnParent(element: Node, fieldName: string) {
      const parent = this._domQuery.getParent(element);
      return parent ? this.resolveContext(parent, fieldName) : undefined;
   }

   private deleteField(node: Node, key: string | symbol): void {
      const elementData = this._data.get(node);

      if (!elementData) {
         return;
      }

      delete elementData[key];

      if (Type.isEmptyObject(elementData)) {
         this._data.delete(node);
      }
   }

   private onRemoved = (nodeList: NodeList) => {
      Array.from(nodeList).forEach((node) => this.unregister(node));
   };

   private startWatchForRemoved(): void {
      if (!this._removedSubscription) {
         this._removedSubscription =
            this._elementRemovedObserver.removed.subscribe(this.onRemoved);
      }
   }

   private stopWatchForRemoved(): void {
      if (this._removedSubscription) {
         this._removedSubscription.unsubscribe();
         this._removedSubscription = null;
      }
   }
}
