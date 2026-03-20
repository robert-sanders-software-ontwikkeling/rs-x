import { PredefinedPath, Type } from '@rs-x/core';
import {
   DomElementDataMock,
   DomElementFactoryMock,
   DomQueryMock,
} from '@rs-x/core/testing';
import { createElementMock, ElementMock } from '../../lib/testing/element.mock';
import { createHTMLTemplateElementMock, HTMLTemplateElementMock } from '../../lib/testing/html-template-element.mock';
import { ITemplatedElementFactoryPrivate } from '../../lib/testing/private/templated-element-factory-private.interface';
import { bindingDataPropertyName } from '../../lib/web-component/interfaces';
import { TemplatedElementFactory } from '../../lib/web-component/template/templated-element.factory';

describe('Templated element factory', () => {
   const data = { myProperty: 12 };
   const dataAlias = 'myData';
   let templateElement: HTMLTemplateElementMock;
   let contentContainerElement: ElementMock;
   let contentElement1: ElementMock;
   let contentElement2: ElementMock;
   let factory: TemplatedElementFactory;
   let domElementData: DomElementDataMock;
   let domQuery: DomQueryMock;
   let domElementFactory: DomElementFactoryMock;
   let contentElements: ElementMock[];

   function createFactory(): TemplatedElementFactory {
      return new TemplatedElementFactory(
         templateElement,
         domQuery,
         domElementFactory,
         domElementData
      );
   }

   beforeEach(() => {
      contentContainerElement = createElementMock();
      templateElement = createHTMLTemplateElementMock();
      contentElement1 = createElementMock();
      contentElement1.cloneNode.mockReturnValue(contentElement1);
      contentElement2 = createElementMock();
      contentElements = [contentElement1];
      domElementData = new DomElementDataMock();
      domQuery = new DomQueryMock();
      domElementFactory = new DomElementFactoryMock();
      domQuery.getChildNodesWithContent.mockImplementation(
         () => contentElements
      );

      factory = createFactory();
   });

   it('If template contains only one element it will be used as template for creating content ', () => {
      expect(
         Type.cast<ITemplatedElementFactoryPrivate>(factory)._element
      ).toEqual(contentElement1);
   });

   it('If template contains more elements a container with the child node of the template will be created', () => {
      contentElements = [contentElement1, contentElement2];

      domElementFactory.createElement.mockReturnValue(contentContainerElement);

      const factory = createFactory();

      expect(contentContainerElement.appendChild).toHaveBeenCalledTimes(2);
      expect(contentContainerElement.appendChild).toHaveBeenNthCalledWith(
         1,
         contentElement1
      );
      expect(contentContainerElement.appendChild).toHaveBeenNthCalledWith(
         2,
         contentElement2
      );

      expect(
         Type.cast<ITemplatedElementFactoryPrivate>(factory)._element
      ).toEqual(contentContainerElement);
   });

   it('create will register data for the element with default alias if no alias provided', () => {
      factory.create(undefined, data);

      expect(domElementData.register).toHaveBeenCalledTimes(1);
      expect(domElementData.register).toHaveBeenCalledWith(
         contentElement1,
         bindingDataPropertyName,
         {
            [PredefinedPath.Data]: data,
         }
      );
   });

   it('create will register data for the element with given alias', () => {
      factory.create(dataAlias, data);

      expect(domElementData.register).toHaveBeenCalledTimes(1);
      expect(domElementData.register).toHaveBeenCalledWith(
         contentElement1,
         bindingDataPropertyName,
         {
            [dataAlias]: data,
         }
      );
   });

   it('create creates a deep clone of the template content element', () => {
      factory.create(undefined, data);

      expect(contentElement1.cloneNode).toHaveBeenCalledTimes(1);
      expect(contentElement1.cloneNode).toHaveBeenCalledWith(true);
   });
});
