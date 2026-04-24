import { Injectable, Type, UnsupportedException } from '@rs-x/core';

import { CompiledExpression } from '../compiled-expression/compiled-expression';
import { AbstractExpression } from '../expressions/abstract-expression';
import type { IExpression } from '../expressions/expression-parser.interface';

import type { IExpressionIndexAccessor } from './expression-index-accessor.type';

@Injectable()
export class ExpressionIndexAccessor implements IExpressionIndexAccessor {
  public readonly priority!: 300;

  public getResolvedValue(context: unknown, index: string): unknown {
    const target = Type.toObject(context);
    if (!target) {
      return undefined;
    }
    const value = target[index];
    return isExpressionReference(value) ? value.value : undefined;
  }

  public hasValue(context: unknown, index: string): boolean {
    const target = Type.toObject(context);
    if (!target) {
      return false;
    }
    const value = target[index];
    return isExpressionReference(value) && value.value !== undefined;
  }

  public getValue(context: unknown, index: string): unknown {
    const target = Type.toObject(context);
    return target ? target[index] : undefined;
  }

  public setValue(): void {
    throw new UnsupportedException(
      'Cannot set the value of an expression directly. To update it, modify the relevant properties in the expression context.',
    );
  }

  public getIndexes(): IterableIterator<string> {
    return [].values();
  }

  public applies(context: unknown, index: string): boolean {
    const target = Type.toObject(context);
    if (!target) {
      return false;
    }

    return isExpressionReference(target[index]);
  }
}

function isExpressionReference(value: unknown): value is IExpression {
  return (
    value instanceof AbstractExpression || value instanceof CompiledExpression
  );
}
