import { type AnyFunction, Assertion, PENDING, Type } from '@rs-x/core';

import { type IExpressionChangeCommitHandler } from '../expresion-change-transaction-manager.interface';

import { AbstractExpression } from './abstract-expression';
import type { ArrayExpression } from './array-expression';
import { ConstantNullExpression } from './constant-null-expression';
import type { IExpressionBindConfiguration } from './expression-bind-configuration.type';
import { ExpressionType } from './expression-parser.interface';

export class FunctionExpression extends AbstractExpression {
  private _context: unknown;
  private _functionContext: unknown;
  private _functionId!: string;
  private readonly _commitHandler: IExpressionChangeCommitHandler;

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
    this._commitHandler = {
      owner: this,
      commit: this.commit,
    };
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

  public override bind(
    settings: IExpressionBindConfiguration,
  ): AbstractExpression {
    super.bind(settings);
    this._functionId = this.guidFactory.create();
    this._context = settings.context;
    if (this._objectExpression) {
      this._objectExpression.bind(settings);

      this._functionExpression.bind(
        this._computed ? settings : { ...settings, context: undefined },
      );

      if (this._computed) {
        this._functionExpression.bind(settings);
      } else {
        AbstractExpression.setHidden(this._functionExpression);
      }
    } else {
      this._childExpressions[0].bind(settings);
      AbstractExpression.setHidden(this._functionExpression);
      this._functionExpression.bind(
        this._functionExpression.type == ExpressionType.Identifier
          ? { ...settings, context: undefined }
          : settings,
      );
    }

    this._argumentsExpression.bind(settings);
    this.transactionManager.registerChange(
      this.evaluationRoot,
      this._commitHandler,
    );

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
      sender === this._functionExpression ||
      sender === this._objectExpression ||
      sender === this._argumentsExpression
    ) {
      super.prepareReevaluation(this, root, pendingCommits);
      return true;
    }

    return super.prepareReevaluation(sender, root, pendingCommits);
  }

  protected override evaluate(): unknown {
    const functionContext = Type.toObject(
      this._objectExpression ? this._objectExpression?.value : this._context,
    );
    if (!functionContext) {
      return PENDING;
    }

    if (this._functionContext !== functionContext) {
      this._functionContext = functionContext;
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

    return this.registerResult(func.call(functionContext, ...args));
  }

  private get functionName(): string {
    return this._computed
      ? (this._functionExpression.value as string)
      : this._functionExpression.expressionString;
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

  private commit = (
    root: AbstractExpression,
    pendingCommits: Set<IExpressionChangeCommitHandler>,
  ) => this.reevaluated(this, root, pendingCommits);
}
