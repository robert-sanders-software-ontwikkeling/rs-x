import { type IDisposable } from '@rs-x/core';
import { type Observable } from 'rxjs';
import { type AbstractExpression } from './expressions';

export interface IExpressionChangeCommitHandler {
    owner: AbstractExpression;
    commit: (root: AbstractExpression, pendingCommits: Set<IExpressionChangeCommitHandler>) => boolean
}

export interface IExpressionChangeTransactionManager extends IDisposable {
    readonly commited: Observable<AbstractExpression>;
    registerChange(rootExpression: AbstractExpression, commitHandler: IExpressionChangeCommitHandler): void;
    suspend(): void;
    continue(): void;
    commit(): void;
}
