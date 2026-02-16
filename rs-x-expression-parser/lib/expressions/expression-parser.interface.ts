import { type Observable } from 'rxjs';

import { type IDisposable } from '@rs-x/core';

import { type AbstractExpression } from './abstract-expression';
import type { IExpressionBindConfiguration } from './expression-bind-configuration.type';



export interface IExpression<T = unknown, PT = unknown> extends IDisposable {
  readonly changed: Observable<IExpression>;
  readonly type: ExpressionType;
  readonly expressionString: string;
  readonly parent: IExpression<PT> | undefined;
  readonly childExpressions: readonly IExpression[];
  readonly value: T | undefined;
  readonly isRoot: boolean;
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
  And = 'and',
  Or = 'or',
  Not = 'not',
  Conditional = 'conditional',
  Equality = 'equality',
  Inequality = 'inequality',
  StrictEquality = 'strict equality',
  StrictInequality = 'strict inequality',
  GreaterThan = 'greater than',
  GreaterThanOrEqual = 'Greater than or equal',
  LessThan = 'less than',
  LessThanOrEqual = 'less than or equal',
  In = 'in',
  Instanceof = 'instanceof',
  Typeof = 'typeof',
  Remainder = 'remain',
  Subtraction = 'subtraction',
  UnaryNegation = 'unary negation',
  Addition = 'addition',
  Division = 'division',
  Multiplication = 'multiplication',
  Exponentiation = 'exponentiation',
  NullishCoalescing = 'nullish coalescing',
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Array = 'array',
  Identifier = 'identifier',
  Function = 'function',
  TemlateString = 'template string',
  Null = 'null',
  BigInt = 'big int',
  RegExp = 'regular expression',
  Member = 'member',
  Spread = 'spread',
  BitwiseLeftShift = 'bitwise left shift',
  BitwiseRightShift = 'bitwise right shift',
  BitwiseUnsignedRightShift = 'bitwise unsigned right shift',
  BitwiseNot = 'bitwise not',
  BitwiseAnd = 'bitwise and',
  BitwiseOr = 'bitwise or',
  BitwiseXor = 'bitwise xor',
  New = 'new',
  Sequence = 'sequence',
  Object = 'object',
  Property = 'property',
  PropertyContext = 'property context',
  Super = 'super',
  This = 'this',
  Index = 'Index',
  UnaryPlus = 'unary plus',
}

export interface IExpressionParser {
  parse(expression: string): AbstractExpression;
}
