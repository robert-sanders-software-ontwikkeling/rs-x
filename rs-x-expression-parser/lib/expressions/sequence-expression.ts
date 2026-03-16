import { type IExpressionChangeCommitHandler } from '../expresion-change-transaction-manager.interface';

import { AbstractExpression } from './abstract-expression';
import type { IExpressionBindConfiguration } from './expression-bind-configuration.type';
import { ExpressionType } from './expression-parser.interface';

export class SequenceExpression extends AbstractExpression {
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

  public override bind(
    settings: IExpressionBindConfiguration,
  ): AbstractExpression {
    super.bind(settings);
    this._childExpressions.forEach((childExpression) =>
      childExpression.bind(settings),
    );

    return this;
  }

  protected override prepareReevaluation(
    sender: AbstractExpression,
    root: AbstractExpression,
    pendingCommits: Set<IExpressionChangeCommitHandler>,
  ): boolean {
    // Bubble child changes as if they originated from this sequence segment.
    // MemberExpression path resolution expects direct segment senders.
    if (this._childExpressions.includes(sender)) {
      return super.prepareReevaluation(this, root, pendingCommits);
    }
    return super.prepareReevaluation(sender, root, pendingCommits);
  }

  protected override evaluate(): unknown {
    const childExpression = this._childExpressions;
    return childExpression[childExpression.length - 1].value;
  }
}
