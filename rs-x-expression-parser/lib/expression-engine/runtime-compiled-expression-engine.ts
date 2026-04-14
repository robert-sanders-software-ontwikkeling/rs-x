import { Injectable } from '@rs-x/core';

import { CompiledExpression } from '../compiled-expression/compiled-expression';
import { getPrecompiledCompiledExpressionPlan } from '../compiled-expression/precompiled-expression-plan-registry';
import { startRuntimeCompiledExpressionLoad } from '../runtime-expression-load-registry';

import type { ICompiledExpressionEngine } from './expression-engine.interface';

@Injectable()
export class RuntimeCompiledExpressionEngine implements ICompiledExpressionEngine {
  public tryCreate(expressionString: string) {
    const precompiledPlan =
      getPrecompiledCompiledExpressionPlan(expressionString);
    if (precompiledPlan) {
      return new CompiledExpression(precompiledPlan);
    }

    return new CompiledExpression(undefined, {
      expressionString,
      startLazyLoad: () =>
        startRuntimeCompiledExpressionLoad(expressionString)?.then(() => {}),
    });
  }
}
