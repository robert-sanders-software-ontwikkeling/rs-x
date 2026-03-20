import { IEventManager } from '../web-component/event-manager/event-manager.interface';

export class EventManagerMock implements IEventManager {
   public readonly bindEvents = jest.fn();
   public readonly unbindAllEvents = jest.fn();
   public readonly unbindEvents = jest.fn();
   public readonly emitEvent = jest.fn();
}
