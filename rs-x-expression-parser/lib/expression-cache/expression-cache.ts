import { Inject, Injectable, KeyedInstanceFactory } from '@rs-x/core';

import type {
  IExpression,
} from '../expressions/expression-parser.interface';
import { RsXExpressionParserInjectionTokens } from '../rs-x-expression-parser-injection-tokes';
import type { IExpressionEngineSelector } from '../expression-engine/expression-engine.interface';
import { hydrateExpressionCacheWithCompiledExpressionPlans } from '../compiled-expression/compiled-expression-cache-preload';

import type { IExpressionCache } from './expression-cache.type';
import { hydrateExpressionCacheWithPreparsedAsts } from './preparsed-expression-ast-registry';
import { triggerLazyExpressionPreload } from './lazy-expression-preload-registry';

@Injectable()
export class ExpressionCache
  extends KeyedInstanceFactory<string, string, IExpression>
  implements IExpressionCache
{
  private readonly _precompiledExpressions = new Map<string, IExpression>();
  private _hasPrecompiledExpressions = false;

  constructor(
    @Inject(RsXExpressionParserInjectionTokens.IExpressionEngineSelector)
    private readonly _expressionEngineSelector: IExpressionEngineSelector,
  ) {
    super();
    hydrateExpressionCacheWithPreparsedAsts(this);
    hydrateExpressionCacheWithCompiledExpressionPlans(this);
  }

  public registerExpressionTree(
    expressionString: string,
    expressionTree: IExpression,
  ): void {
    this._precompiledExpressions.set(expressionString, expressionTree);
    this._hasPrecompiledExpressions = true;
  }

  public override getId(expressionString: string): string | undefined {
    return expressionString;
  }

  protected override createId(expressionString: string): string {
    return expressionString;
  }

  override create(data: string): {
    referenceCount: number;
    instance: IExpression<unknown, unknown>;
    id: string;
  } {
    const result = super.create(data);

    // Hot path for runtime-only parsed expressions: first consumer can reuse
    // the cached template without any extra lookups/cloning.
    if (!this._hasPrecompiledExpressions && result.referenceCount === 1) {
      return result;
    }

    // Keep precompiled trees immutable by always returning a clone.
    // For parser-produced trees, the first consumer can reuse the template
    // directly; additional concurrent consumers still get clones.
    const isPrecompiledExpression =
      this._hasPrecompiledExpressions &&
      this._precompiledExpressions.get(data) === result.instance;
    const shouldClone = isPrecompiledExpression || result.referenceCount > 1;

    if (shouldClone) {
      result.instance = result.instance.clone();
    }

    return result;
  }

  protected override createInstance(
    expressionString: string,
  ): IExpression<unknown, unknown> {
    triggerLazyExpressionPreload(expressionString);

    const precompiledExpression =
      this._precompiledExpressions.get(expressionString);
    if (precompiledExpression) {
      return precompiledExpression;
    }

    return this._expressionEngineSelector.create(expressionString);
  }
}
