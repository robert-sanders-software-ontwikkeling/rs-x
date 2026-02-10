import { type AnyFunction, Assertion, PENDING, Type } from '@rs-x/core';

import { type IExpressionChangeCommitHandler } from '../expresion-change-transaction-manager.interface';

import { AbstractExpression } from './abstract-expression';
import { type ArrayExpression } from './array-expression';
import { ConstantNullExpression } from './constant-null-expression';
import type { IExpressionBindConfiguration } from './expression-bind-configuration.type';
import { ExpressionType } from './expression-parser.interface';

export class FunctionExpression extends AbstractExpression {
  private _context: unknown;
  private _functionContext: unknown;
  private _functionId!: string;

  constructor(
    expressionString: string,
    public readonly functionExpression: AbstractExpression<
      AnyFunction | string | number
    >,
    public readonly objectExpression: AbstractExpression<object>,
    public readonly argumentsExpression: ArrayExpression,
    public readonly computed: boolean,
    public readonly optional: boolean,
  ) {
    super(
      ExpressionType.Function,
      expressionString,
      objectExpression ?? new ConstantNullExpression(),
      functionExpression,
      argumentsExpression,
    );
  }

  public override clone(): this {
    return new (this.constructor as new (
      expressionString: string,
      functionExpression: AbstractExpression<AnyFunction | string | number>,
      objectExpression: AbstractExpression<object>,
      argumentsExpression: ArrayExpression,
      computed: boolean,
      optional: boolean,
    ) => this)(
      this.expressionString,
      this.functionExpression.clone(),
      this.objectExpression?.clone(),
      this.argumentsExpression.clone(),
      this.computed,
      this.optional,
    );
  }

  public override bind(
    settings: IExpressionBindConfiguration,
  ): AbstractExpression {
    super.bind(settings);
    this._functionId = this.guidFactory.create();
    this._context = settings.context ?? settings.rootContext;
    if (this.objectExpression) {
      this.objectExpression.bind(settings);
      if (this.computed) {
        this.functionExpression.bind(settings);
      }
    } else if (this.functionExpression.type !== ExpressionType.Identifier) {
      this.functionExpression.bind(settings);
    }

    this.argumentsExpression.bind(settings);

    return this;
  }

  protected override internalDispose(): void {
    this.releaseResult();
  }

  protected override prepareReevaluation(
    sender: AbstractExpression,
    root: AbstractExpression,
    pendingCommits: Set<IExpressionChangeCommitHandler>,
  ): boolean {
    if (
      sender === this.functionExpression ||
      sender === this.objectExpression ||
      sender === this.argumentsExpression
    ) {
      super.prepareReevaluation(this, root, pendingCommits);
      return true;
    }

    return super.prepareReevaluation(sender, root, pendingCommits);
  }

  protected override evaluate(): unknown {
    const functionContext = Type.toObject(
      this.objectExpression ? this.objectExpression?.value : this._context,
    );
    if (!functionContext) {
      return PENDING;
    }

    if (this._functionContext !== functionContext) {
      this._functionContext = functionContext;
    }

    const { functionName, argumentsExpression } = this;

    const args = argumentsExpression.value;

    if (!functionName || !args || !functionContext) {
      return PENDING;
    }

    const func = Type.cast<Function>(functionContext[functionName]);
    Assertion.assertIsFunction(func, func.name);

    return this.registerResult(func.call(functionContext, ...args));
  }

  private get functionName(): string {
    return this.computed
      ? (this.functionExpression.value as string)
      : this.functionExpression.expressionString;
  }

  private releaseResult(): void {
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
}
