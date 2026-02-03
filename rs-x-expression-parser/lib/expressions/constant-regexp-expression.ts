import { ConstantExpression } from './constant-expression';
import { ExpressionType } from './expression-parser.interface';

export class ConstantRegExpExpression extends ConstantExpression<RegExp> {
  constructor(expressionString: string, value: RegExp) {
    super(ExpressionType.RegExp, expressionString, value);
  }

  override clone(): this {
    return new (this.constructor as new (
      expressionString: string,
      value: RegExp,
    ) => this)(this.expressionString, this._value as RegExp);
  }
}
