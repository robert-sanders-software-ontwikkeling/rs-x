import { coreApiItems } from './core-api/core-api.data';
import { stateManagerApiItems } from './state-manager-api/state-manager-api.data';
import { apiPackages } from './api-packages';
import { DocsPageClient } from './docs-page.client';

export const metadata = {
  title: 'Docs',
  description: 'Documentation and concepts for rs-x declarative reactivity.',
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
    href: '/docs/core-concepts/performance-report',
    title: 'Performance report',
    meta: 'Parse, bind, update, and memory benchmarks',
  },
  {
    href: '/docs/core-concepts/compiled-vs-tree',
    title: 'Compiled vs tree: the break-even point',
    meta: 'At which expression complexity does compiled mode become faster than tree?',
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

export default function DocsPage() {
  return (
    <DocsPageClient
      apiNamespaces={apiPackages}
      advancedLinks={advancedLinks}
      apiSymbols={apiSymbols}
    />
  );
}
