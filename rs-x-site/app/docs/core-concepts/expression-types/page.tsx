import Link from 'next/link';

import { DocsBreadcrumbs } from '../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../components/DocsPageTemplate';

import { ExpressionTypesTable } from './expression-types-table.client';

type ExpressionTypeInfo = {
  name: string;
  category: string;
  syntax: string;
  description: string;
};

const expressionTypeRows: ExpressionTypeInfo[] = [
  {
    name: 'Addition',
    category: 'Arithmetic',
    syntax: 'a + b',
    description:
      'Adds numeric values, or concatenates when one side is a string.',
  },
  {
    name: 'And',
    category: 'Logical',
    syntax: 'isReady && isValid',
    description:
      'Logical AND with short-circuit behavior (returns first falsy operand).',
  },
  {
    name: 'Array',
    category: 'Literal / structure',
    syntax: '[a, b, c]',
    description: 'Array literal node.',
  },
  {
    name: 'BigInt',
    category: 'Literal',
    syntax: '10n',
    description: 'BigInt literal node.',
  },
  {
    name: 'BitwiseAnd',
    category: 'Bitwise',
    syntax: 'a & b',
    description: 'Bitwise AND.',
  },
  {
    name: 'BitwiseLeftShift',
    category: 'Bitwise',
    syntax: 'value << 1',
    description: 'Left bit-shift.',
  },
  {
    name: 'BitwiseNot',
    category: 'Bitwise',
    syntax: '~value',
    description: 'Bitwise NOT.',
  },
  {
    name: 'BitwiseOr',
    category: 'Bitwise',
    syntax: 'a | b',
    description: 'Bitwise OR.',
  },
  {
    name: 'BitwiseRightShift',
    category: 'Bitwise',
    syntax: 'value >> 1',
    description: 'Right bit-shift (sign-preserving).',
  },
  {
    name: 'BitwiseUnsignedRightShift',
    category: 'Bitwise',
    syntax: 'value >>> 1',
    description: 'Unsigned right bit-shift (zero-fill).',
  },
  {
    name: 'BitwiseXor',
    category: 'Bitwise',
    syntax: 'a ^ b',
    description: 'Bitwise XOR.',
  },
  {
    name: 'Boolean',
    category: 'Literal',
    syntax: 'true',
    description: 'Boolean literal node.',
  },
  {
    name: 'Conditional',
    category: 'Logical',
    syntax: 'a > 0 ? a : 0',
    description: 'Ternary conditional expression.',
  },
  {
    name: 'Division',
    category: 'Arithmetic',
    syntax: 'a / b',
    description: 'Numeric division.',
  },
  {
    name: 'Equality',
    category: 'Comparison',
    syntax: 'a == b',
    description: 'Loose equality check (with coercion).',
  },
  {
    name: 'Exponentiation',
    category: 'Arithmetic',
    syntax: 'a ** 2',
    description: 'Power operator.',
  },
  {
    name: 'Function',
    category: 'Call / construction',
    syntax: 'sum(a, b)',
    description: 'Function call expression node.',
  },
  {
    name: 'GreaterThan',
    category: 'Comparison',
    syntax: 'a > b',
    description: 'Greater-than comparison.',
  },
  {
    name: 'GreaterThanOrEqual',
    category: 'Comparison',
    syntax: 'a >= b',
    description: 'Greater-than-or-equal comparison.',
  },
  {
    name: 'Identifier',
    category: 'Access',
    syntax: 'total',
    description: 'Variable or model field reference.',
  },
  {
    name: 'In',
    category: 'Comparison',
    syntax: "'key' in obj",
    description: 'Checks whether a property key exists in an object.',
  },
  {
    name: 'Index',
    category: 'Access',
    syntax: 'items[i]',
    description:
      'Computed index/key/member lookup segment inside bracket access.',
  },
  {
    name: 'Inequality',
    category: 'Comparison',
    syntax: 'a != b',
    description: 'Loose inequality check (with coercion).',
  },
  {
    name: 'Instanceof',
    category: 'Comparison',
    syntax: 'value instanceof Date',
    description: 'Prototype-chain instance check.',
  },
  {
    name: 'LessThan',
    category: 'Comparison',
    syntax: 'a < b',
    description: 'Less-than comparison.',
  },
  {
    name: 'LessThanOrEqual',
    category: 'Comparison',
    syntax: 'a <= b',
    description: 'Less-than-or-equal comparison.',
  },
  {
    name: 'Member',
    category: 'Access',
    syntax: 'user.name / user?.name',
    description:
      'Member access over object paths. Optional chaining is supported, but not required because rs-x handles null/undefined path segments safely.',
  },
  {
    name: 'Multiplication',
    category: 'Arithmetic',
    syntax: 'a * b',
    description: 'Numeric multiplication.',
  },
  {
    name: 'New',
    category: 'Call / construction',
    syntax: 'new Date()',
    description: 'Constructor invocation node.',
  },
  {
    name: 'Not',
    category: 'Logical',
    syntax: '!isEnabled',
    description: 'Logical negation.',
  },
  {
    name: 'Null',
    category: 'Literal',
    syntax: 'null',
    description: 'Null literal node.',
  },
  {
    name: 'NullishCoalescing',
    category: 'Logical',
    syntax: "name ?? 'N/A'",
    description: 'Nullish-coalescing operator.',
  },
  {
    name: 'Number',
    category: 'Literal',
    syntax: '42',
    description: 'Number literal node.',
  },
  {
    name: 'Object',
    category: 'Literal / structure',
    syntax: '({ total: a + b })',
    description: 'Object literal node.',
  },
  {
    name: 'Or',
    category: 'Logical',
    syntax: 'left || right',
    description:
      'Logical OR with short-circuit behavior (returns first truthy operand).',
  },
  {
    name: 'RegExp',
    category: 'Literal',
    syntax: '/abc/i',
    description: 'Regular expression literal node.',
  },
  {
    name: 'Remainder',
    category: 'Arithmetic',
    syntax: 'count % 2',
    description: 'Remainder operator.',
  },
  {
    name: 'Sequence',
    category: 'Control / ordering',
    syntax: '(a++, a)',
    description: 'Comma sequence; returns the last expression result.',
  },
  {
    name: 'Spread',
    category: 'Literal / structure',
    syntax: '({ ...defaults, enabled: true })',
    description:
      'Spread expansion for objects, arrays, and call arguments.',
  },
  {
    name: 'StrictEquality',
    category: 'Comparison',
    syntax: 'a === b',
    description: 'Strict equality check (no coercion).',
  },
  {
    name: 'StrictInequality',
    category: 'Comparison',
    syntax: 'a !== b',
    description: 'Strict inequality check (no coercion).',
  },
  {
    name: 'String',
    category: 'Literal',
    syntax: "'hello'",
    description: 'String literal node.',
  },
  {
    name: 'Subtraction',
    category: 'Arithmetic',
    syntax: 'a - b',
    description: 'Numeric subtraction.',
  },
  {
    name: 'TemplateLiteral',
    category: 'Literal',
    syntax: '`Hello ${name}`',
    description: 'Template string node.',
  },
  {
    name: 'Typeof',
    category: 'Type / reflection',
    syntax: "typeof value === 'string'",
    description: 'JavaScript typeof operator node.',
  },
  {
    name: 'UnaryNegation',
    category: 'Arithmetic',
    syntax: '-amount',
    description: 'Arithmetic negation.',
  },
  {
    name: 'UnaryPlus',
    category: 'Arithmetic',
    syntax: '+value',
    description: 'Numeric coercion via unary plus.',
  },
];

export const metadata = {
  title: 'Expression types',
  description:
    'Overview of supported expression node types.',
};

export default function ExpressionTypesCoreConceptPage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader docsApiHeaderTitleAlign">
        <div className="docsApiTitleBlock">
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: 'Core concepts', href: '/docs' },
              { label: 'Expression types' },
            ]}
          />
          <p className="docsApiEyebrow">Core Concepts</p>
          <h1 className="sectionTitle">Expression types</h1>
        </div>
        <div className="docsApiActions docsApiActionsTitle">
          <Link className="btn btnGhost" href="/docs/expression-type">
            ExpressionType API <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
      <p className="sectionLead docsApiLead">
        Quick reference of the expression types you can use in rs-x
        expressions.
      </p>

      <div className="docsApiGrid">
        <article className="card docsApiCard">
          <h2 className="cardTitle">What this page covers</h2>
          <p className="cardText">
            This table lists the supported expression node kinds, grouped by
            category.
          </p>
          <p className="cardText">
            It focuses on user-facing expression types you can use directly in
            expressions.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">How to use this page</h2>
          <p className="cardText">
            Use this page as a quick reference while writing or debugging an
            expression.
          </p>
          <p className="cardText">
            If a result looks wrong, identify the node type first and then
            check that part of the expression.
          </p>
          <p className="cardText">
            Optional chaining (<span className="codeInline">?.</span>) is
            supported. It is not required in rs-x member-path evaluation,
            because member path evaluation already handles{' '}
            <span className="codeInline">null</span>{' '}
            and <span className="codeInline">undefined</span> safely.
          </p>
        </article>
      </div>

      <article className="card docsApiCard expressionTypesTableCard">
        <h2 className="cardTitle">Supported expression types</h2>
        <ExpressionTypesTable rows={expressionTypeRows} />
      </article>
    </DocsPageTemplate>
  );
}
