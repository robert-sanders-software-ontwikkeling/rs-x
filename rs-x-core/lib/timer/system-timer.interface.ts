export interface ISystemTimer {
   setInterval(handler: TimerHandler, timeout?: number): number;
   setTimeout(handler: TimerHandler, timeout?: number): number;
   clearInterval(handle?: number): void;
   clearTimeout(handle?: number): void;
}
