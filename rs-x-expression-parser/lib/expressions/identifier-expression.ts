import { type IIndexWatchRule, IndexWatchRule } from '@rs-x/state-manager';

import { IdentifierExpressionEvaluateUnit } from '../expression-evaluate-manager';
import { type IExpressionEvaluateUnit } from '../expression-evaluate-manager/expression-evaluate-unit.interface';

import { AbstractExpression } from './abstract-expression';
import type { IExpressionBindConfiguration } from './expression-bind-configuration.type';
import { ExpressionType } from './expression-parser.interface';

export type IIdentifierBindConfiguration = IExpressionBindConfiguration & {
  readonly currentValue?: unknown;
  readonly context: unknown;
  readonly isRoot?: boolean;
};

export class IdentifierExpression extends AbstractExpression {
  private _context: unknown;
  private _indexWatchRule!: IIndexWatchRule | undefined;
  private _isAsync: boolean | undefined;
  private _expressionEvaluateUnit!: IExpressionEvaluateUnit;

  constructor(expressionString: string) {
    super(ExpressionType.Identifier, expressionString);
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
    return new (this.constructor as new (expressionString: string) => this)(
      this.expressionString,
    );
  }

  private commitValue = () => {
    this.evaluateBottomToTop();
  };

  protected override get expressionEvaluateUnit(): IExpressionEvaluateUnit {
    return this._expressionEvaluateUnit;
  }

  protected override onBind(settings: IExpressionBindConfiguration): void {
    if (!settings.context) {
      super.onBind(settings);
      return;
    }
    this._context = this.identifierOwnerResolver.resolve(
      this.index,
      settings.context,
    );

    if (this._indexWatchRule) {
      this._indexWatchRule.context = this._context;
    } else {
      this._indexWatchRule = new IndexWatchRule(
        this._context,
        this.shouldWatchIndex,
      );
    }

    const isMemberSegment = this.parent?.type === ExpressionType.Member;
    this._expressionEvaluateUnit = new IdentifierExpressionEvaluateUnit(
      this.index,
      isMemberSegment ? undefined : this._context,
      this.stateManager,
      this.commitValue,
      this.root,
      this._indexWatchRule,
    );

    if (!isMemberSegment && !settings.skipEvaluateUnitRegistration) {
      this.evaluateManagerForExpression.register(this._expressionEvaluateUnit);
    }

    super.onBind(settings);
  }

  protected override internalDispose(): void {
    super.internalDispose();
    this._indexWatchRule = undefined;
  }

  protected override evaluate(): unknown {
    if (!this._context) {
      return this.expressionEvaluateUnit?.value ?? this.expressionString;
    }
    return (
      this.expressionEvaluateUnit?.value ??
      this.indexValueAccessor.getValue(this._context, this.index)
    );
  }

  private get isLeaf(): boolean {
    return (
      !this.parent ||
      this.parent.childExpressions[this.parent.childExpressions.length - 1] ===
        this
    );
  }

  private get isMemberExpressionSegment(): boolean {
    return (
      this.parent?.type === ExpressionType.Member &&
      this.parent.childExpressions.includes(this)
    );
  }

  private shouldWatchIndex = (
    targetIndex: unknown,
    target: unknown,
  ): boolean => {
    const index = this.index;

    // Fast reject: rule-based watching only
    if (
      index !== targetIndex ||
      this.expressionEvaluateUnit.context !== target
    ) {
      return !!this.leafIndexWatchRule?.test(targetIndex, target);
    }

    const value = this.indexValueAccessor.getValue(target, index);

    if (!this.isLeaf && this.isMemberExpressionSegment) {
      return this.valueMetadata.needsProxy(value);
    }

    if (!this.isLeaf && this.isExpressionReferenceValue(value)) {
      return true;
    }

    if (this.isLeaf) {
      return (
        this.valueMetadata.needsProxy(value) ||
        !!this.leafIndexWatchRule?.test(targetIndex, target)
      );
    }

    return false;
  };

  private isExpressionReferenceValue(value: unknown): boolean {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Record<string, unknown>;
    return (
      typeof candidate.bind === 'function' &&
      typeof candidate.dispose === 'function' &&
      'changed' in candidate &&
      'value' in candidate
    );
  }
}
