export class NullOrEmptyException extends Error {
   constructor(argumentName: string) {
      super(`'${argumentName}' cannot be null or empty`);
   }
}
