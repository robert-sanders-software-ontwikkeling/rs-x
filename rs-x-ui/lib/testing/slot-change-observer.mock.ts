import { ISlotChangeObserver } from '../web-component/slot-change-observer/slot-change-observer.interface';

export class SlotChangeObserverMock implements ISlotChangeObserver {
   public isWatching!: boolean;
   public readonly startWatching = jest.fn();
   public readonly stopWatching = jest.fn();
}
