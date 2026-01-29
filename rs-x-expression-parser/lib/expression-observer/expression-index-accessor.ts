import {
    Injectable,
    Type,
    UnsupportedException
} from '@rs-x/core';

import { AbstractExpression } from '../expressions/abstract-expression';
import type { IExpression } from '../expressions/expression-parser.interface';

import type { IExpressionIndexAccessor } from './expression-index-accessor.type';


@Injectable()
export class ExpressionIndexAccessor implements IExpressionIndexAccessor {
    public readonly priority!: 300;

    public isAsync(): boolean {
       return true;
    }

    public getResolvedValue(context: unknown, index: string): unknown {
        return Type.cast<IExpression>((Type.toObject(context) ?? {})[index])?.value;
    }
    
    public hasValue(context: unknown, index: string): boolean {
        return Type.cast<IExpression>((Type.toObject(context) ?? {})[index])?.value !== undefined;
    }

    public getValue(context: unknown, index: string): unknown {
        return (Type.toObject(context) ?? {})[index];
    }

    public setValue(): void {
        throw new UnsupportedException('Cannot set the value of an expression directly. To update it, modify the relevant properties in the expression context.');
    }

    public getIndexes(): IterableIterator<string> {
        return [].values();
    }

    public applies(context: unknown, index: string): boolean {
        return (Type.toObject(context) ?? {})[index] instanceof AbstractExpression;
    }
}