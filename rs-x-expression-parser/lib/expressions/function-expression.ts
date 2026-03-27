import { type AnyFunction, Assertion, PENDING, Type } from '@rs-x/core';

import {
  ConstExpressionEvaluateUnit,
  FunctionExpressionEvaluateUnit,
  type IExpressionEvaluateUnit,
} from '../expression-evaluate-manager';

import { AbstractExpression } from './abstract-expression';
import type { ArrayExpression } from './array-expression';
import { ConstantNullExpression } from './constant-null-expression';
import type { IExpressionBindConfiguration } from './expression-bind-configuration.type';
import { ExpressionType } from './expression-parser.interface';

export class FunctionExpression extends AbstractExpression {
  private _functionContext: unknown;
  private _functionId!: string;
  private _context: unknown;
  private _expressionEvaluateUnit: IExpressionEvaluateUnit | undefined;
  private _isMemberSegment = false;
  private _argumentEvaluateUnits: Array<IExpressionEvaluateUnit | undefined> =
    [];

  constructor(
    expressionString: string,
    private readonly _functionExpression: AbstractExpression<
      AnyFunction | string | number
    >,

    private readonly _objectExpression: AbstractExpression<object>,
    private readonly _argumentsExpression: ArrayExpression,
    private readonly _computed: boolean,
    private readonly _optional: boolean,
  ) {
    const hasArguments = _argumentsExpression.childExpressions.length > 0;
    const argumentsExpression = hasArguments
      ? _argumentsExpression
      : AbstractExpression.setHidden(_argumentsExpression);

    super(
      ExpressionType.Function,
      expressionString,
      _objectExpression ??
        AbstractExpression.setHidden(new ConstantNullExpression()),
      _functionExpression,
      argumentsExpression,
    );
  }

  public override clone(): this {
    return new (this.constructor as new (
      expressionString: string,
      _functionExpression: AbstractExpression<AnyFunction | string | number>,
      _objectExpression: AbstractExpression<object>,
      _argumentsExpression: ArrayExpression,
      _computed: boolean,
      _optional: boolean,
    ) => this)(
      this.expressionString,
      this._functionExpression.clone(),
      this._objectExpression?.clone(),
      this._argumentsExpression.clone(),
      this._computed,
      this._optional,
    );
  }

  protected override bindChildren(
    settings: IExpressionBindConfiguration,
  ): void {
    this._functionId = this.guidFactory.create();
    this._context = settings.context;
    this._functionContext = this.absoluteRoot;
    const isMemberSegment = this.parent?.type === ExpressionType.Member;
    this._isMemberSegment = isMemberSegment;
    this._argumentEvaluateUnits = [];
    const childBindSettings = {
      ...settings,
      skipEvaluateUnitRegistration: true,
    };

    const unitsToRegister = new Set<IExpressionEvaluateUnit>();
    const addUnit = (expression: AbstractExpression): void => {
      const unit = AbstractExpression.getExpressionEvaluateUnit(expression);
      if (unit) {
        unitsToRegister.add(unit);
      }
    };

    if (this._objectExpression) {
      this._objectExpression.bind(childBindSettings);
      addUnit(this._objectExpression);

      if (this._computed) {
        this._functionExpression.bind(childBindSettings);
        addUnit(this._functionExpression);
      } else {
        AbstractExpression.setHidden(this._functionExpression);
        this._functionExpression.bind({
          ...childBindSettings,
          context: undefined,
        });
      }
    } else {
      this.evaluateManagerForExpression.register(
        new ConstExpressionEvaluateUnit(settings.context),
      );

      this._childExpressions[0].bind(childBindSettings);
      addUnit(this._childExpressions[0]);

      AbstractExpression.setHidden(this._functionExpression);
      this._functionExpression.bind(
        this._functionExpression.type === ExpressionType.Identifier
          ? { ...childBindSettings, context: undefined }
          : childBindSettings,
      );
    }

    this._argumentsExpression.bind(childBindSettings);

    for (
      let i = 0;
      i < this._argumentsExpression.childExpressions.length;
      i++
    ) {
      const argumentExpression = this._argumentsExpression.childExpressions[
        i
      ] as AbstractExpression;
      const argumentUnit =
        AbstractExpression.getExpressionEvaluateUnit(argumentExpression);
      this._argumentEvaluateUnits.push(argumentUnit);
      if (argumentUnit) {
        unitsToRegister.add(argumentUnit);
      }
    }

    if (isMemberSegment) {
      const functionEvaluateUnit = new FunctionExpressionEvaluateUnit(
        this.expressionString,
        undefined,
        [...unitsToRegister.values()],
        () => this.evaluate(),
        this.commitValue,
      );
      this._expressionEvaluateUnit = functionEvaluateUnit;
      if (!settings.skipEvaluateUnitRegistration) {
        this.evaluateManagerForExpression.register(functionEvaluateUnit);
      }
    } else {
      this._expressionEvaluateUnit = undefined;
    }

    if (!settings.skipEvaluateUnitRegistration && !isMemberSegment) {
      for (const unit of unitsToRegister.values()) {
        this.evaluateManagerForExpression.register(unit);
      }
    }
  }

  protected override get expressionEvaluateUnit():
    | IExpressionEvaluateUnit
    | undefined {
    return this._expressionEvaluateUnit;
  }

  protected override internalDispose(): void {
    this.releaseResult();
    super.internalDispose();
    this._expressionEvaluateUnit = undefined;
  }

  protected override evaluate(): unknown {
    const objectValue = this._objectExpression
      ? (this._objectExpression.value ??
        AbstractExpression.evaluateExpression(this._objectExpression))
      : this._context;

    const functionContext = Type.toObject(objectValue);
    if (!functionContext) {
      return PENDING;
    }

    const { functionName } = this;

    const argsValue = this._isMemberSegment
      ? this.evaluateArgumentsFromUnits()
      : (this._argumentsExpression.value ??
        AbstractExpression.evaluateExpression(this._argumentsExpression));
    const args =
      argsValue ??
      (this._argumentsExpression.childExpressions.length === 0
        ? []
        : undefined);

    if (!functionName || args === undefined || !functionContext) {
      return PENDING;
    }

    const func = Type.cast<Function>(functionContext[functionName]);
    Assertion.assertIsFunction(func, func.name);

    const result = this.registerResult(
      func.call(functionContext, ...(args as unknown[])),
    );

    return result;
  }

  private get functionName(): string {
    return this._computed
      ? (this._functionExpression.value as string)
      : this._functionExpression.expressionString;
  }

  private releaseResult(): void {
    if (!this.stateManager || !this._functionContext || !this._functionId) {
      this._functionContext = undefined;
      return;
    }

    this.stateManager.releaseState(this._functionContext, this._functionId);
    this._functionContext = undefined;
  }

  private registerResult(result: unknown): unknown {
    this.stateManager.setState(
      this._functionContext,
      this._functionId,
      result,
      this.absoluteRoot,
    );
    return result;
  }

  private commitValue = () => {
    this.evaluateBottomToTop();
  };

  private evaluateArgumentsFromUnits(): unknown[] {
    const values: unknown[] = [];
    const argumentExpressions = this._argumentsExpression.childExpressions;

    for (let i = 0; i < argumentExpressions.length; i++) {
      const argumentExpression = argumentExpressions[i] as AbstractExpression;
      const unit = this._argumentEvaluateUnits[i];
      const value =
        unit?.value ??
        argumentExpression.value ??
        AbstractExpression.evaluateExpression(argumentExpression);

      if (argumentExpression.type === ExpressionType.Spread) {
        values.push(...((value as unknown[]) ?? []));
      } else {
        values.push(value);
      }
    }

    return values;
  }
}
