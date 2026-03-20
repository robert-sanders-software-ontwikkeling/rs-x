import { TemplatedElementFactory } from './templated-element.factory';
import { ITemplatedElementFactories } from './templated-element.factories.type';

import { Inject, Injectable, KeyedInstanceFactory,  } from '@rs-x/core';
import { IDomQuery } from '../dom-query/dom-query.interface';

import { IDomElementData } from '../dom-element-data/dom-element-data.interface';
import { IElementFactory } from '../dom-item-element-synchronisizer/element-factory.interface';
import { RsXUIInjectionTokens } from '../rx-x-ui.injection-tokens';
import { IDomElementFactory } from '../dom-element/dom-element.factory.interface';

@Injectable()
export class TemplatedElementFactories
   extends KeyedInstanceFactory<
      HTMLTemplateElement,
      HTMLTemplateElement,
      IElementFactory
   >
   implements ITemplatedElementFactories
{
   constructor(
      @Inject(RsXUIInjectionTokens.IDomQuery)
      private readonly _domQuery: IDomQuery,
      @Inject(RsXUIInjectionTokens.IDomElementFactory)
      private readonly _domElementFactory: IDomElementFactory,
      @Inject(RsXUIInjectionTokens.IDomElementData)
      private readonly _domElementData: IDomElementData
   ) {
      super();
   }

   public getId(element: HTMLTemplateElement): HTMLTemplateElement {
      return element;
   }

   protected createId(element: HTMLTemplateElement): HTMLTemplateElement {
      return this.getId(element);
   }

   protected createInstance(element: HTMLTemplateElement): IElementFactory {
      return new TemplatedElementFactory(
         element,
         this._domQuery,
         this._domElementFactory,
         this._domElementData
      );
   }
}
