import {
   Inject,
   Injectable,
} from '@rs-x/core';
import { componentPropertyName } from '../interfaces';
import {
   BindingType,
   IBindingAttribute,
   IBindingAttributeParser,
} from './interfaces';
import { RsXUIInjectionTokens } from '../../rx-x-ui.injection-tokens';
import { IDomQuery } from '../../dom-query/dom-query.interface';
import { IDomElementData } from '../../dom-element-data/dom-element-data.interface';

interface IParsedBindingType {
   index: number;
   bindingType: BindingType | null;
}

@Injectable()
export class BindingAttributeParser implements IBindingAttributeParser {
   constructor(
      @Inject(RsXUIInjectionTokens.IDomQuery)
      private readonly _domQuery: IDomQuery,
      @Inject(RsXUIInjectionTokens.IDomElementData)
      private readonly _dataElementData: IDomElementData
   ) {}

   public parse(contentElements: Element[]): IBindingAttribute[] {
      const bindingAttributes: IBindingAttribute[] = [];
      contentElements.forEach((contentElement) => {
         this.addAttributes(contentElement, bindingAttributes);
         this._domQuery
            .getDescendantsExceptTemplateContent(contentElement)
            .forEach((descendant) => {
               this.addAttributes(descendant, bindingAttributes);
            });
      });
      return bindingAttributes;
   }

   private addAttributes(
      contentElements: Element,
      bindingAttributes: IBindingAttribute[]
   ): void {
      Array.from(contentElements.attributes).forEach((attribute) => {
         const bindingAttribute = this.createBindingAttribute(attribute);
         if (bindingAttribute) {
            bindingAttributes.push(bindingAttribute);
         }
      });
   }

   private createBindingAttribute = (attribute: Attr): IBindingAttribute | null => {
      const { index, bindingType } = this.getBindingType(attribute.name);
      if (!bindingType) {
         return null;
      }
      return {
         name: attribute.name.substring(0, index),
         bindingType,
         bindingExpression: attribute.value,
         ownerElement: attribute.ownerElement!,
         component: this._dataElementData.getData(
            attribute.ownerElement!,
            componentPropertyName
         ),
      };
   };

   private tryParseOneWay(attributeName): IParsedBindingType | null {
      let index = attributeName.indexOf('.oneway');
      if (index > 0) {
         return {
            index,
            bindingType: BindingType.OneWay,
         };
      }
      return null;
   }

   private tryParseTwoWay(attributeName): IParsedBindingType | null {
      let index = attributeName.indexOf('.twoway');
      if (index > 0) {
         return {
            index,
            bindingType: BindingType.TwoWay,
         };
      }
      return null;
   }

   private tryParseOneTime(attributeName): IParsedBindingType | null {
      let index = attributeName.indexOf('.onetime');
      if (index > 0) {
         return {
            index,
            bindingType: BindingType.OneTime,
         };
      }
      return null;
   }

   private getBindingType(attributeName: string): IParsedBindingType {
      return (
         this.tryParseOneWay(attributeName) ||
         this.tryParseTwoWay(attributeName) ||
         this.tryParseOneTime(attributeName) || {
            bindingType: null,
            index: -1,
         }
      );
   }
}
