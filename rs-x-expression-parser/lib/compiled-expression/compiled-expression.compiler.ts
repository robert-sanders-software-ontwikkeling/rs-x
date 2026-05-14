import { generate as astToString } from 'astring';
import type {
  ArrowFunctionExpression,
  Expression,
  FunctionExpression as EstreeFunctionExpression,
  Literal,
  MemberExpression,
  Node,
  Pattern,
  PrivateIdentifier,
  Super,
} from 'estree';

import { Inject, Injectable } from '@rs-x/core';

import { ExpressionType } from '../expressions/expression-parser.interface';
import type { IJsExpressionAstParser } from '../js-expression-ast-parser';
import { RsXExpressionParserInjectionTokens } from '../rs-x-expression-parser-injection-tokes';

import type {
  ICompiledExpressionCompiler,
  ICompiledExpressionPlan,
  ICompiledExpressionWatchDependency,
  ICompiledMemberChainPlan,
  ICompiledMemberChainSegment,
  ICompiledSequenceOperandPlan,
} from './compiled-expression.compiler.interface';

@Injectable()
export class CompiledExpressionCompiler implements ICompiledExpressionCompiler {
  private static readonly DEFAULT_MAX_PLAN_CACHE_SIZE = 5000;
  private static readonly MAX_PLAN_CACHE_SIZE_ENV =
    'RSX_COMPILED_PLAN_CACHE_MAX';

  private static readonly SIMPLE_IDENTIFIER_EXPRESSION_RE =
    /^[A-Za-z_$][A-Za-z0-9_$]*$/;
  private static readonly SIMPLE_MEMBER_CHAIN_EXPRESSION_RE =
    /^[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*$/;
  private static readonly RESERVED_KEYWORD_EXPRESSIONS = new Set([
    // JS literals / globals treated as special values
    'true',
    'false',
    'null',
    'undefined',
    'NaN',
    'Infinity',
    'this',

    // ECMAScript keywords that are syntactically invalid as identifier references in expression position
    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'do',
    'else',
    'enum',
    'export',
    'extends',
    'finally',
    'for',
    'function',
    'if',
    'import',
    'in',
    'instanceof',
    'let',
    'new',
    'return',
    'super',
    'switch',
    'throw',
    'try',
    'typeof',
    'var',
    'void',
    'while',
    'with',
    'yield',
  ]);

  private readonly _planCache = new Map<
    string,
    ICompiledExpressionPlan | undefined
  >();
  private readonly _maxPlanCacheSize: number;

  constructor(
    @Inject(RsXExpressionParserInjectionTokens.IJsExpressionAstParser)
    private readonly _jsExpressionAstParser: IJsExpressionAstParser,
  ) {
    this._maxPlanCacheSize = this.resolveMaxPlanCacheSize();
  }

  public tryCompile(
    expressionString: string,
  ): ICompiledExpressionPlan | undefined {
    const cached = this._planCache.get(expressionString);
    if (cached !== undefined || this._planCache.has(expressionString)) {
      if (cached !== undefined) {
        // Promote in LRU cache to keep hot items longer
        this._planCache.delete(expressionString);
        this._planCache.set(expressionString, cached);
      }
      return cached;
    }

    const compiled = this.buildPlan(expressionString);
    this.cachePlan(expressionString, compiled);
    return compiled;
  }

  private cachePlan(
    expressionString: string,
    plan: ICompiledExpressionPlan | undefined,
  ): void {
    if (this._planCache.has(expressionString)) {
      this._planCache.set(expressionString, plan);
      return;
    }

    if (this._planCache.size >= this._maxPlanCacheSize) {
      const oldestKey = this._planCache.keys().next().value;
      if (typeof oldestKey === 'string') {
        this._planCache.delete(oldestKey);
      }
    }

    this._planCache.set(expressionString, plan);
  }

  private resolveMaxPlanCacheSize(): number {
    const processEnv = this.getProcessEnv();
    const rawValue =
      processEnv?.[CompiledExpressionCompiler.MAX_PLAN_CACHE_SIZE_ENV];
    if (!rawValue) {
      return CompiledExpressionCompiler.DEFAULT_MAX_PLAN_CACHE_SIZE;
    }

    const parsedValue = Number.parseInt(rawValue, 10);
    if (Number.isNaN(parsedValue) || parsedValue <= 0) {
      return CompiledExpressionCompiler.DEFAULT_MAX_PLAN_CACHE_SIZE;
    }

    return parsedValue;
  }

  private getProcessEnv(): Record<string, string | undefined> | undefined {
    if (typeof process === 'undefined' || !process || !process.env) {
      return undefined;
    }

    return process.env as Record<string, string | undefined>;
  }

  private createUnitExpressionPlan(
    expressionString: string,
  ): ICompiledExpressionPlan {
    const plan: ICompiledExpressionPlan = {
      expressionString,
      dependencyNames: [expressionString],
      watchDependencies: [
        {
          name: expressionString,
          ownerPath: [],
          isLeaf: true,
          isMemberExpressionSegment: false,
        },
      ],
      expressionType: ExpressionType.Identifier,
      hasHiddenArgumentArray: false,
      memberChain: undefined,
      sequenceOperands: undefined,
      evaluate: (value: unknown): unknown => value,
      evaluateResolvedDependencies: (
        model: unknown,
        identifierOwnerResolver: {
          resolve: (index: unknown, context?: unknown) => unknown;
        },
        indexValueAccessor: {
          getResolvedValue: (context: unknown, index: string) => unknown;
          getValue: (context: unknown, index: string) => unknown;
        },
        normalizeDependencyValue: (
          value: unknown,
          ownerContext: unknown,
        ) => unknown,
        wrapForRuntimeEvaluation: (value: unknown) => unknown,
      ): unknown => {
        const ownerContext =
          identifierOwnerResolver.resolve(expressionString, model) ?? model;
        const resolvedValue = indexValueAccessor.getResolvedValue(
          ownerContext,
          expressionString,
        );
        const rawValue =
          resolvedValue !== undefined
            ? resolvedValue
            : indexValueAccessor.getValue(ownerContext, expressionString);
        const normalizedValue = normalizeDependencyValue(
          rawValue,
          ownerContext,
        );
        return wrapForRuntimeEvaluation(normalizedValue);
      },
    };
    return plan;
  }

  private buildPlan(
    expressionString: string,
  ): ICompiledExpressionPlan | undefined {
    if (
      CompiledExpressionCompiler.SIMPLE_IDENTIFIER_EXPRESSION_RE.test(
        expressionString,
      ) &&
      !CompiledExpressionCompiler.RESERVED_KEYWORD_EXPRESSIONS.has(
        expressionString,
      )
    ) {
      return this.createUnitExpressionPlan(expressionString);
    }

    const simpleMemberChainPlan =
      this.tryBuildSimpleMemberChainPlan(expressionString);
    if (simpleMemberChainPlan !== undefined) {
      return simpleMemberChainPlan;
    }

    let expression: Expression;
    try {
      expression = this._jsExpressionAstParser.parse(expressionString);
    } catch {
      return undefined;
    }

    const expressionType = this.mapExpressionType(expression);
    if (expressionType === undefined) {
      return undefined;
    }

    const dependencyNames = this.collectDependencies(expression);
    const watchDependencies = this.collectWatchDependencies(expression);
    const memberChain = this.tryBuildMemberChainPlan(expression, [
      ...dependencyNames,
    ]);
    const sequenceOperands = this.tryBuildSequenceOperandPlans(expression);
    const orderedDependencies = [...dependencyNames];

    const normalizedExpressionString = this.resolveExpressionString(
      expression,
      expressionString,
    );

    try {
      if (
        expressionType === ExpressionType.Identifier &&
        orderedDependencies.length === 1
      ) {
        const dependencyName = orderedDependencies[0];
        const evaluate = (value: unknown): unknown => value;
        const evaluateResolvedDependencies = (
          model: unknown,
          identifierOwnerResolver: {
            resolve: (index: unknown, context?: unknown) => unknown;
          },
          indexValueAccessor: {
            getResolvedValue: (context: unknown, index: string) => unknown;
            getValue: (context: unknown, index: string) => unknown;
          },
          normalizeDependencyValue: (
            value: unknown,
            ownerContext: unknown,
          ) => unknown,
          wrapForRuntimeEvaluation: (value: unknown) => unknown,
        ): unknown => {
          const ownerContext =
            identifierOwnerResolver.resolve(dependencyName, model) ?? model;
          const resolvedValue = indexValueAccessor.getResolvedValue(
            ownerContext,
            dependencyName,
          );
          const rawValue =
            resolvedValue !== undefined
              ? resolvedValue
              : indexValueAccessor.getValue(ownerContext, dependencyName);
          const normalizedValue = normalizeDependencyValue(
            rawValue,
            ownerContext,
          );
          return wrapForRuntimeEvaluation(normalizedValue);
        };

        return {
          expressionString: normalizedExpressionString,
          dependencyNames: orderedDependencies,
          watchDependencies,
          expressionType,
          hasHiddenArgumentArray: this.hasHiddenArgumentArray(expression),
          memberChain,
          sequenceOperands,
          evaluate,
          evaluateResolvedDependencies,
        };
      }

      const declarationLines = orderedDependencies
        .map((dependencyName) => {
          const ownerName = `${dependencyName}Owner`;
          const resolvedName = `${dependencyName}Resolved`;
          const rawName = `${dependencyName}Raw`;
          const normalizedName = `${dependencyName}Normalized`;
          const dependencyLiteral = JSON.stringify(dependencyName);
          return [
            `const ${ownerName} = identifierOwnerResolver.resolve(${dependencyLiteral}, model) ?? model;`,
            `const ${resolvedName} = indexValueAccessor.getResolvedValue(${ownerName}, ${dependencyLiteral});`,
            `const ${rawName} = ${resolvedName} !== undefined ? ${resolvedName} : indexValueAccessor.getValue(${ownerName}, ${dependencyLiteral});`,
            `const ${normalizedName} = normalizeDependencyValue(${rawName}, ${ownerName});`,
            `const ${dependencyName} = wrapForRuntimeEvaluation(${normalizedName});`,
          ].join('\n');
        })
        .join('\n');

      const evaluate = new Function(
        ...orderedDependencies,
        `return (${expressionString});`,
      ) as (...args: unknown[]) => unknown;
      const evaluateResolvedDependencies = new Function(
        'model',
        'identifierOwnerResolver',
        'indexValueAccessor',
        'normalizeDependencyValue',
        'wrapForRuntimeEvaluation',
        `${declarationLines}\nreturn (${expressionString});`,
      ) as (
        model: unknown,
        identifierOwnerResolver: unknown,
        indexValueAccessor: unknown,
        normalizeDependencyValue: unknown,
        wrapForRuntimeEvaluation: unknown,
      ) => unknown;
      return {
        expressionString: normalizedExpressionString,
        dependencyNames: orderedDependencies,
        watchDependencies,
        expressionType,
        hasHiddenArgumentArray: this.hasHiddenArgumentArray(expression),
        memberChain,
        sequenceOperands,
        evaluate,
        evaluateResolvedDependencies,
      };
    } catch {
      return undefined;
    }
  }

  private tryBuildSimpleMemberChainPlan(
    expressionString: string,
  ): ICompiledExpressionPlan | undefined {
    if (
      !CompiledExpressionCompiler.SIMPLE_MEMBER_CHAIN_EXPRESSION_RE.test(
        expressionString,
      )
    ) {
      return undefined;
    }

    const parts = expressionString.split('.');
    if (parts.length <= 1) {
      return undefined;
    }

    if (
      parts.some((part) =>
        CompiledExpressionCompiler.RESERVED_KEYWORD_EXPRESSIONS.has(part),
      )
    ) {
      return undefined;
    }

    const rootIdentifier = parts[0];
    const dependencyNames = [rootIdentifier];
    const watchDependencies: ICompiledExpressionWatchDependency[] = [
      {
        name: rootIdentifier,
        ownerPath: [],
        isLeaf: false,
        isMemberExpressionSegment: true,
      },
    ];

    const segments = parts.slice(1).map((part, index) => {
      const ownerPath = parts.slice(0, index + 1);
      watchDependencies.push({
        name: part,
        ownerPath,
        isLeaf: index === parts.length - 2,
        isMemberExpressionSegment: true,
      });
      return {
        kind: 'static' as const,
        key: part,
      };
    });

    const plan: ICompiledExpressionPlan = {
      expressionString,
      dependencyNames,
      watchDependencies,
      expressionType: ExpressionType.Member,
      hasHiddenArgumentArray: false,
      memberChain: {
        rootIdentifier,
        segments,
      },
      sequenceOperands: undefined,
      evaluate: () => undefined,
    };

    return plan;
  }

  private collectDependencies(expression: Expression): Set<string> {
    return this.collectDependenciesAndWatchDependencies(expression)
      .dependencies;
  }

  private collectWatchDependencies(
    expression: Expression,
  ): ICompiledExpressionWatchDependency[] {
    return [
      ...this.collectDependenciesAndWatchDependencies(
        expression,
      ).watchDependencies.values(),
    ];
  }

  private collectDependenciesAndWatchDependencies(expression: Expression): {
    dependencies: Set<string>;
    watchDependencies: Map<string, ICompiledExpressionWatchDependency>;
  } {
    const dependencies = new Set<string>();
    const watchDependencies = new Map<
      string,
      ICompiledExpressionWatchDependency
    >();
    const localScopeStack: string[][] = [];

    const isLocallyBound = (identifierName: string): boolean => {
      for (let i = localScopeStack.length - 1; i >= 0; i -= 1) {
        if (localScopeStack[i].includes(identifierName)) {
          return true;
        }
      }
      return false;
    };

    const visit = (
      node: unknown,
      parent?: Node,
      parentKey?: string,
      grandParent?: Node,
      grandParentKey?: string,
    ): void => {
      if (!this.isNode(node)) {
        return;
      }

      if (
        node.type === 'ArrowFunctionExpression' ||
        node.type === 'FunctionExpression'
      ) {
        const localBindings = this.collectFunctionLocalBindings(node);
        localScopeStack.push(localBindings);
        visit(node.body, node, 'body', parent, parentKey);
        localScopeStack.pop();
        return;
      }

      if (node.type === 'Identifier') {
        if (isLocallyBound(node.name)) {
          return;
        }

        if (!this.shouldSkipIdentifier(node, parent, parentKey, false)) {
          dependencies.add(node.name);
        }

        if (!this.shouldSkipIdentifier(node, parent, parentKey, true)) {
          const memberParent =
            parent?.type === 'MemberExpression' ? parent : undefined;
          const isMemberObjectSegment =
            memberParent !== undefined && parentKey === 'object';
          const isMemberPropertySegment =
            memberParent !== undefined &&
            parentKey === 'property' &&
            !memberParent.computed;
          const isStaticCalleeProperty =
            isMemberPropertySegment &&
            (grandParent?.type === 'CallExpression' ||
              grandParent?.type === 'NewExpression') &&
            grandParentKey === 'callee';
          if (!isStaticCalleeProperty) {
            const ownerPath = isMemberPropertySegment
              ? this.getStaticPath(memberParent.object)
              : [];
            if (ownerPath.length > 0 && isLocallyBound(ownerPath[0])) {
              return;
            }
            const dependencyId = `${ownerPath.join('.')}|${node.name}`;
            const existing = watchDependencies.get(dependencyId);
            const dependency: ICompiledExpressionWatchDependency = {
              name: node.name,
              ownerPath,
              isLeaf: !isMemberObjectSegment && (existing?.isLeaf ?? true),
              isMemberExpressionSegment:
                isMemberObjectSegment ||
                isMemberPropertySegment ||
                (existing?.isMemberExpressionSegment ?? false),
            };
            watchDependencies.set(dependencyId, dependency);
          }
        }
      }

      const recordNode = node as unknown as Record<string, unknown>;
      for (const key in recordNode) {
        if (!Object.prototype.hasOwnProperty.call(recordNode, key)) {
          continue;
        }
        if (
          key === 'loc' ||
          key === 'range' ||
          key === 'start' ||
          key === 'end'
        ) {
          continue;
        }

        const value = recordNode[key];
        if (Array.isArray(value)) {
          for (let i = 0; i < value.length; i++) {
            visit(value[i], node, key, parent, parentKey);
          }
          continue;
        }

        visit(value, node, key, parent, parentKey);
      }
    };

    visit(expression);
    return { dependencies, watchDependencies };
  }

  private collectFunctionLocalBindings(
    functionNode: ArrowFunctionExpression | EstreeFunctionExpression,
  ): string[] {
    const localBindings = new Set<string>();
    for (const parameter of functionNode.params) {
      this.collectPatternIdentifiers(parameter, localBindings);
    }

    return [...localBindings];
  }

  private collectPatternIdentifiers(
    pattern: Pattern,
    identifiers: Set<string>,
  ): void {
    switch (pattern.type) {
      case 'Identifier':
        identifiers.add(pattern.name);
        return;
      case 'AssignmentPattern':
        this.collectPatternIdentifiers(pattern.left, identifiers);
        return;
      case 'RestElement':
        this.collectPatternIdentifiers(pattern.argument, identifiers);
        return;
      case 'ArrayPattern':
        for (const element of pattern.elements) {
          if (element) {
            this.collectPatternIdentifiers(element, identifiers);
          }
        }
        return;
      case 'ObjectPattern':
        for (const property of pattern.properties) {
          if (property.type === 'RestElement') {
            this.collectPatternIdentifiers(property.argument, identifiers);
            continue;
          }

          this.collectPatternIdentifiers(property.value, identifiers);
        }
        return;
      default:
        return;
    }
  }

  private shouldSkipIdentifier(
    _: { name: string },
    parent?: Node,
    parentKey?: string,
    forWatching = false,
  ): boolean {
    if (!parent || parentKey === undefined) {
      return false;
    }

    if (
      !forWatching &&
      parent.type === 'MemberExpression' &&
      parentKey === 'property' &&
      !parent.computed
    ) {
      return true;
    }

    if (
      forWatching &&
      (parent.type === 'CallExpression' || parent.type === 'NewExpression') &&
      parentKey === 'callee'
    ) {
      return true;
    }

    if (
      parent.type === 'Property' &&
      parentKey === 'key' &&
      !parent.computed &&
      !parent.shorthand
    ) {
      return true;
    }

    return false;
  }

  private mapExpressionType(
    expression: Expression,
  ): ExpressionType | undefined {
    switch (expression.type) {
      case 'Identifier':
        return ExpressionType.Identifier;
      case 'Literal':
        return this.mapLiteralType(expression);
      case 'ArrayExpression':
        return ExpressionType.Array;
      case 'ObjectExpression':
        return ExpressionType.Object;
      case 'TemplateLiteral':
        return expression.expressions.length === 0
          ? ExpressionType.String
          : ExpressionType.TemplateLiteral;
      case 'BinaryExpression':
        return this.mapBinaryOperatorToExpressionType(expression.operator);
      case 'LogicalExpression':
        return this.mapLogicalOperatorToExpressionType(expression.operator);
      case 'UnaryExpression':
        return this.mapUnaryOperatorToExpressionType(expression.operator);
      case 'ConditionalExpression':
        return ExpressionType.Conditional;
      case 'MemberExpression':
        return ExpressionType.Member;
      case 'CallExpression':
        return ExpressionType.Function;
      case 'NewExpression':
        return ExpressionType.New;
      case 'SequenceExpression':
        return ExpressionType.Sequence;
      default:
        return undefined;
    }
  }

  private mapLiteralType(literal: Literal): ExpressionType | undefined {
    if (literal.value === null) {
      return ExpressionType.Null;
    }
    if (
      'regex' in literal &&
      (literal as { regex?: unknown }).regex !== undefined
    ) {
      return ExpressionType.RegExp;
    }
    switch (typeof literal.value) {
      case 'string':
        return ExpressionType.String;
      case 'number':
        return ExpressionType.Number;
      case 'boolean':
        return ExpressionType.Boolean;
      case 'bigint':
        return ExpressionType.BigInt;
      default:
        return undefined;
    }
  }

  private resolveExpressionString(
    expression: Expression,
    source: string,
  ): string {
    if (expression.type === 'Literal') {
      if (expression.value === null) {
        return 'null';
      }
      if ('regex' in expression && expression.regex !== undefined) {
        return source;
      }
      if (typeof expression.value === 'string') {
        return expression.value;
      }
      if (typeof expression.value === 'bigint') {
        return expression.value.toString();
      }
      return String(expression.value);
    }

    if (expression.type === 'TemplateLiteral') {
      if (
        expression.expressions.length === 0 &&
        expression.quasis.length === 1
      ) {
        return expression.quasis[0].value.raw;
      }
      return source;
    }

    if (expression.type === 'ArrayExpression') {
      return astToString(expression);
    }

    if (expression.type === 'ObjectExpression') {
      return astToString(expression);
    }

    if (
      expression.type === 'BinaryExpression' &&
      expression.operator === 'in'
    ) {
      return astToString(expression);
    }

    return source;
  }

  private mapBinaryOperatorToExpressionType(
    operator: string,
  ): ExpressionType | undefined {
    switch (operator) {
      case '+':
        return ExpressionType.Addition;
      case '-':
        return ExpressionType.Subtraction;
      case '*':
        return ExpressionType.Multiplication;
      case '/':
        return ExpressionType.Division;
      case '%':
        return ExpressionType.Remainder;
      case '**':
        return ExpressionType.Exponentiation;
      case '==':
        return ExpressionType.Equality;
      case '!=':
        return ExpressionType.Inequality;
      case '===':
        return ExpressionType.StrictEquality;
      case '!==':
        return ExpressionType.StrictInequality;
      case '<':
        return ExpressionType.LessThan;
      case '<=':
        return ExpressionType.LessThanOrEqual;
      case '>':
        return ExpressionType.GreaterThan;
      case '>=':
        return ExpressionType.GreaterThanOrEqual;
      case '<<':
        return ExpressionType.BitwiseLeftShift;
      case '>>':
        return ExpressionType.BitwiseRightShift;
      case '>>>':
        return ExpressionType.BitwiseUnsignedRightShift;
      case '&':
        return ExpressionType.BitwiseAnd;
      case '|':
        return ExpressionType.BitwiseOr;
      case '^':
        return ExpressionType.BitwiseXor;
      case 'in':
        return ExpressionType.In;
      case 'instanceof':
        return ExpressionType.Instanceof;
      default:
        return undefined;
    }
  }

  private mapLogicalOperatorToExpressionType(
    operator: string,
  ): ExpressionType | undefined {
    switch (operator) {
      case '&&':
        return ExpressionType.And;
      case '||':
        return ExpressionType.Or;
      case '??':
        return ExpressionType.NullishCoalescing;
      default:
        return undefined;
    }
  }

  private mapUnaryOperatorToExpressionType(
    operator: string,
  ): ExpressionType | undefined {
    switch (operator) {
      case '+':
        return ExpressionType.UnaryPlus;
      case '-':
        return ExpressionType.UnaryNegation;
      case '!':
        return ExpressionType.Not;
      case '~':
        return ExpressionType.BitwiseNot;
      case 'typeof':
        return ExpressionType.Typeof;
      default:
        return undefined;
    }
  }

  private isNode(value: unknown): value is Node {
    return (
      value !== null &&
      typeof value === 'object' &&
      'type' in (value as Record<string, unknown>) &&
      typeof (value as { type?: unknown }).type === 'string'
    );
  }

  private hasHiddenArgumentArray(expression: Expression): boolean {
    return (
      (expression.type === 'CallExpression' ||
        expression.type === 'NewExpression') &&
      expression.arguments.length === 0
    );
  }

  private tryBuildSequenceOperandPlans(
    expression: Expression,
  ): ICompiledSequenceOperandPlan[] | undefined {
    if (expression.type !== 'SequenceExpression') {
      return undefined;
    }

    const operands: ICompiledSequenceOperandPlan[] = [];
    for (let i = 0; i < expression.expressions.length; i++) {
      const operand = expression.expressions[i];
      const dependencyNames = [...this.collectDependencies(operand)];
      const operandSource = astToString(operand);
      const evaluate = new Function(
        ...dependencyNames,
        `return (${operandSource});`,
      ) as (...args: unknown[]) => unknown;

      operands.push({
        expressionString: operandSource,
        dependencyNames,
        evaluate,
      });
    }

    return operands;
  }

  private tryBuildMemberChainPlan(
    expression: Expression,
    dependencyNames: readonly string[],
  ): ICompiledMemberChainPlan | undefined {
    if (expression.type !== 'MemberExpression') {
      return undefined;
    }

    const parts = this.flattenMemberChain(expression);
    if (parts === undefined || parts.length < 2) {
      return undefined;
    }

    const root = parts[0].expression;
    if (root.type !== 'Identifier') {
      return undefined;
    }

    const segments: ICompiledMemberChainSegment[] = [];
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i].expression;
      const isComputed = parts[i].computed;
      if (!isComputed) {
        if (part.type !== 'Identifier') {
          return undefined;
        }
        segments.push({
          kind: 'static',
          key: part.name,
        });
        continue;
      }

      if (part.type === 'Literal') {
        const literalValue = part.value;
        if (
          typeof literalValue === 'string' ||
          typeof literalValue === 'number'
        ) {
          segments.push({
            kind: 'static',
            key: literalValue,
          });
          continue;
        }
      }

      if (part.type === 'PrivateIdentifier') {
        return undefined;
      }
      if (part.type === 'Super') {
        return undefined;
      }

      const indexExpressionSource = astToString(part);
      const evaluateIndex = new Function(
        ...dependencyNames,
        `return (${indexExpressionSource});`,
      ) as (...args: unknown[]) => unknown;
      const computedDependencyNames = [...this.collectDependencies(part)];
      const evaluateIndexByOwnDependencies = new Function(
        ...computedDependencyNames,
        `return (${indexExpressionSource});`,
      ) as (...args: unknown[]) => unknown;
      segments.push({
        kind: 'computed',
        expressionString: indexExpressionSource,
        dependencyNames: computedDependencyNames,
        evaluateIndex,
        evaluateIndexByOwnDependencies,
      });
    }

    return {
      rootIdentifier: root.name,
      segments,
    };
  }

  private flattenMemberChain(expression: Expression):
    | Array<{
        expression: Expression | Super | PrivateIdentifier;
        computed: boolean;
      }>
    | undefined {
    const result: Array<{
      expression: Expression | Super | PrivateIdentifier;
      computed: boolean;
    }> = [];

    let current: Expression | Super = expression;
    while (current.type === 'MemberExpression') {
      const member = current as MemberExpression;
      result.push({
        expression: member.property as Expression | PrivateIdentifier,
        computed: member.computed,
      });
      current = member.object as Expression | Super;
    }

    result.push({
      expression: current,
      computed: false,
    });

    result.reverse();
    return result;
  }

  private getStaticPath(node: Expression | Super): string[] {
    if (node.type === 'Super') {
      return [];
    }

    if (node.type === 'Identifier') {
      return [node.name];
    }

    if (node.type !== 'MemberExpression') {
      return [];
    }

    const objectPath = this.getStaticPath(node.object as Expression);
    if (objectPath.length === 0) {
      return [];
    }

    if (node.computed) {
      if (node.property.type === 'Literal') {
        const literalValue = node.property.value;
        if (
          typeof literalValue === 'string' ||
          typeof literalValue === 'number'
        ) {
          return [...objectPath, String(literalValue)];
        }
      }
      return [];
    }

    if (node.property.type !== 'Identifier') {
      return [];
    }

    return [...objectPath, node.property.name];
  }
}
