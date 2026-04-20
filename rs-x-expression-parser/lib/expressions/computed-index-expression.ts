import { ComputedIndexExpressionEvaluateUnit } from '../expression-evaluate-manager/computed-index-expression-evaluate-unit';
import { type IEvaluateManagerForExpression } from '../expression-evaluate-manager/expression-evaluate-manager.interface';

import { AbstractExpression } from './abstract-expression';
import type { IExpressionBindConfiguration } from './expression-bind-configuration.type';
import { ExpressionType } from './expression-parser.interface';
import { ParameterizedExpression } from './parameterized-abstract-expression';

export class ComputedIndexExpression extends ParameterizedExpression {
  private _expressionEvaluateUnit:
    | ComputedIndexExpressionEvaluateUnit
    | undefined;

  constructor(expression: AbstractExpression) {
    super(ExpressionType.ComputedIndex, `[${expression}]`, expression);
  }

  public override clone(): this {
    return new (this.constructor as new (
      expression: AbstractExpression,
    ) => this)(this._childExpressions[0].clone());
  }

  protected override get expressionEvaluateUnit(): ComputedIndexExpressionEvaluateUnit {
    if (!this._expressionEvaluateUnit) {
      this._expressionEvaluateUnit = new ComputedIndexExpressionEvaluateUnit(
        this.watchFactory,
        this.root,
        undefined,
        this.commitCallback,
      );
    }

    return this._expressionEvaluateUnit;
  }

  private commitCallback = (forceDirty?: boolean): void => {
    if (forceDirty && this.isStaticIndexExpression()) {
      this.markRootDirty();
    }
    this.evaluateBottomToTop();
  };

  protected override evaluateBottomToTop(): boolean {
    // Update the watched index before propagating so parent reads the correct slot value
    const indexValue = this._childExpressions[0].value;
    if (indexValue !== undefined) {
      this.expressionEvaluateUnit.setIndex(indexValue);
    }
    return super.evaluateBottomToTop();
  }

  private setCalculateddIndex = () => {
    const indexValue = AbstractExpression.evaluateExpression(
      this._childExpressions[0] as AbstractExpression,
    );
    this.expressionEvaluateUnit.setIndex(indexValue);
  };

  protected override onBind(settings: IExpressionBindConfiguration): void {
    super.onBind(settings);
    this.evaluateManagerForExpression.initialize();
    this.setCalculateddIndex();
  }

  protected override createEvaluateManagerForExpression(): IEvaluateManagerForExpression {
    return this.expressionEvaluateManager.create(this.setCalculateddIndex)
      .instance;
  }

  protected override get isEvaluationBoundary(): boolean {
    return true;
  }

  protected override evaluateExpression(indexValue: unknown): unknown {
    return indexValue;
  }

  private isStaticIndexExpression(): boolean {
    const indexExpression = this._childExpressions[0];
    return (
      indexExpression?.type === ExpressionType.Number ||
      indexExpression?.type === ExpressionType.String
    );
  }
}
