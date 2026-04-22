import ts from 'typescript';

import type { IRsxToken } from '@rs-x/compiler';

export const RSX_SEMANTIC_TOKEN_TYPE = {
  parameter: 6,
  variable: 7,
  property: 9,
  function: 10,
} as const;

interface IRsxParameterBinding {
  readonly name: string;
  readonly start: number;
  readonly end: number;
}

interface IRsxParameterScope {
  readonly start: number;
  readonly end: number;
  readonly parameters: readonly IRsxParameterBinding[];
}

export interface IRsxSemanticClassificationContext {
  readonly parameterScopes: readonly IRsxParameterScope[];
}

export function createRsxSemanticClassificationContext(
  expressionText: string,
): IRsxSemanticClassificationContext {
  const sourcePrefix = 'const __rsx_expr__ = ';
  const sourceFile = ts.createSourceFile(
    '__rsx_expr__.ts',
    `${sourcePrefix}${expressionText};`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const parameterScopes: IRsxParameterScope[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      const parameters = node.parameters.flatMap((parameter) => {
        if (!ts.isIdentifier(parameter.name)) {
          return [];
        }

        return [
          {
            name: parameter.name.text,
            start: parameter.name.getStart(sourceFile) - sourcePrefix.length,
            end: parameter.name.getEnd() - sourcePrefix.length,
          },
        ];
      });

      if (parameters.length > 0) {
        parameterScopes.push({
          start: node.getStart(sourceFile) - sourcePrefix.length,
          end: node.getEnd() - sourcePrefix.length,
          parameters,
        });
      }
    }

    ts.forEachChild(node, visit);
  };

  ts.forEachChild(sourceFile, visit);

  return { parameterScopes };
}

export function resolveSemanticTokenTypeForIdentifier(args: {
  context: IRsxSemanticClassificationContext;
  text: string;
  token: IRsxToken;
}): number {
  const { context, text, token } = args;
  const prev = previousNonWhitespaceChar(text, token.start - 1);
  const next = nextNonWhitespaceChar(text, token.end);

  if (prev === '.') {
    return RSX_SEMANTIC_TOKEN_TYPE.property;
  }

  if (isLambdaParameterToken(context, text, token)) {
    return RSX_SEMANTIC_TOKEN_TYPE.parameter;
  }

  if (next === '(') {
    return RSX_SEMANTIC_TOKEN_TYPE.function;
  }

  return RSX_SEMANTIC_TOKEN_TYPE.variable;
}

function isLambdaParameterToken(
  context: IRsxSemanticClassificationContext,
  text: string,
  token: IRsxToken,
): boolean {
  const tokenText = text.slice(token.start, token.end);
  const innermostScope = [...context.parameterScopes]
    .filter((scope) => token.start >= scope.start && token.end <= scope.end)
    .sort(
      (left, right) => left.end - left.start - (right.end - right.start),
    )[0];

  if (!innermostScope) {
    return false;
  }

  return innermostScope.parameters.some((parameter) => {
    if (parameter.start === token.start && parameter.end === token.end) {
      return true;
    }

    return parameter.name === tokenText;
  });
}

function previousNonWhitespaceChar(text: string, from: number): string | null {
  for (let index = from; index >= 0; index -= 1) {
    if (!isWhitespace(text[index])) {
      return text[index];
    }
  }

  return null;
}

function nextNonWhitespaceChar(text: string, from: number): string | null {
  for (let index = from; index < text.length; index += 1) {
    if (!isWhitespace(text[index])) {
      return text[index];
    }
  }

  return null;
}

function isWhitespace(char: string): boolean {
  return /\s/u.test(char);
}
