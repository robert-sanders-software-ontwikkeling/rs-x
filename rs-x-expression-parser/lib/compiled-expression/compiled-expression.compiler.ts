import { generate as astToString } from 'astring';
import type {
  Expression,
  Literal,
  MemberExpression,
  Node,
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
  ICompiledMemberChainPlan,
  ICompiledMemberChainSegment,
  ICompiledSequenceOperandPlan,
  ICompiledExpressionWatchDependency,
} from './compiled-expression.compiler.interface';

@Injectable()
export class CompiledExpressionCompiler implements ICompiledExpressionCompiler {
  private readonly _planCache = new Map<
    string,
    ICompiledExpressionPlan | undefined
  >();

  constructor(
    @Inject(RsXExpressionParserInjectionTokens.IJsExpressionAstParser)
    private readonly _jsExpressionAstParser: IJsExpressionAstParser,
  ) {}

  public tryCompile(expressionString: string): ICompiledExpressionPlan | undefined {
    const cached = this._planCache.get(expressionString);
    if (cached !== undefined || this._planCache.has(expressionString)) {
      return cached;
    }

    const compiled = this.buildPlan(expressionString);
    this._planCache.set(expressionString, compiled);
    return compiled;
  }

  private buildPlan(expressionString: string): ICompiledExpressionPlan | undefined {
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

    const dependencyNames = this.collectDependencies(expression, false);
    const watchDependencies = this.collectWatchDependencies(expression);
    const memberChain = this.tryBuildMemberChainPlan(
      expression,
      [...dependencyNames],
    );
    const sequenceOperands = this.tryBuildSequenceOperandPlans(expression);
    const orderedDependencies = [...dependencyNames];

    const normalizedExpressionString = this.resolveExpressionString(
      expression,
      expressionString,
    );

    try {
      const evaluate = new Function(
        ...orderedDependencies,
        `return (${expressionString});`,
      ) as (...args: unknown[]) => unknown;
      return {
        expressionString: normalizedExpressionString,
        dependencyNames: orderedDependencies,
        watchDependencies,
        expressionType,
        hasHiddenArgumentArray: this.hasHiddenArgumentArray(expression),
        memberChain,
        sequenceOperands,
        evaluate,
      };
    } catch {
      return undefined;
    }
  }

  private collectDependencies(
    expression: Expression,
    forWatching: boolean,
  ): Set<string> {
    const dependencies = new Set<string>();

    const visit = (node: unknown, parent?: Node, parentKey?: string): void => {
      if (!this.isNode(node)) {
        return;
      }

      if (
        node.type === 'Identifier' &&
        !this.shouldSkipIdentifier(node, parent, parentKey, forWatching)
      ) {
        dependencies.add(node.name);
      }

      const recordNode = node as unknown as Record<string, unknown>;
      for (const [key, value] of Object.entries(recordNode)) {
        if (key === 'loc' || key === 'range' || key === 'start' || key === 'end') {
          continue;
        }

        if (Array.isArray(value)) {
          for (let i = 0; i < value.length; i++) {
            visit(value[i], node, key);
          }
          continue;
        }

        visit(value, node, key);
      }
    };

    visit(expression);
    return dependencies;
  }

  private collectWatchDependencies(
    expression: Expression,
  ): ICompiledExpressionWatchDependency[] {
    const dependencies = new Map<string, ICompiledExpressionWatchDependency>();

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
        node.type === 'Identifier' &&
        !this.shouldSkipIdentifier(node, parent, parentKey, true)
      ) {
        const memberParent =
          parent?.type === 'MemberExpression' ? parent : undefined;
        const isMemberObjectSegment = memberParent !== undefined && parentKey === 'object';
        const isMemberPropertySegment =
          memberParent !== undefined && parentKey === 'property' && !memberParent.computed;
        const isStaticCalleeProperty =
          isMemberPropertySegment &&
          (grandParent?.type === 'CallExpression' ||
            grandParent?.type === 'NewExpression') &&
          grandParentKey === 'callee';
        if (isStaticCalleeProperty) {
          return;
        }
        const ownerPath = isMemberPropertySegment
          ? this.getStaticPath(memberParent.object)
          : [];
        const dependencyId = `${ownerPath.join('.')}|${node.name}`;
        const existing = dependencies.get(dependencyId);
        const dependency: ICompiledExpressionWatchDependency = {
          name: node.name,
          ownerPath,
          isLeaf: !isMemberObjectSegment && (existing?.isLeaf ?? true),
          isMemberExpressionSegment:
            isMemberObjectSegment ||
            isMemberPropertySegment ||
            (existing?.isMemberExpressionSegment ?? false),
        };
        dependencies.set(dependencyId, dependency);
      }

      const recordNode = node as unknown as Record<string, unknown>;
      for (const [key, value] of Object.entries(recordNode)) {
        if (key === 'loc' || key === 'range' || key === 'start' || key === 'end') {
          continue;
        }

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
    return [...dependencies.values()];
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

  private mapExpressionType(expression: Expression): ExpressionType | undefined {
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
    if ('regex' in literal && (literal as { regex?: unknown }).regex !== undefined) {
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
      if (expression.expressions.length === 0 && expression.quasis.length === 1) {
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

    if (expression.type === 'BinaryExpression' && expression.operator === 'in') {
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
      (expression.type === 'CallExpression' || expression.type === 'NewExpression') &&
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
      const dependencyNames = [...this.collectDependencies(operand, false)];
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
      const computedDependencyNames = [
        ...this.collectDependencies(part, false),
      ];
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

  private flattenMemberChain(
    expression: Expression,
  ):
    | Array<{ expression: Expression | Super | PrivateIdentifier; computed: boolean }>
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
