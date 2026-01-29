import { type Observable } from 'rxjs';

import { type IError } from './error.interface';

export interface IErrorLog {
   readonly error: Observable<IError>;
   add(error: IError): void;
   clear(): void;
}
