export interface IError {
   readonly message?: string;
   readonly code?: number;
   readonly exception?: Error;
   readonly context: unknown;
   readonly fatal?: boolean;
   readonly data?: unknown;
}
