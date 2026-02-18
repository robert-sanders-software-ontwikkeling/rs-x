import { IDisposableOwner, Injectable, SingletonFactory } from '@rs-x/core';
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { IExpression } from '../expressions/expression-parser.interface';
import { IExpressionChangeTracker, IExpressionChangeTrackerManager } from './expression-change-tracker-manager.interface';
import { IExpressionChangeHistory } from './expression-change-history.interface';



class ExpressionChangeTracker implements IExpressionChangeTracker {
    private readonly _changes: IExpressionChangeHistory[] = [];
    private readonly _changed = new ReplaySubject<IExpressionChangeHistory[]>(1)
    private _isDisposed = false;
    private _paused = false;

    constructor(
        private readonly _owner: IDisposableOwner,
        private readonly _expression: IExpression) {
        if (this._expression.changeHook) {
            throw new Error(`Expression ${this._expression.expressionString} is already tracked`)
        }

        this._expression.changeHook = this.onChanged
    }

    public get changed(): Observable<IExpressionChangeHistory[]> {
        return this._changed;
    }

    public pause(): void {
        this._paused = true;
    }

    public continue(): void {
        this._paused = false;
    }

    public dispose(): void {
        if (this._isDisposed) {
            return;
        }

        if (this._owner.canDispose?.()) {
            this._changes.length = 0;
            this._expression.changeHook = undefined;
            this._isDisposed = true;
        }
        this._owner.release();
    }

    private onChanged = (expression: IExpression, oldValue: unknown): void => {
        if (this._paused) {
            return;
        }

        this._changes.push({
            expression,
            value: expression.value,
            oldValue,
        });

        if (expression !== this._expression) {
            return;
        }

        this._changed.next([...this._changes]);
        this._changes.length = 0;
    };
}

@Injectable()
export class ExpressionChangeTrackerManager
    extends SingletonFactory<IExpression, IExpression, IExpressionChangeTracker>
    implements IExpressionChangeTrackerManager {


    constructor() {
        super();
    }

    public override getId(expresion: IExpression) {
        return expresion;
    }

    protected override createInstance(expresion: IExpression, id: IExpression): IExpressionChangeTracker {
        return new ExpressionChangeTracker(
            {
                canDispose: () => this.getReferenceCount(id) === 1,
                release: () => this.release(id)
            },
            expresion
        );
    }

    protected override createId(expresion: IExpression) {
        return expresion;
    }
}

