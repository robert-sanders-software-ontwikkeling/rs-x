import { InjectionContainer } from '@rs-x/core';

import type { ICompiledExpressionPlan } from './compiled-expression/compiled-expression.compiler.interface';
import { registerCompiledExpressionPlanInExpressionCache } from './compiled-expression/compiled-expression-cache-preload';
import type { AbstractExpression } from './expressions/abstract-expression';
import type { IExpressionCache } from './expression-cache';
import { RsXExpressionParserInjectionTokens } from './rs-x-expression-parser-injection-tokes';

type RuntimeExpressionTools = typeof import('./runtime-expression-tools');

let runtimeToolsPromise: Promise<RuntimeExpressionTools> | undefined;

const inFlightTreeLoads = new Map<
  string,
  Promise<AbstractExpression | undefined>
>();
const resolvedTreeTemplates = new Map<string, AbstractExpression>();

const inFlightCompiledLoads = new Map<
  string,
  Promise<ICompiledExpressionPlan | undefined>
>();

function loadRuntimeExpressionTools(): Promise<RuntimeExpressionTools> {
  if (!runtimeToolsPromise) {
    runtimeToolsPromise = import('./runtime-expression-tools');
  }

  return runtimeToolsPromise;
}

export function startRuntimeTreeExpressionLoad(
  expressionString: string,
): Promise<AbstractExpression | undefined> {
  const resolved = resolvedTreeTemplates.get(expressionString);
  if (resolved) {
    return Promise.resolve(resolved);
  }

  const inFlight = inFlightTreeLoads.get(expressionString);
  if (inFlight) {
    return inFlight;
  }

  const promise = loadRuntimeExpressionTools()
    .then((tools) => tools.parseExpressionStringToTree(expressionString))
    .then((expressionTree) => {
      if (!expressionTree) {
        return undefined;
      }

      resolvedTreeTemplates.set(expressionString, expressionTree);
      if (
        InjectionContainer.isBound(
          RsXExpressionParserInjectionTokens.IExpressionCache,
        )
      ) {
        const expressionCache = InjectionContainer.get<IExpressionCache>(
          RsXExpressionParserInjectionTokens.IExpressionCache,
        );
        expressionCache.registerExpressionTree(
          expressionString,
          expressionTree,
        );
      }

      return expressionTree;
    })
    .finally(() => {
      inFlightTreeLoads.delete(expressionString);
    });

  inFlightTreeLoads.set(expressionString, promise);
  return promise;
}

export function startRuntimeCompiledExpressionLoad(
  expressionString: string,
): Promise<ICompiledExpressionPlan | undefined> {
  const inFlight = inFlightCompiledLoads.get(expressionString);
  if (inFlight) {
    return inFlight;
  }

  const promise = loadRuntimeExpressionTools()
    .then((tools) => tools.tryCompileExpressionString(expressionString))
    .then((plan) => {
      if (plan) {
        registerCompiledExpressionPlanInExpressionCache(expressionString, plan);
      }

      return plan;
    })
    .finally(() => {
      inFlightCompiledLoads.delete(expressionString);
    });

  inFlightCompiledLoads.set(expressionString, promise);
  return promise;
}

export function clearRuntimeExpressionLoadRegistry(): void {
  runtimeToolsPromise = undefined;
  inFlightTreeLoads.clear();
  resolvedTreeTemplates.clear();
  inFlightCompiledLoads.clear();
}
