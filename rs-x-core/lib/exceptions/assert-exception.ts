import { CustomError } from './custome-error';

export class AssertionError extends CustomError {
  constructor(message: string) {
    super(message, 'AssertionError');
  }
}
