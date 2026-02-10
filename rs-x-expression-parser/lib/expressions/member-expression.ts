import { type Subscription } from 'rxjs';

import { PENDING, Type } from '@rs-x/core';

import { type IExpressionChangeCommitHandler } from '../expresion-change-transaction-manager.interface';

import { AbstractExpression } from './abstract-expression';
import type { IExpressionBindConfiguration } from './expression-bind-configuration.type';
import { ExpressionType } from './expression-parser.interface';
import {
  IdentifierExpression,
  type IIdentifierBindConfiguration,
} from './identifier-expression';

interface ISlotChangeSubscription {
  staticIndexExpression: IdentifierExpression;
  changeSubscription: Subscription;
  index: unknown;
  pathSegmentIndex: number;
}

export class MemberExpression extends AbstractExpression {
  private _slotObservers = new Map<
    AbstractExpression,
    ISlotChangeSubscription
  >();
  private _rebindingSlot = false;
  private readonly _initializeQueue = new Map<AbstractExpression, () => void>();

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

  public override bind(
    settings: IExpressionBindConfiguration,
  ): AbstractExpression {
    super.bind(settings);

    for (let i = 0; i < this._childExpressions.length; i++) {
      const currentSegment = this._childExpressions[i];
      if (i === 0 || this.isCalculated(currentSegment)) {
        currentSegment.bind(settings);
      }
    }

    return this;
  }

  protected override internalDispose(): void {
    super.internalDispose();

    for (const slotObserver of this._slotObservers.values()) {
      this.disposeSlotObserver(slotObserver);
    }
    this._slotObservers.clear();

    this._initializeQueue.clear();
  }

  protected override prepareReevaluation(
    sender: AbstractExpression,
    root: AbstractExpression,
    pendingCommits: Set<IExpressionChangeCommitHandler>,
  ): boolean {
    const senderIndex = this._childExpressions.indexOf(
      this.isCalculated(root) ? root : sender,
    );
    if (senderIndex < 0) {
      return false;
    }

    if (this.shouldCancelEvaluate(senderIndex, pendingCommits)) {
      return false;
    }

    const pathSeqments = this._childExpressions;
    for (let i = senderIndex + 1; i < pathSeqments.length; i++) {
      if (
        !this.isCalculated(pathSeqments[i]) &&
        !this.isPending(pathSeqments[i], pendingCommits)
      ) {
        AbstractExpression.clearValue(pathSeqments[i]);
      }
    }

    return true;
  }

  protected override evaluate(
    sender: AbstractExpression,
    root: AbstractExpression,
  ): unknown {
    const senderIndex = this._childExpressions.indexOf(
      root.type === ExpressionType.Index ? root : sender,
    );
    const senderExpr = this._childExpressions[senderIndex];
    if (senderExpr?.value === undefined) {
      return undefined;
    }
    const startIndex = this.isCalculated(this._childExpressions[senderIndex])
      ? senderIndex - 1
      : senderIndex + 1;

    let previousPathSegmentValue =
      this._childExpressions[startIndex - 1]?.value;

    if (startIndex > 0 && Type.isNullOrUndefined(previousPathSegmentValue)) {
      return PENDING;
    }

    for (let i = startIndex; i < this._childExpressions.length; i++) {
      const currentPathSegment = this._childExpressions[i];
      const currentPathSegmentValue = this.resolvePathSegment(
        currentPathSegment,
        previousPathSegmentValue,
        i,
      );

      if (currentPathSegmentValue === PENDING) {
        return currentPathSegmentValue;
      }

      previousPathSegmentValue = currentPathSegmentValue;
    }

    return previousPathSegmentValue;
  }

  protected override isCommitTarget(sender: AbstractExpression): boolean {
    return (
      super.isCommitTarget(sender) ||
      (this.isCalculated(sender) &&
        this._childExpressions[this._childExpressions.length - 1] === sender)
    );
  }

  private shouldCancelEvaluate(
    senderIndex: number,
    pendingCommits: Set<IExpressionChangeCommitHandler>,
  ): boolean {
    for (const commit of pendingCommits) {
      const index = this._childExpressions.indexOf(commit.owner);
      if (index >= 0 && index < senderIndex) {
        return true;
      }
    }
    return false;
  }

  private bindPathSegement(
    pathSegment: AbstractExpression,
    settings: IIdentifierBindConfiguration,
    bind?: () => void,
  ): void {
    this._initializeQueue.set(
      pathSegment,
      bind ?? (() => pathSegment.bind(settings)),
    );
    // Must run after the current evaluate() finishes.
    // Running this code block immediately could trigger a nested evaluate(),
    // so we defer it until the current evaluate has fully returned.
    queueMicrotask(() => {
      this._initializeQueue.get(pathSegment)?.();
      this._initializeQueue.delete(pathSegment);
    });
  }

  private resolvePathSegment(
    pathSegment: AbstractExpression,
    previousPathSegmentValue: unknown,
    pathSegmentIndex: number,
  ): unknown {
    const isPending = this.isPathSegmentPending(pathSegmentIndex);
    if (isPending) {
      return PENDING;
    }

    if (pathSegment.value === undefined) {
      this.bindPathSegement(pathSegment, {
        context: previousPathSegmentValue,
        services: this.services,
        leafIndexWatchRule: this.leafIndexWatchRule,
      });
      return PENDING;
    }

    if (this.isCalculated(pathSegment)) {
      return this.resolveCalculated(
        pathSegment,
        previousPathSegmentValue,
        pathSegmentIndex,
      );
    }

    if (pathSegment.value !== undefined) {
      return pathSegment.value;
    }

    this.bindPathSegement(pathSegment, {
      context: previousPathSegmentValue,
      services: this.services,
      leafIndexWatchRule: this.leafIndexWatchRule,
    });

    return PENDING;
  }

  private resolveCalculated(
    current: AbstractExpression,
    previousContext: unknown,
    index: number,
  ): unknown {
    const { value } = current;
    if (value === undefined) {
      return undefined;
    }

    const resolved = this.indexValueAccessor.getResolvedValue(
      previousContext,
      value,
    );
    this.observeSlot(previousContext, index, current, resolved);
    return resolved;
  }

  private disposeSlotObserver(
    slotChangeSubscription: ISlotChangeSubscription,
  ): void {
    slotChangeSubscription.changeSubscription.unsubscribe();
    slotChangeSubscription.staticIndexExpression.dispose();
  }

  private isPathSegmentPending(currentIndex: number): boolean {
    const nextExpression = this._childExpressions[currentIndex + 1];
    if (
      nextExpression === undefined ||
      nextExpression.type === ExpressionType.Identifier
    ) {
      return false;
    }

    return (
      nextExpression.value === undefined || !this.isCalculated(nextExpression)
    );
  }

  private observeSlot(
    context: unknown,
    pathSegmentIndex: number,
    dynamicIndexExpression: AbstractExpression,
    value: unknown,
  ): void {
    const slotObserver = this._slotObservers.get(dynamicIndexExpression);
    if (slotObserver) {
      if (dynamicIndexExpression.value === slotObserver.index) {
        return;
      }
      this.disposeSlotObserver(slotObserver);
      this._slotObservers.delete(dynamicIndexExpression);
      this._rebindingSlot = true;
    }

    const staticIndexExpression = new IdentifierExpression(
      '',
      dynamicIndexExpression.value,
    );

    this.bindPathSegement(
      staticIndexExpression,
      {
        context,
        currentValue: value,
        services: {
          ...this.services,
          transactionManager: Type.cast(undefined),
        },
        leafIndexWatchRule: this.leafIndexWatchRule,
      },
      () => {
        let bound = false;
        const changeSubscription = staticIndexExpression.changed.subscribe(
          () => {
            if (bound) {
              this.onSlotChanged(staticIndexExpression);
            }
            bound = true;
          },
        );
        this._slotObservers.set(dynamicIndexExpression, {
          staticIndexExpression,
          changeSubscription,
          index: dynamicIndexExpression.value,
          pathSegmentIndex,
        });
        this._rebindingSlot = false;
      },
    );
  }

  private onSlotChanged(sender: AbstractExpression): void {
    if (!this._rebindingSlot) {
      this.evaluateBottomToTop(sender, this.evaluationRoot, new Set());
    }
  }

  private isPending(
    pathSegement: AbstractExpression,
    pendingCommits: Set<IExpressionChangeCommitHandler>,
  ): boolean {
    for (const commit of pendingCommits) {
      if (commit.owner === pathSegement) {
        return true;
      }
    }
    return false;
  }

  private isCalculated(expression: AbstractExpression): boolean {
    return expression.type === ExpressionType.Index;
  }
}
