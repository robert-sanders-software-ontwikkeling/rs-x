import {
  FunctionExpressionEvaluateUnit,
  type IExpressionEvaluateUnit,
} from '../expression-evaluate-manager';

import { AbstractExpression } from './abstract-expression';
import type { IExpressionBindConfiguration } from './expression-bind-configuration.type';
import { ExpressionType } from './expression-parser.interface';

export class SequenceExpression extends AbstractExpression {
  private _expressionEvaluateUnit: FunctionExpressionEvaluateUnit | undefined;

  constructor(expressionString: string, expressions: AbstractExpression[]) {
    super(ExpressionType.Sequence, expressionString, ...expressions);
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

    for (let i = 0; i < this._childExpressions.length; i++) {
      this._childExpressions[i].bind(childBindSettings);
    }

    // Sequence operands before the last may have side effects. For member-segment usage
    // we execute them once at bind time so the final operand can resolve on initialization.
    for (let i = 0; i < this._childExpressions.length - 1; i++) {
      AbstractExpression.evaluateExpression(
        this._childExpressions[i] as AbstractExpression,
      );
    }

    const dependencyUnits: IExpressionEvaluateUnit[] = [];
    for (let i = 0; i < this._childExpressions.length; i++) {
      const dependencyUnit = AbstractExpression.getExpressionEvaluateUnit(
        this._childExpressions[i] as AbstractExpression,
      );

      if (dependencyUnit) {
        dependencyUnits.push(dependencyUnit);
      }
    }

    this._expressionEvaluateUnit = new FunctionExpressionEvaluateUnit(
      this.expressionString,
      settings.context,
      dependencyUnits,
      () => this.evaluate(),
      this.commitValue,
      true,
      true,
    );
  }

  protected override get expressionEvaluateUnit():
    | IExpressionEvaluateUnit
    | undefined {
    return this._expressionEvaluateUnit;
  }

  private readonly commitValue = (_value: unknown) => {
    this.evaluateBottomToTop();
  };

  protected override evaluate(): unknown {
    const childExpression = this._childExpressions;
    return AbstractExpression.evaluateExpression(
      childExpression[childExpression.length - 1] as AbstractExpression,
    );
  }

  protected override shouldAbortTopDownEvaluation(): boolean {
    return false;
  }
}
