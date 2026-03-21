import ts from 'typescript';

import { JsEspreeExpressionParser } from '@rs-x/expression-parser';

import type { AbstractExpression } from '@rs-x/expression-parser';
import { ExpressionType } from '@rs-x/expression-parser';

import {
  type ICompilerDiagnostic,
  classifyParserError,
} from '../diagnostics/expression-diagnostics';

import {
  type IExpressionSiteDetection,
  detectExpressionSites,
} from './expression-site-detector';

export interface IValidatedExpressionSite extends IExpressionSiteDetection {
  readonly diagnostics: readonly ICompilerDiagnostic[];
}

interface IResolvedType {
  readonly tsType?: ts.Type;
  readonly primitive?: 'string' | 'number' | 'boolean' | 'bigint' | 'null';
}

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

  resolveExpressionType(parsedExpression, modelType, modelType, checker, diagnostics);

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
      return resolveMultiplicationType(
        expression,
        currentContextType,
        rootModelType,
        checker,
        diagnostics,
      );

    default:
      expression.childExpressions.forEach((childExpression) => {
        resolveExpressionType(
          childExpression as AbstractExpression,
          currentContextType,
          rootModelType,
          checker,
          diagnostics,
        );
      });

      return {};
  }
}

function resolveIdentifierType(
  identifier: string,
  contextType: ts.Type,
  checker: ts.TypeChecker,
  diagnostics: ICompilerDiagnostic[],
): IResolvedType {
  const property = contextType.getProperty(identifier);
  if (!property) {
    diagnostics.push({
      category: 'semantic',
      message: `Identifier '${identifier}' does not exist on model type.`,
    });
    return {};
  }

  const declaration = property.valueDeclaration ?? property.declarations?.[0];
  if (!declaration) {
    return {};
  }

  return {
    tsType: checker.getTypeOfSymbolAtLocation(property, declaration),
  };
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

    if (segment.type === ExpressionType.Identifier) {
      currentType = resolveIdentifierType(
        segment.expressionString,
        currentType.tsType,
        checker,
        diagnostics,
      );
      continue;
    }

    if (segment.type === ExpressionType.Index) {
      const indexExpression = segment.childExpressions[0] as AbstractExpression;
      const resolvedIndexType = resolveExpressionType(
        indexExpression,
        rootModelType,
        rootModelType,
        checker,
        diagnostics,
      );
      currentType = resolveIndexedType(
        currentType.tsType,
        resolvedIndexType,
        checker,
        diagnostics,
      );
      continue;
    }

    if (segment.type === ExpressionType.Function) {
      currentType = resolveFunctionTypeFromKnownContext(
        segment,
        currentType.tsType,
        rootModelType,
        checker,
        diagnostics,
      );
      continue;
    }

    currentType = resolveExpressionType(
      segment,
      currentType.tsType,
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
  if (indexType.primitive === 'string') {
    return {};
  }

  if (indexType.primitive === 'number') {
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
  const objectExpression = functionExpression.childExpressions[0] as AbstractExpression;
  const functionNameExpression =
    functionExpression.childExpressions[1] as AbstractExpression;

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
  const fnExpression =
    functionNameExpression ??
    (functionExpression.childExpressions[1] as AbstractExpression);
  const argsContainer = functionExpression.childExpressions[2] as AbstractExpression;
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

  const functionType = checker.getTypeOfSymbolAtLocation(functionProperty, declaration);
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
    const declaration = parameter.valueDeclaration ?? parameter.declarations?.[0];
    if (!declaration) {
      return false;
    }
    const parameterType = checker.getTypeOfSymbolAtLocation(parameter, declaration);
    if (!isAssignableToParameter(resolvedArguments[i], parameterType, checker)) {
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
    return checker.isTypeAssignableTo(argumentType.tsType, parameterType);
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

function resolveMultiplicationType(
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

  if (!isNumberLike(leftType) || !isNumberLike(rightType)) {
    diagnostics.push({
      category: 'semantic',
      message:
        'Operator "*" requires both left and right operands to be number-compatible.',
    });
  }

  return { primitive: 'number' };
}

function isNumberLike(type: IResolvedType): boolean {
  if (type.primitive === 'number') {
    return true;
  }
  if (!type.tsType) {
    return false;
  }
  return (type.tsType.flags & ts.TypeFlags.NumberLike) !== 0;
}
