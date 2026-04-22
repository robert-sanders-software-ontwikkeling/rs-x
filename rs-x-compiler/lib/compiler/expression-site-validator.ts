import ts from 'typescript';

import { effectiveTypeFlags as _typeFlags } from './effective-typescript';
export { setEffectiveTypeScript } from './effective-typescript';

import type { AbstractExpression } from '@rs-x/expression-parser';
import {
  ExpressionType,
  GlobalIdentifierOwnerResolver,
  JsEspreeExpressionParser,
  JsExpressionAstParser,
} from '@rs-x/expression-parser';

import {
  classifyParserError,
  type ICompilerDiagnostic,
} from '../diagnostics/expression-diagnostics';

import {
  detectExpressionSites,
  type IExpressionSiteDetection,
} from './expression-site-detector';

export interface IValidatedExpressionSite extends IExpressionSiteDetection {
  readonly diagnostics: readonly ICompilerDiagnostic[];
}

interface IResolvedType {
  readonly tsType?: ts.Type;
  readonly primitive?:
    | 'string'
    | 'number'
    | 'boolean'
    | 'bigint'
    | 'null'
    | 'function';
}

type LocalBindings = ReadonlyMap<string, ts.Type>;

const emptyLocalBindings: LocalBindings = new Map();

const globalIdentifierOwnerResolver = new GlobalIdentifierOwnerResolver();
export const supportedDateProperties = new Set<string>([
  'year',
  'utcYear',
  'month',
  'utcMonth',
  'date',
  'utcDate',
  'hours',
  'utcHours',
  'minutes',
  'utcMinutes',
  'seconds',
  'utcSeconds',
  'milliseconds',
  'utcMilliseconds',
  'time',
]);

export function validateExpressionSites(
  program: ts.Program,
): IValidatedExpressionSite[] {
  const checker = program.getTypeChecker();
  const parser = new JsEspreeExpressionParser(new JsExpressionAstParser());

  return detectExpressionSites(program).map((site) =>
    validateExpressionSite(site, checker, parser),
  );
}

export function validateExpressionSite(
  site: IExpressionSiteDetection,
  checker: ts.TypeChecker,
  parser = new JsEspreeExpressionParser(new JsExpressionAstParser()),
): IValidatedExpressionSite {
  const diagnostics: ICompilerDiagnostic[] = [];
  const modelType = resolveModelType(site, checker);

  if (!modelType) {
    diagnostics.push({
      category: 'semantic',
      message: 'Could not resolve model type for expression entry point.',
    });

    return {
      ...site,
      diagnostics,
    };
  }

  let parsedExpression: AbstractExpression;
  try {
    parsedExpression = parser.parse(site.expression);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown parser error';
    diagnostics.push(classifyParserError(site.expression, message));

    return {
      ...site,
      diagnostics,
    };
  }

  resolveExpressionType(
    parsedExpression,
    modelType,
    modelType,
    checker,
    diagnostics,
  );

  validateDeclaredReturnType({
    checker,
    diagnostics,
    modelType,
    parsedExpression,
    site,
  });

  return {
    ...site,
    diagnostics,
  };
}

function resolveModelType(
  site: IExpressionSiteDetection,
  checker: ts.TypeChecker,
): ts.Type | null {
  if (site.modelTypeNode) {
    return checker.getTypeFromTypeNode(site.modelTypeNode);
  }

  const modelArgument = site.callExpression?.arguments[0];
  if (!modelArgument) {
    return null;
  }
  return checker.getTypeAtLocation(modelArgument);
}

function validateDeclaredReturnType(args: {
  checker: ts.TypeChecker;
  diagnostics: ICompilerDiagnostic[];
  modelType: ts.Type;
  parsedExpression: AbstractExpression;
  site: IExpressionSiteDetection;
}): void {
  const { checker, diagnostics, modelType, parsedExpression, site } = args;
  if (!site.returnTypeNode) {
    return;
  }

  const actualResolvedType = resolveExpressionType(
    parsedExpression,
    modelType,
    modelType,
    checker,
    [],
  );
  const actualType = resolveResolvedTypeToTsType(actualResolvedType, checker);
  if (!actualType) {
    return;
  }

  const expectedType = checker.getTypeFromTypeNode(site.returnTypeNode);
  if (!checker.isTypeAssignableTo(actualType, expectedType)) {
    diagnostics.push({
      category: 'semantic',
      message: `Expression result is not assignable to declared return type '${checker.typeToString(
        expectedType,
      )}'.`,
    });
  }
}

function resolveResolvedTypeToTsType(
  resolved: IResolvedType,
  checker: ts.TypeChecker,
): ts.Type | null {
  if (resolved.tsType) {
    return resolved.tsType;
  }

  switch (resolved.primitive) {
    case 'string':
      return checker.getStringType();
    case 'number':
      return checker.getNumberType();
    case 'boolean':
      return checker.getBooleanType();
    case 'bigint':
      return checker.getBigIntType();
    default:
      return null;
  }
}

function resolveExpressionType(
  expression: AbstractExpression,
  currentContextType: ts.Type,
  rootModelType: ts.Type,
  checker: ts.TypeChecker,
  diagnostics: ICompilerDiagnostic[],
  localBindings: LocalBindings = emptyLocalBindings,
): IResolvedType {
  switch (expression.type) {
    case ExpressionType.Identifier:
      return resolveIdentifierType(
        expression.expressionString,
        currentContextType,
        checker,
        diagnostics,
        localBindings,
      );

    case ExpressionType.Member:
      return resolveMemberType(
        expression,
        currentContextType,
        rootModelType,
        checker,
        diagnostics,
        localBindings,
      );

    case ExpressionType.Function:
      return resolveFunctionType(
        expression,
        currentContextType,
        rootModelType,
        checker,
        diagnostics,
        localBindings,
      );

    case ExpressionType.Number:
      return { primitive: 'number' };

    case ExpressionType.String:
      return { primitive: 'string' };

    case ExpressionType.Boolean:
      return { primitive: 'boolean' };

    case ExpressionType.BigInt:
      return { primitive: 'bigint' };

    case ExpressionType.Null:
      return { primitive: 'null' };

    case ExpressionType.Multiplication:
      return resolveNumericBinaryType(
        expression,
        currentContextType,
        rootModelType,
        checker,
        diagnostics,
        '*',
        localBindings,
      );

    case ExpressionType.Subtraction:
      return resolveNumericBinaryType(
        expression,
        currentContextType,
        rootModelType,
        checker,
        diagnostics,
        '-',
        localBindings,
      );

    case ExpressionType.Division:
      return resolveNumericBinaryType(
        expression,
        currentContextType,
        rootModelType,
        checker,
        diagnostics,
        '/',
        localBindings,
      );

    case ExpressionType.Remainder:
      return resolveNumericBinaryType(
        expression,
        currentContextType,
        rootModelType,
        checker,
        diagnostics,
        '%',
        localBindings,
      );

    case ExpressionType.Exponentiation:
      return resolveNumericBinaryType(
        expression,
        currentContextType,
        rootModelType,
        checker,
        diagnostics,
        '**',
        localBindings,
      );

    case ExpressionType.Addition:
      return resolveAdditionType(
        expression,
        currentContextType,
        rootModelType,
        checker,
        diagnostics,
        localBindings,
      );

    case ExpressionType.UnaryPlus:
    case ExpressionType.UnaryNegation:
      return resolveNumericUnaryType(
        expression,
        currentContextType,
        rootModelType,
        checker,
        diagnostics,
        localBindings,
      );

    default:
      return resolveNestedExpressionType(
        expression,
        currentContextType,
        rootModelType,
        checker,
        diagnostics,
        localBindings,
      );
  }
}

function resolveIdentifierType(
  identifier: string,
  contextType: ts.Type,
  checker: ts.TypeChecker,
  diagnostics: ICompilerDiagnostic[],
  localBindings: LocalBindings,
): IResolvedType {
  const normalizedIdentifier = String(identifier);
  const localBindingType = localBindings.get(normalizedIdentifier);
  if (localBindingType) {
    return {
      tsType: unwrapRsxExpressionType(localBindingType, checker),
    };
  }

  contextType = checker.getNonNullableType(
    unwrapRsxExpressionType(contextType, checker),
  );
  // If the context resolved to any/unknown (e.g. inferred from unresolved `this`
  // in a JS object literal inside an in-memory program), allow any identifier.
  if (contextType.flags & (_typeFlags.Any | _typeFlags.Unknown)) {
    return {};
  }
  const property = contextType.getProperty(normalizedIdentifier);
  if (!property) {
    const mapValueType = resolveMapValueType(contextType, checker);
    if (mapValueType) {
      return mapValueType;
    }

    if (
      supportedDateProperties.has(normalizedIdentifier) &&
      isDateLikeType(contextType, checker)
    ) {
      return { primitive: 'number' };
    }

    const indexedType = resolveIdentifierAsIndexedAccess(
      normalizedIdentifier,
      contextType,
      checker,
    );
    if (indexedType) {
      return indexedType;
    }

    if (isAllowedGlobalIdentifier(normalizedIdentifier)) {
      return {};
    }

    diagnostics.push({
      category: 'semantic',
      message: `Identifier '${normalizedIdentifier}' does not exist on model type.`,
      token: normalizedIdentifier,
    });
    return {};
  }

  const declaration = property.valueDeclaration ?? property.declarations?.[0];
  if (!declaration) {
    return {};
  }

  return {
    tsType: unwrapRsxExpressionType(
      checker.getTypeOfSymbolAtLocation(property, declaration),
      checker,
    ),
  };
}

function resolveIdentifierAsIndexedAccess(
  identifier: string,
  contextType: ts.Type,
  checker: ts.TypeChecker,
): IResolvedType | null {
  const numericIdentifier = Number(identifier);
  const isCanonicalNumberIdentifier =
    Number.isInteger(numericIdentifier) &&
    String(numericIdentifier) === identifier;
  if (isCanonicalNumberIdentifier) {
    const numberIndexType = contextType.getNumberIndexType();
    if (numberIndexType) {
      return { tsType: unwrapRsxExpressionType(numberIndexType, checker) };
    }
  }

  const stringIndexType = contextType.getStringIndexType();
  if (stringIndexType) {
    return { tsType: unwrapRsxExpressionType(stringIndexType, checker) };
  }

  return null;
}

function isAllowedGlobalIdentifier(identifier: string): boolean {
  return globalIdentifierOwnerResolver.resolve(identifier) !== null;
}

export function isDateLikeType(
  type: ts.Type,
  checker: ts.TypeChecker,
): boolean {
  type = unwrapRsxExpressionType(type, checker);

  if (type.isUnionOrIntersection()) {
    return type.types.some((memberType) => isDateLikeType(memberType, checker));
  }

  // Runtime DatePropertyAccessor applies to Date instances. We approximate that
  // contract by checking for core Date getters/setters on the static type.
  return Boolean(
    type.getProperty('getFullYear') &&
    type.getProperty('setFullYear') &&
    type.getProperty('getTime') &&
    type.getProperty('setTime'),
  );
}

function resolveMapValueType(
  type: ts.Type,
  checker: ts.TypeChecker,
): IResolvedType | null {
  type = unwrapRsxExpressionType(type, checker);

  if (type.isUnionOrIntersection()) {
    for (const memberType of type.types) {
      const memberMapValueType = resolveMapValueType(memberType, checker);
      if (memberMapValueType) {
        return memberMapValueType;
      }
    }
    return null;
  }

  const symbolName = (type.aliasSymbol ?? type.getSymbol())?.getName();
  if (symbolName !== 'Map') {
    return null;
  }

  const typeArguments = checker.getTypeArguments(type as ts.TypeReference);
  if (typeArguments.length < 2) {
    return {};
  }

  return { tsType: unwrapRsxExpressionType(typeArguments[1], checker) };
}

function resolveSetValueType(
  type: ts.Type,
  checker: ts.TypeChecker,
): IResolvedType | null {
  type = unwrapRsxExpressionType(type, checker);

  if (type.isUnionOrIntersection()) {
    for (const memberType of type.types) {
      const memberSetValueType = resolveSetValueType(memberType, checker);
      if (memberSetValueType) {
        return memberSetValueType;
      }
    }
    return null;
  }

  const symbolName = (type.aliasSymbol ?? type.getSymbol())?.getName();
  if (symbolName !== 'Set') {
    return null;
  }

  const typeArguments = checker.getTypeArguments(type as ts.TypeReference);
  if (typeArguments.length < 1) {
    return {};
  }

  return { tsType: unwrapRsxExpressionType(typeArguments[0], checker) };
}

function resolveMemberType(
  memberExpression: AbstractExpression,
  contextType: ts.Type,
  rootModelType: ts.Type,
  checker: ts.TypeChecker,
  diagnostics: ICompilerDiagnostic[],
  localBindings: LocalBindings,
): IResolvedType {
  const segments = memberExpression.childExpressions as AbstractExpression[];
  if (segments.length === 0) {
    return {};
  }

  let currentType = resolveExpressionType(
    segments[0],
    contextType,
    rootModelType,
    checker,
    diagnostics,
    localBindings,
  );

  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];

    if (!currentType.tsType) {
      return {};
    }
    const currentTsType = unwrapRsxExpressionType(currentType.tsType, checker);

    if (segment.type === ExpressionType.Identifier) {
      currentType = resolveIdentifierType(
        segment.expressionString,
        currentTsType,
        checker,
        diagnostics,
        localBindings,
      );
      continue;
    }

    if (segment.type === ExpressionType.ComputedIndex) {
      const indexExpression = segment.childExpressions[0] as AbstractExpression;
      const resolvedIndexType = resolveExpressionType(
        indexExpression,
        rootModelType,
        rootModelType,
        checker,
        diagnostics,
        localBindings,
      );
      currentType = resolveIndexedType(
        currentTsType,
        resolvedIndexType,
        checker,
        diagnostics,
      );
      continue;
    }

    if (segment.type === ExpressionType.Function) {
      currentType = resolveFunctionTypeFromKnownContext(
        segment,
        currentTsType,
        rootModelType,
        checker,
        diagnostics,
        undefined,
        localBindings,
      );
      continue;
    }

    currentType = resolveExpressionType(
      segment,
      currentTsType,
      rootModelType,
      checker,
      diagnostics,
      localBindings,
    );
  }

  return currentType;
}

function resolveIndexedType(
  targetType: ts.Type,
  indexType: IResolvedType,
  checker: ts.TypeChecker,
  diagnostics: ICompilerDiagnostic[],
): IResolvedType {
  targetType = unwrapRsxExpressionType(targetType, checker);
  const mapValueType = resolveMapValueType(targetType, checker);
  if (mapValueType) {
    return mapValueType;
  }

  const setValueType = resolveSetValueType(targetType, checker);
  if (setValueType) {
    return setValueType;
  }

  const isNumberIndexType =
    indexType.primitive === 'number' ||
    (indexType.tsType
      ? tsTypeMatches(indexType.tsType, _typeFlags.NumberLike, checker)
      : false);

  if (isNumberIndexType) {
    const numberIndexType = targetType.getNumberIndexType();
    if (!numberIndexType) {
      diagnostics.push({
        category: 'semantic',
        message: 'Index access with number is not valid for this type.',
      });
      return {};
    }
    return { tsType: numberIndexType };
  }

  if (indexType.primitive === 'string') {
    return {};
  }

  const stringIndexType = targetType.getStringIndexType();
  if (!stringIndexType) {
    diagnostics.push({
      category: 'semantic',
      message: 'Index access is not valid for this type.',
    });
    return {};
  }

  return { tsType: stringIndexType };
}

function resolveFunctionType(
  functionExpression: AbstractExpression,
  contextType: ts.Type,
  rootModelType: ts.Type,
  checker: ts.TypeChecker,
  diagnostics: ICompilerDiagnostic[],
  localBindings: LocalBindings,
): IResolvedType {
  if (functionExpression.childExpressions.length < 3) {
    // Function-valued expression (for example an inline lambda callback),
    // not a function call site.
    return { primitive: 'function' };
  }

  const objectExpression = functionExpression
    .childExpressions[0] as AbstractExpression;
  const functionNameExpression = functionExpression
    .childExpressions[1] as AbstractExpression;

  const objectType =
    objectExpression.type === ExpressionType.Null
      ? { tsType: contextType }
      : resolveExpressionType(
          objectExpression,
          contextType,
          rootModelType,
          checker,
          diagnostics,
          localBindings,
        );

  if (!objectType.tsType) {
    return {};
  }

  return resolveFunctionTypeFromKnownContext(
    functionExpression,
    objectType.tsType,
    rootModelType,
    checker,
    diagnostics,
    functionNameExpression,
    localBindings,
  );
}

function resolveFunctionTypeFromKnownContext(
  functionExpression: AbstractExpression,
  objectType: ts.Type,
  rootModelType: ts.Type,
  checker: ts.TypeChecker,
  diagnostics: ICompilerDiagnostic[],
  functionNameExpression?: AbstractExpression,
  localBindings: LocalBindings = emptyLocalBindings,
): IResolvedType {
  objectType = unwrapRsxExpressionType(objectType, checker);
  // If the object resolved to any/unknown we cannot inspect its properties.
  if (objectType.flags & (_typeFlags.Any | _typeFlags.Unknown)) {
    return {};
  }
  const fnExpression =
    functionNameExpression ??
    (functionExpression.childExpressions[1] as AbstractExpression);
  const argsContainer = functionExpression
    .childExpressions[2] as AbstractExpression;
  const argumentExpressions = (argsContainer?.childExpressions ??
    []) as AbstractExpression[];

  const functionName = fnExpression.expressionString;
  const functionProperty = objectType.getProperty(functionName);
  if (!functionProperty) {
    diagnostics.push({
      category: 'semantic',
      message: `Function '${functionName}' does not exist on target type.`,
      token: functionName,
    });
    return {};
  }

  const declaration =
    functionProperty.valueDeclaration ?? functionProperty.declarations?.[0];
  if (!declaration) {
    return {};
  }

  const functionType = checker.getTypeOfSymbolAtLocation(
    functionProperty,
    declaration,
  );
  const signatures = functionType.getCallSignatures();
  if (signatures.length === 0) {
    diagnostics.push({
      category: 'semantic',
      message: `'${functionName}' is not callable.`,
      token: functionName,
    });
    return {};
  }

  const resolvedArguments = argumentExpressions.map((argumentExpression) =>
    resolveExpressionType(
      argumentExpression,
      rootModelType,
      rootModelType,
      checker,
      diagnostics,
      localBindings,
    ),
  );

  const matchingSignature = signatures.find((signature) =>
    doesArgumentListMatchSignature(resolvedArguments, signature, checker),
  );

  if (!matchingSignature) {
    diagnostics.push({
      category: 'semantic',
      message: `Arguments for '${functionName}' do not match any call signature.`,
      token: functionName,
    });
    return {};
  }

  validateInlineFunctionArguments(
    argumentExpressions,
    matchingSignature,
    rootModelType,
    checker,
    diagnostics,
    localBindings,
  );

  return {
    tsType: matchingSignature.getReturnType(),
  };
}

function doesArgumentListMatchSignature(
  resolvedArguments: IResolvedType[],
  signature: ts.Signature,
  checker: ts.TypeChecker,
): boolean {
  const parameters = signature.getParameters();
  if (resolvedArguments.length < getRequiredParameterCount(parameters)) {
    return false;
  }

  if (resolvedArguments.length > parameters.length) {
    return false;
  }

  for (let i = 0; i < resolvedArguments.length; i++) {
    const parameter = parameters[i];
    if (!parameter) {
      return false;
    }
    const declaration =
      parameter.valueDeclaration ?? parameter.declarations?.[0];
    if (!declaration) {
      return false;
    }
    const parameterType = checker.getTypeOfSymbolAtLocation(
      parameter,
      declaration,
    );
    if (
      !isAssignableToParameter(resolvedArguments[i], parameterType, checker)
    ) {
      return false;
    }
  }

  return true;
}

function getRequiredParameterCount(parameters: ts.Symbol[]): number {
  return parameters.filter((parameter) => {
    const declaration = parameter.valueDeclaration as
      | ts.ParameterDeclaration
      | undefined;
    return !declaration?.questionToken && !declaration?.initializer;
  }).length;
}

function validateInlineFunctionArguments(
  argumentExpressions: readonly AbstractExpression[],
  signature: ts.Signature,
  rootModelType: ts.Type,
  checker: ts.TypeChecker,
  diagnostics: ICompilerDiagnostic[],
  localBindings: LocalBindings,
): void {
  const parameters = signature.getParameters();

  for (let index = 0; index < argumentExpressions.length; index += 1) {
    const argumentExpression = argumentExpressions[index];
    if (argumentExpression?.type !== ExpressionType.Function) {
      continue;
    }

    const parameter = parameters[index];
    if (!parameter) {
      continue;
    }

    const declaration =
      parameter.valueDeclaration ?? parameter.declarations?.[0];
    if (!declaration) {
      continue;
    }

    validateInlineFunctionExpression(
      argumentExpression,
      checker.getTypeOfSymbolAtLocation(parameter, declaration),
      rootModelType,
      checker,
      diagnostics,
      localBindings,
    );
  }
}

function validateInlineFunctionExpression(
  functionExpression: AbstractExpression,
  parameterType: ts.Type,
  rootModelType: ts.Type,
  checker: ts.TypeChecker,
  diagnostics: ICompilerDiagnostic[],
  outerBindings: LocalBindings,
): void {
  const inlineFunction = parseInlineFunctionParts(
    functionExpression.expressionString,
  );
  if (!inlineFunction) {
    return;
  }

  const signature = pickInlineFunctionSignature(
    unwrapRsxExpressionType(parameterType, checker).getCallSignatures(),
    inlineFunction.parameterNames.length,
  );
  if (!signature) {
    return;
  }

  const bindings = new Map(outerBindings);
  const parameters = signature.getParameters();
  for (
    let index = 0;
    index < inlineFunction.parameterNames.length;
    index += 1
  ) {
    const parameterName = inlineFunction.parameterNames[index];
    const parameter = parameters[index];
    if (!parameter || !parameterName) {
      continue;
    }

    const declaration =
      parameter.valueDeclaration ?? parameter.declarations?.[0];
    if (!declaration) {
      continue;
    }

    bindings.set(
      parameterName,
      checker.getTypeOfSymbolAtLocation(parameter, declaration),
    );
  }

  const parser = new JsEspreeExpressionParser(new JsExpressionAstParser());
  for (const bodyExpression of inlineFunction.bodyExpressions) {
    try {
      resolveExpressionType(
        parser.parse(bodyExpression),
        rootModelType,
        rootModelType,
        checker,
        diagnostics,
        bindings,
      );
    } catch {
      // The outer expression parser already reports syntax errors.
    }
  }
}

function parseInlineFunctionParts(
  expressionSource: string,
): { parameterNames: string[]; bodyExpressions: string[] } | null {
  const sourceText = `const __rsx_inline__ = ${expressionSource};`;
  const sourceFile = ts.createSourceFile(
    '__rsx_inline__.ts',
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const statement = sourceFile.statements[0];
  if (!statement || !ts.isVariableStatement(statement)) {
    return null;
  }

  const declaration = statement.declarationList.declarations[0];
  const initializer = declaration?.initializer;
  if (
    !initializer ||
    (!ts.isArrowFunction(initializer) && !ts.isFunctionExpression(initializer))
  ) {
    return null;
  }

  const parameterNames = initializer.parameters.flatMap((parameter) =>
    ts.isIdentifier(parameter.name) ? [parameter.name.text] : [],
  );

  if (ts.isBlock(initializer.body)) {
    return {
      parameterNames,
      bodyExpressions: initializer.body.statements.flatMap((statementNode) =>
        ts.isReturnStatement(statementNode) && statementNode.expression
          ? [statementNode.expression.getText(sourceFile)]
          : [],
      ),
    };
  }

  return {
    parameterNames,
    bodyExpressions: [initializer.body.getText(sourceFile)],
  };
}

function pickInlineFunctionSignature(
  signatures: readonly ts.Signature[],
  parameterCount: number,
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
      parameterCount <= parameters.length ||
      (hasRest && parameterCount >= parameters.length - 1)
    ) {
      return signature;
    }
  }

  return signatures[0] ?? null;
}

function isAssignableToParameter(
  argumentType: IResolvedType,
  parameterType: ts.Type,
  checker: ts.TypeChecker,
): boolean {
  if (argumentType.tsType) {
    return checker.isTypeAssignableTo(
      unwrapRsxExpressionType(argumentType.tsType, checker),
      parameterType,
    );
  }

  if (!argumentType.primitive) {
    return false;
  }

  return isPrimitiveAssignable(argumentType.primitive, parameterType);
}

function isPrimitiveAssignable(
  primitive: IResolvedType['primitive'],
  parameterType: ts.Type,
): boolean {
  if (!primitive) {
    return false;
  }

  if (
    (parameterType.flags &
      (_typeFlags.Any | _typeFlags.Unknown | _typeFlags.TypeParameter)) !==
    0
  ) {
    return true;
  }

  if (parameterType.isUnionOrIntersection()) {
    return parameterType.types.some((type) =>
      isPrimitiveAssignable(primitive, type),
    );
  }

  switch (primitive) {
    case 'string':
      return (parameterType.flags & _typeFlags.StringLike) !== 0;
    case 'number':
      return (parameterType.flags & _typeFlags.NumberLike) !== 0;
    case 'boolean':
      return (parameterType.flags & _typeFlags.BooleanLike) !== 0;
    case 'bigint':
      return (parameterType.flags & _typeFlags.BigIntLike) !== 0;
    case 'null':
      return (parameterType.flags & _typeFlags.Null) !== 0;
    case 'function':
      return parameterType.getCallSignatures().length > 0;
    default:
      return false;
  }
}

function resolveNumericBinaryType(
  expression: AbstractExpression,
  contextType: ts.Type,
  rootModelType: ts.Type,
  checker: ts.TypeChecker,
  diagnostics: ICompilerDiagnostic[],
  operator: '*' | '-' | '/' | '%' | '**',
  localBindings: LocalBindings,
): IResolvedType {
  const leftExpression = expression.childExpressions[0] as AbstractExpression;
  const rightExpression = expression.childExpressions[1] as AbstractExpression;

  const leftType = resolveExpressionType(
    leftExpression,
    contextType,
    rootModelType,
    checker,
    diagnostics,
    localBindings,
  );
  const rightType = resolveExpressionType(
    rightExpression,
    contextType,
    rootModelType,
    checker,
    diagnostics,
    localBindings,
  );

  if (!isNumberLike(leftType, checker) || !isNumberLike(rightType, checker)) {
    const token = pickIncompatibleOperandToken({
      leftExpression,
      leftType,
      rightExpression,
      rightType,
      checker,
    });
    diagnostics.push({
      category: 'semantic',
      message: `Operator "${operator}" requires both left and right operands to be number-compatible.`,
      token,
    });
  }

  return { primitive: 'number' };
}

function resolveAdditionType(
  expression: AbstractExpression,
  contextType: ts.Type,
  rootModelType: ts.Type,
  checker: ts.TypeChecker,
  diagnostics: ICompilerDiagnostic[],
  localBindings: LocalBindings,
): IResolvedType {
  const leftExpression = expression.childExpressions[0] as AbstractExpression;
  const rightExpression = expression.childExpressions[1] as AbstractExpression;

  const leftType = resolveExpressionType(
    leftExpression,
    contextType,
    rootModelType,
    checker,
    diagnostics,
    localBindings,
  );
  const rightType = resolveExpressionType(
    rightExpression,
    contextType,
    rootModelType,
    checker,
    diagnostics,
    localBindings,
  );

  if (isStringLike(leftType, checker) || isStringLike(rightType, checker)) {
    return { primitive: 'string' };
  }

  if (isNumberLike(leftType, checker) && isNumberLike(rightType, checker)) {
    return { primitive: 'number' };
  }

  if (
    hasMissingIdentifierDiagnostic(leftExpression, diagnostics) ||
    hasMissingIdentifierDiagnostic(rightExpression, diagnostics)
  ) {
    return {};
  }

  const token = pickIncompatibleOperandToken({
    leftExpression,
    leftType,
    rightExpression,
    rightType,
    checker,
  });

  diagnostics.push({
    category: 'semantic',
    message:
      'Operator "+" requires compatible operands (both number-like or at least one string-like).',
    token,
  });

  return {};
}

function hasMissingIdentifierDiagnostic(
  expression: AbstractExpression,
  diagnostics: ICompilerDiagnostic[],
): boolean {
  if (expression.type === ExpressionType.Identifier) {
    const identifier = expression.expressionString;
    const expectedMessage = `Identifier '${identifier}' does not exist on model type.`;
    return diagnostics.some(
      (diagnostic) =>
        diagnostic.category === 'semantic' &&
        diagnostic.message === expectedMessage,
    );
  }

  return expression.childExpressions.some((childExpression) =>
    hasMissingIdentifierDiagnostic(
      childExpression as AbstractExpression,
      diagnostics,
    ),
  );
}

function resolveNumericUnaryType(
  expression: AbstractExpression,
  contextType: ts.Type,
  rootModelType: ts.Type,
  checker: ts.TypeChecker,
  diagnostics: ICompilerDiagnostic[],
  localBindings: LocalBindings,
): IResolvedType {
  const operandExpression = expression
    .childExpressions[0] as AbstractExpression;
  const operandType = resolveExpressionType(
    operandExpression,
    contextType,
    rootModelType,
    checker,
    diagnostics,
    localBindings,
  );

  if (!isNumberLike(operandType, checker)) {
    diagnostics.push({
      category: 'semantic',
      message: 'Unary numeric operator requires a number-compatible operand.',
      token:
        operandExpression.type === ExpressionType.Identifier
          ? operandExpression.expressionString
          : undefined,
    });
  }

  return { primitive: 'number' };
}

function isNumberLike(type: IResolvedType, checker: ts.TypeChecker): boolean {
  if (type.primitive === 'number') {
    return true;
  }
  if (!type.tsType) {
    return false;
  }
  const unwrappedType = unwrapRsxExpressionType(type.tsType, checker);
  if ((unwrappedType.flags & _typeFlags.TypeParameter) !== 0) {
    const constraint = checker.getBaseConstraintOfType(unwrappedType);
    if (!constraint) {
      return true;
    }

    return isNumberLike({ tsType: constraint }, checker);
  }
  if ((unwrappedType.flags & _typeFlags.Any) !== 0) {
    return true;
  }
  return tsTypeMatches(unwrappedType, _typeFlags.NumberLike, checker);
}

function isStringLike(type: IResolvedType, checker: ts.TypeChecker): boolean {
  if (type.primitive === 'string') {
    return true;
  }
  if (!type.tsType) {
    return false;
  }
  const unwrappedType = unwrapRsxExpressionType(type.tsType, checker);
  if ((unwrappedType.flags & _typeFlags.Any) !== 0) {
    return true;
  }
  return tsTypeMatches(unwrappedType, _typeFlags.StringLike, checker);
}

function pickIncompatibleOperandToken(args: {
  leftExpression: AbstractExpression;
  leftType: IResolvedType;
  rightExpression: AbstractExpression;
  rightType: IResolvedType;
  checker: ts.TypeChecker;
}): string | undefined {
  const { leftExpression, leftType, rightExpression, rightType, checker } =
    args;

  const leftCompatible =
    isNumberLike(leftType, checker) || isStringLike(leftType, checker);
  const rightCompatible =
    isNumberLike(rightType, checker) || isStringLike(rightType, checker);

  if (!leftCompatible && leftExpression.type === ExpressionType.Identifier) {
    return leftExpression.expressionString;
  }
  if (!rightCompatible && rightExpression.type === ExpressionType.Identifier) {
    return rightExpression.expressionString;
  }
  return undefined;
}

function resolveNestedExpressionType(
  expression: AbstractExpression,
  currentContextType: ts.Type,
  rootModelType: ts.Type,
  checker: ts.TypeChecker,
  diagnostics: ICompilerDiagnostic[],
  localBindings: LocalBindings,
): IResolvedType {
  const childExpressions = expression.childExpressions as AbstractExpression[];
  if (childExpressions.length === 0) {
    return {};
  }

  const resolvedChildren = childExpressions.map((childExpression) =>
    resolveExpressionType(
      childExpression,
      currentContextType,
      rootModelType,
      checker,
      diagnostics,
      localBindings,
    ),
  );

  if (resolvedChildren.length === 1) {
    return resolvedChildren[0] ?? {};
  }

  return {};
}

function tsTypeMatches(
  type: ts.Type,
  mask: ts.TypeFlags,
  checker: ts.TypeChecker,
): boolean {
  type = unwrapRsxExpressionType(type, checker);
  if ((type.flags & mask) !== 0) {
    return true;
  }

  if (type.isUnionOrIntersection()) {
    return type.types.some((memberType) =>
      tsTypeMatches(memberType, mask, checker),
    );
  }

  return false;
}

function unwrapRsxExpressionType(
  type: ts.Type,
  checker: ts.TypeChecker,
): ts.Type {
  let currentType = type;
  while (true) {
    const unwrappedType = tryUnwrapRsxExpressionType(currentType, checker);
    if (!unwrappedType || unwrappedType === currentType) {
      break;
    }
    currentType = unwrappedType;
  }

  return currentType;
}

function tryUnwrapRsxExpressionType(
  type: ts.Type,
  checker: ts.TypeChecker,
): ts.Type | null {
  const symbol = type.aliasSymbol ?? type.getSymbol();
  const symbolName = symbol?.getName();
  const typeArguments = checker.getTypeArguments(type as ts.TypeReference);
  const hasThen = Boolean(type.getProperty('then'));
  const hasSubscribe = Boolean(type.getProperty('subscribe'));
  const isKnownExpressionWrapper =
    symbolName === 'IExpression' ||
    symbolName === 'IExpressionTree' ||
    symbolName === 'Promise' ||
    symbolName === 'Observable' ||
    symbolName === 'Subject' ||
    symbolName === 'BehaviorSubject';
  const isThenableLike = hasThen;
  const isObservableLike = hasSubscribe;
  if (
    typeArguments.length > 0 &&
    (isKnownExpressionWrapper || isThenableLike || isObservableLike)
  ) {
    return typeArguments[0];
  }

  if (isKnownExpressionWrapper || isObservableLike) {
    const valueLikeType =
      tryResolveValuePropertyType(type, checker) ??
      tryResolveGetValueReturnType(type, checker);
    if (valueLikeType) {
      return valueLikeType;
    }
  }

  // Fallback for concrete expression implementations where generic args are erased.
  const hasExpressionShape =
    type.getProperty('value') &&
    type.getProperty('expressionString') &&
    type.getProperty('childExpressions') &&
    type.getProperty('changed');
  if (!hasExpressionShape) {
    return null;
  }

  const valueProperty = type.getProperty('value');
  const declaration =
    valueProperty?.valueDeclaration ?? valueProperty?.declarations?.[0];
  if (!valueProperty || !declaration) {
    return null;
  }

  return checker.getTypeOfSymbolAtLocation(valueProperty, declaration);
}

function tryResolveValuePropertyType(
  type: ts.Type,
  checker: ts.TypeChecker,
): ts.Type | null {
  const valueProperty = type.getProperty('value');
  const declaration =
    valueProperty?.valueDeclaration ?? valueProperty?.declarations?.[0];
  if (!valueProperty || !declaration) {
    return null;
  }

  return checker.getTypeOfSymbolAtLocation(valueProperty, declaration);
}

function tryResolveGetValueReturnType(
  type: ts.Type,
  checker: ts.TypeChecker,
): ts.Type | null {
  const getValueSymbol = type.getProperty('getValue');
  const declaration =
    getValueSymbol?.valueDeclaration ?? getValueSymbol?.declarations?.[0];
  if (!getValueSymbol || !declaration) {
    return null;
  }

  const getValueType = checker.getTypeOfSymbolAtLocation(
    getValueSymbol,
    declaration,
  );
  const signatures = getValueType.getCallSignatures();
  if (signatures.length === 0) {
    return null;
  }

  return signatures[0]!.getReturnType();
}
