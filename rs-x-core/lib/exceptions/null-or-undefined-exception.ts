export class NullOrUndefinedException extends Error {
   constructor(argumentName: string) {
      super(`'${argumentName}' cannot be null or undefined`);
   }
}
