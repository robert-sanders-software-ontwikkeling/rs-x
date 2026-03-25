import { Injectable, Type, UnsupportedException } from '@rs-x/core';

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
    return Type.cast<IExpression>(target[index])?.value;
  }

  public hasValue(context: unknown, index: string): boolean {
    const target = Type.toObject(context);
    if (!target) {
      return false;
    }
    return Type.cast<IExpression>(target[index])?.value !== undefined;
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

    return target[index] instanceof AbstractExpression;
  }
}
