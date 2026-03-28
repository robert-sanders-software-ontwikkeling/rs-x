import { AbstractExpression } from './abstract-expression';
import { type ExpressionType } from './expression-parser.interface';

export abstract class ParameterizedExpression<
  T = unknown,
  PT = unknown,
> extends AbstractExpression<T, PT> {
  protected constructor(
    type: ExpressionType,
    expressionString: string,
    ...childExpressions: AbstractExpression[]
  ) {
    super(type, expressionString, ...childExpressions);
  }

  protected abstract evaluateExpression(...args: unknown[]): T;

  protected override canEvaluate(): boolean {
    const args = this._childExpressions.map((childExpression) =>
      this.readArg(childExpression),
    );

    if (args.some((arg) => arg === undefined)) {
      return false;
    }

    return true;
  }

  protected override evaluate(): T {
    const args = this._childExpressions.map((childExpression) =>
      this.readArg(childExpression),
    );
    return this.evaluateExpression(...args);
  }

  protected readArg(childExpression: AbstractExpression): unknown {
    const value =
      childExpression.value === undefined
        ? AbstractExpression.evaluateExpression(childExpression)
        : childExpression.value;

    if (this.isExpressionReferenceValue(value)) {
      return (value as { value: unknown }).value;
    }

    return value;
  }

  private isExpressionReferenceValue(value: unknown): boolean {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Record<string, unknown>;
    return (
      typeof candidate.bind === 'function' &&
      typeof candidate.dispose === 'function' &&
      'changed' in candidate &&
      'value' in candidate
    );
  }
}
