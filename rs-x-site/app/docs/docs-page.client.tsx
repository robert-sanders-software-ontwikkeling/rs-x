'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type DocsLinkItem = {
  href: string;
  title: string;
  meta: string;
};

type DocsNamespace = {
  name: string;
  href?: string;
  links: DocsLinkItem[];
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
    title: 'Batching transactions',
    meta: 'Group updates and commit once',
  },
  {
    href: '/docs/core-concepts/caching-and-identity',
    title: 'Caching and identity',
    meta: 'Stable ids and reusable instances',
  },
  {
    href: '/docs/core-concepts/collections',
    title: 'Collections',
    meta: 'Array/Map/Set observation and updates',
  },
  {
    href: '/docs/core-concepts/error-diagnostics',
    title: 'Error diagnostics',
    meta: 'Capture and inspect runtime errors',
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
    meta: 'Safe commit flow and write constraints',
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
  const activeApiEntryCount = activeNamespace
    ? getApiEntryCount(activeNamespace.links)
    : null;

  return (
    <main id="content" className="main">
      <section className="section docsLandingSection">
        <div className="container docsPage">
          <h1 className="sectionTitle">Documentation</h1>
          <p className="docsPageLead">
            Start with concepts, then move to API details and advanced
            internals.
          </p>

          <div className="docsCards">
            <article className="card">
              <p className="docsCardEyebrow">Guide</p>
              <h2 className="cardTitle">Core concepts</h2>
              <p className="cardText">
                Build modular expressions that work with async values,
                collections, member access, readonly properties, and predictable
                update flow.
              </p>
              <ul
                className="docsApiLinkGrid docsConceptLinkGrid"
                aria-label="Core concept topics"
              >
                {coreConceptLinks.map((link) => (
                  <li key={link.href}>
                    <Link className="docsApiLinkItem" href={link.href}>
                      <span className="docsApiLinkTitle">{link.title}</span>
                      <span className="docsApiLinkMeta">{link.meta}</span>
                      <span className="docsApiLinkArrow" aria-hidden="true">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </article>

            <article className="card">
              <p className="docsCardEyebrow">API</p>
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
                <div
                  className="docsApiPackageTabs"
                  role="tablist"
                  aria-label="API package tabs"
                >
                  {apiNamespaces.map((namespace) => {
                    const isActive = namespace.name === selectedNamespace;
                    const tabMeta = namespaceMeta(namespace.name);
                    return (
                      <button
                        key={namespace.name}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        className={`docsApiPackageTab${isActive ? ' isActive' : ''}`}
                        title={tabMeta.packageName}
                        onClick={() => {
                          setSelectedNamespace(namespace.name);
                        }}
                      >
                        <span className="docsApiPackageTabLabel">
                          {tabMeta.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

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
                          {activeNamespace.links.length} modules
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
                                <span className="docsApiLinkTitle">
                                  {link.title}
                                </span>
                                <span className="docsApiLinkMeta">
                                  {link.meta}
                                </span>
                                <span
                                  className="docsApiLinkArrow"
                                  aria-hidden="true"
                                >
                                  →
                                </span>
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
              <p className="docsCardEyebrow">Architecture</p>
              <h2 className="cardTitle">Advanced</h2>
              <ul
                className="docsApiLinkGrid"
                aria-label="Advanced runtime docs"
              >
                {advancedLinks.map((link) => (
                  <li key={link.href}>
                    <Link className="docsApiLinkItem" href={link.href}>
                      <span className="docsApiLinkTitle">{link.title}</span>
                      <span className="docsApiLinkMeta">{link.meta}</span>
                      <span className="docsApiLinkArrow" aria-hidden="true">
                        →
                      </span>
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
