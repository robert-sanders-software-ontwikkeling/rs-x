import { IKeyedInstanceFactory } from '@rs-x/core';
import { ICustomElementConnector } from '../interfaces';
import { ISlotChangeObserver } from './slot-change-observer.interface';

export type ISlotCHangeObserverFactory = IKeyedInstanceFactory<
   ICustomElementConnector,
   ICustomElementConnector,
   ISlotChangeObserver
>;
