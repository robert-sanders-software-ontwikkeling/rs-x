import { IKeyedInstanceFactory } from '@rs-x/core';
import { IEventManager } from './event-manager.interface';
import { IEventManagerContext } from './event-manager-context.interface';

export type IEventManagerFactory = IKeyedInstanceFactory<
   Element,
   IEventManagerContext,
   IEventManager
>;
