import { Inject, Injectable } from '@rs-x/core';

import { CompiledExpression } from '../compiled-expression/compiled-expression';
import type { ICompiledExpressionCompiler } from '../compiled-expression/compiled-expression.compiler.interface';
import { getPrecompiledCompiledExpressionPlan } from '../compiled-expression/precompiled-expression-plan-registry';
import { RsXExpressionParserInjectionTokens } from '../rs-x-expression-parser-injection-tokes';

import type { ICompiledExpressionEngine } from './expression-engine.interface';

@Injectable()
export class CompiledExpressionEngine implements ICompiledExpressionEngine {
  constructor(
    @Inject(RsXExpressionParserInjectionTokens.ICompiledExpressionCompiler)
    private readonly _compiledExpressionCompiler: ICompiledExpressionCompiler,
  ) {}

  public tryCreate(expressionString: string) {
    const precompiledPlan =
      getPrecompiledCompiledExpressionPlan(expressionString);
    if (precompiledPlan) {
      return new CompiledExpression(precompiledPlan);
    }

    const compiledPlan =
      this._compiledExpressionCompiler.tryCompile(expressionString);
    if (!compiledPlan) {
      return undefined;
    }
    return new CompiledExpression(compiledPlan);
  }
}
