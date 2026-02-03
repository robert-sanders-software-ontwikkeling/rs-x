import { CustomError } from './custome-error';

export class NullOrEmptyException extends CustomError {
  constructor(argumentName: string) {
    super(`'${argumentName}' cannot be null or empty`, 'NullOrEmptyException');
  }
}
