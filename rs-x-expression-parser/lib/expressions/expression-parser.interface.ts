import { type Observable } from 'rxjs';

import { type IDisposable } from '@rs-x/core';

import { type AbstractExpression } from './abstract-expression';
import type { IExpressionBindConfiguration } from './expression-bind-configuration.type';

export type ChangeHook = (expression: IExpression, oldValue: unknown) => void;

export interface IExpression<T = unknown, PT = unknown> extends IDisposable {
  readonly id: string;
  readonly changed: Observable<IExpression>;
  readonly type: ExpressionType;
  readonly expressionString: string;
  readonly parent: IExpression<PT> | undefined;
  readonly childExpressions: readonly IExpression[];
  readonly value: T | undefined;
  readonly isRoot: boolean;
  readonly isAsync: boolean | undefined;
  readonly hidden: boolean;
  changeHook?: ChangeHook;
  toString(): string;
  clone(): this;
  bind(settings: IExpressionBindConfiguration): IExpression;
}

export interface IPropertyPath {
  object: IPropertyPath;
  name: string;
}

export interface IChangePathValue<T> {
  readonly path: string;
  readonly value: T;
}

export enum ExpressionType {
  Addition = 'addition',
  And = 'and',
  Array = 'array',
  BigInt = 'big int',
  BitwiseAnd = 'bitwise and',
  BitwiseLeftShift = 'bitwise left shift',
  BitwiseNot = 'bitwise not',
  BitwiseOr = 'bitwise or',
  BitwiseRightShift = 'bitwise right shift',
  BitwiseUnsignedRightShift = 'bitwise unsigned right shift',
  BitwiseXor = 'bitwise xor',
  Boolean = 'boolean',
  Conditional = 'conditional',
  Division = 'division',
  Equality = 'equality',
  Exponentiation = 'exponentiation',
  Function = 'function',
  GreaterThan = 'greater than',
  GreaterThanOrEqual = 'Greater than or equal',
  Identifier = 'identifier',
  In = 'in',
  Index = 'Index',
  Inequality = 'inequality',
  Instanceof = 'instanceof',
  LessThan = 'less than',
  LessThanOrEqual = 'less than or equal',
  Member = 'member',
  Multiplication = 'multiplication',
  New = 'new',
  Not = 'not',
  Null = 'null',
  NullishCoalescing = 'nullish coalescing',
  Number = 'number',
  Object = 'object',
  Or = 'or',
  Property = 'property',
  RegExp = 'regular expression',
  Remainder = 'remain',
  Sequence = 'sequence',
  Spread = 'spread',
  StrictEquality = 'strict equality',
  StrictInequality = 'strict inequality',
  String = 'string',
  Subtraction = 'subtraction',
  TemplateLiteral = 'template literal',
  Typeof = 'typeof',
  UnaryNegation = 'unary negation',
  UnaryPlus = 'unary plus',
}

export interface IExpressionParser {
  parse(expression: string): AbstractExpression;
}
