import ts from 'typescript';

export type ExpressionEntryPointKind = 'rsx' | 'factory-create';

export interface IExpressionSiteDetection {
  readonly kind: ExpressionEntryPointKind;
  readonly expression: string;
  readonly expressionLiteral: ts.StringLiteralLike;
  readonly callExpression: ts.CallExpression;
  readonly sourceFile: ts.SourceFile;
}

export function detectExpressionSites(
  program: ts.Program,
): IExpressionSiteDetection[] {
  const checker = program.getTypeChecker();
  const detections: IExpressionSiteDetection[] = [];

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) {
      continue;
    }

    detections.push(...detectExpressionSitesInSourceFile(sourceFile, checker));
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
  if (rsxInvocation.arguments.length !== 1) {
    return null;
  }

  const expressionLiteral = resolveStaticExpressionLiteral(
    rsxInvocation.arguments[0],
  );
  if (!expressionLiteral) {
    return null;
  }

  if (!isRsxCallee(rsxInvocation.expression, checker)) {
    return null;
  }

  return {
    kind: 'rsx',
    expression: expressionLiteral.text,
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

  if (isAliasImportedFromExpressionParser(symbol)) {
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

function isAliasImportedFromExpressionParser(symbol: ts.Symbol): boolean {
  if ((symbol.flags & ts.SymbolFlags.Alias) === 0) {
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
    expressionLiteral,
    callExpression,
    sourceFile: callExpression.getSourceFile(),
  };
}

function resolveStaticExpressionLiteral(
  node: ts.Expression,
): ts.StringLiteralLike | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node;
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
      (secondParameterType.flags & ts.TypeFlags.StringLike) !== 0;
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
