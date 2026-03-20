import { ExpressionType, HtmlTagName, Type } from '@rs-x/core';
import {
   ErrorLogMock,
   EventIdentifierResolverMock,
   ExpressionMock,
   ExpressionParserMock,
   SubscriptionMock,
} from '@rs-x/core/testing';
import { Subject } from 'rxjs';
import { OutputContextMock } from '../../lib/testing/output-context.mock';
import { EventManager } from '../../lib/web-component/event-manager/event-manager';
import {
   ICustomElementConnector,
   Listner,
} from '../../lib/web-component/interfaces';
import { createCustomHtmlElementMock, CustomHtmlElementMock } from '../../lib/testing/custom-html-element.mock';
import { EventObserver } from '../../lib/web-component/event-manager/event-observer';

describe('EventManager', () => {
   let eventElement: CustomHtmlElementMock;
   let outputContext: OutputContextMock;
   let expressionParserMock: ExpressionParserMock;
   let eventIdentifierResolver: EventIdentifierResolverMock;
   let errorLog: ErrorLogMock;
   let eventManager: EventManager;

   function createElement(content: Element[]): Element {
      const element = document.createElement(HtmlTagName.Div);
      jest.spyOn(element, 'querySelectorAll').mockReturnValue(content as any);
      return element;
   }

   function createElementWithEvent(
      eventName: string,
      expression: string
   ): Element {
      const element = document.createElement(HtmlTagName.Div);
      element.setAttribute(`${eventName}.on`, expression);
      Type.cast<ICustomElementConnector>(element).customElement =
         eventElement.customElement;
      return element;
   }

   beforeEach(() => {
      eventElement = createCustomHtmlElementMock();
      outputContext = new OutputContextMock();
      eventIdentifierResolver = new EventIdentifierResolverMock();
      expressionParserMock = new ExpressionParserMock();
      errorLog = new ErrorLogMock();
      eventManager = new EventManager(
         eventElement,
         outputContext,
         eventIdentifierResolver,
         expressionParserMock,
         errorLog,
         new EventObserver()
      );
   });

   it('bindEvents will attach to html event bindings on the content', () => {
      const content = [createElementWithEvent('click', 'onClick()')];
      const element = createElement(content);
      const functionExpression = new ExpressionMock({
         type: ExpressionType.Function,
      });

      expressionParserMock.parse.mockReturnValue(functionExpression);

      const addEventListenerSpy = jest.spyOn(content[0], 'addEventListener');

      eventManager.bindEvents([element]);

      expect(expressionParserMock.parse).toHaveBeenCalledTimes(1);
      expect(expressionParserMock.parse).toHaveBeenNthCalledWith(
         1,
         'onClick()'
      );
      expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
      expect(addEventListenerSpy).toHaveBeenCalledWith(
         'click',
         expect.any(Function)
      );
   });

   it('bindEvents will attach to custom event bindings on the content', () => {
      const content = [createElementWithEvent('custom', 'onCustom()')];
      const element = createElement(content);
      const functionExpression = new ExpressionMock({
         type: ExpressionType.Function,
      });

      expressionParserMock.parse.mockReturnValue(functionExpression);

      const subscribeToEventSpy = jest.spyOn(outputContext, 'subscribeToEvent');
      const isOutputSpy = jest
         .spyOn(outputContext, 'isOutput')
         .mockReturnValue(true);

      eventManager.bindEvents([element]);

      expect(expressionParserMock.parse).toHaveBeenCalledTimes(1);
      expect(expressionParserMock.parse).toHaveBeenCalledWith('onCustom()');
      expect(isOutputSpy).toHaveBeenCalledTimes(1);
      expect(isOutputSpy).toHaveBeenCalledWith(
         eventElement.customElement,
         'custom.on'
      );

      expect(subscribeToEventSpy).toHaveBeenCalledTimes(1);
      expect(subscribeToEventSpy).toHaveBeenCalledWith(
         eventElement.customElement,
         'custom.on',
         expect.any(Function)
      );
   });

   it('bindEvents will attach to custom event bindings on the content with an expression', () => {
      const content = [createElementWithEvent('custom', 'a + b')];
      const element = createElement(content);
      const additionExpression = new ExpressionMock({
         type: ExpressionType.Addition,
      });

      expressionParserMock.parse.mockReturnValue(additionExpression);
      outputContext.isOutput.mockReturnValue(true);

      eventManager.bindEvents([element]);

      expect(expressionParserMock.parse).toHaveBeenCalledTimes(1);
      expect(expressionParserMock.parse).toHaveBeenCalledWith('a + b');
      expect(outputContext.isOutput).toHaveBeenCalledTimes(1);
      expect(outputContext.isOutput).toHaveBeenCalledWith(
         eventElement.customElement,
         'custom.on'
      );

      expect(outputContext.subscribeToEvent).toHaveBeenCalledTimes(1);
      expect(outputContext.subscribeToEvent).toHaveBeenCalledWith(
         eventElement.customElement,
         'custom.on',
         expect.any(Function)
      );
   });

   it('bindEvents will attach to slot content event bindings', () => {
      const slot = document.createElement('slot');
      const assignedNodesSpy = jest
         .spyOn(slot, 'assignedNodes')
         .mockReturnValue([]);

      eventManager.bindEvents([slot]);
      expect(assignedNodesSpy).toHaveBeenCalledTimes(1);
   });

   it('Calling bindEvents for the second time will detach previous html events', () => {
      const content = [createElementWithEvent('click', 'onClick()')];
      const element = createElement(content);
      const functionExpression: any = {
         name: 'onClick',
         type: ExpressionType.Function,
      };

      expressionParserMock.parse.mockReturnValue(functionExpression);

      jest.spyOn(content[0], 'addEventListener');
      eventManager.bindEvents([element]);
      const removeEventListenerSpy = jest.spyOn(
         content[0],
         'removeEventListener'
      );

      eventManager.bindEvents([element]);

      expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
         'click',
         expect.any(Function)
      );
   });

   it('Calling bindEvents for the second time will detach previous custom events', () => {
      const content = [createElementWithEvent('custom', 'onCustom()')];
      const element = createElement(content);

      const functionExpression = new ExpressionMock({
         type: ExpressionType.Function,
      });

      const subsription = new SubscriptionMock();

      expressionParserMock.parse.mockReturnValue(functionExpression);
      outputContext.subscribeToEvent.mockReturnValue(subsription);
      outputContext.isOutput.mockReturnValue(true);

      eventManager.bindEvents([element]);
      eventManager.bindEvents([element]);

      expect(subsription.unsubscribe).toHaveBeenCalledTimes(1);
   });

   it('unbindAllEvents will detach html events', () => {
      const content = [createElementWithEvent('click', 'onClick()')];
      const element = createElement(content);
      const functionExpression = new ExpressionMock({
         type: ExpressionType.Function,
      });

      expressionParserMock.parse.mockReturnValue(functionExpression);

      jest.spyOn(content[0], 'addEventListener');
      eventManager.bindEvents([element]);

      const removeEventListenerSpy = jest.spyOn(
         content[0],
         'removeEventListener'
      );
      eventManager.unbindAllEvents();
      expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
         'click',
         expect.any(Function)
      );
   });

   it('unbindAllEvents will detach custom events', () => {
      const content = [createElementWithEvent('custom', 'onCustom()')];
      const element = createElement(content);
      const functionExpression = new ExpressionMock({
         type: ExpressionType.Function,
      });
      const subsription = new SubscriptionMock();

      expressionParserMock.parse.mockReturnValue(functionExpression);
      outputContext.subscribeToEvent.mockReturnValue(subsription);
      outputContext.isOutput.mockReturnValue(true);

      eventManager.bindEvents([element]);

      eventManager.unbindAllEvents();
      expect(subsription.unsubscribe).toHaveBeenCalledTimes(1);
   });

   it('unbindEvents will detach html events for given elements', () => {
      const content = [createElementWithEvent('click', 'onClick()')];
      const element = createElement(content);
      const functionExpression = new ExpressionMock({
         type: ExpressionType.Function,
      });

      expressionParserMock.parse.mockReturnValue(functionExpression);

      jest.spyOn(content[0], 'addEventListener');
      eventManager.bindEvents([element]);

      const removeEventListenerSpy = jest.spyOn(
         content[0],
         'removeEventListener'
      );
      eventManager.unbindEvents([element]);
      expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
         'click',
         expect.any(Function)
      );
   });

   it('unbindEvents will detach custom events for given elements', () => {
      const content = [createElementWithEvent('custom', 'onCustom()')];
      const element = createElement(content);
      const functionExpression = new ExpressionMock({
         type: ExpressionType.Function,
      });
      const subsription = new SubscriptionMock();

      expressionParserMock.parse.mockReturnValue(functionExpression);
      outputContext.subscribeToEvent.mockReturnValue(subsription);
      outputContext.isOutput.mockReturnValue(true);

      eventManager.bindEvents([element]);
      eventManager.unbindEvents([element]);

      expect(subsription.unsubscribe).toHaveBeenCalledTimes(1);
   });

   it('Event handler will be called when event is emitted', () => {
      const content = [createElementWithEvent('custom', 'onCustom()')];
      const element = createElement(content);
      const functionExpression = new ExpressionMock({
         type: ExpressionType.Function,
      });
      const eventArgs = { a: 1 };
      const event = new Subject<any>();

      expressionParserMock.parse.mockReturnValue(functionExpression);
      outputContext.isOutput.mockReturnValue(true);
      outputContext.subscribeToEvent.mockImplementation(
         (_target: any, _eventName: string, handler: Listner) =>
            event.subscribe(handler)
      );

      eventManager.bindEvents([element]);

      event.next(eventArgs);

      expect(functionExpression.evaluate).toHaveBeenCalledTimes(1);
      expect(functionExpression.evaluate).toHaveBeenCalledWith(content[0]);
      expect(eventIdentifierResolver.$sender).toBe(content[0]);
      expect(eventIdentifierResolver.$event).toBe(eventArgs);
   });
});
