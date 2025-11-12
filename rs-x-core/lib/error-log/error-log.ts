import { Observable, Subject } from 'rxjs';
import { Injectable } from '../dependency-injection';
import { IErrorLog } from './error-log.interface';
import { IError } from './error.interface';

@Injectable()
export class ErrorLog implements IErrorLog {
   private readonly _error: Subject<IError>;

   constructor() {
      this._error = new Subject();
   }

   public get error(): Observable<IError> {
      return this._error;
   }

   public add(error: IError): void {
      console.error(error);
      this._error.next(error);
   }

   public clear(): void {
      console.clear();
   }
}
