import { CustomError } from './custome-error';

export class InvalidOperationException extends CustomError {
  constructor(message: string) {
    super(message, 'InvalidOperationException');
  }
}
