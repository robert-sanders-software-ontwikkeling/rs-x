import { DomQuery } from '../../../lib/dom-query/dom-query';
import { HtmlTagName } from '../../../lib/html-elements/html-tag-name';
import { DomElementDataMock } from '../../../lib/testing/dom-element-data.mock';
import { WebComponentElementMock } from '../../../lib/testing/web-component-element.mock';
import { BindingAttributeParser } from '../../../lib/web-component/binding/binding-attribute-parser';
import { BindingType } from '../../../lib/web-component/binding/interfaces';
import { componentPropertyName } from '../../../lib/web-component/interfaces';

describe('Binding attribute parser', () => {
   let bindingAttributeParser: BindingAttributeParser;
   let domElementData: DomElementDataMock;
   let domQuery: DomQuery;
   let element: HTMLElement;

   beforeEach(() => {
      element = document.createElement(HtmlTagName.Div);
      domQuery = new DomQuery();
      domElementData = new DomElementDataMock();
      bindingAttributeParser = new BindingAttributeParser(
         domQuery,
         domElementData
      );
   });

   it('parser will return onetime bindings', () => {
      setOneTimeBindingAttribute(element, 'a', '1');
      setOneTimeBindingAttribute(element, 'b', '2');

      const actual = bindingAttributeParser.parse([element]);
      const expected = [
         {
            name: 'a',
            bindingExpression: '1',
            bindingType: BindingType.OneTime,
            ownerElement: element,
         },
         {
            name: 'b',
            bindingExpression: '2',
            bindingType: BindingType.OneTime,
            ownerElement: element,
         },
      ];
      expect(actual).toEqual(expected);
   });

   it('parser will return oneway bindings on ownerElement', () => {
      setOneWayBindingAttribute(element, 'a', '1');
      setOneWayBindingAttribute(element, 'b', '2');

      const actual = bindingAttributeParser.parse([element]);
      const expected = [
         {
            name: 'a',
            bindingExpression: '1',
            bindingType: BindingType.OneWay,
            ownerElement: element,
         },
         {
            name: 'b',
            bindingExpression: '2',
            bindingType: BindingType.OneWay,
            ownerElement: element,
         },
      ];
      expect(actual).toEqual(expected);
   });

   it('parser will return two way bindings ', () => {
      setTwoWayBindingAttribute(element, 'a', '1');
      setTwoWayBindingAttribute(element, 'b', '2');

      const actual = bindingAttributeParser.parse([element]);
      const expected = [
         {
            name: 'a',
            bindingExpression: '1',
            bindingType: BindingType.TwoWay,
            ownerElement: element,
         },
         {
            name: 'b',
            bindingExpression: '2',
            bindingType: BindingType.TwoWay,
            ownerElement: element,
         },
      ];
      expect(actual).toEqual(expected);
   });

   it('parser will parse binding on nested content elements', () => {
      const nestedContentElement = document.createElement(HtmlTagName.Div);
      setOneWayBindingAttribute(nestedContentElement, 'a', '1');
      setOneWayBindingAttribute(nestedContentElement, 'b', '2');

      const getDescendantsExceptTemplatesSpy = jest
         .spyOn(domQuery, 'getDescendantsExceptTemplateContent')
         .mockReturnValue([nestedContentElement]);

      const actual = bindingAttributeParser.parse([element]);
      const expected = [
         {
            name: 'a',
            bindingExpression: '1',
            bindingType: BindingType.OneWay,
            ownerElement: nestedContentElement,
         },
         {
            name: 'b',
            bindingExpression: '2',
            bindingType: BindingType.OneWay,
            ownerElement: nestedContentElement,
         },
      ];
      expect(actual).toEqual(expected);
      expect(getDescendantsExceptTemplatesSpy).toHaveBeenCalledTimes(1);
      expect(getDescendantsExceptTemplatesSpy).toHaveBeenNthCalledWith(
         1,
         element
      );
   });

   it('parser will set component if attribute owner element is a component', () => {
      setOneWayBindingAttribute(element, 'a', '1');
      const component = new WebComponentElementMock({});
      domElementData.getData.mockReturnValue(component);

      const actual = bindingAttributeParser.parse([element]);

      expect(domElementData.getData).toHaveBeenCalledTimes(1);
      expect(domElementData.getData).toHaveBeenCalledWith(
         element,
         componentPropertyName
      );
      expect(actual[0]?.component).toBe(component);
   });

   function setOneTimeBindingAttribute(
      element: Element,
      name: string,
      value: string
   ): void {
      element.setAttribute(`${name}.onetime`, value);
   }

   function setOneWayBindingAttribute(
      element: Element,
      name: string,
      value: string
   ): void {
      element.setAttribute(`${name}.oneway`, value);
   }

   function setTwoWayBindingAttribute(
      element: Element,
      name: string,
      value: string
   ): void {
      element.setAttribute(`${name}.twoway`, value);
   }
});
