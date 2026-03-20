import { InvalidOperationException } from '@rs-x/core';
import { ICustomElementConnector } from '../interfaces';
import { ISlotChangeObserver } from './slot-change-observer.interface';
import { IEventManagerFactory } from '../event-manager/event-manager.factory.type';
import { IEventListner } from '../event-manager/event-listner.interface';

export class SlotChangeObserver implements ISlotChangeObserver {
   private _slotChangeListners: IEventListner[] = [];

   constructor(
      private readonly _customElementConnector: ICustomElementConnector,
      private readonly _eventManagerFactory: IEventManagerFactory
   ) {}

   public startWatching(elements: Element[]): boolean {
      if (this._slotChangeListners.length) {
         throw new InvalidOperationException(
            'Watching has already been started. Call stopWatching first'
         );
      }

      this._slotChangeListners = [];
      elements.forEach(this.registerSlotChangeListner);
      return this._slotChangeListners.length > 0;
   }

   public stopWatching(): void {
      this._slotChangeListners.forEach((listner) =>
         listner.sourceElement.removeEventListener(
            listner.eventName,
            listner.listner
         )
      );
      this._slotChangeListners = [];
   }

   private registerSlotChangeListner = (element) => {
      const slots =
         element instanceof HTMLSlotElement
            ? [element]
            : element.querySelectorAll
              ? (Array.from(
                   element.querySelectorAll('slot')
                ) as HTMLSlotElement[])
              : [];
      const listners = slots.map((slot) => this.addListner(slot));
      this._slotChangeListners.push(...listners);
   };

   private addListner(slot: HTMLSlotElement): IEventListner {
      const changeListner = async () => {
         this._eventManagerFactory
            .getFromId(this._customElementConnector)
            ?.emitEvent(this._customElementConnector.customElement, 'slotAssigned', slot);
      };
      slot.addEventListener('slotchange', changeListner);
      return {
         eventName: 'slotchange',
         listner: changeListner,
         sourceElement: slot,
      };
   }
}
