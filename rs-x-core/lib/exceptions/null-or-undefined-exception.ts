import { CustomError } from './custome-error';

export class NullOrUndefinedException extends CustomError {
  constructor(argumentName: string) {
    super(
      `'${argumentName}' cannot be null or undefined`,
      'NullOrEmptyException',
    );
  }
}
