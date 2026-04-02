import type { IExpression } from '../../../lib/expressions/expression-parser.interface';

export function expectCompiledOrTreeInstanceOf<T>(
  expression: IExpression,
  ctor: new (...args: never[]) => T,
): void {
  if (expression instanceof ctor) {
    return;
  }

  expect(
    (expression as { constructor?: { name?: string } }).constructor?.name,
  ).toBe('CompiledExpression');
}
