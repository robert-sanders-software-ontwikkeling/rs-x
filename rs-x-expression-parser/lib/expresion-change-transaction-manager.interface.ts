import { type Observable } from 'rxjs';

import { type IDisposable } from '@rs-x/core';

import type { AbstractExpression } from './expressions/abstract-expression';

export interface IExpressionChangeCommitHandler {
  owner: AbstractExpression;
  commit: (
    root: AbstractExpression,
    pendingCommits: Set<IExpressionChangeCommitHandler>,
  ) => boolean;
}

export interface IExpressionChangeTransactionManager extends IDisposable {
  readonly commited: Observable<AbstractExpression>;
  subscribeCommitted(
    rootExpression: AbstractExpression,
    listener: (expression: AbstractExpression) => void,
  ): () => void;
  registerChange(
    rootExpression: AbstractExpression,
    commitHandler: IExpressionChangeCommitHandler,
  ): void;
  suspend(): void;
  continue(): void;
  commit(): void;
}
