import { ObservableMock } from '@rs-x/core/testing';
import { ChangeHook, ExpressionType, IExpression } from '../expressions';


export class ExpressionMock implements IExpression {
    constructor(properties?: Partial<IExpression>) {
        Object.assign(this, properties);

    }

    public readonly id!: string;
    public readonly changed = new ObservableMock<IExpression<unknown, unknown>>();
    public readonly type!: ExpressionType;
    public readonly expressionString!: string;
    public readonly parent: IExpression<unknown, unknown> | undefined;
    public readonly childExpressions!: readonly IExpression<unknown, unknown>[];
    public readonly value: unknown;
    public readonly isRoot!: boolean;
    public readonly isAsync: boolean | undefined;
    public readonly isDisposed!: boolean;
    public readonly hidden!: boolean;
    public readonly changeHook?: ChangeHook | undefined;
    
    public readonly toString = jest.fn();
    public readonly clone = jest.fn();
    public readonly bind = jest.fn();
    public readonly dispose = jest.fn();

}