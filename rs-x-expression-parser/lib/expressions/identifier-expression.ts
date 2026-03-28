import { type IIndexWatchRule } from '@rs-x/state-manager';

import { IdentifierExpressionEvaluateUnit } from '../expression-evaluate-manager';
import { type IExpressionEvaluateUnit } from '../expression-evaluate-manager/expression-evaluate-unit.interface';

import { AbstractExpression } from './abstract-expression';
import type { IExpressionBindConfiguration } from './expression-bind-configuration.type';
import { ExpressionType } from './expression-parser.interface';

export class IdentifierExpression extends AbstractExpression {
  private _context: unknown;
  private _indexWatchRule!: IIndexWatchRule | undefined;
  private _isAsync: boolean | undefined;
  private _expressionEvaluateUnit!: IExpressionEvaluateUnit;
  private _isMemberSegment = false;
  private readonly _isStaticMemberLeaf: boolean;
  private readonly _isLeaf: boolean | undefined;
  private readonly _isMemberExpressionSegment: boolean | undefined;

  constructor(
    expressionString: string,
    isStaticMemberLeaf = false,
    isLeaf?: boolean,
    isMemberExpressionSegment?: boolean,
  ) {
    super(ExpressionType.Identifier, expressionString);
    this._isStaticMemberLeaf = isStaticMemberLeaf;
    this._isLeaf = isLeaf;
    this._isMemberExpressionSegment = isMemberExpressionSegment;
  }

  public override get isAsync(): boolean | undefined {
    if (this._isAsync === undefined && this._context) {
      const value = this.indexValueAccessor.getValue(this._context, this.index);
      this._isAsync = this.valueMetadata.isAsync(value);
    }
    return this._isAsync;
  }

  private get index(): unknown {
    return this.expressionString;
  }

  public setValue(value: unknown): void {
    const context = this.expressionEvaluateUnit?.context ?? this._context;
    this.indexValueAccessor.setValue(context, this.index, value);
  }

  public override clone(): this {
    return new IdentifierExpression(
      this.expressionString,
      this._isStaticMemberLeaf,
      this._isLeaf,
      this._isMemberExpressionSegment,
    ) as this;
  }

  protected override get expressionEvaluateUnit(): IExpressionEvaluateUnit {
    return this._expressionEvaluateUnit;
  }

  protected override onBind(settings: IExpressionBindConfiguration): void {
    if (!settings.context) {
      super.onBind(settings);
      return;
    }
    const parent = this.parent;
    this._isMemberSegment = parent?.type === ExpressionType.Member;

    this._context = this.identifierOwnerResolver.resolve(
      this.index,
      settings.context,
    );

    this._indexWatchRule = this.identifierWatchRuleFactory.create(
      this._context,
      {
        index: this.index,
        isLeaf: this._isLeaf ?? true,
        isMemberExpressionSegment: this._isMemberExpressionSegment ?? false,
        indexWatchRule: this.leafIndexWatchRule,
      },
    );

    this._expressionEvaluateUnit = new IdentifierExpressionEvaluateUnit(
      this.index,
      this._isMemberSegment ? undefined : this._context,
      this.watchFactory,
      this._indexWatchRule,
      this.commitValue,
      this.root,
      (context, index) => this.indexValueAccessor.getValue(context, index),
      (value) => this.valueMetadata.isAsync(value),
      this.isRoot,
      this._isStaticMemberLeaf,
    );

    if (!this._isMemberSegment && !settings.skipEvaluateUnitRegistration) {
      this.evaluateManagerForExpression.register(this._expressionEvaluateUnit);
    }

    super.onBind(settings);
  }

  protected override internalDispose(): void {
    super.internalDispose();
    this._indexWatchRule?.dispose();
    this._indexWatchRule = undefined;
  }

  protected override evaluate(): unknown {
    if (!this._context) {
      return this.expressionEvaluateUnit?.value ?? this.expressionString;
    }
    const watchedValue = this.expressionEvaluateUnit?.value;
    if (watchedValue !== undefined) {
      return watchedValue;
    }

    const value = this.indexValueAccessor.getValue(this._context, this.index);
    if (this.valueMetadata.isAsync(value)) {
      return undefined;
    }

    return value;
  }

  private commitValue = (_: unknown, forceDirty?: boolean) => {
    if (forceDirty) {
      this.markRootDirty();
    }
    this.evaluateBottomToTop();
  };
}
