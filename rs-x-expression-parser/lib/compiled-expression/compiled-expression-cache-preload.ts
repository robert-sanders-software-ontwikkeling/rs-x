import { InjectionContainer } from '@rs-x/core';

import type { IExpressionCache } from '../expression-cache';
import { RsXExpressionParserInjectionTokens } from '../rs-x-expression-parser-injection-tokes';

import { CompiledExpression } from './compiled-expression';
import type { ICompiledExpressionPlan } from './compiled-expression.compiler.interface';

const pendingCompiledExpressionPlans = new Map<
  string,
  ICompiledExpressionPlan
>();

export function registerCompiledExpressionPlansInExpressionCache(
  plans: Readonly<Record<string, ICompiledExpressionPlan>>,
): void {
  for (const [expressionString, plan] of Object.entries(plans)) {
    registerCompiledExpressionPlanInExpressionCache(expressionString, plan);
  }
}

export function registerCompiledExpressionPlanInExpressionCache(
  expressionString: string,
  plan: ICompiledExpressionPlan,
): void {
  if (
    !InjectionContainer.isBound(
      RsXExpressionParserInjectionTokens.IExpressionCache,
    )
  ) {
    pendingCompiledExpressionPlans.set(expressionString, plan);
    return;
  }

  const expressionCache = InjectionContainer.get<IExpressionCache>(
    RsXExpressionParserInjectionTokens.IExpressionCache,
  );
  expressionCache.registerExpressionTree(
    expressionString,
    new CompiledExpression(plan),
  );
}

export function hydrateExpressionCacheWithCompiledExpressionPlans(
  expressionCache: IExpressionCache,
): void {
  if (pendingCompiledExpressionPlans.size === 0) {
    return;
  }

  for (const [expressionString, plan] of pendingCompiledExpressionPlans) {
    expressionCache.registerExpressionTree(
      expressionString,
      new CompiledExpression(plan),
    );
  }
  pendingCompiledExpressionPlans.clear();
}
