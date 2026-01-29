import { Observable, Subject, Subscription } from 'rxjs';

import { Inject, Injectable, PreDestroy } from '@rs-x/core';
import { type IStateManager, RsXStateManagerInjectionTokens } from '@rs-x/state-manager';

import type { IExpressionChangeCommitHandler, IExpressionChangeTransactionManager } from './expresion-change-transaction-manager.interface';
import { AbstractExpression } from './expressions';

@Injectable()
export class ExpressionChangeTransactionManager implements IExpressionChangeTransactionManager {
    private readonly _commited = new Subject<AbstractExpression>();
    private readonly _changes = new Map<AbstractExpression, Set<IExpressionChangeCommitHandler>>();
    private readonly _startChangeCycleSubscription: Subscription;
    private readonly _endChangeCycleSubscription: Subscription;
    private _emittedChangeCounter = 0;
    private _suspended = false;

    constructor(
        @Inject(RsXStateManagerInjectionTokens.IStateManager)
        stateManager: IStateManager
    ) {
        this._startChangeCycleSubscription = stateManager.startChangeCycle.subscribe(this.onStartChangeCycle);
        this._endChangeCycleSubscription = stateManager.endChangeCycle.subscribe(this.onEndChangeCycle);
    }

    public get commited(): Observable<AbstractExpression> {
        return this._commited;
    }

    @PreDestroy()
    public dispose(): void {
        this._startChangeCycleSubscription.unsubscribe();
        this._endChangeCycleSubscription.unsubscribe();
    }

    public suspend(): void {
        this._suspended = true;
    }

    public continue(): void {
        this._suspended = false;
        this.commit();
    }

    public commit(): void {
        this._emittedChangeCounter = 0;

        for (const root of this._changes.keys()) {
            this.tryCommit(root, false);
        }
        this._changes.clear();
    }

    private tryCommit(root: AbstractExpression, previousCommited: boolean): void  {
        const commitHandlers =this._changes.get(root);
        
        if(!commitHandlers?.size) {
             if(previousCommited) {
                 this._commited.next(root);
             }
           
            return;
        }
        
        let  comitted = false;
        for (const commitHandler of commitHandlers) {
            comitted = commitHandler.commit(root, commitHandlers) || comitted;
        }

        queueMicrotask(() => this.tryCommit(root, comitted));

    }
    public registerChange(rootExpression: AbstractExpression, commitHandler: IExpressionChangeCommitHandler): void {
        let commitHandlers = this._changes.get(rootExpression);
        if (!commitHandlers) {
            commitHandlers = new Set();
            this._changes.set(rootExpression, commitHandlers);
        }
        commitHandlers.add(commitHandler);
    }

    private onStartChangeCycle = () => {
        this._emittedChangeCounter++;
    };

    private onEndChangeCycle = () => {
        if (this._emittedChangeCounter === 0) {
            return;
        }

        this._emittedChangeCounter--;
        if (this._emittedChangeCounter !== 0 || this._suspended) {
            return;
        }

        this.commit();
    };
}
