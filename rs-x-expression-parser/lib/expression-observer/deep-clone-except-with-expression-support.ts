import {
  type IDeepCloneExcept,
  Inject,
  Injectable,
  PENDING,
  RsXCoreInjectionTokens,
} from '@rs-x/core';

import { AbstractExpression } from '../expressions/abstract-expression';
import type { IExpression } from '../expressions/expression-parser.interface';

function isRuntimeExpression(source: unknown): source is IExpression {
  if (!source || typeof source !== 'object') {
    return false;
  }

  const candidate = source as Partial<IExpression>;
  return (
    typeof candidate.expressionString === 'string' &&
    typeof candidate.bind === 'function' &&
    typeof candidate.clone === 'function' &&
    typeof candidate.dispose === 'function'
  );
}

@Injectable()
export class DeepCloneExceptWithExpressionSupport implements IDeepCloneExcept {
  constructor(
    @Inject(RsXCoreInjectionTokens.IDeepCloneExcept)
    private readonly _defaultDeepCloneValueGetter: IDeepCloneExcept,
  ) {}
  public except(source: unknown): unknown {
    if (source instanceof AbstractExpression || isRuntimeExpression(source)) {
      return source.value === undefined ? PENDING : source.value;
    }

    return this._defaultDeepCloneValueGetter.except(source);
  }
}
