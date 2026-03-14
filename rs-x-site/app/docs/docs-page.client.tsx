'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  type ITabItem,
  ItemLinkCardContent,
  Tabs,
} from '@rs-x/react-components';

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

type DocsPageClientProps = {
  apiNamespaces: DocsNamespace[];
  advancedLinks: DocsLinkItem[];
};

const coreConceptLinks: DocsLinkItem[] = [
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
    href: '/docs/core-concepts/member-expressions',
    title: 'Member expressions',
    meta: 'Nested property and member access',
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

function matches(link: DocsLinkItem, query: string): boolean {
  const haystack = `${link.title} ${link.meta}`.toLowerCase();
  return haystack.includes(query);
}

export function DocsPageClient({
  apiNamespaces,
  advancedLinks,
}: DocsPageClientProps) {
  const [query, setQuery] = useState('');
  const [selectedNamespace, setSelectedNamespace] = useState(
    apiNamespaces[0]?.name ?? '',
  );
  const normalized = query.trim().toLowerCase();
  const isSearching = normalized.length > 0;

  const filteredApiNamespaces = useMemo(() => {
    if (!normalized) {
      return apiNamespaces;
    }

    return apiNamespaces
      .map((namespace) => {
        return {
          ...namespace,
          links: namespace.links.filter((link) => matches(link, normalized)),
        };
      })
      .filter((namespace) => namespace.links.length > 0);
  }, [apiNamespaces, normalized]);

  const noApiResults =
    normalized.length > 0 && filteredApiNamespaces.length === 0;
  const visibleNamespaces = normalized
    ? filteredApiNamespaces
    : filteredApiNamespaces.filter(
        (namespace) => namespace.name === selectedNamespace,
      );
  const activeNamespace = visibleNamespaces[0];
  const activeNamespaceMeta = activeNamespace
    ? namespaceMeta(activeNamespace.name)
    : { key: 'all' as const, label: '', packageName: '' };
  const activeModuleCount = activeNamespace
    ? (isSearching
      ? activeNamespace.links.length
      : (activeNamespace.moduleCount ?? activeNamespace.links.length))
    : 0;
  const activeApiEntryCount = activeNamespace
    ? (isSearching
      ? (getApiEntryCount(activeNamespace.links) ?? activeNamespace.links.length)
      : (activeNamespace.apiEntryCount ??
        getApiEntryCount(activeNamespace.links) ??
        activeNamespace.links.length))
    : null;
  const apiPackageTabs = useMemo<ITabItem<string>[]>(() => {
    return apiNamespaces.map((namespace) => {
      const tabMeta = namespaceMeta(namespace.name);
      return {
        value: namespace.name,
        label: tabMeta.label,
        title: tabMeta.packageName,
      };
    });
  }, [apiNamespaces]);

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
                      <ItemLinkCardContent title={link.title} meta={link.meta} />
                    </Link>
                  </li>
                ))}
              </ul>
            </article>

            <article className="card">
              <p className="docsCardEyebrow docsCardEyebrowApi">API</p>
              <h2 className="cardTitle">API reference</h2>

              <div className="docsSearchBar docsSearchBarInCard">
                <div className="docsSearchPanelHeader">
                  <label className="docsSearchLabel" htmlFor="docs-search">
                    API search
                  </label>
                  <p className="docsSearchHint">
                    Filters the API entries below
                  </p>
                </div>
                <input
                  id="docs-search"
                  className="docsSearchInput"
                  type="search"
                  placeholder="Type a symbol, module, or topic..."
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                  }}
                />
              </div>

              {noApiResults && (
                <div
                  className="docsSearchEmpty"
                  role="status"
                  aria-live="polite"
                >
                  <p className="cardText">
                    No API docs found for{' '}
                    <span className="codeInline">{query}</span>.
                  </p>
                </div>
              )}

              <div
                className="docsApiTabbedShell"
                data-api-package={isSearching ? 'all' : activeNamespaceMeta.key}
              >
                <Tabs
                  unstyled
                  ariaLabel="API package tabs"
                  persistKey="docs.api-packages"
                  items={apiPackageTabs}
                  value={selectedNamespace}
                  onValueChange={setSelectedNamespace}
                  listClassName="docsApiPackageTabs"
                  tabClassName="docsApiPackageTab"
                  activeTabClassName="isActive"
                  labelClassName="docsApiPackageTabLabel"
                />

                <div className="docsApiTabBody">
                  {activeNamespace && (
                    <div className="docsApiTabHeading">
                      {activeNamespaceMeta.npmUrl ? (
                        <a
                          className="docsApiPackageMetaLink"
                          href={activeNamespaceMeta.npmUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {activeNamespaceMeta.packageName}{' '}
                          <span aria-hidden="true">↗</span>
                        </a>
                      ) : (
                        <span className="docsApiPackageMetaText">
                          {activeNamespaceMeta.packageName}
                        </span>
                      )}
                      <div className="docsApiTabStats">
                        <span className="docsApiStatChip">
                          {activeModuleCount} modules
                        </span>
                        <span className="docsApiStatChip">
                          {activeApiEntryCount === null
                            ? `${activeNamespace.links.length} API entries`
                            : `${activeApiEntryCount} API entries`}
                        </span>
                        {isSearching ? (
                          <span className="docsApiStatChip">
                            {visibleNamespaces.length} matching package(s)
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}

                  <div className="docsApiNamespaceList" aria-label="API docs">
                    {visibleNamespaces.map((namespace) => (
                      <section
                        key={namespace.name}
                        className="docsApiNamespace"
                      >
                        {!activeNamespace ||
                        namespace.name !== activeNamespace.name ? (
                          <h3 className="docsApiNamespaceTitle">
                            {namespace.href ? (
                              <Link href={namespace.href}>
                                {namespace.name}
                              </Link>
                            ) : (
                              namespace.name
                            )}
                          </h3>
                        ) : null}
                        <ul className="docsApiLinkGrid">
                          {namespace.links.map((link) => (
                            <li key={link.href}>
                              <Link
                                className="docsApiLinkItem"
                                href={link.href}
                              >
                                <ItemLinkCardContent
                                  title={link.title}
                                  meta={link.meta}
                                />
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                </div>
              </div>
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
                      <ItemLinkCardContent title={link.title} meta={link.meta} />
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
