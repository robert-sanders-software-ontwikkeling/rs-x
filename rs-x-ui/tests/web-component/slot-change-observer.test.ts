import { waitForEvent } from '@rs-x/core';
import { createHTMLElementMock } from '../../lib/testing/html-element.mock';
import { CustomElementMock } from '../../lib/testing/custom-element.mock';
import {
   setupWebComponentTests,
   teardownWebComponentTests,
} from '../../lib/testing/utility';
import { IBindingManager } from '../../lib/web-component/binding/interfaces';
import { Component } from '../../lib/web-component/decorators';
import {
   ICustomElementConnector,
   IEventManager,
   IWebComponentController,
} from '../../lib/web-component/interfaces';
import { SlotChangeObserver } from '../../lib/web-component/slot-change-observer/slot-change-observer';
import { WebComponentController } from '../../lib/web-component/web-component-controller';
import { WebComponentElement } from '../../lib/web-component/web-component-element';

describe('Slot change observer', () => {
   let bindingManager: IBindingManager;
   let eventManager: IEventManager;
   let slotChangeObserver: SlotChangeObserver;

   beforeAll(() => {
      @Component({
         selector: 'my-panel',
         template: `
            <slot name="header"></slot>
            <slot name="content"></slot>
         `,
         dependencies: [],
         controllerFactoryToken: WebComponentController,
      })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      class PanelComponent extends WebComponentElement<IWebComponentController> {
         public header = 'Say hello to';
         public name = 'Robert';
      }
      setupWebComponentTests();
   });
   afterAll(teardownWebComponentTests);

   beforeEach(() => {
      eventManager = createEventManagerMock();
      bindingManager = createBindingManagerMock();
      slotChangeObserver = new SlotChangeObserver(
         new CustomElementMock(createHTMLElementMock()),
         eventManager
      );
   });

   afterEach(() => {
      document.body.innerHTML = '';
   });

   it('startWatching with root slot element will start listen to slotchange event', () => {
      const slot = createSlot();
      const addEventListenerSpy = jest.spyOn(slot, 'addEventListener');
      slotChangeObserver.startWatching([slot]);

      expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
      expect(addEventListenerSpy).toHaveBeenNthCalledWith(
         1,
         'slotchange',
         expect.any(Function)
      );
   });

   it('Calling startWatching for the second time without calling stopWatching will throw an error', () => {
      const slot = createSlot();
      slotChangeObserver.startWatching([slot]);
      expect(() => slotChangeObserver.startWatching([slot])).toThrow(
         'Watching has already been started. Call stopWatching first'
      );
   });

   it('startWatching with nested slot element will start listen to slotchange event', () => {
      const element1 = createElement();
      const slot1 = createSlot();
      const addEventListenerSpy1 = jest.spyOn(slot1, 'addEventListener');
      const querySelectorAllSpy1 = jest
         .spyOn(element1, 'querySelectorAll')
         .mockReturnValue([slot1] as any);

      const element2 = createElement();
      const slot2 = createSlot();
      const addEventListenerSpy2 = jest.spyOn(slot2, 'addEventListener');
      const querySelectorAllSpy2 = jest
         .spyOn(element2, 'querySelectorAll')
         .mockReturnValue([slot2] as any);

      slotChangeObserver.startWatching([element1, element2]);
      expect(querySelectorAllSpy1).toHaveBeenCalledTimes(1);
      expect(querySelectorAllSpy2).toHaveBeenCalledTimes(1);
      expect(querySelectorAllSpy1).toHaveBeenNthCalledWith(1, 'slot');
      expect(querySelectorAllSpy2).toHaveBeenNthCalledWith(1, 'slot');

      expect(addEventListenerSpy1).toHaveBeenCalledTimes(1);
      expect(addEventListenerSpy1).toHaveBeenNthCalledWith(
         1,
         'slotchange',
         expect.any(Function)
      );

      expect(addEventListenerSpy2).toHaveBeenCalledTimes(1);
      expect(addEventListenerSpy2).toHaveBeenNthCalledWith(
         1,
         'slotchange',
         expect.any(Function)
      );
   });

   it('stopWatching will call removeEventListener on every register slot', () => {
      const slot1 = createSlot();
      const slot2 = createSlot();

      slotChangeObserver.startWatching([slot1, slot2]);
      const removeEventListenerSpy1 = jest.spyOn(slot1, 'removeEventListener');
      const removeEventListenerSpy2 = jest.spyOn(slot2, 'removeEventListener');

      slotChangeObserver.stopWatching();

      expect(removeEventListenerSpy1).toHaveBeenCalledTimes(1);
      expect(removeEventListenerSpy1).toHaveBeenNthCalledWith(
         1,
         'slotchange',
         expect.any(Function)
      );
      expect(removeEventListenerSpy2).toHaveBeenCalledTimes(1);
      expect(removeEventListenerSpy2).toHaveBeenNthCalledWith(
         1,
         'slotchange',
         expect.any(Function)
      );
   });

   it('calling stopWatching for the second time without calling startWatch will do nothing', () => {
      const slot = createSlot();
      slotChangeObserver.startWatching([slot]);
      const removeEventListenerSpy = jest.spyOn(slot, 'removeEventListener');
      slotChangeObserver.stopWatching();
      slotChangeObserver.stopWatching();
      expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
   });

   it('slotAssigned event will be emitted when appending slot content', async () => {
      const panel = createPanel();
      const expected = panel.shadowRoot.querySelector(`slot[name='header']`);

      const actual = await waitForEvent(
         panel.customElement,
         'slotAssigned',
         () => {
            panel.appendChild(createHeader());
         }
      );

      expect(actual).toBe(expected);
   });

   it('slotAssigned event will be emitted when removing slot content', async () => {
      const panel = createPanel();
      const expected = panel.shadowRoot.querySelector(`slot[name='header']`);
      const header = createHeader();
      panel.appendChild(header);

      const actual = await waitForEvent(
         panel.customElement,
         'slotAssigned',
         () => {
            header.remove();
         }
      );

      expect(actual).toBe(expected);
   });

   function createHeader(): HTMLElement {
      const headerElement = document.createElement('div');
      headerElement.setAttribute('slot', 'header');
      headerElement.textContent = '[[header]]';
      return headerElement;
   }

   function createPanel(): ICustomElementConnector<any, any> {
      document.body.innerHTML = '<my-panel></my-panel>';
      return document.querySelector('my-panel');
   }

   function createSlot(): HTMLSlotElement {
      return document.createElement('slot');
   }
   function createElement(): HTMLElement {
      return document.createElement('div');
   }

   function createBindingManagerMock(): IBindingManager {
      const BindingManagerMock = jest.fn(() => {
         return {
            attachSlotBindings: () => {
               return;
            },
         };
      });
      return new BindingManagerMock() as any;
   }

   function createEventManagerMock(): IEventManager {
      const EventManagerMock = jest.fn(() => {
         return {
            bindEvents: () => {
               return;
            },
         };
      });
      return new EventManagerMock() as any;
   }
});
