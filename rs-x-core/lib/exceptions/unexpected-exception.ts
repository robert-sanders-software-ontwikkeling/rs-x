import { CustomError } from './custome-error';

export class UnexpectedException extends CustomError {
  constructor(message: string) {
    super(message, 'UnexpectedException');
  }
}
