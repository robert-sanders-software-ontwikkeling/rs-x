import { IDomTimer } from '../timer/dom-timer.interface';

export class DomTimerMock implements IDomTimer {
   public readonly setInterval = jest.fn();
   public readonly setTimeout = jest.fn();
   public readonly clearInterval = jest.fn();
   public readonly clearTimeout = jest.fn();
}
