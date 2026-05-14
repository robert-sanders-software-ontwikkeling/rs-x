import ts from 'typescript';

import {
  createExpressionSiteDetectionsFromRsxBackedProgram,
  detectExpressionSites,
  detectExpressionSitesInSourceFile,
  type IExpressionSiteDetection,
} from '../compiler/expression-site-detector';
import {
  isDateLikeType,
  supportedDateProperties,
  validateExpressionSite,
} from '../compiler/expression-site-validator';
import type { CompilerDiagnosticCategory } from '../diagnostics';
import { createRsxBackedProgramForFile, type IRsxBackedProgram } from '../rsx';
import { createVueBackedProgramForFile } from '../vue';

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

type LocalBindings = ReadonlyMap<string, ts.Type>;

const emptyLocalBindings: LocalBindings = new Map();

function getExpressionSourceFileName(site: IExpressionSiteDetection): string {
  return site.expressionSourceFile.fileName;
}

function getExpressionLiteralBounds(site: IExpressionSiteDetection): {
  start: number;
  end: number;
} {
  return {
    start: site.expressionStart,
    end: site.expressionEnd,
  };
}

function getRelevantExpressionSites(
  program: ts.Program,
  fileName: string,
): IExpressionSiteDetection[] {
  return detectExpressionSites(program, {
    includePartialRsxInvocations: true,
  }).filter((site) => getExpressionSourceFileName(site) === fileName);
}

function getRsxBackedDetections(
  rsxBacked: IRsxBackedProgram,
): IExpressionSiteDetection[] {
  return createExpressionSiteDetectionsFromRsxBackedProgram(rsxBacked);
}

export function findRsxExpressionRegionAtPosition(
  program: ts.Program,
  fileName: string,
  position: number,
): IRsxExpressionRegion | null {
  const resolved = resolveProgramForFile(program, fileName);
  const sourceFile =
    resolved.rsxBacked?.sourceFile ??
    resolved.program.getSourceFile(resolved.fileName);
  if (!sourceFile) {
    return null;
  }

  const checker = resolved.program.getTypeChecker();
  const sites = resolved.rsxBacked
    ? getRsxBackedDetections(resolved.rsxBacked)
    : sourceFile.fileName === resolved.fileName
      ? getRelevantExpressionSites(resolved.program, resolved.fileName)
      : detectExpressionSitesInSourceFile(sourceFile, checker, {
          includePartialRsxInvocations: true,
        });

  for (const site of sites) {
    const { start, end } = getExpressionLiteralBounds(site);
    if (position < start || position > end) {
      continue;
    }

    return {
      expression: site.expression,
      start,
      end,
    };
  }

  return null;
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
  const inlineFunctionContext = resolveInlineFunctionBodyContext(
    context,
    expressionOffset,
  );
  const activePrefixSource =
    inlineFunctionContext?.prefixSource ?? prefixSource;
  const localBindings =
    inlineFunctionContext?.localBindings ?? emptyLocalBindings;
  const constructorPrefix =
    resolveConstructorCompletionPrefix(activePrefixSource);
  if (constructorPrefix !== null) {
    return resolveConstructorCompletions(context, constructorPrefix);
  }

  const completionTarget = resolveCompletionTarget(activePrefixSource);
  if (!completionTarget.chain.length) {
    const names = [
      ...context.modelType
        .getProperties()
        .map((property) => property.getName()),
      ...localBindings.keys(),
    ]
      .filter((name) => name.startsWith(completionTarget.prefix))
      .filter((name, index, collection) => collection.indexOf(name) === index)
      .sort();

    return names.map((name) => ({
      name,
      kind: localBindings.has(name)
        ? ('property' as const)
        : isCallableProperty(context.modelType, name, context.checker)
          ? ('method' as const)
          : ('property' as const),
    }));
  }

  const targetType = resolveChainType(
    context.modelType,
    completionTarget.chain,
    context.checker,
    localBindings,
  );

  if (!targetType) {
    return [];
  }

  if (isDateLikeType(targetType, context.checker)) {
    const names = [...supportedDateProperties]
      .filter((name) => name.startsWith(completionTarget.prefix))
      .sort();
    return names.map((name) => ({ name, kind: 'property' as const }));
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
  const resolved = resolveProgramForFile(program, fileName);
  const sourceFile =
    resolved.rsxBacked?.sourceFile ??
    resolved.program.getSourceFile(resolved.fileName);
  if (!sourceFile) {
    return [];
  }

  const checker = resolved.program.getTypeChecker();
  if (resolved.rsxBacked) {
    return getRsxBackedDetections(resolved.rsxBacked).flatMap((site) => {
      const result = validateExpressionSite(site, site.typeChecker ?? checker);
      const literalBounds = getExpressionLiteralBounds(site);
      return result.diagnostics.map((diagnostic) => {
        const tokenRange = resolveDiagnosticTokenRangeInExpression({
          expression: site.expression,
          token: diagnostic.token,
        });
        const start =
          tokenRange === null
            ? literalBounds.start
            : literalBounds.start + tokenRange.start;
        const end =
          tokenRange === null
            ? literalBounds.end
            : literalBounds.start + tokenRange.end;

        return {
          category: diagnostic.category,
          message: diagnostic.message,
          start,
          end,
        };
      });
    });
  }

  const sites = resolved.rsxBacked
    ? getRsxBackedDetections(resolved.rsxBacked)
    : sourceFile.fileName === resolved.fileName
      ? getRelevantExpressionSites(resolved.program, resolved.fileName)
      : detectExpressionSitesInSourceFile(sourceFile, checker);
  return sites.flatMap((site) => {
    const result = validateExpressionSite(site, site.typeChecker ?? checker);
    const literalBounds = getExpressionLiteralBounds(site);
    const expressionText = site.expression;

    return result.diagnostics.map((diagnostic) => {
      const tokenRange = resolveDiagnosticTokenRangeInExpression({
        expression: expressionText,
        token: diagnostic.token,
      });
      const start =
        tokenRange === null
          ? literalBounds.start
          : literalBounds.start + tokenRange.start;
      const end =
        tokenRange === null
          ? literalBounds.end
          : literalBounds.start + tokenRange.end;

      return {
        category: diagnostic.category,
        message: diagnostic.message,
        start,
        end,
      };
    });
  });
}

function resolveDiagnosticTokenRangeInExpression(args: {
  expression: string;
  token: string | undefined;
}): { start: number; end: number } | null {
  const { expression, token } = args;
  if (!token) {
    return null;
  }

  const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const pattern = new RegExp(`\\b${escapedToken}\\b`, 'u');
  const match = pattern.exec(expression);
  if (!match || typeof match.index !== 'number') {
    return null;
  }

  return {
    start: match.index,
    end: match.index + token.length,
  };
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
  const localBindings = resolveInlineFunctionLocalBindings(
    context,
    expressionOffset,
  );
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
    localBindings,
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
  const resolved = resolveProgramForFile(program, fileName);
  const sourceFile =
    resolved.rsxBacked?.sourceFile ??
    resolved.program.getSourceFile(resolved.fileName);
  if (!sourceFile) {
    return null;
  }

  const checker = resolved.program.getTypeChecker();
  if (resolved.rsxBacked) {
    const sites = getRsxBackedDetections(resolved.rsxBacked);
    for (const site of sites) {
      const expressionStart = site.expressionStart;
      const expressionEnd = site.expressionEnd;
      if (position < expressionStart || position > expressionEnd) {
        continue;
      }

      const modelType = site.modelTypeNode
        ? checker.getTypeFromTypeNode(site.modelTypeNode)
        : null;
      if (!modelType) {
        continue;
      }

      return {
        sourceFile,
        expression: site.expression,
        expressionStart,
        expressionEnd,
        modelType,
        checker,
      };
    }
    return null;
  }

  const sites = resolved.rsxBacked
    ? getRsxBackedDetections(resolved.rsxBacked)
    : sourceFile.fileName === resolved.fileName
      ? getRelevantExpressionSites(resolved.program, resolved.fileName)
      : detectExpressionSitesInSourceFile(sourceFile, checker);

  for (const site of sites) {
    const { start: expressionStart, end: expressionEnd } =
      getExpressionLiteralBounds(site);
    if (position < expressionStart || position > expressionEnd) {
      continue;
    }

    const modelType = site.modelTypeNode
      ? checker.getTypeFromTypeNode(site.modelTypeNode)
      : (() => {
          const modelNode = site.callExpression?.arguments[0];
          return modelNode ? checker.getTypeAtLocation(modelNode) : null;
        })();
    if (!modelType) {
      return null;
    }

    return {
      sourceFile,
      expression: site.expression,
      expressionStart,
      expressionEnd,
      modelType,
      checker,
    };
  }

  return null;
}

function resolveInlineFunctionBodyContext(
  context: IRsxExpressionContext,
  expressionOffset: number,
): { prefixSource: string; localBindings: LocalBindings } | null {
  const sourcePrefix = 'const __rsx_expr__ = ';
  const sourceFile = ts.createSourceFile(
    '__rsx_expr__.ts',
    `${sourcePrefix}${context.expression};`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const absoluteOffset = sourcePrefix.length + expressionOffset;
  const match = findInlineFunctionMatchAtOffset(
    sourceFile,
    absoluteOffset,
    false,
  );
  if (!match) {
    return null;
  }

  const localBindings = resolveInlineFunctionBindings(context, match);
  if (localBindings.size === 0) {
    return null;
  }

  const bodyStartOffset = Math.max(
    0,
    match.functionNode.body.getStart(sourceFile) - sourcePrefix.length,
  );

  return {
    prefixSource: context.expression.slice(bodyStartOffset, expressionOffset),
    localBindings,
  };
}

function resolveInlineFunctionLocalBindings(
  context: IRsxExpressionContext,
  expressionOffset: number,
): LocalBindings {
  const sourcePrefix = 'const __rsx_expr__ = ';
  const sourceFile = ts.createSourceFile(
    '__rsx_expr__.ts',
    `${sourcePrefix}${context.expression};`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const absoluteOffset = sourcePrefix.length + expressionOffset;
  const match = findInlineFunctionMatchAtOffset(
    sourceFile,
    absoluteOffset,
    true,
  );
  return match
    ? resolveInlineFunctionBindings(context, match)
    : emptyLocalBindings;
}

function findInlineFunctionMatchAtOffset(
  sourceFile: ts.SourceFile,
  absoluteOffset: number,
  includeParameters: boolean,
): {
  functionNode: ts.ArrowFunction | ts.FunctionExpression;
  callExpression: ts.CallExpression;
} | null {
  let bestMatch: {
    functionNode: ts.ArrowFunction | ts.FunctionExpression;
    callExpression: ts.CallExpression;
  } | null = null;

  const visit = (node: ts.Node): void => {
    if (
      (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
      absoluteOffset >=
        (includeParameters
          ? node.getStart(sourceFile)
          : node.body.getStart(sourceFile)) &&
      absoluteOffset <= node.getEnd()
    ) {
      const callExpression = findParentCallExpression(node);
      if (callExpression) {
        const bestWidth = bestMatch
          ? bestMatch.functionNode.body.getWidth(sourceFile)
          : Number.POSITIVE_INFINITY;
        const nextWidth = node.body.getWidth(sourceFile);
        if (nextWidth <= bestWidth) {
          bestMatch = { functionNode: node, callExpression };
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  ts.forEachChild(sourceFile, visit);
  return bestMatch;
}

function findParentCallExpression(
  functionNode: ts.ArrowFunction | ts.FunctionExpression,
): ts.CallExpression | null {
  let current: ts.Node = functionNode;

  while (current.parent) {
    if (
      ts.isCallExpression(current.parent) &&
      current.parent.arguments.some((argument) => argument === current)
    ) {
      return current.parent;
    }

    if (!ts.isParenthesizedExpression(current.parent)) {
      current = current.parent;
      continue;
    }

    current = current.parent;
  }

  return null;
}

function resolveInlineFunctionBindings(
  context: IRsxExpressionContext,
  match: {
    functionNode: ts.ArrowFunction | ts.FunctionExpression;
    callExpression: ts.CallExpression;
  },
): LocalBindings {
  const callbackIndex = match.callExpression.arguments.findIndex(
    (argument) => argument === match.functionNode,
  );
  if (callbackIndex < 0) {
    return emptyLocalBindings;
  }

  const arrayMethodBindings = resolveArrayMethodInlineFunctionBindings(
    context,
    match,
    callbackIndex,
  );
  if (arrayMethodBindings.size > 0) {
    return arrayMethodBindings;
  }

  const callableType = resolveTsExpressionType(
    match.callExpression.expression,
    context.modelType,
    context.checker,
  );
  if (!callableType) {
    return emptyLocalBindings;
  }

  const outerSignature = pickSignatureByArgumentCount(
    callableType.getCallSignatures(),
    match.callExpression.arguments.length,
  );
  if (!outerSignature) {
    return emptyLocalBindings;
  }

  const parameter = outerSignature.getParameters()[callbackIndex];
  const declaration =
    parameter?.valueDeclaration ?? parameter?.declarations?.[0];
  if (!parameter || !declaration) {
    return emptyLocalBindings;
  }

  const callbackType = context.checker.getTypeOfSymbolAtLocation(
    parameter,
    declaration,
  );
  const callbackSignature = pickSignatureByArgumentCount(
    callbackType.getCallSignatures(),
    match.functionNode.parameters.length,
  );
  if (!callbackSignature) {
    return emptyLocalBindings;
  }

  const bindings = new Map<string, ts.Type>();
  const callbackParameters = callbackSignature.getParameters();
  for (
    let index = 0;
    index < match.functionNode.parameters.length &&
    index < callbackParameters.length;
    index += 1
  ) {
    const parameterNode = match.functionNode.parameters[index];
    if (!ts.isIdentifier(parameterNode.name)) {
      continue;
    }

    const callbackParameter = callbackParameters[index];
    const callbackDeclaration =
      callbackParameter?.valueDeclaration ??
      callbackParameter?.declarations?.[0];
    if (!callbackParameter || !callbackDeclaration) {
      continue;
    }

    bindings.set(
      parameterNode.name.text,
      context.checker.getTypeOfSymbolAtLocation(
        callbackParameter,
        callbackDeclaration,
      ),
    );
  }

  return bindings;
}

function resolveArrayMethodInlineFunctionBindings(
  context: IRsxExpressionContext,
  match: {
    functionNode: ts.ArrowFunction | ts.FunctionExpression;
    callExpression: ts.CallExpression;
  },
  callbackIndex: number,
): LocalBindings {
  if (
    callbackIndex !== 0 ||
    !ts.isPropertyAccessExpression(match.callExpression.expression)
  ) {
    return emptyLocalBindings;
  }

  const methodName = match.callExpression.expression.name.text;
  const targetType = resolveTsExpressionType(
    match.callExpression.expression.expression,
    context.modelType,
    context.checker,
  );
  if (!targetType) {
    return emptyLocalBindings;
  }

  const elementType = resolveArrayElementType(targetType, context.checker);
  if (!elementType) {
    return emptyLocalBindings;
  }

  const bindings = new Map<string, ts.Type>();
  const parameterNodes = match.functionNode.parameters;

  const bindParameter = (index: number, type: ts.Type | null): void => {
    const parameterNode = parameterNodes[index];
    if (!parameterNode || !ts.isIdentifier(parameterNode.name) || !type) {
      return;
    }

    bindings.set(parameterNode.name.text, type);
  };

  switch (methodName) {
    case 'map':
    case 'filter':
    case 'find':
    case 'some':
    case 'every':
    case 'forEach':
      bindParameter(0, elementType);
      bindParameter(1, context.checker.getNumberType());
      bindParameter(2, targetType);
      return bindings;
    case 'reduce': {
      const seedArgument = match.callExpression.arguments[1];
      const accumulatorType =
        seedArgument && ts.isExpression(seedArgument)
          ? (resolveTsExpressionType(
              seedArgument,
              context.modelType,
              context.checker,
            ) ?? elementType)
          : elementType;
      bindParameter(0, accumulatorType);
      bindParameter(1, elementType);
      bindParameter(2, context.checker.getNumberType());
      bindParameter(3, targetType);
      return bindings;
    }
    default:
      return emptyLocalBindings;
  }
}

function resolveArrayElementType(
  targetType: ts.Type,
  checker: ts.TypeChecker,
): ts.Type | null {
  const nonNullableTarget = checker.getNonNullableType(targetType);
  const numberIndexType = nonNullableTarget.getNumberIndexType();
  if (numberIndexType) {
    return checker.getNonNullableType(numberIndexType);
  }

  const typeArguments = checker.getTypeArguments(
    nonNullableTarget as ts.TypeReference,
  );
  return typeArguments[0] ? checker.getNonNullableType(typeArguments[0]) : null;
}

function pickSignatureByArgumentCount(
  signatures: readonly ts.Signature[],
  argumentCount: number,
): ts.Signature | null {
  for (const signature of signatures) {
    const parameters = signature.getParameters();
    const hasRest = parameters.some((parameter) => {
      const declaration = parameter.valueDeclaration;
      return Boolean(
        declaration &&
        ts.isParameter(declaration) &&
        declaration.dotDotDotToken,
      );
    });

    if (
      argumentCount <= parameters.length ||
      (hasRest && argumentCount >= parameters.length - 1)
    ) {
      return signature;
    }
  }

  return signatures[0] ?? null;
}

function resolveTsExpressionType(
  node: ts.Expression,
  modelType: ts.Type,
  checker: ts.TypeChecker,
  localBindings: LocalBindings = emptyLocalBindings,
): ts.Type | null {
  if (ts.isNumericLiteral(node)) {
    return checker.getNumberType();
  }

  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return checker.getStringType();
  }

  if (
    node.kind === ts.SyntaxKind.TrueKeyword ||
    node.kind === ts.SyntaxKind.FalseKeyword
  ) {
    return checker.getBooleanType();
  }

  if (ts.isParenthesizedExpression(node)) {
    return resolveTsExpressionType(
      node.expression,
      modelType,
      checker,
      localBindings,
    );
  }

  if (ts.isIdentifier(node)) {
    const localBinding = localBindings.get(node.text);
    if (localBinding) {
      return checker.getNonNullableType(localBinding);
    }

    const property = modelType.getProperty(node.text);
    const declaration =
      property?.valueDeclaration ?? property?.declarations?.[0];
    if (!property || !declaration) {
      return null;
    }

    return checker.getNonNullableType(
      checker.getTypeOfSymbolAtLocation(property, declaration),
    );
  }

  if (ts.isPropertyAccessExpression(node)) {
    const targetType = resolveTsExpressionType(
      node.expression,
      modelType,
      checker,
      localBindings,
    );
    if (!targetType) {
      return null;
    }

    const property = checker
      .getNonNullableType(targetType)
      .getProperty(node.name.text);
    const declaration =
      property?.valueDeclaration ?? property?.declarations?.[0];
    if (!property || !declaration) {
      return null;
    }

    return checker.getNonNullableType(
      checker.getTypeOfSymbolAtLocation(property, declaration),
    );
  }

  if (ts.isElementAccessExpression(node)) {
    const targetType = resolveTsExpressionType(
      node.expression,
      modelType,
      checker,
      localBindings,
    );
    if (!targetType) {
      return null;
    }

    const nonNullableTarget = checker.getNonNullableType(targetType);
    const literalArgument = node.argumentExpression;
    if (literalArgument && ts.isNumericLiteral(literalArgument)) {
      return (
        nonNullableTarget.getNumberIndexType() ??
        checker.getTypeArguments(nonNullableTarget as ts.TypeReference)[0] ??
        null
      );
    }

    if (literalArgument && ts.isStringLiteral(literalArgument)) {
      const property = nonNullableTarget.getProperty(literalArgument.text);
      const declaration =
        property?.valueDeclaration ?? property?.declarations?.[0];
      if (property && declaration) {
        return checker.getTypeOfSymbolAtLocation(property, declaration);
      }
    }
  }

  if (ts.isCallExpression(node)) {
    const callableType = resolveTsExpressionType(
      node.expression,
      modelType,
      checker,
      localBindings,
    );
    const signature = callableType
      ? pickSignatureByArgumentCount(
          callableType.getCallSignatures(),
          node.arguments.length,
        )
      : null;
    return signature
      ? checker.getNonNullableType(signature.getReturnType())
      : null;
  }

  return null;
}

function resolveProgramForFile(
  program: ts.Program,
  fileName: string,
): { program: ts.Program; fileName: string; rsxBacked?: IRsxBackedProgram } {
  const rsxBacked = createRsxBackedProgramForFile(program, fileName);
  if (rsxBacked) {
    return {
      program: rsxBacked.program,
      fileName,
      rsxBacked,
    };
  }

  return (
    createVueBackedProgramForFile(program, fileName) ?? {
      program,
      fileName,
    }
  );
}

function resolveCompletionTarget(prefixSource: string): {
  chain: string[];
  prefix: string;
} {
  // A chain segment: identifier optionally followed by () or [digits]
  // e.g. 'items', 'first()', 'items[0]'
  // chain.prefix  — e.g. 'cart.first().q' → chain='cart.first()', prefix='q'
  const chainMatch = prefixSource.match(
    /([A-Za-z_$][\w$]*(?:(?:\(\))|(?:\[\d+\]))?(?:\.[A-Za-z_$][\w$]*(?:(?:\(\))|(?:\[\d+\]))?)*)\.([A-Za-z_$][\w$]*)?$/u,
  );
  if (chainMatch) {
    return {
      chain: splitChain(chainMatch[1]),
      prefix: chainMatch[2] ?? '',
    };
  }

  // chain.  — trailing dot with no prefix yet, e.g. 'cart[0].'
  const trailingDotChainMatch = prefixSource.match(
    /([A-Za-z_$][\w$]*(?:(?:\(\))|(?:\[\d+\]))?(?:\.[A-Za-z_$][\w$]*(?:(?:\(\))|(?:\[\d+\]))?)*)\.$/u,
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
  localBindings: LocalBindings = emptyLocalBindings,
): ts.Type | null {
  let currentType: ts.Type | null = modelType;
  let startIndex = 0;

  const firstSegment = chain[0];
  const localRootMatch = firstSegment?.match(/^([A-Za-z_$][\w$]*)$/u);
  if (localRootMatch) {
    const localRootType = localBindings.get(localRootMatch[1]);
    if (localRootType) {
      currentType = checker.getNonNullableType(
        unwrapRsxExpressionType(localRootType, checker),
      );
      startIndex = 1;
    }
  }

  for (let index = startIndex; index < chain.length; index += 1) {
    const segment = chain[index];
    if (!currentType) {
      return null;
    }
    currentType = unwrapRsxExpressionType(currentType, checker);

    // Handle array index: 'items[0]' or 'cart[0]'
    const arrayIndexMatch = segment.match(/^([A-Za-z_$][\w$]*)?\[(\d+)\]$/u);
    if (arrayIndexMatch) {
      const propName = arrayIndexMatch[1];
      let typeToIndex = currentType;

      if (propName) {
        const property = typeToIndex.getProperty(propName);
        if (!property) return null;
        const declaration =
          property.valueDeclaration ?? property.declarations?.[0];
        if (!declaration) return null;
        typeToIndex = checker.getNonNullableType(
          unwrapRsxExpressionType(
            checker.getTypeOfSymbolAtLocation(property, declaration),
            checker,
          ),
        );
      }

      // Get element type via numeric index signature
      const numberIndexType = typeToIndex.getNumberIndexType();
      if (numberIndexType) {
        currentType = checker.getNonNullableType(
          unwrapRsxExpressionType(numberIndexType, checker),
        );
      } else {
        // Fallback: first type argument of generic Array<T>
        const typeArgs = checker.getTypeArguments(
          typeToIndex as ts.TypeReference,
        );
        if (typeArgs.length > 0 && typeArgs[0]) {
          currentType = checker.getNonNullableType(
            unwrapRsxExpressionType(typeArgs[0], checker),
          );
        } else {
          return null;
        }
      }
      continue;
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

    const propertyType = checker.getTypeOfSymbolAtLocation(
      property,
      declaration,
    );
    if (!isMethodCall) {
      currentType = checker.getNonNullableType(
        unwrapRsxExpressionType(propertyType, checker),
      );
      continue;
    }

    const signatures = propertyType.getCallSignatures();
    if (signatures.length === 0) {
      return null;
    }

    currentType = checker.getNonNullableType(
      unwrapRsxExpressionType(signatures[0].getReturnType(), checker),
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
  if (
    symbol?.getName() === 'IExpression' ||
    symbol?.getName() === 'IExpressionTree'
  ) {
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
