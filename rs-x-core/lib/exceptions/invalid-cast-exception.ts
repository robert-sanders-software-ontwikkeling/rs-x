import { CustomError } from './custome-error';

export class InvalidCastException extends CustomError {
  constructor(message: string) {
    super(message, 'InvalidCastException');
  }
}
