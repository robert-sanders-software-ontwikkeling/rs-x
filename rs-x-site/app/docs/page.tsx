import { coreApiItems } from './core-api/core-api.data';
import { stateManagerApiItems } from './state-manager-api/state-manager-api.data';
import {
  coreLinks,
  expressionParserLinks,
  stateManagerLinks,
} from './api-packages';
import { DocsPageClient } from './docs-page.client';

export const metadata = {
  title: 'Docs',
  description: 'Documentation and concepts for rs-x declarative reactivity.',
  alternates: {
    canonical: '/docs',
  },
};

const advancedLinks = [
  {
    href: '/docs/expression-creation',
    title: 'Expression creation',
    meta: 'How an expression instance is created',
  },
  {
    href: '/docs/observation',
    title: 'Observation strategy',
    meta: 'How values are observed by type',
  },
  {
    href: '/docs/async-operations',
    title: 'Async operations',
    meta: 'Promise/Observable/Expression runtime flow',
  },
  {
    href: '/docs/modular-expressions',
    title: 'Modular expression internals',
    meta: 'Expression value-type extensions (same pattern as Promise/Observable support)',
  },
  {
    href: '/docs/custom-data-types',
    title: 'Custom data types',
    meta: 'Teach rs-x to observe any class — observer, proxy, index accessor, DI wiring',
  },
  {
    href: '/docs/core-concepts/performance',
    title: 'Performance',
    meta: 'Engine modes, parsing, binding, updates, memory — and what changed in v2',
  },
];

const apiSymbols = [
  ...coreApiItems.map((item) => ({
    href: `/docs/core-api/${item.symbol}`,
    title: item.symbol,
    description: item.description,
    kind: item.kind,
    category: 'Core API',
  })),
  ...stateManagerApiItems.map((item) => ({
    href: `/docs/state-manager-api/${item.symbol}`,
    title: item.symbol,
    description: item.description,
    kind: item.kind,
    category: 'State Manager',
  })),
];

const apiNamespaces = [
  {
    name: '@rs-x/core',
    links: coreLinks,
    apiEntryCount: coreApiItems.length,
  },
  {
    name: '@rs-x/state-manager',
    links: stateManagerLinks,
    apiEntryCount: stateManagerApiItems.length,
  },
  {
    name: '@rs-x/expression-parser',
    links: expressionParserLinks,
  },
];

export default function DocsPage() {
  return (
    <DocsPageClient
      apiNamespaces={apiNamespaces}
      advancedLinks={advancedLinks}
      apiSymbols={apiSymbols}
    />
  );
}
