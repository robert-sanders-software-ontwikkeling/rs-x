import { Injectable } from '@rs-x/core';

import { DeferredTreeExpression } from '../expressions/deferred-tree-expression';
import { startRuntimeTreeExpressionLoad } from '../runtime-expression-load-registry';

import type { ITreeExpressionEngine } from './expression-engine.interface';

@Injectable()
export class RuntimeTreeExpressionEngine implements ITreeExpressionEngine {
  public create(expressionString: string) {
    return new DeferredTreeExpression(expressionString, () =>
      startRuntimeTreeExpressionLoad(expressionString),
    );
  }
}
