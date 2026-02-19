import { IDisposableOwner, Injectable, SingletonFactory } from '@rs-x/core';
import { Observable, ReplaySubject, Subscription } from 'rxjs';
import { IExpression } from '../expressions/expression-parser.interface';
import { IExpressionChangeHistory } from './expression-change-history.interface';
import { IExpressionChangeTracker, IExpressionChangeTrackerManager } from './expression-change-tracker-manager.interface';

export class ExpressionChangeTracker implements IExpressionChangeTracker {
    private readonly _changedSubscription: Subscription;
    private readonly _changed = new ReplaySubject<IExpressionChangeHistory[]>(1);
    private _isDisposed = false;
    private _paused = false;
    private readonly _changes: IExpressionChangeHistory[] = [];
    private readonly _seen = new Set<IExpression>(); // dedupe nodes
    private _flushScheduled = false;

    constructor(
        private readonly _owner: IDisposableOwner,
        private readonly _expression: IExpression
    ) {
        if (this._expression.changeHook) {
            throw new Error(`Expression ${this._expression.expressionString} is already tracked`);
        }

        this._expression.changeHook = this.onChanged;

        this._changedSubscription = this._expression.changed.subscribe(() => {
            if (this._paused) {
                return;
            }
            this.scheduleFlush();
        });
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
            this._expression.changeHook = undefined;
            this._changedSubscription.unsubscribe();

            this.clearCycleState();
            this._flushScheduled = false;

            this._isDisposed = true;
        }

        this._owner.release();
    }

    private onChanged = (expression: IExpression, oldValue: unknown): void => {
        if (this._paused) {
            return;
        }

        // first time we see this node this cycle => push entry
        if (!this._seen.has(expression)) {
            this._seen.add(expression);
            this._changes.push({
                expression,
                value: expression.value,
                oldValue,
            });
            return;
        }

        // already seen => update the LAST value for that node
        // (linear scan is fine: small lists, and only when duplicates occur)
        for (let i = this._changes.length - 1; i >= 0; i--) {
            const item = this._changes[i]!;
            if (item.expression === expression) {
                item.value = expression.value;
                break;
            }
        }
    };

    private scheduleFlush(): void {
        if (this._flushScheduled) {
            return;
        }
        this._flushScheduled = true;

        queueMicrotask(() => {
            this._flushScheduled = false;

            if (this._paused) {
                return;
            }

            if (this._changes.length === 0) {
                return;
            }

            this._changed.next([...this._changes]);
            this.clearCycleState();
        });
    }

    private clearCycleState(): void {
        this._changes.length = 0;
        this._seen.clear();
    }
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

