import { type AbstractExpression } from './abstract-expression';
import { CollectionExpression } from './collection-expression';
import { ExpressionType } from './expression-parser.interface';

export class ArrayExpression extends CollectionExpression<unknown[]> {
  constructor(expressions: AbstractExpression[]) {
    super(
      ExpressionType.Array,
      `[${expressions.map((expression) => expression.expressionString).join(', ')}]`,
      expressions,
    );
  }

  public override clone(): this {
    return new ArrayExpression(
      this._childExpressions.map((childExpression) => childExpression.clone()),
    ) as this;
  }

  protected override evaluateExpression(...args: unknown[]): unknown[] {
    const array: unknown[] = [];

    args.forEach((item, i) => {
      if (this.childExpressions[i].type === ExpressionType.Spread) {
        array.push(...(item as unknown[]));
      } else {
        array.push(item);
      }
    });

    return array;
  }
}
