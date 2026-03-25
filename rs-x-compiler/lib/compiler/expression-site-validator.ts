import ts from 'typescript';

import type { AbstractExpression } from '@rs-x/expression-parser';
import {
  ExpressionType,
  GlobalIdentifierOwnerResolver,
  JsEspreeExpressionParser,
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
  readonly primitive?: 'string' | 'number' | 'boolean' | 'bigint' | 'null';
}

const globalIdentifierOwnerResolver = new GlobalIdentifierOwnerResolver();
const supportedDateProperties = new Set<string>([
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
  const parser = new JsEspreeExpressionParser();

  return detectExpressionSites(program).map((site) =>
    validateExpressionSite(site, checker, parser),
  );
}

export function validateExpressionSite(
  site: IExpressionSiteDetection,
  checker: ts.TypeChecker,
  parser = new JsEspreeExpressionParser(),
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

  return {
    ...site,
    diagnostics,
  };
}

function resolveModelType(
  site: IExpressionSiteDetection,
  checker: ts.TypeChecker,
): ts.Type | null {
  const modelArgument = site.callExpression.arguments[0];
  if (!modelArgument) {
    return null;
  }
  return checker.getTypeAtLocation(modelArgument);
}

function resolveExpressionType(
  expression: AbstractExpression,
  currentContextType: ts.Type,
  rootModelType: ts.Type,
  checker: ts.TypeChecker,
  diagnostics: ICompilerDiagnostic[],
): IResolvedType {
  switch (expression.type) {
    case ExpressionType.Identifier:
      return resolveIdentifierType(
        expression.expressionString,
        currentContextType,
        checker,
        diagnostics,
      );

    case ExpressionType.Member:
      return resolveMemberType(
        expression,
        currentContextType,
        rootModelType,
        checker,
        diagnostics,
      );

    case ExpressionType.Function:
      return resolveFunctionType(
        expression,
        currentContextType,
        rootModelType,
        checker,
        diagnostics,
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
      );

    case ExpressionType.Subtraction:
      return resolveNumericBinaryType(
        expression,
        currentContextType,
        rootModelType,
        checker,
        diagnostics,
        '-',
      );

    case ExpressionType.Division:
      return resolveNumericBinaryType(
        expression,
        currentContextType,
        rootModelType,
        checker,
        diagnostics,
        '/',
      );

    case ExpressionType.Remainder:
      return resolveNumericBinaryType(
        expression,
        currentContextType,
        rootModelType,
        checker,
        diagnostics,
        '%',
      );

    case ExpressionType.Exponentiation:
      return resolveNumericBinaryType(
        expression,
        currentContextType,
        rootModelType,
        checker,
        diagnostics,
        '**',
      );

    case ExpressionType.Addition:
      return resolveAdditionType(
        expression,
        currentContextType,
        rootModelType,
        checker,
        diagnostics,
      );

    case ExpressionType.UnaryPlus:
    case ExpressionType.UnaryNegation:
      return resolveNumericUnaryType(
        expression,
        currentContextType,
        rootModelType,
        checker,
        diagnostics,
      );

    default:
      return resolveNestedExpressionType(
        expression,
        currentContextType,
        rootModelType,
        checker,
        diagnostics,
      );
  }
}

function resolveIdentifierType(
  identifier: string,
  contextType: ts.Type,
  checker: ts.TypeChecker,
  diagnostics: ICompilerDiagnostic[],
): IResolvedType {
  const normalizedIdentifier = String(identifier);
  contextType = unwrapRsxExpressionType(contextType, checker);
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

function isDateLikeType(type: ts.Type, checker: ts.TypeChecker): boolean {
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

function resolveMemberType(
  memberExpression: AbstractExpression,
  contextType: ts.Type,
  rootModelType: ts.Type,
  checker: ts.TypeChecker,
  diagnostics: ICompilerDiagnostic[],
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
      );
      continue;
    }

    currentType = resolveExpressionType(
      segment,
      currentTsType,
      rootModelType,
      checker,
      diagnostics,
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

  const isNumberIndexType =
    indexType.primitive === 'number' ||
    (indexType.tsType
      ? tsTypeMatches(indexType.tsType, ts.TypeFlags.NumberLike, checker)
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
): IResolvedType {
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
  );
}

function resolveFunctionTypeFromKnownContext(
  functionExpression: AbstractExpression,
  objectType: ts.Type,
  rootModelType: ts.Type,
  checker: ts.TypeChecker,
  diagnostics: ICompilerDiagnostic[],
  functionNameExpression?: AbstractExpression,
): IResolvedType {
  objectType = unwrapRsxExpressionType(objectType, checker);
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
    ),
  );

  const matchingSignature = signatures.find((signature) =>
    doesArgumentListMatchSignature(resolvedArguments, signature, checker),
  );

  if (!matchingSignature) {
    diagnostics.push({
      category: 'semantic',
      message: `Arguments for '${functionName}' do not match any call signature.`,
    });
    return {};
  }

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

  if (parameterType.isUnionOrIntersection()) {
    return parameterType.types.some((type) =>
      isPrimitiveAssignable(primitive, type),
    );
  }

  switch (primitive) {
    case 'string':
      return (parameterType.flags & ts.TypeFlags.StringLike) !== 0;
    case 'number':
      return (parameterType.flags & ts.TypeFlags.NumberLike) !== 0;
    case 'boolean':
      return (parameterType.flags & ts.TypeFlags.BooleanLike) !== 0;
    case 'bigint':
      return (parameterType.flags & ts.TypeFlags.BigIntLike) !== 0;
    case 'null':
      return (parameterType.flags & ts.TypeFlags.Null) !== 0;
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
): IResolvedType {
  const leftExpression = expression.childExpressions[0] as AbstractExpression;
  const rightExpression = expression.childExpressions[1] as AbstractExpression;

  const leftType = resolveExpressionType(
    leftExpression,
    contextType,
    rootModelType,
    checker,
    diagnostics,
  );
  const rightType = resolveExpressionType(
    rightExpression,
    contextType,
    rootModelType,
    checker,
    diagnostics,
  );

  if (!isNumberLike(leftType, checker) || !isNumberLike(rightType, checker)) {
    diagnostics.push({
      category: 'semantic',
      message: `Operator "${operator}" requires both left and right operands to be number-compatible.`,
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
): IResolvedType {
  const leftExpression = expression.childExpressions[0] as AbstractExpression;
  const rightExpression = expression.childExpressions[1] as AbstractExpression;

  const leftType = resolveExpressionType(
    leftExpression,
    contextType,
    rootModelType,
    checker,
    diagnostics,
  );
  const rightType = resolveExpressionType(
    rightExpression,
    contextType,
    rootModelType,
    checker,
    diagnostics,
  );

  if (isStringLike(leftType, checker) || isStringLike(rightType, checker)) {
    return { primitive: 'string' };
  }

  if (isNumberLike(leftType, checker) && isNumberLike(rightType, checker)) {
    return { primitive: 'number' };
  }

  diagnostics.push({
    category: 'semantic',
    message:
      'Operator "+" requires compatible operands (both number-like or at least one string-like).',
  });

  return {};
}

function resolveNumericUnaryType(
  expression: AbstractExpression,
  contextType: ts.Type,
  rootModelType: ts.Type,
  checker: ts.TypeChecker,
  diagnostics: ICompilerDiagnostic[],
): IResolvedType {
  const operandExpression = expression
    .childExpressions[0] as AbstractExpression;
  const operandType = resolveExpressionType(
    operandExpression,
    contextType,
    rootModelType,
    checker,
    diagnostics,
  );

  if (!isNumberLike(operandType, checker)) {
    diagnostics.push({
      category: 'semantic',
      message: 'Unary numeric operator requires a number-compatible operand.',
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
  return tsTypeMatches(type.tsType, ts.TypeFlags.NumberLike, checker);
}

function isStringLike(type: IResolvedType, checker: ts.TypeChecker): boolean {
  if (type.primitive === 'string') {
    return true;
  }
  if (!type.tsType) {
    return false;
  }
  return tsTypeMatches(type.tsType, ts.TypeFlags.StringLike, checker);
}

function resolveNestedExpressionType(
  expression: AbstractExpression,
  currentContextType: ts.Type,
  rootModelType: ts.Type,
  checker: ts.TypeChecker,
  diagnostics: ICompilerDiagnostic[],
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
  if (
    (symbolName === 'IExpression' ||
      symbolName === 'Promise' ||
      symbolName === 'Observable' ||
      symbolName === 'Subject' ||
      symbolName === 'BehaviorSubject') &&
    typeArguments.length > 0
  ) {
    return typeArguments[0];
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
