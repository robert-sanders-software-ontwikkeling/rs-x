import {
  type IExpressionEvaluateUnit,
  SequenceExpressionEvaluateUnit,
} from '../expression-evaluate-manager';

import { AbstractExpression } from './abstract-expression';
import type { IExpressionBindConfiguration } from './expression-bind-configuration.type';
import { ExpressionType } from './expression-parser.interface';

export class SequenceExpression extends AbstractExpression {
  private _expressionEvaluateUnit: IExpressionEvaluateUnit | undefined;

  constructor(expressionString: string, expressions: AbstractExpression[]) {
    super(ExpressionType.Sequence, expressionString, expressions);
  }

  public override clone(): this {
    return new (this.constructor as new (
      expressionString: string,
      expressions: AbstractExpression[],
    ) => this)(
      this.expressionString,
      this._childExpressions.map((child) => child.clone()),
    );
  }

  protected override bindChildren(
    settings: IExpressionBindConfiguration,
  ): void {
    const isMemberSegment = this.parent?.type === ExpressionType.Member;
    if (!isMemberSegment) {
      super.bindChildren(settings);
      return;
    }

    const childBindSettings = {
      ...settings,
      skipEvaluateUnitRegistration: true,
    };
    const dependencyUnits: IExpressionEvaluateUnit[] = [];

    for (let i = 0; i < this._childExpressions.length; i++) {
      const childExpression = this._childExpressions[i];
      childExpression.bind(childBindSettings);
      const unit =
        AbstractExpression.getExpressionEvaluateUnit(childExpression);
      if (unit) {
        dependencyUnits.push(unit);
      }
    }

    this._expressionEvaluateUnit = new SequenceExpressionEvaluateUnit(
      this.expressionString,
      undefined,
      dependencyUnits,
      () => this.evaluate(),
      this.commitValue,
    );

    if (!settings.skipEvaluateUnitRegistration) {
      this.evaluateManagerForExpression.register(this._expressionEvaluateUnit);
    }
  }

  protected override get expressionEvaluateUnit():
    | IExpressionEvaluateUnit
    | undefined {
    return this._expressionEvaluateUnit;
  }

  protected override internalDispose(): void {
    super.internalDispose();
    this._expressionEvaluateUnit = undefined;
  }

  protected override evaluate(): unknown {
    const childExpression = this._childExpressions;
    return AbstractExpression.evaluateExpression(
      childExpression[childExpression.length - 1] as AbstractExpression,
    );
  }

  protected override shouldAbortTopDownEvaluation(): boolean {
    return false;
  }

  private commitValue = () => {
    this.evaluateBottomToTop();
  };
}
