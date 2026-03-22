import { GuidKeyedInstanceFactory, IGuidFactory, KeyedInstanceFactory } from '@rs-x/core';
import { IStateChange, IStateManager } from '@rs-x/state-manager';
import { Subscription } from 'rxjs';


interface IExpressionEvaluateParameterId {
    index: unknown;
    context: unknown;
}

interface IExpressionEvaluateParameter extends IExpressionEvaluateParameterId {
    reevaluate?: () => void;
    resolved?: boolean;
}


class EvaluateManagerForExpression
    extends GuidKeyedInstanceFactory<IExpressionEvaluateParameter, Map<() => void, () => void>, IExpressionEvaluateParameterId>
{

    private readonly _onChangedSubscription: Subscription;
    private readonly _resolvedById = new Map<string, boolean>();
    private readonly _pendingReevaluateIds = new Set<string>();
    private _unresolvedCount = 0;
    private _initialized = false;
    private _bootstrapScheduled = false;
    private _reevaluateScheduled = false;

    constructor(
        private readonly _stateManager: IStateManager,
        guidFactory: IGuidFactory,
        private readonly evaluate: () => void) {

        super(guidFactory);

        this._onChangedSubscription = this._stateManager.changed.subscribe(this.onChange);

    }

    protected override onDispose(): void {
        this._onChangedSubscription.unsubscribe();
        this._resolvedById.clear();
        this._pendingReevaluateIds.clear();
        this._unresolvedCount = 0;
        this._initialized = false;
        this._bootstrapScheduled = false;
        this._reevaluateScheduled = false;
        super.onDispose();
    }


    public override create(data: IExpressionEvaluateParameter): { referenceCount: number; instance: Map<() => void, () => void>; id: string; } {
        const result = super.create(data);
        const reevaluate = data.reevaluate ?? data.reevaluate;
        if (reevaluate) {
            result.instance.set(reevaluate, reevaluate);
        }

        if (result.referenceCount === 1) {
            const resolved = data.resolved ?? this.isResolved(data.context, data.index);
            this._resolvedById.set(result.id, resolved);
            if (!resolved) {
                this._unresolvedCount++;
            }
        }

        if (!this._initialized && this._unresolvedCount === 0) {
            this.scheduleEvaluate();
        }

        return result;
    }


    protected override getGroupId(data: IExpressionEvaluateParameterId): unknown {
        return data.context;
    }

    protected override getGroupMemberId(data: IExpressionEvaluateParameterId): unknown {
        return data.index
    }

    protected override createInstance(data: IExpressionEvaluateParameter, id: unknown): Map<() => void, () => void> {
        return new Map();
    }

    protected override releaseInstance(instance: Map<() => void, () => void>, id: string): void {
        const wasResolved = this._resolvedById.get(id);
        if (wasResolved === false && this._unresolvedCount > 0) {
            this._unresolvedCount--;
        }

        this._resolvedById.delete(id);
        this._pendingReevaluateIds.delete(id);
        instance.clear();
        super.releaseInstance(instance, id);
    }

    private readonly onChange = (change: IStateChange) => {
        let id = this.getId({ context: change.oldContext, index: change.index });
        if (!id && change.context !== change.oldContext) {
            id = this.getId({ context: change.context, index: change.index });
        }

        if (!id) {
            return;
        }

        if (change.context !== change.oldContext) {
            this.replaceGroupId(change.oldContext, change.context);
        }

        const resolved = change.newValue !== undefined;
        const changed = this.updateResolvedState(id, resolved);
        if (!changed) {
            return;
        }

        if (!this._initialized) {
            if (this._unresolvedCount === 0) {
                this.scheduleEvaluate();
            }
            return;
        }

        if (!resolved) {
            this._initialized = false;
            return;
        }

        this.scheduleReevaluate(id);
    }

    private scheduleReevaluate(id: string) {
        this._pendingReevaluateIds.add(id);
        if (this._reevaluateScheduled) return;

        this._reevaluateScheduled = true;

        queueMicrotask(() => {
            this._reevaluateScheduled = false;
            const pendingIds = Array.from(this._pendingReevaluateIds);
            this._pendingReevaluateIds.clear();

            for (const pendingId of pendingIds) {
                const reevaluates = this.getFromId(pendingId);
                if (!reevaluates) {
                    continue;
                }
                for (const reevaluate of reevaluates.values()) {
                    reevaluate();
                }
            }
        });

    }

    private scheduleEvaluate() {
        if (this._bootstrapScheduled || this._initialized) {
            return
        }
        this._bootstrapScheduled = true;

        queueMicrotask(() => {
            this._bootstrapScheduled = false;
            if (this._unresolvedCount !== 0 || this._initialized) {
                return;
            }

            this.evaluate();
            this._initialized = true;
        });
    }

    private updateResolvedState(id: string, resolved: boolean): boolean {
        const previous = this._resolvedById.get(id);
        if (previous === resolved) {
            return false;
        }

        if (previous === undefined) {
            this._resolvedById.set(id, resolved);
            if (!resolved) {
                this._unresolvedCount++;
            }
            return true;
        }

        this._resolvedById.set(id, resolved);

        if (previous && !resolved) {
            this._unresolvedCount++;
        } else if (!previous && resolved && this._unresolvedCount > 0) {
            this._unresolvedCount--;
        }

        return true;
    }

    private isResolved(context: unknown, index: unknown): boolean {
        return this._stateManager.getState(context, index) !== undefined;
    }

}

export class ExpressionEvaluateManager extends KeyedInstanceFactory<() => void, () => void, EvaluateManagerForExpression> {

    constructor(
        private readonly _stateManager: IStateManager,
        private readonly _guidFactory: IGuidFactory) {

        super();
    }

    public override getId(evaluate: () => void): () => void {
        return evaluate;
    }

    protected override createInstance(evaluate: () => void, id: () => void): EvaluateManagerForExpression {
        return new EvaluateManagerForExpression(
            this._stateManager, 
            this._guidFactory, 
            evaluate);

    }
    protected override createId(evaluate: () => void): () => void {
        return evaluate;
    }

}
