import { JsEspreeExpressionCodegenParser } from '../../lib/js-espree-expression-codegen-parser';

interface ICase {
  name: string;
  expression: string;
  expected: string;
}

describe('JsEspreeExpressionCodegenParser tests', () => {
  const parser = new JsEspreeExpressionCodegenParser();

  const cases: ICase[] = [
    {
      name: 'addition',
      expression: 'a + b',
      expected:
        'new AdditionExpression("a + b", new IdentifierExpression("a"), new IdentifierExpression("b"))',
    },
    {
      name: 'and',
      expression: 'a && b',
      expected:
        'new LogicalAndExpression("a && b", new IdentifierExpression("a"), new IdentifierExpression("b"))',
    },
    {
      name: 'array',
      expression: '[a, b]',
      expected:
        'new ArrayExpression([new IdentifierExpression("a"), new IdentifierExpression("b")])',
    },
    {
      name: 'bigint',
      expression: '9007199254740991n',
      expected: 'new ConstantBigIntExpression(BigInt("9007199254740991"))',
    },
    {
      name: 'bitwise and',
      expression: 'a & b',
      expected:
        'new BitwiseAndExpression("a & b", new IdentifierExpression("a"), new IdentifierExpression("b"))',
    },
    {
      name: 'bitwise left shift',
      expression: 'a << b',
      expected:
        'new BitwiseLeftShiftExpression("a << b", new IdentifierExpression("a"), new IdentifierExpression("b"))',
    },
    {
      name: 'bitwise not',
      expression: '~a',
      expected:
        'new BitwiseNotExpression("~a", new IdentifierExpression("a"))',
    },
    {
      name: 'bitwise or',
      expression: 'a | b',
      expected:
        'new BitwiseOrExpression("a | b", new IdentifierExpression("a"), new IdentifierExpression("b"))',
    },
    {
      name: 'bitwise right shift',
      expression: 'a >> b',
      expected:
        'new BitwiseRightShiftExpression("a >> b", new IdentifierExpression("a"), new IdentifierExpression("b"))',
    },
    {
      name: 'bitwise unsigned right shift',
      expression: 'a >>> b',
      expected:
        'new BitwiseUnsignedRightShiftExpression("a >>> b", new IdentifierExpression("a"), new IdentifierExpression("b"))',
    },
    {
      name: 'bitwise xor',
      expression: 'a ^ b',
      expected:
        'new BitwiseXorExpression("a ^ b", new IdentifierExpression("a"), new IdentifierExpression("b"))',
    },
    {
      name: 'boolean',
      expression: 'true',
      expected: 'new ConstantBooleanExpression(true)',
    },
    {
      name: 'conditional',
      expression: 'a > 0 ? b : 0',
      expected:
        'new ConditionalExpression("a > 0 ? b : 0", new GreaterThanExpression("a > 0", new IdentifierExpression("a"), new ConstantNumberExpression(0)), new IdentifierExpression("b"), new ConstantNumberExpression(0))',
    },
    {
      name: 'division',
      expression: 'a / b',
      expected:
        'new DivisionExpression("a / b", new IdentifierExpression("a"), new IdentifierExpression("b"))',
    },
    {
      name: 'equality',
      expression: 'a == b',
      expected:
        'new EqualityExpression("a == b", new IdentifierExpression("a"), new IdentifierExpression("b"))',
    },
    {
      name: 'exponentiation',
      expression: 'a ** b',
      expected:
        'new ExponentiationExpression("a ** b", new IdentifierExpression("a"), new IdentifierExpression("b"))',
    },
    {
      name: 'function',
      expression: 'sum(a, b)',
      expected:
        'new FunctionExpression("sum(a, b)", new IdentifierExpression("sum"), null, new ArrayExpression([new IdentifierExpression("a"), new IdentifierExpression("b")]), false, false)',
    },
    {
      name: 'greater than',
      expression: 'a > b',
      expected:
        'new GreaterThanExpression("a > b", new IdentifierExpression("a"), new IdentifierExpression("b"))',
    },
    {
      name: 'greater than or equal',
      expression: 'a >= b',
      expected:
        'new GreaterThanOrEqualExpression("a >= b", new IdentifierExpression("a"), new IdentifierExpression("b"))',
    },
    {
      name: 'identifier',
      expression: 'a',
      expected: 'new IdentifierExpression("a")',
    },
    {
      name: 'in operator',
      expression: '"admin" in obj',
      expected:
        'new InExpression("(\\"admin\\" in obj)", new ConstantStringExpression("admin"), new IdentifierExpression("obj"))',
    },
    {
      name: 'inequality',
      expression: 'a != b',
      expected:
        'new InequalityExpression("a != b", new IdentifierExpression("a"), new IdentifierExpression("b"))',
    },
    {
      name: 'instanceof',
      expression: 'a instanceof type',
      expected:
        'new InstanceofExpression("a instanceof type", new IdentifierExpression("a"), new IdentifierExpression("type"))',
    },
    {
      name: 'less than',
      expression: 'a < b',
      expected:
        'new LessThanExpression("a < b", new IdentifierExpression("a"), new IdentifierExpression("b"))',
    },
    {
      name: 'less than or equal',
      expression: 'a <= b',
      expected:
        'new LessThanOrEqualExpression("a <= b", new IdentifierExpression("a"), new IdentifierExpression("b"))',
    },
    {
      name: 'member',
      expression: 'obj.x',
      expected:
        'new MemberExpression("obj.x", [new IdentifierExpression("obj"), new IdentifierExpression("x")])',
    },
    {
      name: 'member computed',
      expression: 'arr[index]',
      expected:
        'new MemberExpression("arr[index]", [new IdentifierExpression("arr"), new IndexExpression(new IdentifierExpression("index"))])',
    },
    {
      name: 'member optional chain',
      expression: 'obj?.x',
      expected:
        'new MemberExpression("obj?.x", [new IdentifierExpression("obj"), new IdentifierExpression("x")])',
    },
    {
      name: 'multiplication',
      expression: 'a * b',
      expected:
        'new MultiplicationExpression("a * b", new IdentifierExpression("a"), new IdentifierExpression("b"))',
    },
    {
      name: 'new expression',
      expression: 'new type(value)',
      expected:
        'new NewExpression(new type(value), new IdentifierExpression("type"), [new IdentifierExpression("value")])',
    },
    {
      name: 'not',
      expression: '!a',
      expected:
        'new LogicalNotExpression("!a", new IdentifierExpression("a"))',
    },
    {
      name: 'null',
      expression: 'null',
      expected: 'new ConstantNullExpression()',
    },
    {
      name: 'nullish coalescing',
      expression: 'a ?? b',
      expected:
        'new NullishCoalescingExpression("a ?? b", new IdentifierExpression("a"), new IdentifierExpression("b"))',
    },
    {
      name: 'number',
      expression: '100',
      expected: 'new ConstantNumberExpression(100)',
    },
    {
      name: 'object',
      expression: '({ a: x, b: y })',
      expected:
        'new ObjectExpression("{\\n  a: x,\\n  b: y\\n}", [new PropertyExpression("a: x", new ConstantStringExpression("a"), new IdentifierExpression("x")), new PropertyExpression("b: y", new ConstantStringExpression("b"), new IdentifierExpression("y"))])',
    },
    {
      name: 'or',
      expression: 'a || b',
      expected:
        'new LogicalOrExpression("a || b", new IdentifierExpression("a"), new IdentifierExpression("b"))',
    },
    {
      name: 'regular expression',
      expression: '/ab+c/i',
      expected:
        'new ConstantRegExpExpression("/ab+c/i", new RegExp("ab+c", "i"))',
    },
    {
      name: 'remainder',
      expression: 'a % b',
      expected:
        'new RemainderExpression("a % b", new IdentifierExpression("a"), new IdentifierExpression("b"))',
    },
    {
      name: 'sequence',
      expression: '(setB(value), b)',
      expected:
        'new SequenceExpression("(setB(value), b)", [new FunctionExpression("setB(value)", new IdentifierExpression("setB"), null, new ArrayExpression([new IdentifierExpression("value")]), false, false), new IdentifierExpression("b")])',
    },
    {
      name: 'strict equality',
      expression: 'a === b',
      expected:
        'new StrictEqualityExpression("a === b", new IdentifierExpression("a"), new IdentifierExpression("b"))',
    },
    {
      name: 'strict inequality',
      expression: 'a !== b',
      expected:
        'new StrictInequalityExpression("a !== b", new IdentifierExpression("a"), new IdentifierExpression("b"))',
    },
    {
      name: 'string',
      expression: "'hi'",
      expected: 'new ConstantStringExpression("hi")',
    },
    {
      name: 'subtraction',
      expression: 'a - b',
      expected:
        'new SubtractionExpression("a - b", new IdentifierExpression("a"), new IdentifierExpression("b"))',
    },
    {
      name: 'template literal',
      expression: '`Hello ${name}`',
      expected:
        'new TemplateLiteralExpression("`Hello ${name}`", [new ConstantStringExpression("Hello "), new IdentifierExpression("name"), new ConstantStringExpression("")])',
    },
    {
      name: 'typeof',
      expression: 'typeof a[index]',
      expected:
        'new TypeofExpression("typeof a[index]", new MemberExpression("a[index]", [new IdentifierExpression("a"), new IndexExpression(new IdentifierExpression("index"))]))',
    },
    {
      name: 'unary negation',
      expression: '-value',
      expected:
        'new UnaryNegationExpression("-value", new IdentifierExpression("value"))',
    },
    {
      name: 'unary plus',
      expression: '+a',
      expected: 'new UnaryPlusExpression("+a", new IdentifierExpression("a"))',
    },
  ];

  it.each(cases)('creates exact constructor output for $name', ({ expression, expected }) => {
    const actual = parser.parse(expression);
    expect(actual).toEqual(expected);
  });

  it('keeps template literals without placeholders as constant strings', () => {
    const actual = parser.parse('`hello`');

    expect(actual).toEqual('new ConstantStringExpression("hello")');
  });

  it('creates exact constructor output for nested arithmetic expressions', () => {
    const actual = parser.parse('(a + b) * (c * d) + 10');

    expect(actual).toEqual(
      'new AdditionExpression("(a + b) * (c * d) + 10", new MultiplicationExpression("(a + b) * (c * d)", new AdditionExpression("a + b", new IdentifierExpression("a"), new IdentifierExpression("b")), new MultiplicationExpression("c * d", new IdentifierExpression("c"), new IdentifierExpression("d"))), new ConstantNumberExpression(10))',
    );
  });
});
