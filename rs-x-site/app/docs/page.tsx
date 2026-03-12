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
];

export default function DocsPage() {
  return (
    <DocsPageClient apiNamespaces={apiPackages} advancedLinks={advancedLinks} />
  );
}
