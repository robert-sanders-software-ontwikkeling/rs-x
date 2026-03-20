import { IDomElementData } from '../dom-element-data/dom-element-data.interface';
import { IDomElementFactory } from '../dom-element/dom-element.factory.interface';
import { IElementFactory } from '../dom-item-element-synchronisizer/element-factory.interface';

import { IDomQuery } from '../dom-query/dom-query.interface';
import { HtmlTagName } from '../html-elements/html-tag-name';
import { bindingDataPropertyName } from './binding-data-property-name';

export class TemplatedElementFactory implements IElementFactory {
   private readonly _element: Element;

   constructor(
      template: HTMLTemplateElement,
      domQuery: IDomQuery,
      domElementFactory: IDomElementFactory,
      private readonly _domElementData: IDomElementData
   ) {
      this._element = this.createTemplateContentElement(
         template,
         domQuery,
         domElementFactory
      );
   }

   public create<T>(dataAlias: string, data: T): Element {
      const element = this._element.cloneNode(true) as Element;
      this._domElementData.register(element, bindingDataPropertyName, {
         [dataAlias]: data,
      });
      return element;
   }

   public setData(element: Element, dataAlias: string, data: unknown): void {
      this._domElementData.register(element, bindingDataPropertyName, {
         [dataAlias]: data,
      });
   }

   private createTemplateContentElement(
      template: HTMLTemplateElement,
      domQuery: IDomQuery,
      domElementFactory: IDomElementFactory
   ): HTMLElement {
      const chidlNodesWithContent = domQuery.getChildNodesWithContent(template);
      if (chidlNodesWithContent.length === 1) {
         return chidlNodesWithContent[0] as HTMLElement;
      }
      const container = domElementFactory.createElement(HtmlTagName.Div);
      chidlNodesWithContent.forEach((childNode) =>
         container.appendChild(childNode)
      );
      return container;
   }
}
