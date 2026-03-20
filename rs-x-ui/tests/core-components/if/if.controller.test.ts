/* eslint-disable @typescript-eslint/no-explicit-any */
import { HtmlTagName } from '@rs-x/core';
import { of } from 'rxjs';
import { IfController } from '../../../lib/core-components/if/if.controller';
import { CustomElementCoreServicesMock } from '../../../lib/testing/custom-element-core-services.mock';
import { ElementFactoryMock } from '../../../lib/testing/element-factory.mock';

describe('If controller', () => {
   let contentParent: Element;
   let contentClone: Node;
   let template: HTMLTemplateElement;
   let elementFactory: ElementFactoryMock;
   let customElementCoreServicesMock: CustomElementCoreServicesMock;
   let customElement: any;

   beforeEach(() => {
      customElement = { id: 'x' };
      elementFactory = new ElementFactoryMock();
      template = createTemplate();
      customElementCoreServicesMock = new CustomElementCoreServicesMock(
         template,
         customElement
      );
   });

   it('creating an if controller will create the content element', () => {
      const createSpy = jest
         .spyOn(elementFactory, 'create')
         .mockReturnValue(contentClone);
      const controller = createConroller();
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect((controller as any)._contentElement).toEqual(contentClone);
   });

   it('show has false als default value', () => {
      const controller = createConroller();
      expect(controller.show).toBeFalsy();
   });

   it('content will intiallly be empty', () => {
      const controller = createConroller();
      expect(controller.content).toEqual([]);
   });

   it('attach will append content when show is true', () => {
      jest.spyOn(elementFactory, 'create').mockReturnValue(contentClone);
      const controller = createConroller();
      const afterSpy = jest.spyOn(template, 'after');
      controller.show = true;
      controller.attach();
      expect(afterSpy).toHaveBeenCalledTimes(1);
      expect(afterSpy).toHaveBeenNthCalledWith(1, contentClone);
      expect(controller.content).toEqual([contentClone]);
   });

   it('attach will not append content if show is false', () => {
      jest.spyOn(elementFactory, 'create').mockReturnValue(contentClone);
      const controller = createConroller();
      const afterSpy = jest.spyOn(template, 'after');
      controller.attach();
      expect(afterSpy).not.toHaveBeenCalled();
      expect(controller.content).toEqual([]);
   });

   it('set show from true to false will remove content if attached', () => {
      jest.spyOn(elementFactory, 'create').mockReturnValue(contentClone);
      const controller = createConroller();

      controller.show = true;
      controller.attach();

      const removeBindingsForElementsSpy = jest.spyOn(
         customElementCoreServicesMock.bindingManager,
         'removeBindingsForElements'
      );
      const unbindEventsSpy = jest.spyOn(
         customElementCoreServicesMock.eventManager,
         'unbindEvents'
      );
      const removeChildSpy = jest.spyOn(contentParent, 'removeChild');
      controller.show = false;

      expect(removeBindingsForElementsSpy).toHaveBeenCalledTimes(1);
      expect(removeBindingsForElementsSpy).toHaveBeenNthCalledWith(1, [
         contentClone,
      ]);
      expect(unbindEventsSpy).toHaveBeenCalledTimes(1);
      expect(unbindEventsSpy).toHaveBeenNthCalledWith(1, [contentClone]);
      expect(removeChildSpy).toHaveBeenCalledTimes(1);
      expect(removeChildSpy).toHaveBeenNthCalledWith(1, contentClone);
      expect(controller.content).toEqual([]);
   });

   it('set show from false to true will add content if attached', () => {
      jest.spyOn(elementFactory, 'create').mockReturnValue(contentClone);
      const controller = createConroller();

      controller.show = false;
      controller.attach();

      const attachBindingsSpy = jest
         .spyOn(customElementCoreServicesMock.bindingManager, 'attachBindings')
         .mockReturnValue(of([]))
         .mockClear();
      const bindEventsSpy = jest
         .spyOn(customElementCoreServicesMock.eventManager, 'bindEvents')
         .mockClear();
      const afterSpy = jest.spyOn(template, 'after');
      controller.show = true;

      expect(afterSpy).toHaveBeenCalledTimes(1);
      expect(afterSpy).toHaveBeenNthCalledWith(1, contentClone);
      expect(attachBindingsSpy).toHaveBeenCalledTimes(1);
      expect(attachBindingsSpy).toHaveBeenNthCalledWith(1, [contentClone]);
      expect(bindEventsSpy).toHaveBeenCalledTimes(1);
      expect(bindEventsSpy).toHaveBeenNthCalledWith(1, [contentClone]);
      expect(controller.content).toEqual([contentClone]);
   });

   it('set show from false to will emit bound event', async () => {
      jest.spyOn(elementFactory, 'create').mockReturnValue(contentClone);
      const controller = createConroller();

      controller.show = false;
      controller.attach();

      const expectedEventArgs: any = {};
      jest
         .spyOn(customElementCoreServicesMock.bindingManager, 'attachBindings')
         .mockReturnValue(of(expectedEventArgs));
      const emitEventSpy = jest.spyOn(
         customElementCoreServicesMock.eventManager,
         'emitEvent'
      );
      controller.show = true;
      expect(emitEventSpy).toHaveBeenCalledTimes(1);
      expect(emitEventSpy).toHaveBeenNthCalledWith(
         1,
         customElement,
         'bound',
         expectedEventArgs
      );
   });

   function createTemplate(): HTMLTemplateElement {
      contentParent = document.createElement(HtmlTagName.Div);
      const templateElement = document.createElement(HtmlTagName.Template);
      contentParent.appendChild(templateElement);
      const content = document.createElement(HtmlTagName.Div);
      content.textContent = 'Hello';
      templateElement.content.appendChild(content);
      contentClone = content.cloneNode(true);
      return templateElement;
   }

   function createConroller(): IfController {
      return new IfController(customElementCoreServicesMock, elementFactory);
   }
});
