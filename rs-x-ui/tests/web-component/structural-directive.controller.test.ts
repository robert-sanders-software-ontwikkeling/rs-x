import { Type } from '@rs-x/core';
import {
   DomElementDataMock,
   DomQueryMock,
} from '@rs-x/core/testing';
import { createHTMLElementMock, HTMLElementMock } from '../../lib/testing/html-element.mock';
import { createHTMLTemplateElementMock, HTMLTemplateElementMock } from '../../lib/testing/html-template-element.mock';
import { createNodeMock, NodeMock } from '../../lib/testing/node.mock';
import { BindingManagerMock } from '../../lib/testing/binding/binding-manager.mock';
import { BindingQueueMock } from '../../lib/testing/binding/binding-queue.mock';
import { CustomElementMock } from '../../lib/testing/custom-element.mock';
import { EventManagerMock } from '../../lib/testing/event-manager.mock';
import { IStructuralDirectiveControllerPrivate } from '../../lib/testing/private/structural-directive.controller-private.interface';
import { StructuralDirectiveController } from '../../lib/web-component/structural-directive.controller';

describe('Structural directive controller', () => {
   let customElement: CustomElementMock;
   let element: HTMLTemplateElementMock;
   let contentElement1: HTMLElementMock;
   let contentElement2: HTMLElementMock;
   let content: NodeMock[];
   let controller: StructuralDirectiveController;

   beforeEach(() => {
      contentElement1 = createHTMLElementMock();
      contentElement2 = createHTMLElementMock();
      content = [
         contentElement1,
         createNodeMock({ nodeType: Node.TEXT_NODE }),
         contentElement2,
      ];
      element = createHTMLTemplateElementMock();
      element.parentElement = createHTMLElementMock();
      customElement = new CustomElementMock(element);
      controller = createConroller(element);
   });

   it('parent will return content container', () => {
      expect(controller.parent).toBe(element.parentElement);
   });

   it('getEventElements returns only content elements', () => {
      jest.spyOn(controller, 'content', 'get').mockReturnValue(content);
      const actual =
         Type.cast<IStructuralDirectiveControllerPrivate>(
            controller
         ).getEventElements();
      const expected = [contentElement1, contentElement2];
      expect(actual).toEqual(expected);
   });

   function createConroller(
      templateElement: HTMLTemplateElement
   ): StructuralDirectiveController {
      class TestStructuralDirectiveConroller extends StructuralDirectiveController {
         public get content(): readonly Node[] {
            return [];
         }
         public buildContent(): void {
            return;
         }
      }
      return new TestStructuralDirectiveConroller({
         element: templateElement,
         customElement,
         eventManager: new EventManagerMock(),
         bindingManager: new BindingManagerMock(),
         domElementData: new DomElementDataMock(),
         bindingQueue: new BindingQueueMock(),
         domQuery: new DomQueryMock(),
      });
   }
});
