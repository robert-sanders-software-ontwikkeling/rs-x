import { Inject, Injectable } from '@rs-x/core';

import { RsXExpressionParserInjectionTokens } from '../rs-x-expression-parser-injection-tokes';

import type {
  ICompiledExpressionEngine,
  IExpressionEngineSelector,
  ITreeExpressionEngine,
  RsxExpressionEngineMode,
} from './expression-engine.interface';

@Injectable()
export class ExpressionEngineSelector implements IExpressionEngineSelector {
  constructor(
    @Inject(RsXExpressionParserInjectionTokens.ITreeExpressionEngine)
    private readonly _treeEngine: ITreeExpressionEngine,
    @Inject(RsXExpressionParserInjectionTokens.ICompiledExpressionEngine)
    private readonly _compiledEngine: ICompiledExpressionEngine,
  ) {}

  public create(expressionString: string) {
    if (this.getMode() === 'compiled') {
      const compiledExpression =
        this._compiledEngine.tryCreate(expressionString);
      if (!compiledExpression) {
        throw new Error(
          `Compiled expression engine could not compile: ${expressionString}`,
        );
      }
      return compiledExpression;
    }
    return this._treeEngine.create(expressionString);
  }

  public getMode(): RsxExpressionEngineMode {
    const processEnv = this.getProcessEnv();
    const explicitMode = processEnv?.RSX_EXPRESSION_ENGINE_MODE;
    if (explicitMode === 'compiled') {
      return 'compiled';
    }
    if (explicitMode === 'tree') {
      return 'tree';
    }

    // Backward compatibility with the temporary benchmark toggle.
    if (processEnv?.RSX_ENABLE_COMPILED_EXPRESSIONS === 'true') {
      return 'compiled';
    }

    return 'tree';
  }

  private getProcessEnv(): Record<string, string | undefined> | undefined {
    if (typeof process === 'undefined' || !process || !process.env) {
      return undefined;
    }

    return process.env as Record<string, string | undefined>;
  }
}
