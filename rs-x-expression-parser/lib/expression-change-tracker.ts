import { Observable, Subject } from 'rxjs';
import { IExpression } from './expressions/expression-parser.interface';
import { IDisposable } from '@rs-x/core';

export interface IExpressionChangeHistory<T = IExpression> {
    expression: T;
    value: unknown;
    oldValue: unknown;
}

export class ExpressionChangeTracker implements IDisposable {
    private readonly _changes: IExpressionChangeHistory[] = [];
    private readonly _changed = new Subject<IExpressionChangeHistory[]>;
    private _isDisposed = false;
    private _skip = 0;

    constructor(private readonly _expression: IExpression) {
        if (this._expression.changeHook) {
            throw new Error(`Expression ${this._expression.expressionString} is already tracked`)
        }

        this._expression.changeHook = this.onChanged
    }

    public get changed(): Observable<IExpressionChangeHistory[]> {
        return this._changed;
    }

    public skip(skip: number): void {
        this._skip = skip;
    }



    public dispose(): void {
        if (this._isDisposed) {
            return;
        }
        this._changes.length = 0;
        this._expression.changeHook = undefined;
        this._isDisposed = true;
    }

    private onChanged = (expression: IExpression, oldValue: unknown): void => {
        this._changes.push({
            expression,
            value: expression.value,
            oldValue,
        });

        if (expression !== this._expression) {
            return;
        }

        if (this._skip > 0) {
            this._skip--;
            this._changes.length = 0;
            return;
        }

        this._changed.next([...this._changes]);
        this._changes.length = 0;
    };
}