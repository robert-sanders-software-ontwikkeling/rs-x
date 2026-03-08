import dedent from 'dedent';
import Link from 'next/link';

import { ApiParameterList } from '../../../components/ApiParameterList';
import { SyntaxCodeBlock } from '../../../components/SyntaxCodeBlock';

export const metadata = {
  title: 'ExpressionType',
  description: 'Enum of expression node kinds used by IExpression.type.',
};

const apiCode = dedent`
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
`;

const expressionTypeRows: Array<{
  name: string;
  description: string;
  example: string;
}> = [
  {
    name: 'And',
    description: 'Evaluates left to right and returns the first falsy operand, otherwise the last operand.',
    example: 'isReady && isValid',
  },
  {
    name: 'Or',
    description: 'Evaluates left to right and returns the first truthy operand, otherwise the last operand.',
    example: 'left || right',
  },
  {
    name: 'Not',
    description: 'Converts the operand to boolean and returns the negated value.',
    example: '!isEnabled',
  },
  {
    name: 'Conditional',
    description: 'Evaluates a condition and returns either the consequent or alternate branch.',
    example: 'a > 0 ? a : 0',
  },
  {
    name: 'Equality',
    description: 'Compares values with JavaScript loose equality semantics (type coercion allowed).',
    example: 'a == b',
  },
  {
    name: 'Inequality',
    description: 'Compares values with JavaScript loose inequality semantics (type coercion allowed).',
    example: 'a != b',
  },
  {
    name: 'StrictEquality',
    description: 'Compares values without type coercion; both type and value must match.',
    example: 'a === b',
  },
  {
    name: 'StrictInequality',
    description: 'Compares values without type coercion and returns true when type or value differs.',
    example: 'a !== b',
  },
  { name: 'GreaterThan', description: 'Returns true when the left operand is greater than the right operand.', example: 'a > b' },
  {
    name: 'GreaterThanOrEqual',
    description: 'Returns true when the left operand is greater than or equal to the right operand.',
    example: 'a >= b',
  },
  { name: 'LessThan', description: 'Returns true when the left operand is less than the right operand.', example: 'a < b' },
  {
    name: 'LessThanOrEqual',
    description: 'Returns true when the left operand is less than or equal to the right operand.',
    example: 'a <= b',
  },
  {
    name: 'In',
    description: 'Checks whether a property key exists in an object or its prototype chain.',
    example: "'key' in obj",
  },
  {
    name: 'Instanceof',
    description: 'Checks whether an object is an instance of a constructor via prototype-chain lookup.',
    example: 'value instanceof Date',
  },
  {
    name: 'Typeof',
    description: 'Returns the JavaScript runtime type name of the operand as a string.',
    example: "typeof value === 'string'",
  },
  {
    name: 'Remainder',
    description: 'Returns the remainder after dividing the left operand by the right operand.',
    example: 'count % 2',
  },
  {
    name: 'Subtraction',
    description: 'Subtracts the right numeric operand from the left numeric operand.',
    example: 'a - b',
  },
  {
    name: 'UnaryNegation',
    description: 'Converts operand to number and returns its arithmetic negation.',
    example: '-amount',
  },
  {
    name: 'Addition',
    description: 'Adds numbers or concatenates strings depending on operand types.',
    example: 'a + b',
  },
  {
    name: 'Division',
    description: 'Divides the left numeric operand by the right numeric operand.',
    example: 'a / b',
  },
  {
    name: 'Multiplication',
    description: 'Multiplies two numeric operands and returns the product.',
    example: 'a * b',
  },
  {
    name: 'Exponentiation',
    description: 'Raises the left operand to the power of the right operand.',
    example: 'a ** 2',
  },
  {
    name: 'NullishCoalescing',
    description: 'Returns the right operand only when the left operand is null or undefined.',
    example: "name ?? 'N/A'",
  },
  { name: 'String', description: 'String literal node.', example: "'hello'" },
  { name: 'Number', description: 'Number literal node.', example: '42' },
  { name: 'Boolean', description: 'Boolean literal node.', example: 'true' },
  { name: 'Array', description: 'Array literal node.', example: '[a, b, c]' },
  { name: 'Identifier', description: 'Variable or model field access.', example: 'a' },
  {
    name: 'Function',
    description: 'Represents a function call expression and evaluates by invoking the resolved function with arguments.',
    example: 'sum(a, b)',
  },
  { name: 'TemplateLiteral', description: 'Template string node.', example: '`Hello ${name}`' },
  { name: 'Null', description: 'Null literal node.', example: 'null' },
  { name: 'BigInt', description: 'BigInt literal node.', example: '10n' },
  { name: 'RegExp', description: 'Regular expression literal node.', example: '/abc/i' },
  { name: 'Member', description: 'Object member access.', example: 'user.name' },
  {
    name: 'Spread',
    description:
      'Spread element/property. Valid inside array literals, object literals, and function calls. It expands iterable elements or object properties into the surrounding expression.',
    example: '({ ...defaults, enabled: true })',
  },
  {
    name: 'BitwiseLeftShift',
    description: 'Shifts bits of the left operand left by the number of bits from the right operand.',
    example: 'value << 1',
  },
  {
    name: 'BitwiseRightShift',
    description: 'Shifts bits of the left operand right (sign-preserving) by the right operand.',
    example: 'value >> 1',
  },
  {
    name: 'BitwiseUnsignedRightShift',
    description: 'Shifts bits of the left operand right with zero-fill by the right operand.',
    example: 'value >>> 1',
  },
  {
    name: 'BitwiseNot',
    description: 'Inverts all bits of the operand.',
    example: '~value',
  },
  {
    name: 'BitwiseAnd',
    description: 'Performs bitwise AND between corresponding bits of both operands.',
    example: 'a & b',
  },
  {
    name: 'BitwiseOr',
    description: 'Performs bitwise OR between corresponding bits of both operands.',
    example: 'a | b',
  },
  {
    name: 'BitwiseXor',
    description: 'Performs bitwise XOR between corresponding bits of both operands.',
    example: 'a ^ b',
  },
  {
    name: 'New',
    description: 'Constructs a new object instance by invoking a constructor with arguments.',
    example: 'new Date()',
  },
  {
    name: 'Sequence',
    description:
      'Comma operator sequence. It evaluates multiple expressions left-to-right and returns only the last result. Use it when you need side effects first, then a final value.',
    example: '(a++, a)',
  },
  {
    name: 'Object',
    description:
      'Object literal node. In expression strings, wrap object literals in parentheses so they are parsed as an expression, not a block.',
    example: '({ total: a + b })',
  },
  { name: 'Index', description: 'Indexed access node.', example: 'items[0]' },
  {
    name: 'UnaryPlus',
    description: 'Converts the operand to a number without changing its sign.',
    example: '+value',
  },
];

const sortedExpressionTypeRows = [...expressionTypeRows].sort((a, b) => {
  return a.name.localeCompare(b.name);
});

export default function ExpressionTypeDocsPage() {
  return (
    <main id='content' className='main'>
      <section className='section docsApiSection'>
        <div className='container'>
          <div className='docsApiHeader docsApiHeaderTitleAlign'>
            <div className='docsApiTitleBlock'>
              <p className='docsApiEyebrow'>API Reference</p>
              <h1 className='sectionTitle'>ExpressionType</h1>
            </div>
            <div className='docsApiActions docsApiActionsTitle'>
              <Link className='btn btnGhost' href='/docs/iexpression'>
                IExpression <span aria-hidden='true'>→</span>
              </Link>
              <Link className='btn btnGhost' href='/docs'>
                Back to Docs <span aria-hidden='true'>→</span>
              </Link>
            </div>
          </div>
          <p className='sectionLead docsApiLead'>
            <span className='codeInline'>ExpressionType</span> describes the
            node kind for an <Link href='/docs/iexpression'>IExpression</Link>{' '}
            via <span className='codeInline'>expression.type</span>.
          </p>

          <aside className='qsCodeCard docsApiCode' aria-label='ExpressionType API'>
            <div className='qsCodeHeader'>
              <div className='qsCodeTitle'>API</div>
            </div>
            <SyntaxCodeBlock code={apiCode} />
          </aside>

          <div className='docsApiGrid'>
            <article className='card docsApiCard'>
              <h2 className='cardTitle'>Description</h2>
              <p className='cardText'>
                Enum used by <span className='codeInline'>IExpression.type</span> to describe each parsed node.
              </p>
            </article>
            <article className='card docsApiCard'>
              <h2 className='cardTitle'>Parameters</h2>
              <ApiParameterList items={[]} />
            </article>
            <article className='card docsApiCard'>
              <h2 className='cardTitle'>Return type</h2>
              <p className='cardText'>
                Members resolve to string enum values used for runtime node classification.
              </p>
            </article>
          </div>

          <article className='card docsApiCard'>
            <h2 className='cardTitle'>Supported expression types</h2>
            <div className='comparisonWrap'>
              <table className='comparisonTable'>
                <thead>
                  <tr>
                    <th>ExpressionType</th>
                    <th>Description</th>
                    <th>Example</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedExpressionTypeRows.map((item) => {
                    return (
                      <tr key={item.name}>
                        <td>
                          <span className='codeInline'>{item.name}</span>
                        </td>
                        <td>{item.description}</td>
                        <td>
                          <span className='codeInline'>{item.example}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
