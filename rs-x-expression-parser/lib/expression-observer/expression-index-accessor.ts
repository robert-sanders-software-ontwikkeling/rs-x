import {
    Injectable,
    Type,
    UnsupportedException
} from '@rs-x/core';
import { AbstractExpression, type IExpression } from '../expressions';
import type { IExpressionIndexAccessor } from './expression-index-accessor.type';


@Injectable()
export class ExpressionIndexAccessor implements IExpressionIndexAccessor {
    public readonly priority: 300;

    public isAsync(): boolean {
       return true;
    }

    public getResolvedValue(context: unknown, index: string): unknown {
        return Type.cast<IExpression>(context[index])?.value;
    }
    
    public hasValue(context: unknown, index: string): boolean {
        return Type.cast<IExpression>(context[index])?.value !== undefined;
    }

    public getValue(context: unknown, index: string): unknown {
        return context[index];
    }

    public setValue(): void {
        throw new UnsupportedException('Cannot set the value of an expression directly. To update it, modify the relevant properties in the expression context.');
    }

    public getIndexes(): IterableIterator<string> {
        return [].values();
    }

    public applies(context: unknown, index: string): boolean {
        return context[index] instanceof AbstractExpression;
    }
}