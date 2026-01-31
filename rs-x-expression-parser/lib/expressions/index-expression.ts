import { type AbstractExpression } from './abstract-expression';
import { ExpressionType } from './expression-parser.interface';
import { ParameterizedExpression } from './parameterized-abstract-expression';

export class IndexExpression extends ParameterizedExpression {
  constructor(expression: AbstractExpression) {
    super(ExpressionType.Index, `[${expression}]`, expression);
  }

  public override clone(): this {
    return new (this.constructor as new (
      expression: AbstractExpression,
    ) => this)(this._childExpressions[0].clone());
  }

  protected override get root(): AbstractExpression {
    return this;
  }

  protected evaluateExpression(index: unknown): unknown {
    return index;
  }
}
