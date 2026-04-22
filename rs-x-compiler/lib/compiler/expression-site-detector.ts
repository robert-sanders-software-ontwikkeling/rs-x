import ts from 'typescript';

import {
  createRsxBackedProgramForFile,
  type IRsxBackedProgram,
  isRsxFileName,
} from '../rsx';
import { createVueBackedProgramForFile, isVueFileName } from '../vue';

import { effectiveTypeFlags as _typeFlags } from './effective-typescript';

export type ExpressionEntryPointKind = 'rsx' | 'factory-create' | 'rsx-file';

export interface IExpressionSiteDetection {
  readonly kind: ExpressionEntryPointKind;
  readonly expression: string;
  readonly preparse: boolean;
  readonly lazy: boolean;
  /** Named lazy group. When set, implies lazy: true. */
  readonly lazyGroup: string | undefined;
  readonly compiled: boolean;
  readonly expressionSourceFile: ts.SourceFile;
  readonly expressionStart: number;
  readonly expressionEnd: number;
  readonly expressionLiteral?: ts.StringLiteralLike;
  readonly callExpression?: ts.CallExpression;
  readonly modelTypeNode?: ts.TypeNode;
  readonly returnTypeNode?: ts.TypeNode;
  readonly sourceFile: ts.SourceFile;
}

export function detectExpressionSites(
  program: ts.Program,
): IExpressionSiteDetection[] {
  const checker = program.getTypeChecker();
  const detections: IExpressionSiteDetection[] = [];
  const seenVueRoots = new Set<string>();

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) {
      continue;
    }

    detections.push(...detectExpressionSitesInSourceFile(sourceFile, checker));
  }

  for (const rootFileName of program.getRootFileNames()) {
    if (isRsxFileName(rootFileName)) {
      const rsxProgram = createRsxBackedProgramForFile(program, rootFileName);
      if (!rsxProgram) {
        continue;
      }

      const detection = detectExpressionSiteInRsxBackedProgram(rsxProgram);
      if (detection) {
        detections.push(detection);
      }
      continue;
    }

    if (!isVueFileName(rootFileName) || seenVueRoots.has(rootFileName)) {
      continue;
    }
    seenVueRoots.add(rootFileName);

    const vueProgram = createVueBackedProgramForFile(program, rootFileName);
    if (!vueProgram) {
      continue;
    }

    const vueSourceFile = vueProgram.program.getSourceFile(vueProgram.fileName);
    if (!vueSourceFile || vueSourceFile.isDeclarationFile) {
      continue;
    }

    detections.push(
      ...detectExpressionSitesInSourceFile(
        vueSourceFile,
        vueProgram.program.getTypeChecker(),
      ),
    );
  }

  return detections;
}

export function detectExpressionSitesInSourceFile(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
): IExpressionSiteDetection[] {
  const detections: IExpressionSiteDetection[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const rsxDetection = tryDetectRsxEntryPoint(node, checker);
      if (rsxDetection) {
        detections.push(rsxDetection);
      }

      const factoryDetection = tryDetectFactoryEntryPoint(node, checker);
      if (factoryDetection) {
        detections.push(factoryDetection);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return detections;
}

function tryDetectRsxEntryPoint(
  callExpression: ts.CallExpression,
  checker: ts.TypeChecker,
): IExpressionSiteDetection | null {
  if (!ts.isCallExpression(callExpression.expression)) {
    return null;
  }

  const rsxInvocation = callExpression.expression;
  if (
    rsxInvocation.arguments.length < 1 ||
    rsxInvocation.arguments.length > 2
  ) {
    return null;
  }

  const expressionLiteral = resolveStaticExpressionLiteral(
    rsxInvocation.arguments[0],
    checker,
  );
  if (!expressionLiteral) {
    return null;
  }

  if (!isRsxCallee(rsxInvocation.expression, checker)) {
    return null;
  }

  const rsxOptions = resolveRsxOptions(rsxInvocation.arguments[1]);

  return {
    kind: 'rsx',
    expression: expressionLiteral.text,
    preparse: rsxOptions.preparse,
    lazy: rsxOptions.lazy,
    lazyGroup: rsxOptions.lazyGroup,
    compiled: rsxOptions.compiled,
    expressionSourceFile: expressionLiteral.getSourceFile(),
    expressionStart:
      expressionLiteral.getStart(expressionLiteral.getSourceFile()) + 1,
    expressionEnd: expressionLiteral.getEnd() - 1,
    expressionLiteral,
    callExpression,
    sourceFile: callExpression.getSourceFile(),
  };
}

function isRsxCallee(
  expression: ts.LeftHandSideExpression,
  checker: ts.TypeChecker,
): boolean {
  const symbol = checker.getSymbolAtLocation(expression);
  if (!symbol) {
    return false;
  }

  if (isAliasImportedFromExpressionParser(symbol, checker)) {
    return true;
  }

  const resolvedSymbol =
    symbol.flags & ts.SymbolFlags.Alias
      ? checker.getAliasedSymbol(symbol)
      : symbol;
  if (resolvedSymbol.getName() !== 'rsx') {
    return false;
  }

  const declarations = resolvedSymbol.declarations ?? [];
  return declarations.some((declaration) => {
    const sourcePath = declaration
      .getSourceFile()
      .fileName.replace(/\\/gu, '/');
    return (
      sourcePath.includes('/rs-x-expression-parser/') ||
      sourcePath.includes('/@rs-x/expression-parser/')
    );
  });
}

function isAliasImportedFromExpressionParser(
  symbol: ts.Symbol,
  checker: ts.TypeChecker,
  seenSymbols = new Set<ts.Symbol>(),
): boolean {
  if (seenSymbols.has(symbol)) {
    return false;
  }
  seenSymbols.add(symbol);

  if ((symbol.flags & ts.SymbolFlags.Alias) === 0) {
    const declarations = symbol.declarations ?? [];
    for (const declaration of declarations) {
      if (!ts.isVariableDeclaration(declaration) || !declaration.initializer) {
        continue;
      }

      const initializerSymbol = checker.getSymbolAtLocation(
        declaration.initializer,
      );
      if (
        initializerSymbol &&
        isAliasImportedFromExpressionParser(
          initializerSymbol,
          checker,
          seenSymbols,
        )
      ) {
        return true;
      }
    }

    return false;
  }

  const declarations = symbol.declarations ?? [];
  return declarations.some((declaration) => {
    if (!ts.isImportSpecifier(declaration)) {
      return false;
    }

    let current: ts.Node | undefined = declaration;
    while (current && !ts.isImportDeclaration(current)) {
      current = current.parent;
    }
    if (!current) {
      return false;
    }

    const moduleSpecifier = current.moduleSpecifier;
    if (!ts.isStringLiteral(moduleSpecifier)) {
      return false;
    }

    return moduleSpecifier.text === '@rs-x/expression-parser';
  });
}

function tryDetectFactoryEntryPoint(
  callExpression: ts.CallExpression,
  checker: ts.TypeChecker,
): IExpressionSiteDetection | null {
  if (!ts.isPropertyAccessExpression(callExpression.expression)) {
    return null;
  }

  if (callExpression.expression.name.text !== 'create') {
    return null;
  }

  if (callExpression.arguments.length < 2) {
    return null;
  }

  const expressionLiteral = resolveStaticExpressionLiteral(
    callExpression.arguments[1],
    checker,
  );
  if (!expressionLiteral) {
    return null;
  }

  const factoryType = checker.getTypeAtLocation(
    callExpression.expression.expression,
  );
  if (!isExpressionFactoryType(factoryType, checker, new Set())) {
    return null;
  }

  return {
    kind: 'factory-create',
    expression: expressionLiteral.text,
    preparse: true,
    lazy: false,
    lazyGroup: undefined,
    compiled: true,
    expressionSourceFile: expressionLiteral.getSourceFile(),
    expressionStart:
      expressionLiteral.getStart(expressionLiteral.getSourceFile()) + 1,
    expressionEnd: expressionLiteral.getEnd() - 1,
    expressionLiteral,
    callExpression,
    sourceFile: callExpression.getSourceFile(),
  };
}

function detectExpressionSiteInRsxBackedProgram(
  rsxProgram: IRsxBackedProgram,
): IExpressionSiteDetection | null {
  const statements = rsxProgram.virtualSourceFile.statements;
  const modelAlias = statements[0];
  const returnAlias = statements[1];
  if (!modelAlias || !ts.isTypeAliasDeclaration(modelAlias)) {
    return null;
  }

  return {
    kind: 'rsx-file',
    expression: rsxProgram.metadata.expression,
    preparse: true,
    lazy: false,
    lazyGroup: undefined,
    compiled: true,
    expressionSourceFile: rsxProgram.sourceFile,
    expressionStart: rsxProgram.metadata.expressionStart,
    expressionEnd: rsxProgram.metadata.expressionEnd,
    modelTypeNode: modelAlias.type,
    returnTypeNode:
      returnAlias && ts.isTypeAliasDeclaration(returnAlias)
        ? returnAlias.type
        : undefined,
    sourceFile: rsxProgram.sourceFile,
  };
}

export function createExpressionSiteDetectionFromRsxBackedProgram(
  rsxProgram: IRsxBackedProgram,
): IExpressionSiteDetection | null {
  return detectExpressionSiteInRsxBackedProgram(rsxProgram);
}

function resolveRsxOptions(optionArgument?: ts.Expression): {
  preparse: boolean;
  lazy: boolean;
  lazyGroup: string | undefined;
  compiled: boolean;
} {
  let preparse = true;
  let lazy = false;
  let lazyGroup: string | undefined;
  let compiled = true;

  if (!optionArgument || !ts.isObjectLiteralExpression(optionArgument)) {
    return { preparse, lazy, lazyGroup, compiled };
  }

  for (let i = 0; i < optionArgument.properties.length; i += 1) {
    const property = optionArgument.properties[i];
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }

    if (isPropertyName(property.name, 'preparse')) {
      if (property.initializer.kind === ts.SyntaxKind.FalseKeyword) {
        preparse = false;
      }
      if (property.initializer.kind === ts.SyntaxKind.TrueKeyword) {
        preparse = true;
      }
      continue;
    }

    if (isPropertyName(property.name, 'lazy')) {
      if (property.initializer.kind === ts.SyntaxKind.TrueKeyword) {
        lazy = true;
      }
      if (property.initializer.kind === ts.SyntaxKind.FalseKeyword) {
        lazy = false;
      }
      continue;
    }

    if (isPropertyName(property.name, 'lazyGroup')) {
      if (ts.isStringLiteral(property.initializer)) {
        lazyGroup = property.initializer.text;
        lazy = true; // lazyGroup implies lazy
      }
      continue;
    }

    if (isPropertyName(property.name, 'compiled')) {
      if (property.initializer.kind === ts.SyntaxKind.TrueKeyword) {
        compiled = true;
      }
      if (property.initializer.kind === ts.SyntaxKind.FalseKeyword) {
        compiled = false;
      }
    }
  }

  return { preparse, lazy, lazyGroup, compiled };
}

function isPropertyName(
  propertyName: ts.PropertyName,
  expectedName: string,
): boolean {
  if (ts.isIdentifier(propertyName)) {
    return propertyName.text === expectedName;
  }
  if (ts.isStringLiteral(propertyName)) {
    return propertyName.text === expectedName;
  }
  return false;
}

function resolveStaticExpressionLiteral(
  node: ts.Expression,
  checker: ts.TypeChecker,
  seenSymbols = new Set<ts.Symbol>(),
): ts.StringLiteralLike | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node;
  }

  if (!ts.isIdentifier(node)) {
    return null;
  }

  const symbol = checker.getSymbolAtLocation(node);
  if (!symbol) {
    return null;
  }

  const resolvedSymbol =
    symbol.flags & ts.SymbolFlags.Alias
      ? checker.getAliasedSymbol(symbol)
      : symbol;
  if (seenSymbols.has(resolvedSymbol)) {
    return null;
  }
  seenSymbols.add(resolvedSymbol);

  const declarations = resolvedSymbol.declarations ?? [];
  for (const declaration of declarations) {
    if (!ts.isVariableDeclaration(declaration) || !declaration.initializer) {
      continue;
    }

    const declarationList = declaration.parent;
    if (
      !ts.isVariableDeclarationList(declarationList) ||
      (declarationList.flags & ts.NodeFlags.Const) === 0
    ) {
      continue;
    }

    const literal = resolveStaticExpressionLiteral(
      declaration.initializer,
      checker,
      seenSymbols,
    );
    if (literal) {
      return literal;
    }
  }

  return null;
}

function isExpressionFactoryType(
  type: ts.Type,
  checker: ts.TypeChecker,
  seenTypes: Set<ts.Type>,
): boolean {
  if (seenTypes.has(type)) {
    return false;
  }
  seenTypes.add(type);

  const symbolName = type.getSymbol()?.getName();
  if (symbolName === 'IExpressionFactory') {
    return true;
  }

  if (type.isUnionOrIntersection()) {
    return type.types.some((unionType) =>
      isExpressionFactoryType(unionType, checker, seenTypes),
    );
  }

  if (isExpressionFactoryByCreateSignature(type, checker)) {
    return true;
  }

  const baseTypes = getBaseTypes(type);
  return baseTypes.some((baseType) =>
    isExpressionFactoryType(baseType, checker, seenTypes),
  );
}

function getBaseTypes(type: ts.Type): readonly ts.Type[] {
  if (!('getBaseTypes' in type)) {
    return [];
  }

  const baseTypes = (type as ts.InterfaceType).getBaseTypes?.();
  return baseTypes ?? [];
}

function isExpressionFactoryByCreateSignature(
  type: ts.Type,
  checker: ts.TypeChecker,
): boolean {
  const createProperty = type.getProperty('create');
  if (!createProperty) {
    return false;
  }

  const declaration =
    createProperty.valueDeclaration ?? createProperty.declarations?.[0];
  if (!declaration) {
    return false;
  }

  const createType = checker.getTypeOfSymbolAtLocation(
    createProperty,
    declaration,
  );
  const signatures = createType.getCallSignatures();
  if (signatures.length === 0) {
    return false;
  }

  return signatures.some((signature) => {
    const secondParameter = signature.parameters[1];
    if (!secondParameter) {
      return false;
    }

    const parameterDeclaration =
      secondParameter.valueDeclaration ?? secondParameter.declarations?.[0];
    if (!parameterDeclaration) {
      return false;
    }

    const secondParameterType = checker.getTypeOfSymbolAtLocation(
      secondParameter,
      parameterDeclaration,
    );
    const secondParameterIsString =
      (secondParameterType.flags & _typeFlags.StringLike) !== 0;
    if (!secondParameterIsString) {
      return false;
    }

    const returnType = signature.getReturnType();
    return isExpressionLikeReturnType(returnType);
  });
}

function isExpressionLikeReturnType(type: ts.Type): boolean {
  const hasExpressionString = Boolean(type.getProperty('expressionString'));
  const hasType = Boolean(type.getProperty('type'));
  return hasExpressionString && hasType;
}
