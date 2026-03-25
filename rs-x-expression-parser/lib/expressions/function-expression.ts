import { type AnyFunction, Assertion, PENDING, Type } from '@rs-x/core';

import {
  FunctionExpressionEvaluateUnit,
  type IExpressionEvaluateUnit,
} from '../expression-evaluate-manager';

import { AbstractExpression } from './abstract-expression';
import type { ArrayExpression } from './array-expression';
import { ConstantNullExpression } from './constant-null-expression';
import type { IExpressionBindConfiguration } from './expression-bind-configuration.type';
import { ExpressionType } from './expression-parser.interface';

export class FunctionExpression extends AbstractExpression {
  private _context: unknown;
  private _functionContext: unknown;
  private _functionId!: string;
  private _functionExpressionEvaluateUnit:
    | FunctionExpressionEvaluateUnit
    | undefined;
  private _lastInvocation:
    | {
        context: unknown;
        functionName: string;
        args: unknown[];
        result: unknown;
      }
    | undefined;

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
    const childBindSettings = {
      ...settings,
      skipEvaluateUnitRegistration: true,
    };

    if (this._objectExpression) {
      if (this._computed) {
        this._objectExpression.bind(childBindSettings);
        this._functionExpression.bind(childBindSettings);
      } else {
        this._objectExpression.bind(childBindSettings);
        AbstractExpression.setHidden(this._functionExpression);
        this._functionExpression.bind({
          ...childBindSettings,
          context: undefined,
        });
      }
    } else {
      this._childExpressions[0].bind(childBindSettings);
      AbstractExpression.setHidden(this._functionExpression);
      this._functionExpression.bind(
        this._functionExpression.type == ExpressionType.Identifier
          ? { ...childBindSettings, context: undefined }
          : childBindSettings,
      );
    }

    this._argumentsExpression.bind(childBindSettings);

    const dependencyUnits: IExpressionEvaluateUnit[] = [];
    const objectExpressionUnit = this._objectExpression
      ? AbstractExpression.getExpressionEvaluateUnit(this._objectExpression)
      : undefined;
    if (objectExpressionUnit) {
      dependencyUnits.push(objectExpressionUnit);
    }

    const functionExpressionUnit = AbstractExpression.getExpressionEvaluateUnit(
      this._functionExpression,
    );
    if (functionExpressionUnit) {
      dependencyUnits.push(functionExpressionUnit);
    }

    for (
      let i = 0;
      i < this._argumentsExpression.childExpressions.length;
      i++
    ) {
      const argumentUnit = AbstractExpression.getExpressionEvaluateUnit(
        this._argumentsExpression.childExpressions[i] as AbstractExpression,
      );
      if (argumentUnit) {
        dependencyUnits.push(argumentUnit);
      }
    }

    this._functionExpressionEvaluateUnit = new FunctionExpressionEvaluateUnit(
      this._functionId,
      undefined,
      dependencyUnits,
      () => this.evaluate(),
      this.commitValue,
      this.parent?.type === ExpressionType.Member,
      this.parent?.type === ExpressionType.Member,
    );

    if (!settings.skipEvaluateUnitRegistration) {
      this.evaluateManagerForExpression.register(
        this._functionExpressionEvaluateUnit,
      );
    }
  }

  protected override get expressionEvaluateUnit():
    | FunctionExpressionEvaluateUnit
    | undefined {
    return this._functionExpressionEvaluateUnit;
  }

  protected override internalDispose(): void {
    this.releaseResult();
    this._functionExpressionEvaluateUnit?.dispose();
    super.internalDispose();
  }

  protected override evaluate(): unknown {
    this.syncObjectExpressionCache();
    this.syncArgumentsExpressionCache();

    const functionContext = Type.toObject(
      this._objectExpression ? this._objectExpression.value : this._context,
    );
    if (!functionContext) {
      return PENDING;
    }

    if (this._functionContext !== functionContext) {
      this._functionContext = functionContext;
      if (this._functionExpressionEvaluateUnit) {
        this._functionExpressionEvaluateUnit.context = this._functionContext;
      }
    }

    const { functionName } = this;

    const args =
      this._argumentsExpression.value ??
      (this._argumentsExpression.childExpressions.length === 0
        ? []
        : undefined);

    if (!functionName || args === undefined || !functionContext) {
      return PENDING;
    }

    const func = Type.cast<Function>(functionContext[functionName]);
    Assertion.assertIsFunction(func, func.name);

    if (
      this._lastInvocation &&
      this._lastInvocation.context === functionContext &&
      this._lastInvocation.functionName === functionName &&
      this.argsEqual(this._lastInvocation.args, args as unknown[])
    ) {
      return this._lastInvocation.result;
    }

    const result = this.registerResult(
      func.call(functionContext, ...(args as unknown[])),
    );
    this._lastInvocation = {
      context: functionContext,
      functionName,
      args: [...(args as unknown[])],
      result,
    };
    if (result !== PENDING && this._functionExpressionEvaluateUnit) {
      this._functionExpressionEvaluateUnit.setValueDirectly(result);
    }
    return result;
  }

  private get functionName(): string {
    return this._computed
      ? (AbstractExpression.evaluateExpression(
          this._functionExpression,
        ) as string)
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

  private syncObjectExpressionCache(): void {
    if (!this._objectExpression) {
      return;
    }

    const value = AbstractExpression.evaluateExpression(this._objectExpression);
    if (value === undefined) {
      AbstractExpression.clearValue(this._objectExpression);
      return;
    }

    AbstractExpression.setValue(this._objectExpression, () => value);
  }

  private syncArgumentsExpressionCache(): void {
    if (this._argumentsExpression.childExpressions.length === 0) {
      AbstractExpression.setValue(this._argumentsExpression, () => []);
      return;
    }

    const args = this._argumentsExpression.childExpressions.map(
      (childExpression) =>
        AbstractExpression.evaluateExpression(
          childExpression as AbstractExpression,
        ),
    );
    if (args.some((arg) => arg === undefined)) {
      AbstractExpression.clearValue(this._argumentsExpression);
      return;
    }

    AbstractExpression.setValue(this._argumentsExpression, () => args);
  }

  private readonly commitValue = (_value: unknown) => {
    this.evaluateBottomToTop();
  };

  private argsEqual(previous: unknown[], next: unknown[]): boolean {
    if (previous.length !== next.length) {
      return false;
    }

    for (let i = 0; i < previous.length; i++) {
      if (!Object.is(previous[i], next[i])) {
        return false;
      }
    }

    return true;
  }
}
