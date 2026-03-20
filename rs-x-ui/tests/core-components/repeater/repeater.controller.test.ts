/* eslint-disable @typescript-eslint/no-explicit-any */
import { HtmlTagName } from '@rs-x/core';
import { DomItemElementSynchronizerMock } from '@rs-x/core/testing';
import { of } from 'rxjs';
import { RepeaterController } from '../../../lib/core-components/repeater/repeater.controller';
import { CustomElementCoreServicesMock } from '../../../lib/testing/custom-element-core-services.mock';

describe('Repeater controller', () => {
   let controller: RepeaterController;
   let element: HTMLTemplateElement;
   let customElement: any;
   let customElementCoreServicesMock: CustomElementCoreServicesMock;
   let synchronizer: DomItemElementSynchronizerMock;

   beforeEach(() => {
      customElement = {};
      element = createTemplate();
      customElementCoreServicesMock = new CustomElementCoreServicesMock(
         element,
         customElement
      );
      synchronizer = new DomItemElementSynchronizerMock();
      controller = createConroller();
   });

   it('get items will call get items on synchronizer', () => {
      const actual = controller.items;
      expect(actual).toBe(synchronizer.items);
   });

   it('set items will not call set items on synchronizer when not attached', () => {
      const items = [];
      controller.items = items;
      expect(synchronizer.items).not.toBe(items);
   });

   it('set items will  call set items on synchronizer when  attached', () => {
      controller.attach();
      const items = [];
      controller.items = items;
      expect(synchronizer.items).toBe(items);
   });

   it('added elements will be data bound', () => {
      const attachBindingsSpy = jest.spyOn(
         customElementCoreServicesMock.bindingManager,
         'attachBindings'
      );
      const elements = [
         document.createElement(HtmlTagName.Div),
         document.createElement(HtmlTagName.Div),
         document.createTextNode('test'),
      ];

      synchronizer.emitChanged({
         addedElements: [
            {
               element: elements[0],
               data: null,
               index: 0,
            },
            {
               element: elements[1],
               data: null,
               index: 1,
            },
            {
               element: elements[2],
               data: null,
               index: 2,
            },
         ],
         deletedElements: [],
         changedElements: [],
         currentElements: [],
      });

      expect(attachBindingsSpy).toHaveBeenCalledTimes(1);
      expect(attachBindingsSpy).toHaveBeenNthCalledWith(1, elements);
   });

   it('events will be bound for add elements', () => {
      const bindEventsSpy = jest.spyOn(
         customElementCoreServicesMock.eventManager,
         'bindEvents'
      );
      const elements = [
         document.createElement(HtmlTagName.Div),
         document.createElement(HtmlTagName.Div),
         document.createTextNode('test'),
      ];

      synchronizer.emitChanged({
         addedElements: [
            {
               element: elements[0],
               data: null,
               index: 0,
            },
            {
               element: elements[1],
               data: null,
               index: 1,
            },
            {
               element: elements[2],
               data: null,
               index: 2,
            },
         ],
         deletedElements: [],
         changedElements: [],
         currentElements: [],
      });

      expect(bindEventsSpy).toHaveBeenCalledTimes(1);
      expect(bindEventsSpy).toHaveBeenNthCalledWith(1, [
         elements[0],
         elements[1],
      ]);
   });

   it('remove elements will be unbound', () => {
      const removeBindingsForElementSpy = jest.spyOn(
         customElementCoreServicesMock.bindingManager,
         'removeBindingsForElements'
      );
      const elements = [
         document.createElement(HtmlTagName.Div),
         document.createElement(HtmlTagName.Div),
         document.createTextNode('test'),
      ];

      synchronizer.emitChanged({
         addedElements: [],
         deletedElements: elements,
         changedElements: [],
         currentElements: [],
      });

      expect(removeBindingsForElementSpy).toHaveBeenCalledTimes(1);
      expect(removeBindingsForElementSpy).toHaveBeenNthCalledWith(1, elements);
   });

   it('events for removed elements will be unbound', () => {
      const unbindEventsSpy = jest.spyOn(
         customElementCoreServicesMock.eventManager,
         'unbindEvents'
      );
      const elements = [
         document.createElement(HtmlTagName.Div),
         document.createElement(HtmlTagName.Div),
         document.createTextNode('test'),
      ];

      synchronizer.emitChanged({
         addedElements: [],
         deletedElements: elements,
         changedElements: [],
         currentElements: [],
      });

      expect(unbindEventsSpy).toHaveBeenCalledTimes(1);
      expect(unbindEventsSpy).toHaveBeenNthCalledWith(1, [
         elements[0],
         elements[1],
      ]);
   });

   it('changed elements will be unbound', () => {
      const elements = [
         document.createElement(HtmlTagName.Div),
         document.createElement(HtmlTagName.Div),
         document.createTextNode('test'),
      ];

      synchronizer.emitChanged({
         addedElements: [],
         deletedElements: [],
         changedElements: [
            {
               element: elements[0],
               data: null,
               index: 0,
            },
            {
               element: elements[1],
               data: null,
               index: 1,
            },
            {
               element: elements[2],
               data: null,
               index: 2,
            },
         ],
         currentElements: [],
      });

      expect(
         customElementCoreServicesMock.bindingManager.rebindElements
      ).toHaveBeenCalledTimes(1);
      expect(
         customElementCoreServicesMock.bindingManager.rebindElements
      ).toHaveBeenNthCalledWith(1, elements);
   });

   it('detach wil unsubscribe to changed event', () => {
      const subscription = {
         unsubscribe: jest.fn(),
      };
      jest
         .spyOn(synchronizer.changed, 'subscribe')
         .mockReturnValue(subscription as any);
      const controller = createConroller();
      const unsubsribeSpy = jest.spyOn(subscription, 'unsubscribe');
      controller.detach();
      expect(unsubsribeSpy).toHaveBeenCalledTimes(1);
   });

   it('itemsBound event will be emitted when new item element have been added', async () => {
      jest
         .spyOn(customElementCoreServicesMock.bindingManager, 'attachBindings')
         .mockReturnValue(of([]));

      const emitEventSpy = jest.spyOn(
         customElementCoreServicesMock.eventManager,
         'emitEvent'
      );
      synchronizer.emitChanged({
         addedElements: [
            {
               element: document.createElement(HtmlTagName.Div),
               data: null,
               index: 0,
            },
         ],
         deletedElements: [],
         changedElements: [],
         currentElements: [],
      });

      expect(emitEventSpy).toHaveBeenCalledTimes(1);
      expect(emitEventSpy).toHaveBeenNthCalledWith(
         1,
         customElement,
         'itemsBound',
         undefined
      );
   });

   it('itemsBound event will be emitted when item element have changed', async () => {
      jest
         .spyOn(customElementCoreServicesMock.bindingManager, 'rebindElements')
         .mockReturnValue(of([]));

      const emitEventSpy = jest.spyOn(
         customElementCoreServicesMock.eventManager,
         'emitEvent'
      );
      synchronizer.emitChanged({
         addedElements: [],
         deletedElements: [],
         changedElements: [
            {
               element: document.createElement(HtmlTagName.Div),
               data: null,
               index: 0,
            },
         ],
         currentElements: [],
      });

      expect(emitEventSpy).toHaveBeenCalledTimes(1);
      expect(emitEventSpy).toHaveBeenNthCalledWith(
         1,
         customElement,
         'itemsBound',
         undefined
      );
   });

   function createTemplate(): HTMLTemplateElement {
      const rootElement = document.createElement(HtmlTagName.Select);
      const template = document.createElement(HtmlTagName.Template);
      rootElement.appendChild(template);
      const option = document.createElement(HtmlTagName.Option);
      (option as any).customElement = customElement;
      template.content.appendChild(option);
      return template;
   }

   function createConroller(): RepeaterController {
      return new RepeaterController(
         customElementCoreServicesMock,
         synchronizer
      );
   }
});
