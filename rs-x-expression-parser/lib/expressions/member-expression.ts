import { MemberExpressionEvaluateUnit } from '../expression-evaluate-manager';

import { AbstractExpression } from './abstract-expression';
import type { IExpressionBindConfiguration } from './expression-bind-configuration.type';
import { ExpressionType } from './expression-parser.interface';

export class MemberExpression extends AbstractExpression {
  private _expressionEvaluateUnit!: MemberExpressionEvaluateUnit | undefined;

  constructor(expressionString: string, pathSeqments: AbstractExpression[]) {
    super(ExpressionType.Member, expressionString, ...pathSeqments);
  }

  public override clone(): this {
    return new (this.constructor as new (
      expressionString: string,
      pathSeqments: AbstractExpression[],
    ) => this)(
      this.expressionString,
      this._childExpressions.map((child) => child.clone()),
    );
  }

  protected override bindChildren(
    settings: IExpressionBindConfiguration,
  ): void {
    const segments = this._childExpressions
      .map((childExpression) => {
        childExpression.bind(settings);
        return AbstractExpression.getExpressionEvaluateUnit(childExpression);
      })
      .filter((segment) => !!segment);

    this._expressionEvaluateUnit = new MemberExpressionEvaluateUnit(
      settings.context,
      this.expressionString,
      segments,
    );
    if (!settings.skipEvaluateUnitRegistration) {
      this.evaluateManagerForExpression.register(this._expressionEvaluateUnit);
    }
  }

  protected override get expressionEvaluateUnit():
    | MemberExpressionEvaluateUnit
    | undefined {
    return this._expressionEvaluateUnit;
  }

  protected override internalDispose(): void {
    super.internalDispose();

    if (this._expressionEvaluateUnit) {
      this._expressionEvaluateUnit.dispose();
      this._expressionEvaluateUnit = undefined;
    }
  }

  protected override evaluate(): unknown {
    return this._expressionEvaluateUnit?.value;
  }
}
