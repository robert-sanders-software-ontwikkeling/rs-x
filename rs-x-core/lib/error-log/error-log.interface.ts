import { IError } from './error.interface';

export interface IErrorLog {
   add(error: IError): void;
   clear(): void;
}
