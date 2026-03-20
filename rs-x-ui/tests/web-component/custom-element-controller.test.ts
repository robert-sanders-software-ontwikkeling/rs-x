import { Type } from '@rs-x/core';
import {
   DomElementDataMock,
   DomQueryMock,
   SubscriptionMock,
} from '@rs-x/core/testing';
import { createElementMock, ElementMock } from '../../lib/testing/element.mock';
import { createHTMLElementMock, HTMLElementMock } from '../../lib/testing/html-element.mock';
import { createNodeMock, NodeMock } from '../../lib/testing/node.mock';
import { BindingManagerMock } from '../../lib/testing/binding/binding-manager.mock';
import { CustomElementMock } from '../../lib/testing/custom-element.mock';
import { BindingQueueMock } from '../../lib/testing/binding/binding-queue.mock';
import { EventManagerMock } from '../../lib/testing/event-manager.mock';
import { ICustomElementControllerPrivate } from '../../lib/testing/private/custom-element-controller-private.interface';
import { CustomElementController } from '../../lib/web-component/custom-element-controller';
import { componentPropertyName } from '../../lib/web-component/interfaces';

describe('Custom element controller', () => {
   let customElementController: TestCustomElementController;
   let element: HTMLElementMock;
   let customElement: CustomElementMock;
   let bindingManager: BindingManagerMock;
   let bindingQueue: BindingQueueMock;
   let eventManager: EventManagerMock;
   let domElementData: DomElementDataMock;
   let domQuery: DomQueryMock;

   beforeEach(() => {
      element = createHTMLElementMock();
      customElement = new CustomElementMock(element);

      bindingManager = new BindingManagerMock();
      bindingQueue = new BindingQueueMock();
      eventManager = new EventManagerMock();
      domElementData = new DomElementDataMock();
      domQuery = new DomQueryMock();
      customElementController = new TestCustomElementController({
         element,
         customElement,
         eventManager,
         bindingManager,
         domElementData,
         bindingQueue,
         domQuery,
      });
   });

   it('isAttached will initialy be false', () => {
      expect(customElementController.isAttached).toBeFalsy();
   });

   it('isAttached will be true after attach has been called', () => {
      customElementController.attach();
      expect(customElementController.isAttached).toBeTruthy();
   });

   it('isAttached will be false after deatch has been called', () => {
      customElementController.attach();
      customElementController.detach();
      expect(customElementController.isAttached).toBeFalsy();
   });

   it('attach will register the custom element and controller as data', () => {
      customElementController.attach();
      expect(domElementData.register).toHaveBeenCalledTimes(1);
      expect(domElementData.register).toHaveBeenCalledWith(
         element,
         componentPropertyName,
         customElement
      );
   });

   it('attach will register bindings', () => {
      const content = [
         createElementMock(),
         createNodeMock({ nodeType: Node.TEXT_NODE }),
      ];
      jest
         .spyOn(customElementController, 'content', 'get')
         .mockReturnValue(content);

      const eventElement = createElementMock();

      jest
         .spyOn(customElementController, 'getEventElements')
         .mockReturnValue([eventElement]);

      customElementController.attach();

      expect(bindingQueue.push).toHaveBeenCalledTimes(1);
      expect(bindingQueue.push).toHaveBeenCalledWith({
         bindingManager,
         eventManager,
         eventElements: [eventElement],
         content: [element, ...content],
      });
   });

   it('attach will subscribe to binding manager rebuildContent event', () => {
      const rebuildContentSubscribeSpy = jest.spyOn(
         bindingManager.rebuildContent,
         'subscribe'
      );
      customElementController.attach();
      expect(rebuildContentSubscribeSpy).toHaveBeenCalledTimes(1);
      expect(rebuildContentSubscribeSpy).toHaveBeenNthCalledWith(
         1,
         expect.any(Function)
      );
   });

   it('attach will subscribe to binding manager bound event', () => {
      const boundSubscribeSpy = jest.spyOn(bindingManager.bound, 'subscribe');
      customElementController.attach();
      expect(boundSubscribeSpy).toHaveBeenCalledTimes(1);
      expect(boundSubscribeSpy).toHaveBeenNthCalledWith(
         1,
         expect.any(Function)
      );
   });

   it('detach will unregister the custom element as data', () => {
      customElementController.attach();
      customElementController.detach();
      expect(domElementData.unregister).toHaveBeenCalledTimes(1);
      expect(domElementData.unregister).toHaveBeenCalledWith(element);
   });

   it('detach will unsubscribe to binding manager rebuildContent event', () => {
      const subscription = new SubscriptionMock();
      jest
         .spyOn(bindingManager.rebuildContent, 'subscribe')
         .mockReturnValue(subscription);

      customElementController.attach();
      customElementController.detach();
      expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
   });

   it('detach will unsubscribe to binding manager bound event', () => {
      const subscription = new SubscriptionMock();
      jest
         .spyOn(bindingManager.bound, 'subscribe')
         .mockReturnValue(subscription);

      customElementController.attach();
      customElementController.detach();
      expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
   });

   it('content will be rebuild when rebuildContent event is emitted', () => {
      customElementController.attach();
      const detachSpy = jest.spyOn(customElementController, 'detach');
      const attachSpy = jest.spyOn(customElementController, 'attach');

      bindingManager.rebuildContent.next();

      expect(detachSpy).toHaveBeenCalledTimes(1);
      expect(attachSpy).toHaveBeenCalledTimes(1);
   });

   it('calling attach when already attached will do nothing', () => {
      const buildContentSpy = jest.spyOn(
         customElementController,
         'buildContent'
      );
      customElementController.attach();
      customElementController.attach();
      expect(domElementData.register).toHaveBeenCalledTimes(1);
   });

   it('detach disposes old content', () => {
      const content = [createHTMLElementMock(), createHTMLElementMock()];
      const contentContainerElement =
         Type.cast<ICustomElementControllerPrivate>(
            customElementController
         ).contentContainerElement;
      content.forEach((child) => contentContainerElement.appendChild(child));

      jest
         .spyOn(customElementController, 'content', 'get')
         .mockReturnValue(content);
      customElementController.attach();

      const removeChildSpy = jest.spyOn(contentContainerElement, 'removeChild');
      const detachBindingsSpy = jest.spyOn(bindingManager, 'detachBindings');
      const unbindAllEventsSpy = jest.spyOn(eventManager, 'unbindAllEvents');

      customElementController.detach();

      expect(removeChildSpy).toHaveBeenCalledTimes(2);
      expect(removeChildSpy).toHaveBeenNthCalledWith(1, content[0]);
      expect(removeChildSpy).toHaveBeenNthCalledWith(2, content[1]);
      expect(unbindAllEventsSpy).toHaveBeenCalledTimes(1);
      expect(detachBindingsSpy).toHaveBeenCalledTimes(1);
   });

   it('calling detach when already detach will do nothing', () => {
      customElementController.attach();
      const disposeContentSpy = jest.spyOn(
         Type.cast<ICustomElementControllerPrivate>(customElementController),
         'disposeContent'
      );
      customElementController.detach();
      customElementController.detach();
      expect(disposeContentSpy).toHaveBeenCalledTimes(1);
   });

   it('calling attributeChanged will call setPropertyFromAttribute correctly', () => {
      const setPropertyFromAttributeSpy = jest.spyOn(
         bindingManager,
         'setPropertyFromAttribute'
      );
      customElementController.attributeChanged('test', 1, 2);
      expect(setPropertyFromAttributeSpy).toHaveBeenCalledTimes(1);
      expect(setPropertyFromAttributeSpy).toHaveBeenCalledWith('test', 1, 2);
   });

   it('emitEvent will call emitEvent on event manager', () => {
      const emitEventSpy = jest.spyOn(eventManager, 'emitEvent');
      const eventArgs = { a: 'hi' };
      customElementController.emitEvent('bound', eventArgs);

      expect(emitEventSpy).toHaveBeenCalledTimes(1);
      expect(emitEventSpy).toHaveBeenLastCalledWith(
         customElement,
         'bound',
         eventArgs
      );
   });

   it('event mananger emitEvent will be called with the correct paramters when binding manager bound event emits', () => {
      const emitEventSpy = jest.spyOn(eventManager, 'emitEvent');
      customElementController.attach();
      const expectedEventArgs = { id: 'x' };
      bindingManager.bound.next(expectedEventArgs);

      expect(emitEventSpy).toHaveBeenCalledTimes(1);
      expect(emitEventSpy).toHaveBeenNthCalledWith(
         1,
         customElement,
         'bound',
         expectedEventArgs
      );
   });
});

class TestCustomElementController extends CustomElementController {
   public get parent(): Element {
      return null;
   }
   public get content(): readonly Node[] {
      return [];
   }

   public buildContent(): void {
      return;
   }

   public getContentContainer(): Element | ShadowRoot {
      return createHTMLElementMock();
   }

   public getEventElements(): Element[] {
      return [];
   }
}
