import ts from 'typescript';

import type { CompilerDiagnosticCategory } from '../diagnostics';
import { detectExpressionSitesInSourceFile } from '../compiler/expression-site-detector';
import { validateExpressionSite } from '../compiler/expression-site-validator';

export interface IRsxExpressionRegion {
  readonly expression: string;
  readonly start: number;
  readonly end: number;
}

export interface IRsxCompletionItem {
  readonly name: string;
  readonly kind: 'property' | 'method';
}

export interface IRsxDiagnostic {
  readonly category: CompilerDiagnosticCategory;
  readonly message: string;
  readonly start: number;
  readonly end: number;
}

export interface IRsxHoverInfo {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

interface IRsxExpressionContext {
  readonly sourceFile: ts.SourceFile;
  readonly expression: string;
  readonly expressionStart: number;
  readonly expressionEnd: number;
  readonly modelType: ts.Type;
  readonly checker: ts.TypeChecker;
}

export function findRsxExpressionRegionAtPosition(
  program: ts.Program,
  fileName: string,
  position: number,
): IRsxExpressionRegion | null {
  const context = resolveExpressionContext(program, fileName, position);
  if (!context) {
    return null;
  }

  return {
    expression: context.expression,
    start: context.expressionStart,
    end: context.expressionEnd,
  };
}

export function getRsxCompletionsAtPosition(
  program: ts.Program,
  fileName: string,
  position: number,
): IRsxCompletionItem[] {
  const context = resolveExpressionContext(program, fileName, position);
  if (!context) {
    return [];
  }

  const expressionOffset = position - context.expressionStart;
  const prefixSource = context.expression.slice(0, expressionOffset);
  const completionTarget = resolveCompletionTarget(prefixSource);
  const targetType = completionTarget.chain.length
    ? resolveChainType(context.modelType, completionTarget.chain, context.checker)
    : context.modelType;

  if (!targetType) {
    return [];
  }

  const names = targetType
    .getProperties()
    .map((propertySymbol) => propertySymbol.getName())
    .filter((name) => name.startsWith(completionTarget.prefix))
    .sort();

  return names.map((name) => ({
    name,
    kind: isCallableProperty(targetType, name, context.checker) ? 'method' : 'property',
  }));
}

export function getRsxDiagnosticsForFile(
  program: ts.Program,
  fileName: string,
): IRsxDiagnostic[] {
  const sourceFile = program.getSourceFile(fileName);
  if (!sourceFile) {
    return [];
  }

  const checker = program.getTypeChecker();
  const sites = detectExpressionSitesInSourceFile(sourceFile, checker);
  return sites.flatMap((site) => {
    const result = validateExpressionSite(site, checker);
    const literalStart = site.expressionLiteral.getStart(sourceFile) + 1;
    const literalEnd = site.expressionLiteral.getEnd() - 1;

    return result.diagnostics.map((diagnostic) => ({
      category: diagnostic.category,
      message: diagnostic.message,
      start: literalStart,
      end: literalEnd,
    }));
  });
}

export function getRsxHoverAtPosition(
  program: ts.Program,
  fileName: string,
  position: number,
): IRsxHoverInfo | null {
  const context = resolveExpressionContext(program, fileName, position);
  if (!context) {
    return null;
  }

  const expressionOffset = position - context.expressionStart;
  const tokenRange = resolveIdentifierTokenRange(context.expression, expressionOffset);
  if (!tokenRange) {
    return null;
  }

  const textToTokenEnd = context.expression.slice(0, tokenRange.end);
  const chain = resolveChainFromSuffix(textToTokenEnd);
  if (!chain.length) {
    return null;
  }

  const resolvedType = resolveChainType(context.modelType, chain, context.checker);
  if (!resolvedType) {
    return null;
  }

  return {
    text: context.checker.typeToString(resolvedType),
    start: context.expressionStart + tokenRange.start,
    end: context.expressionStart + tokenRange.end,
  };
}

function resolveExpressionContext(
  program: ts.Program,
  fileName: string,
  position: number,
): IRsxExpressionContext | null {
  const sourceFile = program.getSourceFile(fileName);
  if (!sourceFile) {
    return null;
  }

  const checker = program.getTypeChecker();
  const sites = detectExpressionSitesInSourceFile(sourceFile, checker);

  for (const site of sites) {
    const expressionStart = site.expressionLiteral.getStart(sourceFile) + 1;
    const expressionEnd = site.expressionLiteral.getEnd() - 1;
    if (position < expressionStart || position > expressionEnd) {
      continue;
    }

    const modelNode = site.callExpression.arguments[0];
    if (!modelNode) {
      return null;
    }

    return {
      sourceFile,
      expression: site.expression,
      expressionStart,
      expressionEnd,
      modelType: checker.getTypeAtLocation(modelNode),
      checker,
    };
  }

  return null;
}

function resolveCompletionTarget(prefixSource: string): {
  chain: string[];
  prefix: string;
} {
  const chainMatch = prefixSource.match(
    /([A-Za-z_$][\w$]*(?:\(\))?(?:\.[A-Za-z_$][\w$]*(?:\(\))?)*)\.([A-Za-z_$][\w$]*)?$/u,
  );
  if (chainMatch) {
    return {
      chain: splitChain(chainMatch[1]),
      prefix: chainMatch[2] ?? '',
    };
  }

  const trailingDotChainMatch = prefixSource.match(
    /([A-Za-z_$][\w$]*(?:\(\))?(?:\.[A-Za-z_$][\w$]*(?:\(\))?)*)\.$/u,
  );
  if (trailingDotChainMatch) {
    return {
      chain: splitChain(trailingDotChainMatch[1]),
      prefix: '',
    };
  }

  const rootPrefixMatch = prefixSource.match(/([A-Za-z_$][\w$]*)$/u);
  return {
    chain: [],
    prefix: rootPrefixMatch?.[1] ?? '',
  };
}

function resolveIdentifierTokenRange(
  expression: string,
  offset: number,
): { start: number; end: number } | null {
  const isIdentifierChar = (char: string): boolean =>
    /[A-Za-z0-9_$]/u.test(char);

  if (offset < 0 || offset > expression.length) {
    return null;
  }

  let start = offset;
  let end = offset;

  if (
    offset < expression.length &&
    isIdentifierChar(expression[offset])
  ) {
    start = offset;
    end = offset + 1;
  } else if (
    offset > 0 &&
    isIdentifierChar(expression[offset - 1])
  ) {
    start = offset - 1;
    end = offset;
  } else {
    return null;
  }

  while (start > 0 && isIdentifierChar(expression[start - 1])) {
    start -= 1;
  }
  while (end < expression.length && isIdentifierChar(expression[end])) {
    end += 1;
  }

  return { start, end };
}

function resolveChainFromSuffix(prefix: string): string[] {
  const chainMatch = prefix.match(
    /([A-Za-z_$][\w$]*(?:\(\))?(?:\.[A-Za-z_$][\w$]*(?:\(\))?)*)$/u,
  );
  if (!chainMatch) {
    return [];
  }

  return splitChain(chainMatch[1]);
}

function splitChain(chainText: string): string[] {
  return chainText.split('.').filter(Boolean);
}

function resolveChainType(
  modelType: ts.Type,
  chain: readonly string[],
  checker: ts.TypeChecker,
): ts.Type | null {
  let currentType: ts.Type | null = modelType;

  for (const segment of chain) {
    if (!currentType) {
      return null;
    }

    const isMethodCall = segment.endsWith('()');
    const name = isMethodCall ? segment.slice(0, -2) : segment;
    const property = currentType.getProperty(name);
    if (!property) {
      return null;
    }

    const declaration = property.valueDeclaration ?? property.declarations?.[0];
    if (!declaration) {
      return null;
    }

    const propertyType = checker.getTypeOfSymbolAtLocation(property, declaration);
    if (!isMethodCall) {
      currentType = propertyType;
      continue;
    }

    const signatures = propertyType.getCallSignatures();
    if (signatures.length === 0) {
      return null;
    }

    currentType = signatures[0].getReturnType();
  }

  return currentType;
}

function isCallableProperty(
  targetType: ts.Type,
  name: string,
  checker: ts.TypeChecker,
): boolean {
  const property = targetType.getProperty(name);
  if (!property) {
    return false;
  }

  const declaration = property.valueDeclaration ?? property.declarations?.[0];
  if (!declaration) {
    return false;
  }

  const propertyType = checker.getTypeOfSymbolAtLocation(property, declaration);
  return propertyType.getCallSignatures().length > 0;
}
