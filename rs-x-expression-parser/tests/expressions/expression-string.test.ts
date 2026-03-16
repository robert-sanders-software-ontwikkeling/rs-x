import { InjectionContainer } from '@rs-x/core';

import type {
  IExpression,
  IExpressionParser,
} from '../../lib/expressions/expression-parser.interface';
import { ExpressionType } from '../../lib/expressions/expression-parser.interface';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';

interface ICase {
  name: string;
  expression: string;
  type: ExpressionType;
  expected?: string;
}

describe('Expression string tests', () => {
  let parser: IExpressionParser;
  let expression: IExpression | undefined;

  beforeAll(async () => {
    await InjectionContainer.load(RsXExpressionParserModule);
    parser = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionParser,
    );
  });

  afterAll(async () => {
    await unloadRsXExpressionParserModule();
  });

  afterEach(() => {
    expression?.dispose();
    expression = undefined;
  });

  const cases: ICase[] = [
    { name: 'addition', expression: 'a + b', type: ExpressionType.Addition },
    { name: 'and', expression: 'a && b', type: ExpressionType.And },
    { name: 'array', expression: '[a, b]', type: ExpressionType.Array },
    {
      name: 'bigint',
      expression: '9007199254740991n',
      type: ExpressionType.BigInt,
      expected: '9007199254740991',
    },
    {
      name: 'bitwise and',
      expression: 'a & b',
      type: ExpressionType.BitwiseAnd,
    },
    {
      name: 'bitwise left shift',
      expression: 'a << b',
      type: ExpressionType.BitwiseLeftShift,
    },
    {
      name: 'bitwise not',
      expression: '~a',
      type: ExpressionType.BitwiseNot,
    },
    {
      name: 'bitwise or',
      expression: 'a | b',
      type: ExpressionType.BitwiseOr,
    },
    {
      name: 'bitwise right shift',
      expression: 'a >> b',
      type: ExpressionType.BitwiseRightShift,
    },
    {
      name: 'bitwise unsigned right shift',
      expression: 'a >>> b',
      type: ExpressionType.BitwiseUnsignedRightShift,
    },
    {
      name: 'bitwise xor',
      expression: 'a ^ b',
      type: ExpressionType.BitwiseXor,
    },
    { name: 'boolean', expression: 'true', type: ExpressionType.Boolean },
    {
      name: 'conditional',
      expression: 'a > 0 ? b : 0',
      type: ExpressionType.Conditional,
    },
    { name: 'division', expression: 'a / b', type: ExpressionType.Division },
    { name: 'equality', expression: 'a == b', type: ExpressionType.Equality },
    {
      name: 'exponentiation',
      expression: 'a ** b',
      type: ExpressionType.Exponentiation,
    },
    {
      name: 'function',
      expression: 'sum(a, b)',
      type: ExpressionType.Function,
    },
    {
      name: 'greater than',
      expression: 'a > b',
      type: ExpressionType.GreaterThan,
    },
    {
      name: 'greater than or equal',
      expression: 'a >= b',
      type: ExpressionType.GreaterThanOrEqual,
    },
    { name: 'identifier', expression: 'a', type: ExpressionType.Identifier },
    {
      name: 'in operator',
      expression: '"admin" in obj',
      type: ExpressionType.In,
      expected: '("admin" in obj)',
    },
    {
      name: 'inequality',
      expression: 'a != b',
      type: ExpressionType.Inequality,
    },
    {
      name: 'instanceof',
      expression: 'a instanceof type',
      type: ExpressionType.Instanceof,
    },
    {
      name: 'less than',
      expression: 'a < b',
      type: ExpressionType.LessThan,
    },
    {
      name: 'less than or equal',
      expression: 'a <= b',
      type: ExpressionType.LessThanOrEqual,
    },
    { name: 'member', expression: 'obj.x', type: ExpressionType.Member },
    {
      name: 'member computed string',
      expression: 'map["admin"]',
      type: ExpressionType.Member,
    },
    {
      name: 'member computed number',
      expression: 'arr[0]',
      type: ExpressionType.Member,
    },
    {
      name: 'member computed identifier',
      expression: 'arr[index]',
      type: ExpressionType.Member,
    },
    {
      name: 'member chain',
      expression: 'obj?.x',
      type: ExpressionType.Member,
    },
    {
      name: 'multiplication',
      expression: 'a * b',
      type: ExpressionType.Multiplication,
    },
    {
      name: 'new expression',
      expression: 'new type(value)',
      type: ExpressionType.New,
    },
    { name: 'not', expression: '!a', type: ExpressionType.Not },
    { name: 'null', expression: 'null', type: ExpressionType.Null },
    {
      name: 'nullish coalescing',
      expression: 'a ?? b',
      type: ExpressionType.NullishCoalescing,
    },
    { name: 'number', expression: '100', type: ExpressionType.Number },
    {
      name: 'object',
      expression: '({ a: x, b: y })',
      type: ExpressionType.Object,
      expected: '{\n  a: x,\n  b: y\n}',
    },
    { name: 'or', expression: 'a || b', type: ExpressionType.Or },
    {
      name: 'regular expression',
      expression: '/ab+c/i',
      type: ExpressionType.RegExp,
    },
    {
      name: 'remainder',
      expression: 'a % b',
      type: ExpressionType.Remainder,
    },
    {
      name: 'sequence',
      expression: '(setB(value), b)',
      type: ExpressionType.Sequence,
    },
    {
      name: 'strict equality',
      expression: 'a === b',
      type: ExpressionType.StrictEquality,
    },
    {
      name: 'strict inequality',
      expression: 'a !== b',
      type: ExpressionType.StrictInequality,
    },
    {
      name: 'string',
      expression: "'hi'",
      type: ExpressionType.String,
      expected: 'hi',
    },
    {
      name: 'subtraction',
      expression: 'a - b',
      type: ExpressionType.Subtraction,
    },
    {
      name: 'template literal',
      expression: '`Hello ${name}`',
      type: ExpressionType.TemplateLiteral,
    },
    {
      name: 'typeof',
      expression: 'typeof a[index]',
      type: ExpressionType.Typeof,
    },
    {
      name: 'unary negation',
      expression: '-value',
      type: ExpressionType.UnaryNegation,
    },
    {
      name: 'unary plus',
      expression: '+a',
      type: ExpressionType.UnaryPlus,
    },
  ];

  it.each(cases)(
    'keeps original expression string for $name',
    ({ expression: expressionString, type, expected }) => {
      expression = parser.parse(expressionString);
      expect(expression.type).toEqual(type);
      expect(expression.expressionString).toEqual(expected ?? expressionString);
    },
  );

  it('keeps composed child expression strings and covers internal expression types', () => {
    expression = parser.parse(
      '({ config: map["admin"], row: items[index], list: [head, ...tail], label: `name:${user.first}` })',
    );

    const stack: IExpression[] = [expression];
    const seenTypes = new Set<ExpressionType>();
    const seenStrings = new Set<string>();

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) {
        continue;
      }

      seenTypes.add(current.type);
      seenStrings.add(current.expressionString);
      stack.push(...current.childExpressions);
    }

    expect(Array.from(seenTypes)).toEqual(
      expect.arrayContaining([
        ExpressionType.Object,
        ExpressionType.Property,
        ExpressionType.Member,
        ExpressionType.Index,
        ExpressionType.Array,
        ExpressionType.Spread,
        ExpressionType.TemplateLiteral,
        ExpressionType.Identifier,
        ExpressionType.String,
      ]),
    );

    expect(Array.from(seenStrings)).toEqual(
      expect.arrayContaining([
        'map',
        'admin',
        'items',
        'index',
        'head',
        'tail',
        'user',
        'first',
      ]),
    );
  });
});
