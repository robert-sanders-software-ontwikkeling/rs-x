import ts from 'typescript';

import type { IRsxToken, RsxTokenKind } from './rsx-expression-lexing';

export const rsxSemanticTokenTypes = [
  'class',
  'enum',
  'interface',
  'namespace',
  'typeParameter',
  'type',
  'parameter',
  'variable',
  'enumMember',
  'property',
  'function',
  'method',
  'macro',
  'keyword',
  'modifier',
  'comment',
  'string',
  'number',
  'regexp',
  'operator',
  'decorator',
] as const;

export const rsxSemanticTokenTypeIndexes = {
  parameter: rsxSemanticTokenTypes.indexOf('parameter'),
  variable: rsxSemanticTokenTypes.indexOf('variable'),
  property: rsxSemanticTokenTypes.indexOf('property'),
  function: rsxSemanticTokenTypes.indexOf('function'),
  keyword: rsxSemanticTokenTypes.indexOf('keyword'),
  comment: rsxSemanticTokenTypes.indexOf('comment'),
  string: rsxSemanticTokenTypes.indexOf('string'),
  number: rsxSemanticTokenTypes.indexOf('number'),
  regexp: rsxSemanticTokenTypes.indexOf('regexp'),
  operator: rsxSemanticTokenTypes.indexOf('operator'),
} as const;

export interface IRsxSemanticTokenEmissionPolicy {
  readonly emitOperatorTokens: boolean;
}

export const defaultRsxSemanticTokenEmissionPolicy: IRsxSemanticTokenEmissionPolicy =
  Object.freeze({
    emitOperatorTokens: true,
  });

export interface IRsxParameterBinding {
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

export function resolveRsxSemanticTokenTypeForIdentifier(args: {
  context: IRsxSemanticClassificationContext;
  text: string;
  token: IRsxToken;
}): number {
  const { context, text, token } = args;
  const prev = previousNonWhitespaceChar(text, token.start - 1);
  const next = nextNonWhitespaceChar(text, token.end);

  if (prev === '.') {
    return rsxSemanticTokenTypeIndexes.property;
  }

  if (isLambdaParameterToken(context, text, token)) {
    return rsxSemanticTokenTypeIndexes.parameter;
  }

  if (next === '(') {
    return rsxSemanticTokenTypeIndexes.function;
  }

  // Bare identifiers inside RSX expressions usually reference model fields.
  return rsxSemanticTokenTypeIndexes.property;
}

export function resolveRsxSemanticTokenType(args: {
  context: IRsxSemanticClassificationContext;
  text: string;
  token: IRsxToken;
}): number | null {
  const { context, text, token } = args;
  switch (token.kind) {
    case 'identifier':
      return resolveRsxSemanticTokenTypeForIdentifier({
        context,
        text,
        token,
      });
    case 'keyword':
      return rsxSemanticTokenTypeIndexes.keyword;
    case 'number':
      return rsxSemanticTokenTypeIndexes.number;
    case 'string':
      return rsxSemanticTokenTypeIndexes.string;
    case 'operator':
    case 'punctuation':
      return rsxSemanticTokenTypeIndexes.operator;
    default:
      return null;
  }
}

export function toRsxSyntacticTokenType(token: ts.SyntaxKind): number | null {
  if (
    token >= ts.SyntaxKind.FirstKeyword &&
    token <= ts.SyntaxKind.LastKeyword
  ) {
    return rsxSemanticTokenTypeIndexes.keyword;
  }

  if (
    token === ts.SyntaxKind.SingleLineCommentTrivia ||
    token === ts.SyntaxKind.MultiLineCommentTrivia
  ) {
    return rsxSemanticTokenTypeIndexes.comment;
  }

  if (
    token === ts.SyntaxKind.StringLiteral ||
    token === ts.SyntaxKind.NoSubstitutionTemplateLiteral ||
    token === ts.SyntaxKind.TemplateHead ||
    token === ts.SyntaxKind.TemplateMiddle ||
    token === ts.SyntaxKind.TemplateTail
  ) {
    return rsxSemanticTokenTypeIndexes.string;
  }

  if (
    token === ts.SyntaxKind.NumericLiteral ||
    token === ts.SyntaxKind.BigIntLiteral
  ) {
    return rsxSemanticTokenTypeIndexes.number;
  }

  if (token === ts.SyntaxKind.RegularExpressionLiteral) {
    return rsxSemanticTokenTypeIndexes.regexp;
  }

  const tokenText = ts.tokenToString(token);
  if (typeof tokenText === 'string' && tokenText.length > 0) {
    return rsxSemanticTokenTypeIndexes.operator;
  }

  return null;
}

export function toTsClassificationTypeForRsxTokenKind(args: {
  classificationType: Record<
    | 'identifier'
    | 'keyword'
    | 'numericLiteral'
    | 'stringLiteral'
    | 'operator'
    | 'punctuation',
    number
  >;
  tokenKind: RsxTokenKind;
}): number | null {
  const { classificationType, tokenKind } = args;
  switch (tokenKind) {
    case 'identifier':
      return classificationType.identifier;
    case 'keyword':
      return classificationType.keyword;
    case 'number':
      return classificationType.numericLiteral;
    case 'string':
      return classificationType.stringLiteral;
    case 'operator':
      return classificationType.operator;
    case 'punctuation':
      return classificationType.punctuation;
    default:
      return null;
  }
}

export function isOperatorLikeTokenText(text: string): boolean {
  const summary = scanOperatorLikeSummary(text);
  return summary.hasOperatorLike && !summary.hasNonOperatorLike;
}

export function hasOperatorLikePunctuation(text: string): boolean {
  const summary = scanOperatorLikeSummary(text);
  return summary.hasOperatorLike;
}

export function shouldEmitRsxSemanticToken(args: {
  tokenType: number;
  tokenText: string;
  policy?: IRsxSemanticTokenEmissionPolicy;
}): boolean {
  const { tokenType, tokenText } = args;
  const policy = args.policy ?? defaultRsxSemanticTokenEmissionPolicy;
  const normalizedTokenText = tokenText.trim();
  if (normalizedTokenText.length === 0) {
    return false;
  }

  if (
    tokenType === rsxSemanticTokenTypeIndexes.operator &&
    !policy.emitOperatorTokens
  ) {
    return false;
  }
  if (
    tokenType === rsxSemanticTokenTypeIndexes.operator &&
    !isOperatorLikeTokenText(normalizedTokenText)
  ) {
    return false;
  }

  const isLiteralLikeTokenType =
    tokenType === rsxSemanticTokenTypeIndexes.string ||
    tokenType === rsxSemanticTokenTypeIndexes.number ||
    tokenType === rsxSemanticTokenTypeIndexes.regexp ||
    tokenType === rsxSemanticTokenTypeIndexes.comment;
  if (
    tokenType !== rsxSemanticTokenTypeIndexes.operator &&
    !isLiteralLikeTokenType &&
    hasOperatorLikePunctuation(normalizedTokenText)
  ) {
    return false;
  }

  return true;
}

export function shouldEmitTsClassificationForRsxToken(args: {
  classification: number;
  operatorClassification: number;
  policy?: IRsxSemanticTokenEmissionPolicy;
}): boolean {
  const policy = args.policy ?? defaultRsxSemanticTokenEmissionPolicy;
  if (
    args.classification === args.operatorClassification &&
    !policy.emitOperatorTokens
  ) {
    return false;
  }

  return true;
}

function scanOperatorLikeSummary(text: string): {
  hasOperatorLike: boolean;
  hasNonOperatorLike: boolean;
} {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    text,
    undefined,
  );
  let hasOperatorLike = false;
  let hasNonOperatorLike = false;

  let token = scanner.scan();
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    if (
      token === ts.SyntaxKind.WhitespaceTrivia ||
      token === ts.SyntaxKind.NewLineTrivia
    ) {
      token = scanner.scan();
      continue;
    }

    const tokenType = toRsxSyntacticTokenType(token);
    if (tokenType === rsxSemanticTokenTypeIndexes.operator) {
      hasOperatorLike = true;
    } else {
      hasNonOperatorLike = true;
    }

    token = scanner.scan();
  }

  return { hasOperatorLike, hasNonOperatorLike };
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
