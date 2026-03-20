import { ITimerFactory } from '../timer/timer.factory.interface';

export class TimerFactoryMock implements ITimerFactory {
   createDelay = jest.fn();
   createTimer = jest.fn();
}
