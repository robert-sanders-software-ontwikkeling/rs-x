import { Injectable, type IValueMetadata } from '@rs-x/core';

import { CompiledExpression } from '../compiled-expression/compiled-expression';
import { AbstractExpression } from '../expressions/abstract-expression';

@Injectable()
export class ExpressionMetadata implements IValueMetadata {
  public readonly priority = 300;

  public isAsync(): boolean {
    return true;
  }

  public needsProxy(): boolean {
    return true;
  }

  public applies(value: unknown): boolean {
    return (
      value instanceof AbstractExpression || value instanceof CompiledExpression
    );
  }
}
