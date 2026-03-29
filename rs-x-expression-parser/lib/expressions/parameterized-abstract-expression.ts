import { AbstractExpression } from './abstract-expression';
import { type ExpressionType } from './expression-parser.interface';

export abstract class ParameterizedExpression<
  T = unknown,
  PT = unknown,
> extends AbstractExpression<T, PT> {
  private _preparedArgs: unknown[] | undefined;

  protected constructor(
    type: ExpressionType,
    expressionString: string,
    ...childExpressions: AbstractExpression[]
  ) {
    super(type, expressionString, childExpressions);
  }

  protected abstract evaluateExpression(...args: unknown[]): T;

  protected override canEvaluate(): boolean {
    const childExpressions = this._childExpressions;
    const args = new Array<unknown>(childExpressions.length);
    for (let i = 0; i < childExpressions.length; i++) {
      const arg = this.readArg(childExpressions[i]);
      if (arg === undefined) {
        this._preparedArgs = undefined;
        return false;
      }
      args[i] = arg;
    }

    this._preparedArgs = args;
    return true;
  }

  protected override evaluate(): T {
    let args = this._preparedArgs;
    if (!args) {
      const childExpressions = this._childExpressions;
      args = new Array<unknown>(childExpressions.length);
      for (let i = 0; i < childExpressions.length; i++) {
        args[i] = this.readArg(childExpressions[i]);
      }
    }
    this._preparedArgs = undefined;
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
