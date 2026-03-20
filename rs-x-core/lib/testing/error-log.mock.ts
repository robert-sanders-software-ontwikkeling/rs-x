import { IErrorLog } from '../error-log/error-log.interface';
import { IError } from '../error-log/error.interface';
import { ObservableMock } from '../../../rs-x-core/lib/testing/observable.mock';

export class ErrorLogMock implements IErrorLog {

   public readonly error = new ObservableMock();
   public errors!: readonly IError[];
   public lastError!: IError;

   constructor(properties?: Partial<IErrorLog>) {
      Object.assign(this,properties);
   }

   public add = jest.fn();
   public clear = jest.fn();
}
