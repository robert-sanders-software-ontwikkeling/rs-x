import { CustomError } from './custome-error';

export class ArgumentException extends CustomError {
  constructor(message: string) {
    super(message, 'ArgumentException');
  }
}
