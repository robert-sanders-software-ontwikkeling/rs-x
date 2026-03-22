import {
    IDisposable,
    Inject,
    Injectable,
    KeyedInstanceFactory,
} from '@rs-x/core';
import {
    IIndexWatchRule,
    IStateChange,
    IStateManager,
    RsXStateManagerInjectionTokens,
} from '@rs-x/state-manager';
import { Subscription } from 'rxjs';
import type { IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';
import { RsXExpressionParserInjectionTokens } from '../rs-x-expression-parser-injection-tokes';

export enum ValueChange {
    NotApplicable,
    Initialized,
    Changed,
    Unchanged,
    Unintialized
}

export interface IExpressionEvaluateUnit extends IDisposable {
    readonly index: unknown;
    context: unknown;
    setValue(value: unknown, context: unknown, index: unknown): ValueChange;
    commit(): void;
    readonly value: unknown
}

export interface IFunctionExpressionEvaluateUnitOptions {
    readonly index: unknown;
    readonly context: unknown;
    readonly objectExpressionUnit?: IExpressionEvaluateUnit;
    readonly functionExpressionUnit?: IExpressionEvaluateUnit;
    readonly argumentsExpressionUnit?: IExpressionEvaluateUnit;
    readonly commit: (value: unknown) => void;
}

export interface IExpressionEvaluateUnitFactory {
    createIdentifier(
        index: unknown,
        context: unknown,
        commit: (value: unknown) => void,
        indexWatchRule?: IIndexWatchRule,
    ): IExpressionEvaluateUnit;
    createMember(
        index: unknown,
        segments: IExpressionEvaluateUnit[],
    ): IExpressionEvaluateUnit;
    createFunction(options: IFunctionExpressionEvaluateUnitOptions): IExpressionEvaluateUnit;
}


export class IdentifierExpressionEvaluateUnit implements IExpressionEvaluateUnit {
    private _value: unknown;
    private _context: unknown;

    constructor(
        public readonly index: unknown,
        context: unknown,
        private readonly _stateManager: IStateManager,
        private _commit: (value: unknown) => void,
        private readonly _indexWatchRule?: IIndexWatchRule,) {

        this.context = context;

    }

    public get context(): unknown {
        return this._context;
    }

    public get value(): unknown {
        return this._value;
    }

    public set context(value: unknown) {
        if (this._context === value) {
            return;
        }

        if (this._context) {
            this.releasState();
        }

        this._context = value;

        if (this._context) {
            this._stateManager.watchState(this.context, this.index, { indexWatchRule: this._indexWatchRule });
        }

    }

    public dispose(): void {
        this.releasState();
    }


    public setValue(value: unknown, context: unknown, index: unknown): ValueChange {
        if (context !== this.context || this.index !== index) {
            return ValueChange.NotApplicable;
        }

        if (value === this._value) {
            return ValueChange.Unchanged;
        }

        const status = this._value === undefined ? ValueChange.Initialized : value === undefined ? ValueChange.Unintialized : ValueChange.Changed;

        this.context = context;
        this._value = value;

        return status

    }
    public commit(): void {
        if (this._value === undefined) {
            return
        }
        this._commit(this._value);
    }

    private releasState(): void {
        this._stateManager.releaseState(this.context, this.index, this._indexWatchRule);
    }
}


export class MemberExpressionEvaluateUnit implements IExpressionEvaluateUnit {
    constructor(
        public index: unknown,
        private readonly _segments: IExpressionEvaluateUnit[]) {
    }

    public dispose(): void {
        this._segments.forEach(segement => segement.dispose());
    }

    public get value(): unknown {
        return this._segments[this._segments.length - 1].value;
    }

    public get context(): unknown {
        return this._segments[0]?.context;
    }

    public setValue(value: unknown, context: unknown, index: unknown): ValueChange {
        const segmentIndex = this._segments.findIndex(segement => segement.context === context && segement.index === index);
        if (segmentIndex === -1) {
            return ValueChange.NotApplicable
        }

        this._segments[segmentIndex].setValue(value, context, index);

        const prevValue = this.value

        const nextSegmentIndex = segmentIndex + 1;
        if (nextSegmentIndex < this._segments.length) {
            this._segments[nextSegmentIndex].context = value;
        }

        const currentValue = this.value;

        return prevValue == currentValue ? ValueChange.Unchanged : prevValue === undefined ? ValueChange.Initialized : currentValue === undefined ? ValueChange.Unintialized : ValueChange.Changed;

    }

    public commit(): void {
        if (this.value !== undefined) {
            this._segments.forEach(segment => segment.commit())
        }

    }
}

export class FunctionExpressionEvaluateUnit implements IExpressionEvaluateUnit {
    private _context: unknown;

    constructor(
        public readonly index: unknown,
        context: unknown,
        private readonly _objectExpressionUnit: IExpressionEvaluateUnit | undefined,
        private readonly _functionExpressionUnit: IExpressionEvaluateUnit | undefined,
        private readonly _argumentsExpressionUnit: IExpressionEvaluateUnit | undefined,
        private readonly _commit: (value: unknown) => void,
    ) {
        this._context = context;
    }

    public get context(): unknown {
        return this._context;
    }

    public set context(value: unknown) {
        this._context = value;
    }

    public get value(): unknown {
        return undefined;
    }

    public dispose(): void {
        this._objectExpressionUnit?.dispose();
        this._functionExpressionUnit?.dispose();
        this._argumentsExpressionUnit?.dispose();
    }

    public setValue(value: unknown, context: unknown, index: unknown): ValueChange {
        const statuses: ValueChange[] = [];

        if (this._objectExpressionUnit) {
            statuses.push(this._objectExpressionUnit.setValue(value, context, index));
        }

        if (this._functionExpressionUnit) {
            statuses.push(this._functionExpressionUnit.setValue(value, context, index));
        }

        if (this._argumentsExpressionUnit) {
            statuses.push(this._argumentsExpressionUnit.setValue(value, context, index));
        }

        if (statuses.length === 0 || statuses.every((status) => status === ValueChange.NotApplicable)) {
            return ValueChange.NotApplicable;
        }

        if (statuses.some((status) => status === ValueChange.Changed)) {
            return ValueChange.Changed;
        }

        if (statuses.some((status) => status === ValueChange.Initialized)) {
            return ValueChange.Initialized;
        }

        if (statuses.some((status) => status === ValueChange.Unintialized)) {
            return ValueChange.Unintialized;
        }

        return ValueChange.Unchanged;
    }

    public commit(): void {
        this._commit(undefined);
    }
}

@Injectable()
export class ExpressionEvaluateUnitFactory implements IExpressionEvaluateUnitFactory {
    constructor(
        @Inject(RsXStateManagerInjectionTokens.IStateManager)
        private readonly _stateManager: IStateManager,
    ) {
    }

    public createIdentifier(
        index: unknown,
        context: unknown,
        commit: (value: unknown) => void,
        indexWatchRule?: IIndexWatchRule,
    ): IExpressionEvaluateUnit {
        return new IdentifierExpressionEvaluateUnit(
            index,
            context,
            this._stateManager,
            commit,
            indexWatchRule,
        );
    }

    public createMember(
        index: unknown,
        segments: IExpressionEvaluateUnit[],
    ): IExpressionEvaluateUnit {
        return new MemberExpressionEvaluateUnit(index, segments);
    }

    public createFunction(options: IFunctionExpressionEvaluateUnitOptions): IExpressionEvaluateUnit {
        return new FunctionExpressionEvaluateUnit(
            options.index,
            options.context,
            options.objectExpressionUnit,
            options.functionExpressionUnit,
            options.argumentsExpressionUnit,
            options.commit,
        );
    }
}


class EvaluateManagerForExpression implements IDisposable {
    private readonly _evaluateUnits: IExpressionEvaluateUnit[] = [];
    private readonly _onChangedSubscription: Subscription;
    private _unresolvedCount = 0;
    private _initialized = false;
    private _bootstrapScheduled = false;
    private _reevaluateScheduled = false;

    constructor(
        private readonly _stateManager: IStateManager,
        private readonly _expressionChangeTransactionManager: IExpressionChangeTransactionManager,
        private readonly evaluate: () => void,

    ) {
        this._onChangedSubscription = this._stateManager.changed.subscribe(this.onChange);

    }

    public dispose(): void {
        this._onChangedSubscription.unsubscribe();

        this._evaluateUnits.forEach(evaluateUnit => evaluateUnit.dispose());
        this._unresolvedCount = 0;
        this._initialized = false;
        this._bootstrapScheduled = false;
        this._reevaluateScheduled = false;;
    }


    public register(evaluateUnit: IExpressionEvaluateUnit): void {
        this._evaluateUnits.push(evaluateUnit);
    }


    private readonly onChange = (change: IStateChange) => {
        const changed: IExpressionEvaluateUnit[] = []
        for (let i = 0; i < this._evaluateUnits.length; i++) {

            const status = this._evaluateUnits[i].setValue(change.newValue, change.context, change.index);

            if (status === ValueChange.Changed || status === ValueChange.Initialized) {
                changed.push(this._evaluateUnits[i])
            }
        }

        if (!this._initialized && changed.length === this._evaluateUnits.length) {
            if (this._unresolvedCount === 0) {
                this.scheduleEvaluate();
            }
            return;
        }

        if (this._initialized && changed.length > 0) {
            this.scheduleReevaluate(changed);
        }
    }

    private scheduleReevaluate(changed: IExpressionEvaluateUnit[]) {
        if (this._reevaluateScheduled) {
            return;
        }

        this._reevaluateScheduled = true;

        queueMicrotask(() => {
            this._reevaluateScheduled = false;

            this._expressionChangeTransactionManager.suspend();

            for (let i = 0; i < changed.length; i++) {
                changed[i].commit();
            }

            this._expressionChangeTransactionManager.continue();
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
}

@Injectable()
export class ExpressionEvaluateManager extends KeyedInstanceFactory<() => void, () => void, EvaluateManagerForExpression> {

    constructor(
        @Inject(RsXStateManagerInjectionTokens.IStateManager)
        private readonly _stateManager: IStateManager,
        @Inject(RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager)
        private readonly _expressionChangeTransactionManager: IExpressionChangeTransactionManager) {

        super();
    }

    public override getId(evaluate: () => void): () => void {
        return evaluate;
    }

    protected override createInstance(evaluate: () => void, id: () => void): EvaluateManagerForExpression {
        return new EvaluateManagerForExpression(
            this._stateManager,
            this._expressionChangeTransactionManager,
            evaluate);

    }
    protected override createId(evaluate: () => void): () => void {
        return evaluate;
    }


    protected override releaseInstance(instance: EvaluateManagerForExpression, _id: () => void): void {
        instance.dispose();
    }

}
