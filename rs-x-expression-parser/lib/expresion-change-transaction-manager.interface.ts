import { type IDisposable } from '@rs-x/core';

import type { AbstractExpression } from './expressions/abstract-expression';

export interface IExpressionChangeCommitHandler {
  owner: AbstractExpression;
  commit: (
    root: AbstractExpression,
    pendingCommits: Set<IExpressionChangeCommitHandler>,
  ) => boolean;
}

export type IExpressionCommitListener = () => void;

export interface IExpressionChangeTransactionManager extends IDisposable {
  subscribeCommitted(listener: IExpressionCommitListener): () => void;
  suspend(): void;
  continue(): void;
  commit(): void;
}
