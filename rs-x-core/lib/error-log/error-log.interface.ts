import { Observable } from 'rxjs';
import { IError } from './error.interface';

export interface IErrorLog {
   readonly error: Observable<IError>;
   add(error: IError): void;
   clear(): void;
}
