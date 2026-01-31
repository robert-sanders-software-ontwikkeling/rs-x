export class ParserException extends Error {
  constructor(
    public readonly expression: string,
    message: string,
    public readonly position?: number,
  ) {
    super(createMessage(expression, message, position ?? 0));
  }
}

function createMessage(
  expression: string,
  message: string,
  position: number,
): string {
  if (position >= 0) {
    return `Invalid expression ${expression}. ${message}. Position ${position}`;
  }

  return `Invalid expression ${expression}. ${message}.`;
}
