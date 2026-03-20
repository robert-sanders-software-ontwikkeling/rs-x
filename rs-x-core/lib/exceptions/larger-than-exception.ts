import { CustomError } from './custome-error';

export class LargerThanException extends CustomError {
   constructor(argumentName: string, min: number) {
      super(`'${argumentName}' must be larger than ${min}`, 'LargerThanException');
   }
}
