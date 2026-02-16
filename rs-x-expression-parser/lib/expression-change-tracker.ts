import { Observable, Subject } from 'rxjs';
import { IExpression } from './expressions/expression-parser.interface';
import { IDisposable } from '@rs-x/core';

export interface IExpressionChangeHistory {
    expression: IExpression;
    value: unknown;
    oldValue: unknown;
}

export class ExpressionChangeTracker implements IDisposable {
    private readonly _currentTrackStack: IExpressionChangeHistory[] = [];
    private readonly _history: IExpressionChangeHistory[][] = [];
    private readonly _changed = new Subject<IExpressionChangeHistory[]>;
    private _isDisposed = false;

    constructor(private readonly _expression: IExpression) {
        if (this._expression.changeHook) {
            throw new Error(`Expression ${this._expression.expressionString} is already tracked`)
        }

        this._expression.changeHook = this.onChanged
    }
    public get history(): readonly IExpressionChangeHistory[][] {
        return this._history;
    }

    public get changed(): Observable<IExpressionChangeHistory[]> {
        return this._changed;
    }

    public dispose(): void {
        if (this._isDisposed) {
            return;
        }
        this.clear();
        this._expression.changeHook = undefined;
        this._isDisposed = true;
    }


    public clear(): void {
        this._history.length = 0;
        this._currentTrackStack.length = 0;
    }

    private onChanged = (expression: IExpression, oldValue: unknown): void  => {
        this._currentTrackStack.push({
            expression,
            value: expression.value,
            oldValue
        });

        if (expression === this._expression) {
            const currentTrackStack = [...this._currentTrackStack];
            this._history.push(currentTrackStack);
            this._currentTrackStack.length = 0;
            this._changed.next(currentTrackStack);
        }
    }
}