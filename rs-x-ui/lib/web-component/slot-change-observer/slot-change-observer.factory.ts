import { Inject, Injectable, KeyedInstanceFactory } from '@rs-x/core';

import { RsXUIInjectionTokens } from '../../rx-x-ui.injection-tokens';
import { IEventManagerFactory } from '../event-manager/event-manager.factory.type';
import { ICustomElementConnector } from '../interfaces';
import { SlotChangeObserver } from './slot-change-observer';
import { ISlotChangeObserver } from './slot-change-observer.interface';

@Injectable()
export class SlotChangeObserverFactory extends KeyedInstanceFactory<
   ICustomElementConnector,
   ICustomElementConnector,
   ISlotChangeObserver
> {
   constructor(
      @Inject(RsXUIInjectionTokens.IEventManagerFactory)
      private readonly _eventManagerFactory: IEventManagerFactory
   ) {
      super();
   }

   public getId(element: ICustomElementConnector): ICustomElementConnector {
      return element;
   }

   protected createId(element: ICustomElementConnector): ICustomElementConnector {
      return element;
   }

   protected createInstance(element: ICustomElementConnector): ISlotChangeObserver {
      return new SlotChangeObserver(element, this._eventManagerFactory);
   }
}
