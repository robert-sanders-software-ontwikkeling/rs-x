export class CustomError extends Error {
  constructor(message: string, name?: string) {
    super(message);

    this.name = name ?? this.constructor.name;

    // Node.js stack trace fix
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
