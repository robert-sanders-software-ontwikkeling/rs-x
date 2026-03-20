import { IErrorEvents } from '../error-log/error-events.interface';

export class ErrorEventsMock implements IErrorEvents {
   public onerror: OnErrorEventHandlerNonNull;
   public onunhandledrejection: (ev: PromiseRejectionEvent) => unknown;

   public emitError(
      event: Event | string,
      source?: string,
      lineno?: number,
      colno?: number,
      error?: Error
   ): void {
      if (this.onerror) {
         this.onerror(event, source, lineno, colno, error);
      }
   }

   public emitUnhandledRejection(e: PromiseRejectionEvent): void {
      if (this.onunhandledrejection) {
         this.onunhandledrejection(e);
      }
   }
}
