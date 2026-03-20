import { BindingAttributeParserMock } from '../../../lib/testing/binding/binding-attribute-parser.mock';
import { createElementMock } from '../../../lib/testing/element.mock';
import { createHTMLElementMock, HTMLElementMock } from '../../../lib/testing/html-element.mock';
import { createNodeMock } from '../../../lib/testing/node.mock';
import { createParentNodeMock } from '../../../lib/testing/parent-node.mock';

import { echo } from '@rs-x/core';
import { ExpressionFactoryMock, ExpressionMock } from '@rs-x/expression-parser/testing';
import dedent from 'dedent';
import * as htmlAttributes from '../../../lib/html-attributes/html-attributes';
import { DomProperty } from '../../../lib/html-attributes/dom-property.enum';
import { HtmlTagName } from '../../../lib/html-elements/html-tag-name';
import { DomElementDataMock } from '../../../lib/testing/dom-element-data.mock copy';
import { DomQueryMock } from '../../../lib/testing/dom-query.mock';
import { InputContextMock } from '../../../lib/testing/input-context.mock';
import { TextContentExpressionParserMock } from '../../../lib/testing/text-content-expression-parser.mock';
import { WebComponentElementMock } from '../../../lib/testing/web-component-element.mock';
import { BindingsParser } from '../../../lib/web-component/binding/bindings-parser';
import { BindingParseException, BindingType } from '../../../lib/web-component/binding/interfaces';
import { IInputMetadata } from '../../../lib/web-component/decorators/input/input-metadata.interface';

describe('Bindings parser', () => {
   let ownerElement: HTMLElementMock;
   let customElement: WebComponentElementMock;
   let bindingsParser: BindingsParser;
   let inputMetadataContext: InputContextMock;
   let domQuery: DomQueryMock;
   let bindingAttributeParser: BindingAttributeParserMock;
   let textContentExpressionParser: TextContentExpressionParserMock;
   let domElementData: DomElementDataMock;
   let inputs: IInputMetadata[];
   let expressionFactory: ExpressionFactoryMock;

   beforeEach(() => {
      inputs = [
         {
            attributeName: 'a',
            propertyKey: 'a',
         },
         {
            attributeName: 'b',
            propertyKey: 'b',
         },
      ];

      ownerElement = createHTMLElementMock({ tagName: HtmlTagName.Div });

      customElement = new WebComponentElementMock({ element: ownerElement });
      domElementData = new DomElementDataMock();
      domElementData.getData.mockReturnValue(customElement);
      domQuery = new DomQueryMock();
      inputMetadataContext = new InputContextMock();
      bindingAttributeParser = new BindingAttributeParserMock();
      expressionFactory = new ExpressionFactoryMock();
      bindingAttributeParser.parse.mockReturnValue([]);
      textContentExpressionParser = new TextContentExpressionParserMock();

      bindingsParser = new BindingsParser(
         inputMetadataContext,
         bindingAttributeParser,
         expressionFactory,
         textContentExpressionParser,
         domQuery,
         domElementData,
      );
   });

   it('Binding attributes will only be parsed for element nodes', () => {
      const content = [
         createHTMLElementMock(),
         createNodeMock({ nodeType: Node.TEXT_NODE }),
      ];

      bindingsParser.parse(content);

      expect(bindingAttributeParser.parse).toHaveBeenCalledTimes(1);
      expect(bindingAttributeParser.parse).toHaveBeenCalledWith([content[0]]);
   });

   it('Text bindings will be parsed for content nodes', () => {
      const content = [
         createNodeMock({ nodeType: Node.TEXT_NODE, textContent: 'hi 1' }),
         createNodeMock({ nodeType: Node.TEXT_NODE, textContent: 'hi 2' }),
         createHTMLElementMock(),
      ];
      textContentExpressionParser.parse.mockReturnValue(null);
      domQuery.getTextNodes
         .mockReturnValueOnce([content[0]])
         .mockReturnValueOnce([content[1]])
         .mockReturnValueOnce([]);

      bindingsParser.parse(content);

      expect(domQuery.getTextNodes).toHaveBeenCalledTimes(3);
      expect(domQuery.getTextNodes).toHaveBeenNthCalledWith(1, content[0]);
      expect(domQuery.getTextNodes).toHaveBeenNthCalledWith(2, content[1]);
      expect(domQuery.getTextNodes).toHaveBeenNthCalledWith(3, content[2]);

      expect(textContentExpressionParser.parse).toHaveBeenCalledTimes(2);
      expect(textContentExpressionParser.parse).toHaveBeenNthCalledWith(1, 'hi 1');
      expect(textContentExpressionParser.parse).toHaveBeenNthCalledWith(2, 'hi 2');
   });

   it(dedent`The right binding value is resolved on the parent of the attribute owner element
      when the left binding property name matches the binding expression.`, () => {
      const contentElement = createHTMLElementMock({
         tagName: HtmlTagName.Div,
         parentNode: createParentNodeMock(),
      });

      inputMetadataContext.getInputForAttribute.mockReturnValue(inputs[0]);
      bindingAttributeParser.parse.mockReturnValue([
         {
            name: 'a',
            bindingExpression: 'a',
            bindingType: BindingType.OneWay,
            ownerElement: contentElement,
            component: customElement,
         },
      ]);

      expressionFactory.create.mockReturnValue(new ExpressionMock({ expressionString: 'a' }));

      bindingsParser.parse([createElementMock()]);

      expect(expressionFactory.create).toHaveBeenNthCalledWith(
         1,
         contentElement.parentNode,
         'a',
      );
   });

   it('The text binding left expression is resolved on the text node using the textContent property', () => {
      const textNode = createNodeMock({
         nodeType: Node.TEXT_NODE,
         textContent: 'hi 1',
      });

      domQuery.getTextNodes.mockReturnValue([textNode]);

      const parsedExpression = new ExpressionMock({ expressionString: '"hi"' });
      textContentExpressionParser.parse.mockReturnValue(parsedExpression);

      const leftExpression = new ExpressionMock({ expressionString: DomProperty.TextContent });
      const rightExpression = new ExpressionMock({ expressionString: '"hi"' });
      expressionFactory.create.mockImplementation((_, expressionString) => {
         if (expressionString === DomProperty.TextContent) return leftExpression;
         if (expressionString === '"hi"') return rightExpression;
         throw new Error(`Unexpected expressionString: ${String(expressionString)}`);
      });

      bindingsParser.parse([createElementMock()]);

      expect(expressionFactory.create).toHaveBeenCalledTimes(2);
      expect(expressionFactory.create).toHaveBeenNthCalledWith(1, textNode, DomProperty.TextContent);
      expect(expressionFactory.create).toHaveBeenNthCalledWith(2, textNode, '"hi"');
   });

   it('Parse returns one-way bindings', () => {
      const contentElement = createHTMLElementMock({ tagName: HtmlTagName.Div });

      inputMetadataContext.getInputForAttribute.mockReturnValue(inputs[0]);
      bindingAttributeParser.parse.mockReturnValue([
         {
            name: 'a',
            bindingExpression: 'b',
            bindingType: BindingType.OneWay,
            ownerElement: contentElement,
            component: customElement,
         },
      ]);

      const leftExpression = new ExpressionMock({ expressionString: 'a' });
      const rightExpression = new ExpressionMock({ expressionString: 'b' });
      expressionFactory.create.mockImplementation((_, expressionString) => {
         if (expressionString === 'b') return rightExpression;
         if (expressionString === 'a') return leftExpression;
         throw new Error(`Unexpected: ${String(expressionString)}`);
      });

      const actual = bindingsParser.parse([contentElement]);

      expect(actual).toMatchObject([
         {
            inputInfo: inputs[0],
            bindingOwnerElement: contentElement,
            left: leftExpression,
            right: rightExpression,
            bindingType: BindingType.OneWay,
         },
      ]);
   });

   it('Parse returns two-way bindings', () => {
      const contentElement = createHTMLElementMock({ tagName: HtmlTagName.Div });

      inputMetadataContext.getInputForAttribute.mockReturnValue(inputs[0]);
      bindingAttributeParser.parse.mockReturnValue([
         {
            name: 'a',
            bindingExpression: 'b',
            bindingType: BindingType.TwoWay,
            ownerElement: contentElement,
            component: customElement,
         },
      ]);

      const leftExpression = new ExpressionMock({ expressionString: 'a' });
      const rightExpression = new ExpressionMock({ expressionString: 'b' });
      expressionFactory.create.mockImplementation((_, expressionString) => {
         if (expressionString === 'b') return rightExpression;
         if (expressionString === 'a') return leftExpression;
         throw new Error(`Unexpected: ${String(expressionString)}`);
      });

      const actual = bindingsParser.parse([contentElement]);

      expect(actual).toMatchObject([
         {
            inputInfo: inputs[0],
            bindingOwnerElement: contentElement,
            left: leftExpression,
            right: rightExpression,
            bindingType: BindingType.TwoWay,
         },
      ]);
   });

   it('Parse returns text bindings', () => {
      const textNode = createNodeMock({
         nodeType: Node.TEXT_NODE,
         textContent: 'hi 1',
      });
      domQuery.getTextNodes.mockReturnValue([textNode]);

      const parsedExpression = new ExpressionMock({ expressionString: 'someExpr' });
      textContentExpressionParser.parse.mockReturnValue(parsedExpression);

      const leftExpression = new ExpressionMock({ expressionString: DomProperty.TextContent });
      const rightExpression = new ExpressionMock({ expressionString: 'someExpr' });
      expressionFactory.create.mockImplementation((_, expressionString) => {
         if (expressionString === DomProperty.TextContent) return leftExpression;
         if (expressionString === 'someExpr') return rightExpression;
         throw new Error(`Unexpected: ${String(expressionString)}`);
      });

      const actual = bindingsParser.parse([textNode]);

      expect(actual).toMatchObject([
         {
            inputInfo: {
               attributeName: DomProperty.TextContent,
               propertyKey: DomProperty.TextContent,
               watchExpression: DomProperty.TextContent,
               fromString: echo,
            },
            bindingOwnerElement: textNode,
            left: leftExpression,
            right: rightExpression,
            bindingType: BindingType.OneWayText,
         },
      ]);
   });

   it('Text node with no binding expression is excluded from results', () => {
      const textNode = createNodeMock({
         nodeType: Node.TEXT_NODE,
         textContent: 'plain text',
      });
      domQuery.getTextNodes.mockReturnValue([textNode]);
      textContentExpressionParser.parse.mockReturnValue(null);

      const actual = bindingsParser.parse([textNode]);

      expect(actual).toEqual([]);
   });

   it('Null text nodes from getTextNodes falls back to empty array', () => {
      const node = createNodeMock({ nodeType: Node.TEXT_NODE });
      domQuery.getTextNodes.mockReturnValue(null);

      const actual = bindingsParser.parse([node]);

      expect(actual).toEqual([]);
   });

   it('Slot is passed through to attribute bindings', () => {
      const slot = {} as HTMLSlotElement;
      const contentElement = createHTMLElementMock({ tagName: HtmlTagName.Div });

      inputMetadataContext.getInputForAttribute.mockReturnValue(inputs[0]);
      bindingAttributeParser.parse.mockReturnValue([
         {
            name: 'a',
            bindingExpression: 'b',
            bindingType: BindingType.OneWay,
            ownerElement: contentElement,
            component: customElement,
         },
      ]);

      const leftExpression = new ExpressionMock({ expressionString: 'a' });
      const rightExpression = new ExpressionMock({ expressionString: 'b' });
      expressionFactory.create.mockImplementation((_, expressionString) => {
         if (expressionString === 'b') return rightExpression;
         if (expressionString === 'a') return leftExpression;
         throw new Error(`Unexpected: ${String(expressionString)}`);
      });

      const actual = bindingsParser.parse([contentElement], slot);

      expect(actual).toMatchObject([{ slot }]);
   });

   it('Dispose on attribute binding calls left and right dispose', () => {
      const contentElement = createHTMLElementMock({ tagName: HtmlTagName.Div });

      inputMetadataContext.getInputForAttribute.mockReturnValue(inputs[0]);
      bindingAttributeParser.parse.mockReturnValue([
         {
            name: 'a',
            bindingExpression: 'b',
            bindingType: BindingType.OneWay,
            ownerElement: contentElement,
            component: customElement,
         },
      ]);

      const leftExpression = new ExpressionMock({ expressionString: 'a' });
      const rightExpression = new ExpressionMock({ expressionString: 'b' });
      expressionFactory.create.mockImplementation((_, expressionString) => {
         if (expressionString === 'b') return rightExpression;
         if (expressionString === 'a') return leftExpression;
         throw new Error(`Unexpected: ${String(expressionString)}`);
      });

      const [binding] = bindingsParser.parse([contentElement]);
      binding.dispose();

      expect(leftExpression.dispose).toHaveBeenCalledTimes(1);
      expect(rightExpression.dispose).toHaveBeenCalledTimes(1);
   });

   it('Dispose on text binding calls left and right dispose', () => {
      const textNode = createNodeMock({
         nodeType: Node.TEXT_NODE,
         textContent: 'hi',
      });
      domQuery.getTextNodes.mockReturnValue([textNode]);

      const parsedExpression = new ExpressionMock({ expressionString: 'expr' });
      textContentExpressionParser.parse.mockReturnValue(parsedExpression);

      const leftExpression = new ExpressionMock({ expressionString: DomProperty.TextContent });
      const rightExpression = new ExpressionMock({ expressionString: 'expr' });
      expressionFactory.create.mockImplementation((_, expressionString) => {
         if (expressionString === DomProperty.TextContent) return leftExpression;
         if (expressionString === 'expr') return rightExpression;
         throw new Error(`Unexpected: ${String(expressionString)}`);
      });

      const [binding] = bindingsParser.parse([textNode]);
      binding.dispose();

      expect(leftExpression.dispose).toHaveBeenCalledTimes(1);
      expect(rightExpression.dispose).toHaveBeenCalledTimes(1);
   });

   it('Falls back to HTML attribute metadata when element has no component', () => {
      domElementData.getData.mockReturnValue(null);
      jest.spyOn(htmlAttributes, 'getHtmlAttributeInfo').mockReturnValueOnce({
         attributeName: 'href',
         propertyKey: 'href',
         fromString: echo,
         toString: echo,
      });

      const contentElement = createHTMLElementMock({ tagName: 'A' });
      bindingAttributeParser.parse.mockReturnValue([
         {
            name: 'href',
            bindingExpression: 'myHref',
            bindingType: BindingType.OneWay,
            ownerElement: contentElement,
            component: customElement,
         },
      ]);

      expressionFactory.create.mockImplementation((_, expressionString) =>
         new ExpressionMock({ expressionString: String(expressionString) }),
      );

      const actual = bindingsParser.parse([contentElement]);

      expect(actual).toMatchObject([
         {
            inputInfo: {
               attributeName: 'href',
               propertyKey: 'href',
               isAttributeBinding: true,
            },
            bindingType: BindingType.OneWay,
         },
      ]);
   });

   it('Throws BindingParseException when attribute is not registered for element', () => {
      domElementData.getData.mockReturnValue(null);

      const contentElement = createHTMLElementMock({ tagName: 'UNKNOWN-ELEMENT' });
      bindingAttributeParser.parse.mockReturnValue([
         {
            name: 'nonexistent-attr',
            bindingExpression: 'value',
            bindingType: BindingType.OneWay,
            ownerElement: contentElement,
            component: customElement,
         },
      ]);

      expect(() => bindingsParser.parse([contentElement])).toThrow(BindingParseException);
   });
});
