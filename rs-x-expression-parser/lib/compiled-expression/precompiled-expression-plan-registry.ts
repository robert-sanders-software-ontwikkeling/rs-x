import { InjectionContainer } from '@rs-x/core';

import type { IExpressionCache } from '../expression-cache';
import { RsXExpressionParserInjectionTokens } from '../rs-x-expression-parser-injection-tokes';

import { CompiledExpression } from './compiled-expression';
import type { ICompiledExpressionPlan } from './compiled-expression.compiler.interface';

const precompiledPlans = new Map<string, ICompiledExpressionPlan>();

export function registerPrecompiledCompiledExpressionPlan(
  expressionString: string,
  plan: ICompiledExpressionPlan,
): void {
  precompiledPlans.set(expressionString, plan);
  registerPlanInExpressionCache(expressionString, plan);
}

export function registerPrecompiledCompiledExpressionPlans(
  plans: Readonly<Record<string, ICompiledExpressionPlan>>,
): void {
  for (const [expressionString, plan] of Object.entries(plans)) {
    precompiledPlans.set(expressionString, plan);
    registerPlanInExpressionCache(expressionString, plan);
  }
}

export function getPrecompiledCompiledExpressionPlan(
  expressionString: string,
): ICompiledExpressionPlan | undefined {
  return precompiledPlans.get(expressionString);
}

export function clearPrecompiledCompiledExpressionPlans(): void {
  precompiledPlans.clear();
}

function registerPlanInExpressionCache(
  expressionString: string,
  plan: ICompiledExpressionPlan,
): void {
  if (
    !InjectionContainer.isBound(
      RsXExpressionParserInjectionTokens.IExpressionCache,
    )
  ) {
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
