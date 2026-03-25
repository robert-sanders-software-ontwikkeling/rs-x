import ts from 'typescript';

import { detectExpressionSitesInSourceFile } from '../compiler/expression-site-detector';
import { validateExpressionSite } from '../compiler/expression-site-validator';
import type { CompilerDiagnosticCategory } from '../diagnostics';

export interface IRsxExpressionRegion {
  readonly expression: string;
  readonly start: number;
  readonly end: number;
}

export interface IRsxCompletionItem {
  readonly name: string;
  readonly kind: 'property' | 'method' | 'constructor';
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

export interface IRsxSignatureParameter {
  readonly name: string;
  readonly typeText: string;
  readonly isOptional: boolean;
  readonly isRest: boolean;
}

export interface IRsxSignatureHelpItem {
  readonly parameters: readonly IRsxSignatureParameter[];
  readonly returnTypeText: string;
}

export interface IRsxSignatureHelp {
  readonly items: readonly IRsxSignatureHelpItem[];
  readonly argumentIndex: number;
  readonly argumentCount: number;
  readonly applicableStart: number;
  readonly applicableEnd: number;
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
  const constructorPrefix = resolveConstructorCompletionPrefix(prefixSource);
  if (constructorPrefix !== null) {
    return resolveConstructorCompletions(context, constructorPrefix);
  }

  const completionTarget = resolveCompletionTarget(prefixSource);
  const targetType = completionTarget.chain.length
    ? resolveChainType(
        context.modelType,
        completionTarget.chain,
        context.checker,
      )
    : context.modelType;

  if (!targetType) {
    return [];
  }

  const names = targetType
    .getProperties()
    .map((propertySymbol) => propertySymbol.getName())
    .filter((name) => name.startsWith(completionTarget.prefix))
    .filter((name, index, collection) => collection.indexOf(name) === index)
    .sort();

  return names.map((name) => ({
    name,
    kind: isCallableProperty(targetType, name, context.checker)
      ? 'method'
      : 'property',
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
  const tokenRange = resolveIdentifierTokenRange(
    context.expression,
    expressionOffset,
  );
  if (!tokenRange) {
    return null;
  }

  const textToTokenEnd = context.expression.slice(0, tokenRange.end);
  const chain = resolveChainFromSuffix(textToTokenEnd);
  if (!chain.length) {
    return null;
  }

  const resolvedType = resolveChainType(
    context.modelType,
    chain,
    context.checker,
  );
  if (!resolvedType) {
    return null;
  }

  return {
    text: context.checker.typeToString(resolvedType),
    start: context.expressionStart + tokenRange.start,
    end: context.expressionStart + tokenRange.end,
  };
}

export function getRsxSignatureHelpAtPosition(
  program: ts.Program,
  fileName: string,
  position: number,
): IRsxSignatureHelp | null {
  const context = resolveExpressionContext(program, fileName, position);
  if (!context) {
    return null;
  }

  const expressionOffset = position - context.expressionStart;
  const prefixSource = context.expression.slice(0, expressionOffset);
  const activeCall = resolveActiveCallContext(prefixSource);
  if (!activeCall) {
    return null;
  }

  const callableType = resolveCallableType(
    context.modelType,
    activeCall.chain,
    context.sourceFile,
    context.checker,
    activeCall.isConstructorCall,
  );
  if (!callableType) {
    return null;
  }

  const signatures = activeCall.isConstructorCall
    ? callableType.getConstructSignatures()
    : callableType.getCallSignatures();
  if (signatures.length === 0) {
    return null;
  }

  const items: IRsxSignatureHelpItem[] = signatures.map((signature) => {
    const parameters = signature
      .getParameters()
      .map((parameter): IRsxSignatureParameter => {
        const declaration =
          parameter.valueDeclaration ?? parameter.declarations?.[0];
        const typeText = declaration
          ? context.checker.typeToString(
              context.checker.getTypeOfSymbolAtLocation(parameter, declaration),
            )
          : 'unknown';
        const declarations = parameter.declarations ?? [];
        const isOptionalByDeclaration = declarations.some(
          (node) =>
            ts.isParameter(node) &&
            (Boolean(node.questionToken) || Boolean(node.initializer)),
        );
        const isRest = declarations.some(
          (node) => ts.isParameter(node) && Boolean(node.dotDotDotToken),
        );

        return {
          name: parameter.getName(),
          typeText,
          isOptional:
            (parameter.flags & ts.SymbolFlags.Optional) !== 0 ||
            isOptionalByDeclaration,
          isRest,
        };
      });

    return {
      parameters,
      returnTypeText: context.checker.typeToString(signature.getReturnType()),
    };
  });

  return {
    items,
    argumentIndex: activeCall.argumentIndex,
    argumentCount: activeCall.argumentCount,
    applicableStart: context.expressionStart + activeCall.applicableStartOffset,
    applicableEnd: context.expressionStart + activeCall.applicableEndOffset,
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

  if (offset < expression.length && isIdentifierChar(expression[offset])) {
    start = offset;
    end = offset + 1;
  } else if (offset > 0 && isIdentifierChar(expression[offset - 1])) {
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
    currentType = unwrapRsxExpressionType(currentType, checker);

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

    const propertyType = checker.getTypeOfSymbolAtLocation(
      property,
      declaration,
    );
    if (!isMethodCall) {
      currentType = unwrapRsxExpressionType(propertyType, checker);
      continue;
    }

    const signatures = propertyType.getCallSignatures();
    if (signatures.length === 0) {
      return null;
    }

    currentType = unwrapRsxExpressionType(
      signatures[0].getReturnType(),
      checker,
    );
  }

  return currentType;
}

function resolveCallableType(
  modelType: ts.Type,
  chain: readonly string[],
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  isConstructorCall: boolean,
): ts.Type | null {
  if (chain.length === 0) {
    return null;
  }

  if (isConstructorCall) {
    return resolveConstructorType(chain, sourceFile, checker);
  }

  const containerChain = chain.slice(0, -1);
  const callableName = chain[chain.length - 1];
  if (!callableName || callableName.endsWith('()')) {
    return null;
  }

  const containerType = containerChain.length
    ? resolveChainType(modelType, containerChain, checker)
    : modelType;
  if (!containerType) {
    return null;
  }

  const callableProperty = containerType.getProperty(callableName);
  if (!callableProperty) {
    return null;
  }

  const declaration =
    callableProperty.valueDeclaration ?? callableProperty.declarations?.[0];
  if (!declaration) {
    return null;
  }

  return unwrapRsxExpressionType(
    checker.getTypeOfSymbolAtLocation(callableProperty, declaration),
    checker,
  );
}

function resolveActiveCallContext(prefixSource: string): {
  chain: string[];
  isConstructorCall: boolean;
  argumentIndex: number;
  argumentCount: number;
  applicableStartOffset: number;
  applicableEndOffset: number;
} | null {
  const callStack: Array<{ openOffset: number; commaCount: number }> = [];
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplate = false;
  let escaped = false;

  for (let index = 0; index < prefixSource.length; index += 1) {
    const char = prefixSource[index];
    if (escaped) {
      escaped = false;
      continue;
    }

    if (inSingleQuote) {
      if (char === '\\') {
        escaped = true;
      } else if (char === "'") {
        inSingleQuote = false;
      }
      continue;
    }

    if (inDoubleQuote) {
      if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inDoubleQuote = false;
      }
      continue;
    }

    if (inTemplate) {
      if (char === '\\') {
        escaped = true;
      } else if (char === '`') {
        inTemplate = false;
      }
      continue;
    }

    if (char === "'") {
      inSingleQuote = true;
      continue;
    }

    if (char === '"') {
      inDoubleQuote = true;
      continue;
    }

    if (char === '`') {
      inTemplate = true;
      continue;
    }

    if (char === '(') {
      callStack.push({ openOffset: index, commaCount: 0 });
      continue;
    }

    if (char === ')') {
      if (callStack.length > 0) {
        callStack.pop();
      }
      continue;
    }

    if (char === ',' && callStack.length > 0) {
      const activeCall = callStack[callStack.length - 1];
      activeCall.commaCount += 1;
    }
  }

  if (callStack.length === 0) {
    return null;
  }

  const activeCall = callStack[callStack.length - 1];
  const callTargetSource = prefixSource
    .slice(0, activeCall.openOffset)
    .trimEnd();
  const chainMatch = callTargetSource.match(
    /([A-Za-z_$][\w$]*(?:\(\))?(?:\.[A-Za-z_$][\w$]*(?:\(\))?)*)$/u,
  );
  if (!chainMatch) {
    return null;
  }

  const chain = splitChain(chainMatch[1]);
  const constructorMatch = callTargetSource.match(
    /(?:^|[^\w$])new\s+([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)$/u,
  );
  const hasArgumentText =
    prefixSource.slice(activeCall.openOffset + 1).trim().length > 0;

  return {
    chain,
    isConstructorCall:
      Boolean(constructorMatch) && constructorMatch?.[1] === chainMatch[1],
    argumentIndex: activeCall.commaCount,
    argumentCount: hasArgumentText ? activeCall.commaCount + 1 : 0,
    applicableStartOffset: activeCall.openOffset + 1,
    applicableEndOffset: prefixSource.length,
  };
}

function resolveConstructorCompletionPrefix(
  prefixSource: string,
): string | null {
  const constructorPrefixMatch = prefixSource.match(
    /(?:^|[^\w$])new\s+([A-Za-z_$][\w$]*)?$/u,
  );
  if (!constructorPrefixMatch) {
    return null;
  }

  return constructorPrefixMatch[1] ?? '';
}

function resolveConstructorCompletions(
  context: IRsxExpressionContext,
  prefix: string,
): IRsxCompletionItem[] {
  const constructableNames = context.checker
    .getSymbolsInScope(
      context.sourceFile,
      ts.SymbolFlags.Value |
        ts.SymbolFlags.Type |
        ts.SymbolFlags.Namespace |
        ts.SymbolFlags.Alias,
    )
    .filter((symbol) => !symbol.getName().startsWith('__'))
    .filter((symbol) => symbol.getName().startsWith(prefix))
    .filter(
      (symbol) =>
        resolveConstructableTypeFromSymbol(
          symbol,
          context.sourceFile,
          context.checker,
        ) !== null,
    )
    .map((symbol) => symbol.getName())
    .filter((name, index, collection) => collection.indexOf(name) === index)
    .sort();

  return constructableNames.map((name) => ({
    name,
    kind: 'constructor',
  }));
}

function resolveConstructorType(
  chain: readonly string[],
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
): ts.Type | null {
  const [rootName, ...rest] = chain;
  if (!rootName) {
    return null;
  }

  const rootSymbol = checker
    .getSymbolsInScope(
      sourceFile,
      ts.SymbolFlags.Value |
        ts.SymbolFlags.Type |
        ts.SymbolFlags.Namespace |
        ts.SymbolFlags.Alias,
    )
    .find((symbol) => symbol.getName() === rootName);
  if (!rootSymbol) {
    return null;
  }

  const rootType = resolveConstructableTypeFromSymbol(
    rootSymbol,
    sourceFile,
    checker,
  );
  if (!rootType) {
    return null;
  }

  if (rest.length === 0) {
    return rootType;
  }

  let currentType: ts.Type | null = rootType;
  for (const segment of rest) {
    if (!currentType) {
      return null;
    }

    const property = currentType.getProperty(segment);
    if (!property) {
      return null;
    }

    const declaration = property.valueDeclaration ?? property.declarations?.[0];
    if (!declaration) {
      return null;
    }

    currentType = checker.getTypeOfSymbolAtLocation(property, declaration);
  }

  return currentType;
}

function resolveConstructableTypeFromSymbol(
  symbol: ts.Symbol,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
): ts.Type | null {
  const resolvedSymbol =
    symbol.flags & ts.SymbolFlags.Alias
      ? checker.getAliasedSymbol(symbol)
      : symbol;
  const declaration =
    resolvedSymbol.valueDeclaration ??
    resolvedSymbol.declarations?.[0] ??
    symbol.valueDeclaration ??
    symbol.declarations?.[0] ??
    sourceFile;
  const symbolType = checker.getTypeOfSymbolAtLocation(
    resolvedSymbol,
    declaration,
  );
  if (symbolType.getConstructSignatures().length > 0) {
    return symbolType;
  }

  return null;
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

  const propertyType = unwrapRsxExpressionType(
    checker.getTypeOfSymbolAtLocation(property, declaration),
    checker,
  );
  return propertyType.getCallSignatures().length > 0;
}

function unwrapRsxExpressionType(
  type: ts.Type,
  checker: ts.TypeChecker,
): ts.Type {
  const symbol = type.aliasSymbol ?? type.getSymbol();
  if (symbol?.getName() === 'IExpression') {
    const typeArguments = checker.getTypeArguments(type as ts.TypeReference);
    if (typeArguments.length > 0) {
      return typeArguments[0];
    }
  }

  const hasExpressionShape =
    type.getProperty('value') &&
    type.getProperty('expressionString') &&
    type.getProperty('childExpressions') &&
    type.getProperty('changed');
  if (!hasExpressionShape) {
    return type;
  }

  const valueProperty = type.getProperty('value');
  const declaration =
    valueProperty?.valueDeclaration ?? valueProperty?.declarations?.[0];
  if (!valueProperty || !declaration) {
    return type;
  }

  return checker.getTypeOfSymbolAtLocation(valueProperty, declaration);
}
