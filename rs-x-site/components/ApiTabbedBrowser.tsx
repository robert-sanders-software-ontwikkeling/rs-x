'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
  type ITabItem,
  ItemLinkCardContent,
  Tabs,
} from '@rs-x/react-components';

export type ApiTabbedLink = {
  href: string;
  title: string;
  meta: string;
};

export type ApiTabbedSection = {
  id?: string;
  heading?: string;
  entryCount?: number;
  links: ApiTabbedLink[];
};

export type ApiTabbedSymbol = {
  href: string;
  title: string;
  description: string;
  kind: string;
  tabValue?: string;
};

export type ApiTabbedTab = {
  value: string;
  label: string;
  packageName?: string;
  npmUrl?: string;
  moduleCount?: number;
  apiEntryCount?: number;
  sections: ApiTabbedSection[];
};

type ApiTabbedBrowserProps = {
  tabs: ApiTabbedTab[];
  symbols?: ApiTabbedSymbol[];
  searchId?: string;
  searchPlaceholder?: string;
  persistKey?: string;
  ariaLabel?: string;
};

export function ApiTabbedBrowser({
  tabs,
  symbols,
  searchId = 'api-tabbed-search',
  searchPlaceholder = 'Type a symbol, module, or topic...',
  persistKey,
  ariaLabel = 'API tabs',
}: ApiTabbedBrowserProps) {
  const [selectedTab, setSelectedTab] = useState(tabs[0]?.value ?? '');
  const [query, setQuery] = useState('');

  // Sync initial tab from URL hash (e.g. /docs/state-manager-api#observer-core)
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && tabs.some((t) => t.value === hash)) {
      setSelectedTab(hash);
    }
  }, [tabs]);

  const normalized = query.trim().toLowerCase();
  const isSearching = normalized.length > 0;

  const searchResults = useMemo(() => {
    if (!normalized) return [];
    const results: Array<{
      href: string;
      title: string;
      meta: string;
      category: string;
    }> = [];
    const seen = new Set<string>();

    for (const tab of tabs) {
      for (const section of tab.sections) {
        for (const link of section.links) {
          if (
            !seen.has(link.href) &&
            `${link.title} ${link.meta}`.toLowerCase().includes(normalized)
          ) {
            seen.add(link.href);
            const category = section.heading
              ? `${tab.label} · ${section.heading}`
              : tab.label;
            results.push({ ...link, category });
          }
        }
      }
    }

    if (symbols) {
      for (const sym of symbols) {
        if (
          !seen.has(sym.href) &&
          `${sym.title} ${sym.description} ${sym.kind}`
            .toLowerCase()
            .includes(normalized)
        ) {
          seen.add(sym.href);
          const matchingTab = sym.tabValue
            ? tabs.find((t) => t.value === sym.tabValue)
            : undefined;
          results.push({
            href: sym.href,
            title: sym.title,
            meta: `${sym.kind} · ${sym.description}`,
            category: matchingTab?.label ?? sym.kind,
          });
        }
      }
    }

    return results;
  }, [tabs, symbols, normalized]);

  const tabItems = useMemo<ITabItem<string>[]>(
    () =>
      tabs.map((tab) => ({
        value: tab.value,
        label: tab.label,
        title: tab.packageName,
      })),
    [tabs],
  );

  const activeTab = tabs.find((t) => t.value === selectedTab) ?? tabs[0];

  return (
    <div>
      <div className="docsSearchBar docsSearchBarInCard">
        <input
          id={searchId}
          aria-label="Search"
          className="docsSearchInput"
          type="search"
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {isSearching ? (
        <div role="status" aria-live="polite">
          {searchResults.length === 0 ? (
            <div className="docsSearchEmpty">
              <p className="cardText">
                No results for{' '}
                <span className="codeInline">{query}</span>.
              </p>
            </div>
          ) : (
            <ul className="docsApiLinkGrid" aria-label="Search results">
              {searchResults.map((result) => (
                <li key={result.href}>
                  <Link className="docsApiLinkItem" href={result.href}>
                    <ItemLinkCardContent
                      title={result.title}
                      meta={`${result.category} — ${result.meta}`}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="docsApiTabbedShell">
          <Tabs
            unstyled
            ariaLabel={ariaLabel}
            persistKey={persistKey}
            items={tabItems}
            value={selectedTab}
            onValueChange={setSelectedTab}
            listClassName="docsApiPackageTabs"
            tabClassName="docsApiPackageTab"
            activeTabClassName="isActive"
            labelClassName="docsApiPackageTabLabel"
          />

          <div className="docsApiTabBody">
            {activeTab && (
              <>
                {(activeTab.packageName !== undefined ||
                  activeTab.moduleCount !== undefined) && (
                  <div className="docsApiTabHeading">
                    {activeTab.npmUrl ? (
                      <a
                        className="docsApiPackageMetaLink"
                        href={activeTab.npmUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {activeTab.packageName}{' '}
                        <span aria-hidden="true">↗</span>
                      </a>
                    ) : activeTab.packageName ? (
                      <span className="docsApiPackageMetaText">
                        {activeTab.packageName}
                      </span>
                    ) : null}
                    <div className="docsApiTabStats">
                      {activeTab.moduleCount !== undefined && (
                        <span className="docsApiStatChip">
                          {activeTab.moduleCount} modules
                        </span>
                      )}
                      {activeTab.apiEntryCount !== undefined && (
                        <span className="docsApiStatChip">
                          {activeTab.apiEntryCount} API entries
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="docsApiNamespaceList" aria-label="API docs">
                  {activeTab.sections.map((section, i) => (
                    <section
                      key={section.id ?? section.heading ?? i}
                      id={section.id}
                      className="docsApiNamespace"
                    >
                      {section.heading && (
                        <h3 className="docsApiNamespaceTitle">
                          <span className="codeInline">
                            {section.heading}
                          </span>
                          {section.entryCount !== undefined && (
                            <span className="docsApiModuleCount">
                              {section.entryCount} entries
                            </span>
                          )}
                        </h3>
                      )}
                      <ul className="docsApiLinkGrid">
                        {section.links.map((link) => (
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
