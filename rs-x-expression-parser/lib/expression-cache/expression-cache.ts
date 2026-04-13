import { Inject, Injectable, KeyedInstanceFactory } from '@rs-x/core';

import { CompiledExpression } from '../compiled-expression';
import { hydrateExpressionCacheWithCompiledExpressionPlans } from '../compiled-expression/compiled-expression-cache-preload';
import type { IExpressionEngineSelector } from '../expression-engine/expression-engine.interface';
import type { IExpression } from '../expressions/expression-parser.interface';
import { RsXExpressionParserInjectionTokens } from '../rs-x-expression-parser-injection-tokes';

import type {
  IExpressionCache,
  IExpressionCacheData,
} from './expression-cache.type';
import {
  getLazyExpressionGroup,
  hasLazyExpressionPreloader,
  hasLazyGroupPreloader,
  registerLazyExpressionInGroup,
  startLazyExpressionPreload,
  startLazyGroupPreload,
  triggerLazyExpressionPreload,
} from './lazy-expression-preload-registry';
import { hydrateExpressionCacheWithPreparsedAsts } from './preparsed-expression-ast-registry';

@Injectable()
export class ExpressionCache
  extends KeyedInstanceFactory<string, IExpressionCacheData, IExpression>
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

  public override getId(data: IExpressionCacheData): string | undefined {
    return data.expressionString;
  }

  protected override createId(data: IExpressionCacheData): string {
    return data.expressionString;
  }

  override create(data: IExpressionCacheData): {
    referenceCount: number;
    instance: IExpression<unknown>;
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
      this._precompiledExpressions.get(data.expressionString) ===
        result.instance;
    const shouldClone = isPrecompiledExpression || result.referenceCount > 1;

    if (shouldClone) {
      result.instance = result.instance.clone();
    }

    return result;
  }

  protected override createInstance(
    data: IExpressionCacheData,
  ): IExpression<unknown> {
    const isLazy = data.lazy || data.lazyGroup !== undefined;

    if (!isLazy) {
      triggerLazyExpressionPreload(data.expressionString);
    }

    // Register the expression → group mapping so the group loader fires when
    // this expression is triggered (whether from here or elsewhere).
    if (data.lazyGroup) {
      registerLazyExpressionInGroup(data.expressionString, data.lazyGroup);
    }

    // Precompiled AOT expressions are only served when compiled mode is active
    // (either globally or explicitly via the compiled option).
    if (data.compiled !== false) {
      const precompiledExpression = this._precompiledExpressions.get(
        data.expressionString,
      );
      if (precompiledExpression) {
        return precompiledExpression;
      }

      if (isLazy) {
        const groupName =
          data.lazyGroup ?? getLazyExpressionGroup(data.expressionString);
        const hasPreloader = groupName
          ? hasLazyGroupPreloader(groupName)
          : hasLazyExpressionPreloader(data.expressionString);

        if (hasPreloader) {
          return new CompiledExpression(undefined, {
            expressionString: data.expressionString,
            startLazyLoad: () =>
              groupName
                ? startLazyGroupPreload(groupName)
                : startLazyExpressionPreload(data.expressionString),
          });
        }
      }
    }

    return this._expressionEngineSelector.create(data.expressionString);
  }
}
