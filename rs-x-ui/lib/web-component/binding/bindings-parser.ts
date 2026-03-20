import {
   Assertion,
   ConstructorType,
   echo,
   Inject,
   Injectable
} from '@rs-x/core';

import { IdentifierExpression, IExpressionFactory, RsXExpressionParserInjectionTokens } from '@rs-x/expression-parser';
import { IDomElementData } from '../../dom-element-data/dom-element-data.interface';
import { IDomQuery } from '../../dom-query/dom-query.interface';
import { DomProperty } from '../../html-attributes/dom-property.enum';
import { getHtmlAttributeInfo } from '../../html-attributes/html-attributes';
import { RsXUIInjectionTokens } from '../../rx-x-ui.injection-tokens';
import { IInputContext } from '../decorators/input/input-context.interface';
import { IInputMetadata } from '../decorators/input/input-metadata.interface';
import { componentPropertyName } from '../interfaces';
import {
   BindingParseException,
   BindingType,
   IBinding,
   IBindingAttribute,
   IBindingAttributeParser,
   IBindingsParser,
   ITextContentExpressionParser,
} from './interfaces';

@Injectable()
export class BindingsParser implements IBindingsParser {
   constructor(
      @Inject(RsXUIInjectionTokens.IInputContext)
      private readonly _inputMetadataContext: IInputContext,
      @Inject(RsXUIInjectionTokens.IBindingAttributeParser)
      private readonly _bindingAttributeParser: IBindingAttributeParser,
      @Inject(RsXExpressionParserInjectionTokens.IExpressionFactory)
      private readonly _expressionFactory: IExpressionFactory,
      @Inject(RsXUIInjectionTokens.ITextContentExpressionParser)
      private readonly _textContentExpressionParser: ITextContentExpressionParser,
      @Inject(RsXUIInjectionTokens.IDomQuery)
      private readonly _domQuery: IDomQuery,
      @Inject(RsXUIInjectionTokens.IDomElementData)
      private readonly _domElementData: IDomElementData,
   ) { }

   public parse(content: Node[], slot?: HTMLSlotElement): IBinding[] {
      const elementNodes = content.filter(
         (n) => n.nodeType === Node.ELEMENT_NODE
      ) as Element[];

      return [
         ...this.getAttributeBindings(elementNodes, slot),
         ...this.getTextBindings(content),
      ];
   }

   private getAttributeBindings(
      elements: Element[],
      slot?: HTMLSlotElement
   ): IBinding[] {
      const bindingAttributes = this._bindingAttributeParser.parse(elements);
      return bindingAttributes.map((bindingAttribute) =>
         this.createBinding(bindingAttribute, slot)
      );
   }

   private createBinding(
      bindingAttribute: IBindingAttribute,
      slot?: HTMLSlotElement
   ): IBinding {
      const inputInfo = this.getInputInfo(
         bindingAttribute.ownerElement,
         bindingAttribute.name
      );

      // If the right binding expression is an identifier and the name is the same as the property we bind to we want to resolve the right expression on the parent.
      // It doesn't make sense to bind to your self
      const rightContext =
         inputInfo.propertyKey === bindingAttribute.bindingExpression
            ? bindingAttribute.ownerElement.parentNode
            : bindingAttribute.ownerElement;

      Assertion.assertNotNullOrUndefined(rightContext, 'rightContext');

      const rightExpression = this._expressionFactory.create(
         rightContext,
         bindingAttribute.bindingExpression
      );
      const leftExpression = this._expressionFactory.create(bindingAttribute.ownerElement, inputInfo.propertyKey) as IdentifierExpression

      return {
         dispose()  {
            this.left.dispose();
            this.right.dispose()
         },
         inputInfo,
         bindingOwnerElement: bindingAttribute.ownerElement,
         right: rightExpression,
         left: leftExpression,
         bindingType: bindingAttribute.bindingType,
         slot,
      };
   }

   private getTextBindings(
      contentNodes: Node[],
      slot?: HTMLSlotElement
   ): IBinding[] {
      return contentNodes
         .map((element) => this.getTextBindingsForNode(element, slot))
         .reduce((a, b) => a.concat(b), []);
   }

   private getTextBindingsForNode(
      element: Node,
      slot?: HTMLSlotElement
   ): IBinding[] {
      const inputInfo: IInputMetadata = {
         attributeName: DomProperty.TextContent,
         propertyKey: DomProperty.TextContent,
         watchExpression: DomProperty.TextContent,
         fromString: echo as <T>(value: string) => T,
      };
      const textNodes = this._domQuery.getTextNodes(element) ?? [];
      return textNodes
         .map((textNode) =>
            this.createTextBindingValue(textNode, inputInfo, slot)
         )
         .filter((binding) => binding !== null);
   }

   private createTextBindingValue(
      textNode: Node,
      inputInfo: IInputMetadata,
      slot?: HTMLSlotElement
   ): IBinding | null {
      const bindingExpresion = this._textContentExpressionParser.parse(
         textNode.textContent
      );
      if (!bindingExpresion) {
         return null;
      }

      const textBindingExpression = this._expressionFactory.create(textNode, DomProperty.TextContent) as IdentifierExpression;
      const rightExpression = this._expressionFactory.create(
         textNode,
         bindingExpresion.expressionString
      );

      return {
          dispose()  {
            this.left.dispose();
            this.right.dispose()
         },
         inputInfo,
         bindingOwnerElement: textNode,
         left: textBindingExpression,
         right: rightExpression,
         bindingType: BindingType.OneWayText,
         slot,
      };
   }

   private getInputInfo(
      ownerElement: Element,
      attributeName: string
   ): IInputMetadata {
      let inputInfo = this.tryGetInputMetaData(ownerElement, attributeName);

      if (inputInfo) {
         return inputInfo;
      }

      return this.getHtmlAttributeInputMetaData(ownerElement, attributeName);
   }

   private tryGetInputMetaData(
      ownerElement: Element,
      attributeName: string
   ): IInputMetadata | null | undefined {
      const component = this._domElementData.getData(
         ownerElement,
         componentPropertyName
      );

      return component
         ? this._inputMetadataContext.getInputForAttribute(
            component.constructor as ConstructorType<unknown>,
            attributeName,
            false
         )
         : null;
   }

   private getHtmlAttributeInputMetaData(
      ownerElement: Element,
      attributeName: string
   ): IInputMetadata {
      const inputInfo = getHtmlAttributeInfo(
         ownerElement.tagName,
         attributeName
      );

      if (!inputInfo) {
         throw new BindingParseException(
            `'${attributeName}' is not registered as an input or html attribute for element '${ownerElement.tagName}'.` +
            `\n Is ${ownerElement.tagName} an web component or has the belonging javascript file been loaded?`
         );
      }

      return {
         attributeName: inputInfo.attributeName,
         propertyKey: inputInfo.propertyKey,
         fromString: inputInfo.fromString as <T>(value: string) => T,
         valueToString: inputInfo.toString as <T>(value: T) => string,
         isAttributeBinding: true,
      };
   }
}
