'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import { ItemLinkCardContent } from '@rs-x/react-components';

import {
  ApiTabbedBrowser,
  type ApiTabbedSymbol,
  type ApiTabbedTab,
} from '../../components/ApiTabbedBrowser';

type DocsLinkItem = {
  href: string;
  title: string;
  meta: string;
};

type DocsNamespace = {
  name: string;
  href?: string;
  links: DocsLinkItem[];
  moduleCount?: number;
  apiEntryCount?: number;
};

type ApiSymbolEntry = {
  href: string;
  title: string;
  description: string;
  kind: string;
  category: string;
};

type DocsPageClientProps = {
  apiNamespaces: DocsNamespace[];
  advancedLinks: DocsLinkItem[];
  apiSymbols: ApiSymbolEntry[];
};

const frameworkLinks: DocsLinkItem[] = [
  {
    href: '/docs/frameworks/react',
    title: 'React',
    meta: 'useRsxExpression and useRsxModel hooks for reactive components',
  },
  {
    href: '/docs/frameworks/angular',
    title: 'Angular',
    meta: 'RsxPipe and providexRsx() for reactive Angular templates',
  },
  {
    href: '/docs/frameworks/vue',
    title: 'Vue',
    meta: 'Composition API patterns with rs-x expressions',
  },
  {
    href: '/docs/frameworks/rxjs',
    title: 'RxJS',
    meta: 'Observable values inside expressions',
  },
];

const coreConceptLinks: DocsLinkItem[] = [
  {
    href: '/docs/core-concepts/first-expression',
    title: 'Create your first expression',
    meta: 'Step-by-step flow: bind, subscribe, options, and dispose',
  },
  {
    href: '/docs/core-concepts/cli',
    title: 'CLI',
    meta: 'Scaffold, setup, build, and typecheck workflows with rsx commands',
  },
  {
    href: '/docs/core-concepts/compiler',
    title: 'Compiler',
    meta: 'How build-time preparse/compiled/lazy options affect runtime tradeoffs',
  },
  {
    href: '/docs/core-concepts/async-operations',
    title: 'Async operations',
    meta: 'Mix Promise/Observable/expression values with sync values',
  },
  {
    href: '/docs/core-concepts/batching-transactions',
    title: 'Batching changes',
    meta: 'Group updates and emit once',
  },
  {
    href: '/docs/collections',
    title: 'Collections',
    meta: 'Array/Map/Set guide with specific-item monitoring examples',
  },
  {
    href: '/docs/core-concepts/dates',
    title: 'Dates',
    meta: 'Use date properties like month/year (not getMonth/getFullYear)',
  },
  {
    href: '/docs/core-concepts/dependency-injection',
    title: 'Dependency injection',
    meta: 'Compose and adapt runtime services with Inversify',
  },
  {
    href: '/docs/core-concepts/expression-types',
    title: 'Expression types',
    meta: 'Supported node types, including internal-only nodes',
  },
  {
    href: '/docs/core-concepts/functions',
    title: 'Functions',
    meta: 'Call methods and functions directly in expressions',
  },
  {
    href: '/docs/core-concepts/identifier-owner-resolver',
    title: 'Identifier owner resolver',
    meta: 'Pluggable strategy for resolving identifier owners',
  },
  {
    href: '/docs/core-concepts/member-expressions',
    title: 'Member expressions',
    meta: 'Nested property and member access',
  },
  {
    href: '/docs/core-concepts/performance',
    title: 'Performance',
    meta: 'Engine modes, parsing, binding, updates, memory — and what changed in v2',
  },
  {
    href: '/docs/core-concepts/modular-expressions',
    title: 'Modular expressions',
    meta: 'Compose reusable expression parts',
  },
  {
    href: '/docs/core-concepts/readonly-properties',
    title: 'Readonly properties',
    meta: 'Expose readonly values while updating them internally',
  },
  {
    href: '/docs/core-concepts/side-effects',
    title: 'Side effects',
    meta: 'Run side-effect calls inline using the sequence expression',
  },
];

function namespaceMeta(name: string): {
  key: 'core' | 'state-manager' | 'expression-parser' | 'all';
  label: string;
  packageName: string;
  npmUrl?: string;
} {
  if (name === '@rs-x/core') {
    return {
      key: 'core',
      label: 'Core',
      packageName: '@rs-x/core',
      npmUrl: 'https://www.npmjs.com/package/@rs-x/core',
    };
  }
  if (name === '@rs-x/state-manager') {
    return {
      key: 'state-manager',
      label: 'State manager',
      packageName: '@rs-x/state-manager',
      npmUrl: 'https://www.npmjs.com/package/@rs-x/state-manager',
    };
  }
  if (name === '@rs-x/expression-parser') {
    return {
      key: 'expression-parser',
      label: 'Expression parser',
      packageName: '@rs-x/expression-parser',
      npmUrl: 'https://www.npmjs.com/package/@rs-x/expression-parser',
    };
  }
  return { key: 'all', label: name, packageName: name };
}

function getApiEntryCount(links: DocsLinkItem[]): number | null {
  const counts = links
    .map((link) => {
      const match = link.meta.match(/(\d+)\s+API entries?/i);
      return match ? Number(match[1]) : NaN;
    })
    .filter((value) => Number.isFinite(value));
  if (counts.length === 0) {
    return null;
  }
  return counts.reduce((sum, current) => sum + current, 0);
}

export function DocsPageClient({
  apiNamespaces,
  advancedLinks,
  apiSymbols,
}: DocsPageClientProps) {
  const apiTabs = useMemo<ApiTabbedTab[]>(
    () =>
      apiNamespaces.map((namespace) => {
        const meta = namespaceMeta(namespace.name);
        return {
          value: namespace.name,
          label: meta.label,
          packageName: meta.packageName,
          npmUrl: meta.npmUrl,
          moduleCount: namespace.moduleCount,
          apiEntryCount:
            namespace.apiEntryCount ??
            getApiEntryCount(namespace.links) ??
            namespace.links.length,
          sections: [{ links: namespace.links }],
        };
      }),
    [apiNamespaces],
  );

  const apiTabbedSymbols = useMemo<ApiTabbedSymbol[]>(
    () =>
      apiSymbols.map((sym) => ({
        href: sym.href,
        title: sym.title,
        description: sym.description,
        kind: sym.kind,
        tabValue: apiNamespaces.find((ns) =>
          ns.links.some((l) => l.href === sym.href),
        )?.name,
      })),
    [apiSymbols, apiNamespaces],
  );

  return (
    <main id="content" className="main">
      <section className="section docsLandingSection">
        <div className="container docsPage">
          <h1 className="sectionTitle">Documentation</h1>
          <p className="docsPageLead">
            Core concepts, API reference, and advanced documentation.
          </p>

          <div className="docsCards">
            <article className="card">
              <p className="docsCardEyebrow docsCardEyebrowGuide">Guide</p>
              <h2 className="cardTitle">Core concepts</h2>
              <p className="cardText">
                Build modular expressions that work with async values,
                collections, member access, dependency injection, readonly
                properties, and predictable update flow.
              </p>
              <ul
                className="docsApiLinkGrid docsConceptLinkGrid"
                aria-label="Core concept topics"
              >
                {coreConceptLinks.map((link) => (
                  <li key={link.href}>
                    <Link className="docsApiLinkItem" href={link.href}>
                      <ItemLinkCardContent
                        title={link.title}
                        meta={link.meta}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </article>

            <article className="card">
              <p className="docsCardEyebrow docsCardEyebrowFrameworks">
                Frameworks
              </p>
              <h2 className="cardTitle">Framework integrations</h2>
              <p className="cardText">
                Drop-in integrations for React, Angular, Vue, and RxJS — bind
                expressions directly to your components and templates with zero
                boilerplate.
              </p>
              <ul
                className="docsApiLinkGrid docsConceptLinkGrid"
                aria-label="Framework integrations"
              >
                {frameworkLinks.map((link) => (
                  <li key={link.href}>
                    <Link className="docsApiLinkItem" href={link.href}>
                      <ItemLinkCardContent
                        title={link.title}
                        meta={link.meta}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </article>

            <article className="card">
              <p className="docsCardEyebrow docsCardEyebrowApi">API</p>
              <h2 className="cardTitle">API reference</h2>
              <ApiTabbedBrowser
                tabs={apiTabs}
                symbols={apiTabbedSymbols}
                searchId="docs-search"
                searchPlaceholder="Type a symbol, module, or topic..."
                persistKey="docs.api-packages"
                ariaLabel="API package tabs"
              />
            </article>

            <article className="card">
              <p className="docsCardEyebrow docsCardEyebrowArchitecture">
                Architecture
              </p>
              <h2 className="cardTitle">Advanced</h2>
              <ul
                className="docsApiLinkGrid"
                aria-label="Advanced runtime docs"
              >
                {advancedLinks.map((link) => (
                  <li key={link.href}>
                    <Link className="docsApiLinkItem" href={link.href}>
                      <ItemLinkCardContent
                        title={link.title}
                        meta={link.meta}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
