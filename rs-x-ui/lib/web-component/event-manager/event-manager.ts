import { IErrorLog } from '@rs-x/core';
import { IExpression, IExpressionParser } from '@rs-x/expression-parser';
import { IEventIdentifierResolver } from './event-identifier-resolver.interface';
import { ICustomElement } from '../interfaces';
import { IOutputContext } from '../decorators/output/output-context.interface';
import { IEventObserver } from './event-observer.interface';
import { IEventManager } from './event-manager.interface';
import { IEventListner } from './event-listner.interface';
import { Listner } from './listner.type';
import { IEventManagerContext } from './event-manager-context.interface';

interface ICustomEventElement extends Element {
   customElement?: ICustomElement;
}

export class EventManager implements IEventManager {
   private readonly _listners = new Map<Element, IEventListner[]>();

   constructor(
      private readonly _eventManagerContext: IEventManagerContext,
      private readonly _outputContext: IOutputContext,
      private readonly _eventIdentifierResolver: IEventIdentifierResolver,
      private readonly _expressionParser: IExpressionParser,
      private readonly _errorLog: IErrorLog,
      private readonly _eventObserver: IEventObserver
   ) {}

   public bindEvents(elements: (Element | HTMLSlotElement)[]): void {
      this.unbindEvents(elements);

      elements.forEach((element) => {
         const eventElements =
            element instanceof HTMLSlotElement
               ? this.getEventElementsInSlot(element)
               : this.getEventElements(element);
         const listners = this.createListners(eventElements);
         this._listners.set(element, listners);
      });
   }

   public unbindAllEvents(): void {
      this._listners.forEach((l) => this.unregisterListners(l));
      this._listners.clear();
   }

   public unbindEvents(elements: (Element | HTMLSlotElement)[]): void {
      elements.forEach((element) => {
         const listners = this._listners.get(element);
         if (listners) {
            this.unregisterListners(listners);
            this._listners.delete(element);
         }
      });
   }

   public emitEvent(target: unknown, eventName: string, args: unknown): void {
      this._outputContext.emitEvent(target, eventName, args);
   }

   private getEventElementsInSlot(slot: HTMLSlotElement): Element[] {
      return Array.from(slot.assignedNodes())
         .filter((node) => node.nodeType === Node.ELEMENT_NODE)
         .map((node) => this.getEventElements(node as Element))
         .reduce((aElements, bElements) => aElements.concat(bElements), []);
   }

   private isNotChildOfCustomElement = (element: Element | null): boolean => {
      if (!element) {
         return true;
      }
      if (element.parentElement === this._eventManagerContext.element) {
         return false;
      }

      return this.isNotChildOfCustomElement(element.parentElement);
   };

   private getEventElements = (element: Element): Element[] => [
      element,
      ...Array.from(element.querySelectorAll('*')).filter(
         this.isNotChildOfCustomElement
      ),
   ];

   private createListners(eventElements: Element[]): IEventListner[] {
      return eventElements
         .map(this.getEventAttributes)
         .reduce(
            (aEventAttributes, bEventAttributes) =>
               aEventAttributes.concat(bEventAttributes),
            []
         )
         .map((eventAttribute) => this.bindEvent(eventAttribute));
   }

   private getEventAttributes = (eventElement: Element) => {
      return Array.from(eventElement.attributes).filter((attribute) =>
         this.isEvent(attribute.name, eventElement)
      );
   };

   private bindEvent(eventAttribute: Attr): IEventListner {
      const expression = this._expressionParser.parse(eventAttribute.value);
      const listner = this.createListner(
         expression,
         eventAttribute.ownerElement!,
         eventAttribute.name
      );

      const eventListner: IEventListner = {
         eventName: htmlEvents[eventAttribute.name],
         listner: listner,
         sourceElement: eventAttribute.ownerElement!,
      };

      if (eventListner.eventName) {
         eventAttribute.ownerElement!.addEventListener(
            eventListner.eventName,
            listner
         );
      } else {
         eventListner.subscription = this._outputContext.subscribeToEvent(
            (eventAttribute.ownerElement as ICustomEventElement)
               .customElement ?? this._eventManagerContext.context,
            eventAttribute.name,
            listner
         );
      }
      return eventListner;
   }

   private createListner(
      expression: IExpression<unknown>,
      context: Element,
      attributeName: string
   ): Listner {
      return async (e) => {
         this._eventIdentifierResolver.$sender = context;
         this._eventIdentifierResolver.$event = e;

         try {
            const result = await (expression as unknown as { evaluate(ctx: Element): unknown }).evaluate(context);
            this._eventObserver.eventHandled.next({
               sender: context,
               eventArgs: e,
               result,
               eventName: attributeName.replace('.on', ''),
            });
         } catch (e) {
            this._errorLog.add({
               message: `Failed to handle event ${attributeName.replace('.on', '')}. Handler expression ${expression.expressionString} threw an error`,
               context: this._eventManagerContext.context,
               exception: e as Error,
            });
         }
      };
   }

   private isEvent(
      attributeName: string,
      eventElement: ICustomEventElement
   ): boolean {
      return (
         htmlEvents[attributeName] ||
         this._outputContext.isOutput(
            eventElement.customElement ?? this._eventManagerContext.context,
            attributeName
         )
      );
   }

   private unregisterListners(listner: IEventListner[]): void {
      listner.forEach((l) => this.unregisterListner(l));
   }

   private unregisterListner(listner: IEventListner): void {
      if (listner.subscription) {
         listner.subscription.unsubscribe();
      } else {
         listner.sourceElement.removeEventListener(
            listner.eventName,
            listner.listner
         );
      }
   }
}

export const htmlEvents = {
   'abort.on': 'abort',
   'activate.on': 'activate',
   'beforeactivate.on': 'beforeactivate',
   'beforecopy.on': 'beforecopy',
   'beforecut.on': 'beforecut',
   'beforedeactivate.on': 'beforedeactivate',
   'beforepaste.on': 'beforepaste',
   'blur.on': 'blur',
   'canplay.on': 'canplay',
   'canplaythrough.on': 'canplaythrough',
   'change.on': 'change',
   'click.on': 'click',
   'contextmenu.on': 'contextmenu',
   'copy.on': 'copy',
   'cuechange.on': 'cuechange',
   'cut.on': 'cut',
   'dblclick.on': 'dblclick',
   'deactivate.on': 'deactivate',
   'drag.on': 'drag',
   'dragend.on': 'dragend',
   'dragenter.on': 'dragenter',
   'dragleave.on': 'dragleave',
   'dragover.on': 'dragover',
   'dragstart.on': 'dragstart',
   'drop.on': 'drop',
   'durationchange.on': 'durationchange',
   'emptied.on': 'emptied',
   'ended.on': 'ended',
   'error.on': 'error',
   'focus.on': 'focus',
   'input.on': 'input',
   'invalid.on': 'invalid',
   'keydown.on': 'keydown',
   'keypress.on': 'keypress',
   'keyup.on': 'keyup',
   'load.on': 'load',
   'loadeddata.on': 'loadeddata',
   'loadedmetadata.on': 'loadedmetadata',
   'loadstart.on': 'loadstart',
   'mousedown.on': 'mousedown',
   'mouseenter.on': 'mouseenter',
   'mouseleave.on': 'mouseleave',
   'mousemove.on': 'mousemove',
   'mouseout.on': 'mouseout',
   'mouseover.on': 'mouseover',
   'mouseup.on': 'mouseup',
   'mousewheel.on': 'mousewheel',
   'paste.on': 'paste',
   'pause.on': 'pause',
   'play.on': 'play',
   'playing.on': 'playing',
   'progress.on': 'progress',
   'ratechange.on': 'ratechange',
   'reset.on': 'reset',
   'scroll.on': 'scroll',
   'seeked.on': 'seeked',
   'seeking.on': 'seeking',
   'select.on': 'select',
   'selectstart.on': 'selectstart',
   'stalled.on': 'stalled',
   'submit.on': 'submit',
   'suspend.on': 'suspend',
   'timeupdate.on': 'timeupdate',
   'volumechange.on': 'volumechange',
   'waiting.on': 'waiting',
};
