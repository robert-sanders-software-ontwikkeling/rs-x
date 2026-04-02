import dedent from 'dedent';
import type { Metadata } from 'next';

import {
  type CoreConceptDoc,
  CoreConceptPageLayout,
} from '../_template/core-concept-page';

import { CompilerFlowDiagram } from './compiler-flow-diagram.client';

const buildBasicsCode = dedent`
  # Development build
  npx rsx build --project tsconfig.json

  # Production build (AOT-focused profile)
  npx rsx build --project tsconfig.json --prod
`;

const perExpressionOptionsCode = dedent`
  const bindCellTotal = rsx<number>('price * quantity', {
    preparse: true,
    lazy: false,
    compiled: true,
  });

  const total = bindCellTotal(rowModel);
`;

const productionConfigCode = dedent`
  {
    "rsx": {
      "build": {
        "aotPreparse": true,
        "compiledResolvedEvaluator": true
      }
    }
  }
`;

const lazyOptionCode = dedent`
  const bindAdvanced = rsx<number>('complexA + complexB * complexC', {
    preparse: true,
    lazy: true,
  });
`;

const doc: CoreConceptDoc = {
  title: 'Compiler',
  lead: 'Use the rs-x compiler to move expression parse/compile work to build time and improve runtime performance.',
  whatItMeans: (
    <>
      <p>
        The rs-x compiler analyzes expression declaration sites in your source
        (`rsx(...)` and `IExpressionFactory.create(...)`), validates expression
        semantics, and can generate build-time artifacts (preparsed cache and
        compiled plans). Runtime uses those artifacts to skip runtime parsing
        and, in compiled mode, execute precompiled expression functions instead
        of evaluating expression trees.
      </p>
      <div style={{ marginTop: 12 }}>
        <CompilerFlowDiagram kind="build" />
        <CompilerFlowDiagram kind="runtime" />
      </div>
    </>
  ),
  whyItMatters:
    'Using the compiler reduces runtime parse pressure, improves startup consistency, and gives stronger feedback in CI/editor diagnostics. The tradeoff is build complexity, and generated output can become large when you have many unique long expressions.',
  keyPoints: [
    '`rsx build` scans your source for expression declarations, validates them, and generates configured AOT artifacts during build.',
    'There are two config levels: build-level defaults/gates in `package.json` (`rsx.build`) and per-expression options in `rsx(..., options)`.',
    '`preparse` means expression parsing is done at build time so runtime parser work is skipped for those expressions.',
    '`lazy` (requires `compiled: true`) defers loading the AOT-compiled plan module until the expression is first used instead of registering it at startup.',
    '`compiled` controls whether a specific expression site is emitted as a compiled plan (default true).',
    'Use `rsx typecheck` in CI to catch expression semantic issues early.',
    'Compiler options improve startup/runtime behavior, but can increase build time and output size for many long unique expressions.',
  ],
  deepDive: [
    {
      title: 'How the compiler pipeline works',
      paragraphs: [
        'During build, rs-x scans static expression declaration sites (`rsx("...")` and `expressionFactory.create(...)`), reads each expression string, validates identifiers/member paths/supported operators against TypeScript model types, and emits generated registration artifacts when configured.',
        'At runtime, expression factory/cache uses those generated entries first. That avoids parsing the same expression strings at first render or first bind.',
      ],
    },
    {
      title: 'Build config vs expression options',
      paragraphs: [
        'Use `rsx.build` in `package.json` for build-level defaults/gates (for example enabling AOT preparse generation for the build profile).',
        'Use `rsx(..., { preparse, lazy, compiled })` for per-expression behavior. This is where you opt a specific declaration in/out.',
        'Practical rule: set your global build defaults once, then override only exceptional expression sites.',
      ],
    },
    {
      title: 'When to use preparse',
      paragraphs: [
        'Use `preparse: true` to move parse work to build time and avoid runtime parser cost for statically discoverable expressions.',
        'For repeated expressions (for example shared table-column expressions), runtime already parses once per unique string and reuses cache entries across rows.',
        'Preparse is usually a net win in production because parse shifts to build, but it can increase generated code size when many unique long expressions are present.',
        'If expressions are mostly dynamic/generated at runtime, preparse gives limited benefit because those strings are not statically discoverable.',
      ],
    },
    {
      title: 'When to use lazy',
      paragraphs: [
        '`lazy` only takes effect when `compiled: true` is also set. It controls whether the AOT-generated compiled plan module is loaded eagerly at startup or deferred until the expression is first used.',
        'Use `lazy: true` for expressions that are not needed at startup (feature-gated screens, rarely opened panels, admin/debug routes).',
        'Use `lazy: false` (the default) for critical above-the-fold expressions where the compiled plan must be ready immediately.',
        'Lazy keeps the initial bundle smaller, but the first use pays the cost of loading the generated compiled plan module on demand.',
      ],
    },
    {
      title: 'When to use compiled',
      paragraphs: [
        'Use `compiled: true` as the default for normal runtime workloads.',
        'Only use `compiled: false` when you explicitly need expression-tree behavior for that declaration site (for example expression tree visualization or tree-based debugging/introspection).',
        'In short: no extra option is needed for compiled mode (`compiled` defaults to `true`); only set `compiled: false` when you explicitly need tree-specific tooling.',
      ],
    },
    {
      title: 'Advantages and disadvantages',
      paragraphs: [
        'Advantages: lower runtime parse work, faster startup/first-use paths, stronger compile-time diagnostics, and better control over precompute/defer tradeoffs.',
        'Disadvantages: longer build pipeline and larger generated output for many long unique expressions',
        'A practical default is: production `--prod` with AOT enabled, preparse for stable repeated expressions, lazy (with compiled) for non-critical or rarely-used expression sites.',
      ],
    },
  ],
  examples: [
    {
      title: 'Build commands',
      description:
        'Run the build command that validates expressions and generates configured AOT output in dev or prod.',
      code: buildBasicsCode,
    },
    {
      title: 'Per-expression options',
      description:
        'Control AOT behavior per declaration with `preparse`, `lazy`, and `compiled`.',
      code: perExpressionOptionsCode,
    },
    {
      title: 'Production config',
      description:
        'Typical production-oriented compiler settings in package config.',
      code: productionConfigCode,
    },
    {
      title: 'Lazy example',
      description: 'Defer generated entry loading for rarely used expressions.',
      code: lazyOptionCode,
    },
  ],
  related: [
    {
      href: '/docs/core-concepts/cli',
      title: 'CLI',
      meta: 'How `rsx build` and `rsx typecheck` are executed',
    },
    {
      href: '/docs/core-concepts/performance-report',
      title: 'Performance report',
      meta: 'See parse/bind/update impact and generated benchmark results',
    },
    {
      href: '/docs/rsx-function',
      title: 'rsx function',
      meta: 'API contract including declaration options',
    },
    {
      href: '/docs/irsx-options',
      title: 'IRsxOptions',
      meta: 'Option details for `preparse`, `lazy`, and `compiled`',
    },
  ],
};

export const metadata: Metadata = {
  title: doc.title,
  description: doc.lead,
};

export default function Page() {
  return <CoreConceptPageLayout doc={doc} />;
}
