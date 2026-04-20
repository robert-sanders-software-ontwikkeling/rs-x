import type { Expression } from 'estree';

import { InjectionContainer } from '@rs-x/core';

import { type ExpressionTreeBuilder } from '../expression-tree-builder';
import type { IExpression } from '../expressions/expression-parser.interface';
import { RsXExpressionParserInjectionTokens } from '../rs-x-expression-parser-injection-tokes';

import type { IExpressionCache } from './expression-cache.type';

const preparsedExpressionAsts = new Map<string, Expression>();

export function registerPreparsedExpressionAst(
  expressionString: string,
  expressionAst: Expression,
): void {
  preparsedExpressionAsts.set(expressionString, expressionAst);
  registerAstInExpressionCache(expressionString, expressionAst);
}

export function registerPreparsedExpressionAsts(
  expressionAsts: Readonly<Record<string, Expression>>,
): void {
  for (const [expressionString, expressionAst] of Object.entries(
    expressionAsts,
  )) {
    preparsedExpressionAsts.set(expressionString, expressionAst);
    registerAstInExpressionCache(expressionString, expressionAst);
  }
}

export function getPreparsedExpressionAst(
  expressionString: string,
): Expression | undefined {
  return preparsedExpressionAsts.get(expressionString);
}

export function clearPreparsedExpressionAsts(): void {
  preparsedExpressionAsts.clear();
}

export function hydrateExpressionCacheWithPreparsedAsts(
  expressionCache: IExpressionCache,
): void {
  if (preparsedExpressionAsts.size === 0) {
    return;
  }

  for (const [expressionString, expressionAst] of preparsedExpressionAsts) {
    expressionCache.registerExpressionTree(
      expressionString,
      createExpressionTreeFromAst(expressionString, expressionAst),
    );
  }
}

function registerAstInExpressionCache(
  expressionString: string,
  expressionAst: Expression,
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
    createExpressionTreeFromAst(expressionString, expressionAst),
  );
}

function createExpressionTreeFromAst(
  expressionString: string,
  expressionAst: Expression,
): IExpression {
  const expressionParser = InjectionContainer.get<ExpressionTreeBuilder>(
    RsXExpressionParserInjectionTokens.IExpressionTreeBuilder,
  );

  return expressionParser.parseAst(expressionAst, expressionString);
}
