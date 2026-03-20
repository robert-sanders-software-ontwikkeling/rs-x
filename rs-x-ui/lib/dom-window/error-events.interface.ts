export interface IErrorEvents {
   onerror: OnErrorEventHandlerNonNull;
   onunhandledrejection: (ev: PromiseRejectionEvent) => unknown;
}
