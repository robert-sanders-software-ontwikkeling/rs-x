import { KeyedInstanceFactoryMock } from '@rs-x/core/testing';
import { DomElementDataMock } from './dom-element-data.mock';
import { DomQueryMock } from './dom-query.mock';
import {
   ICustomElement,
   ICustomElementController,
   ICustomElementCoreServices,
   ICustomElementConnector,
} from '../web-component/interfaces';
import { BindingManagerMock } from './binding/binding-manager.mock';
import { BindingQueueMock } from './binding/binding-queue.mock';
import { EventManagerMock } from './event-manager.mock';

export class CustomElementCoreServicesMock
   implements ICustomElementCoreServices
{
   public readonly bindingManager = new BindingManagerMock();
   public readonly bindingManagerFactory = new KeyedInstanceFactoryMock() as unknown as ICustomElementCoreServices['bindingManagerFactory'];
   public readonly bindingQueue = new BindingQueueMock();
   public readonly eventManager = new EventManagerMock();
   public readonly eventManagerFactory = new KeyedInstanceFactoryMock() as unknown as ICustomElementCoreServices['eventManagerFactory'];
   public readonly domElementData = new DomElementDataMock();
   public readonly domQuery = new DomQueryMock();

   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   constructor(
      public readonly customElementConnector: ICustomElementConnector = {} as ICustomElementConnector,
      public readonly customElement: ICustomElement<ICustomElementController> = null as unknown as ICustomElement<ICustomElementController>
   ) {}
}
