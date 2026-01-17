import {
    IndexAccessor,
    Type,
    UnsupportedException
} from '@rs-x/core';
import { AbstractExpression, IExpression } from '../expressions';
import { IExpressionIndexAccessor } from './expression-index-accessor.type';

@IndexAccessor()
export class ExpressionIndexAccessor implements IExpressionIndexAccessor {
    public readonly priority: 300;

    public isAsync(): boolean {
       return true;
    }

    public getResolvedValue(context: unknown, index: string): unknown {
        return this.getValue(context, index);
    }
    
    public hasValue(context: unknown, index: string): boolean {
        return Type.cast<IExpression>(context[index])?.value !== undefined;
    }

    public getValue(context: unknown, index: string): unknown {
        return Type.cast<IExpression>(context[index])?.value;
    }

    public setValue(): void {
        throw new UnsupportedException('Cannot set the value of an expression directly. To update it, modify the relevant properties in the expression context.');
    }

    public getIndexes(): IterableIterator<string> {
        return [].values();
    }

    public applies(_: unknown, index: unknown): boolean {
        return index instanceof AbstractExpression;
    }

}