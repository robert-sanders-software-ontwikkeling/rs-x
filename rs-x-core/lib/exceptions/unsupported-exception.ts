import { CustomError } from './custome-error';

export class UnsupportedException extends CustomError {
  constructor(message: string) {
    super(message, 'UnsupportedException');
  }
}
