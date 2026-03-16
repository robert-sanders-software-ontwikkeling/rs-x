import { apiPackages } from './api-packages';
import { coreApiItems } from './core-api/core-api.data';
import { DocsPageClient } from './docs-page.client';
import { stateManagerApiItems } from './state-manager-api/state-manager-api.data';

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
