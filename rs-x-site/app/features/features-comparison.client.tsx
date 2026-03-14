'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  DataTable,
  type IDataTableColumn,
} from '@rs-x/react-components';

export interface IComparisonCell {
  text: string;
  docHref?: string;
  docLabel?: string;
}

export interface IComparisonRow {
  dimension: string;
  values: Record<string, string | IComparisonCell>;
}

export interface IFeaturesComparisonProps {
  frameworks: string[];
  rsxKey: string;
  rows: IComparisonRow[];
}

const FEATURES_COMPARE_STORAGE_KEY = 'rsx.features.compareWith';

const AUTO_LINKS: Array<{ token: string; href: string; label?: string }> = [
  {
    token: 'IExpressionChangeTransactionManager',
    href: '/docs/expression-change-transaction-manager',
  },
  {
    token: 'IExpressionChangeTrackerManager',
    href: '/docs/expression-change-tracker-manager',
  },
  {
    token: 'ExpressionChangeTrackerManager',
    href: '/docs/expression-change-tracker-manager',
    label: 'expression change tracker manager',
  },
  { token: 'expression.changeHook', href: '/docs/change-hook' },
  { token: 'ChangeHook', href: '/docs/change-hook' },
  { token: 'IExpression', href: '/docs/iexpression' },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cleanCell(value: string): string {
  return value
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .trim();
}

function renderInlineText(value: string, keyPrefix: string): React.ReactNode {
  const cleaned = cleanCell(value);
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const hasMarkdownLinks = /\[[^\]]+\]\([^)]+\)/.test(cleaned);

  if (!hasMarkdownLinks) {
    return <>{renderTextWithAutoLinks(cleaned, keyPrefix)}</>;
  }

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match = linkRegex.exec(cleaned);

  while (match) {
    const [raw, label, href] = match;
    const start = match.index;
    const end = start + raw.length;

    if (start > lastIndex) {
      nodes.push(
        ...renderTextWithAutoLinks(
          cleaned.slice(lastIndex, start),
          `${keyPrefix}-part-${start}`,
        ),
      );
    }

    nodes.push(
      <a
        key={`${keyPrefix}-${href}-${start}`}
        href={href}
        target="_blank"
        rel="noreferrer"
      >
        {label}
      </a>,
    );

    lastIndex = end;
    match = linkRegex.exec(cleaned);
  }

  if (lastIndex < cleaned.length) {
    nodes.push(
      ...renderTextWithAutoLinks(
        cleaned.slice(lastIndex),
        `${keyPrefix}-tail-${lastIndex}`,
      ),
    );
  }

  return <>{nodes}</>;
}

function renderTextWithAutoLinks(
  text: string,
  keyPrefix: string,
): React.ReactNode[] {
  if (!text) {
    return [];
  }

  const orderedTokens = [...AUTO_LINKS].sort(
    (a, b) => b.token.length - a.token.length,
  );
  const tokenRegex = new RegExp(
    orderedTokens.map((item) => escapeRegExp(item.token)).join('|'),
    'g',
  );
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let tokenMatch = tokenRegex.exec(text);

  while (tokenMatch) {
    const matchedToken = tokenMatch[0];
    const start = tokenMatch.index;
    const end = start + matchedToken.length;
    const target = orderedTokens.find((item) => item.token === matchedToken);

    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start));
    }

    if (target) {
      nodes.push(
        <a
          key={`${keyPrefix}-auto-${start}`}
          href={target.href}
          target="_blank"
          rel="noreferrer"
        >
          {target.label ?? matchedToken}
        </a>,
      );
    } else {
      nodes.push(matchedToken);
    }

    lastIndex = end;
    tokenMatch = tokenRegex.exec(text);
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function renderCell(
  value: string | IComparisonCell,
  keyPrefix: string,
): React.ReactNode {
  if (typeof value === 'string') {
    const cleaned = cleanCell(value);
    return renderInlineText(cleaned || '—', keyPrefix);
  }

  const cleaned = cleanCell(value.text);
  return (
    <>
      {renderInlineText(cleaned || '—', `${keyPrefix}-text`)}
      {value.docHref ? (
        <>
          {' '}
          <a href={value.docHref} target="_blank" rel="noreferrer">
            {value.docLabel ?? 'docs'}
          </a>
        </>
      ) : null}
    </>
  );
}

export function FeaturesComparisonClient({
  frameworks,
  rsxKey,
  rows,
}: IFeaturesComparisonProps) {
  const [selectedFramework, setSelectedFramework] = useState<string>('');
  const [selectionLoaded, setSelectionLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedSelection = window.localStorage.getItem(
        FEATURES_COMPARE_STORAGE_KEY,
      );
      if (savedSelection && frameworks.includes(savedSelection)) {
        setSelectedFramework(savedSelection);
      }
    } finally {
      setSelectionLoaded(true);
    }
  }, [frameworks]);

  useEffect(() => {
    if (!selectionLoaded) {
      return;
    }

    if (selectedFramework && frameworks.includes(selectedFramework)) {
      window.localStorage.setItem(
        FEATURES_COMPARE_STORAGE_KEY,
        selectedFramework,
      );
      return;
    }

    window.localStorage.removeItem(FEATURES_COMPARE_STORAGE_KEY);
  }, [frameworks, selectedFramework, selectionLoaded]);

  const visibleColumns = useMemo(() => {
    if (!selectedFramework) {
      return [rsxKey];
    }

    return [rsxKey, selectedFramework];
  }, [rsxKey, selectedFramework]);

  const columns = useMemo(() => {
    const valueColumns: IDataTableColumn<IComparisonRow>[] = visibleColumns.map(
      (column) => ({
        id: column,
        header: column,
        renderCell: (row) =>
          renderCell(
            row.values[column] ?? '—',
            `${row.dimension}-${column}`,
          ),
        sortAccessor: (row) => {
          const value = row.values[column] ?? '—';
          return cleanCell(typeof value === 'string' ? value : value.text) || '—';
        },
        filterAccessor: (row) => {
          const value = row.values[column] ?? '—';
          const base =
            cleanCell(typeof value === 'string' ? value : value.text) || '—';
          if (typeof value === 'string') {
            return base;
          }
          return `${base} ${value.docLabel ?? ''} ${value.docHref ?? ''}`.trim();
        },
      }),
    );

    return [
      {
        id: 'dimension',
        header: 'Dimension',
        accessor: (row: IComparisonRow) => cleanCell(row.dimension),
      },
      ...valueColumns,
    ] satisfies IDataTableColumn<IComparisonRow>[];
  }, [visibleColumns]);

  return (
    <div className="featuresShell">
      <header className="featuresHeader">
        <div className="featuresTitleWrap">
          <h1 className="featuresTitle">Features</h1>
        </div>

        <div className="comparisonControls">
          <label htmlFor="framework-select" className="comparisonLabel">
            Compare with
          </label>
          <select
            id="framework-select"
            className="comparisonSelect"
            value={selectedFramework}
            onChange={(event) => {
              setSelectedFramework(event.target.value);
            }}
          >
            <option value="">None (RS-X only)</option>
            {frameworks.map((framework) => {
              return (
                <option key={framework} value={framework}>
                  {framework}
                </option>
              );
            })}
          </select>
        </div>
      </header>

      <DataTable
        rows={rows}
        columns={columns}
        getRowKey={(row) => row.dimension}
        initialSortColumnId="dimension"
        initialSortDirection="asc"
        enableFilter
        filterLabel="Search"
        hideFilterLabel
        filterPlaceholder="Search dimensions and feature text"
        emptyMessage="No feature rows match your search."
        controlsClassName="comparisonSearchRow"
        filterLabelClassName="comparisonSearchLabel"
        filterInputClassName="comparisonSearchInput"
        tableWrapClassName="comparisonWrap"
        tableClassName="comparisonTable"
        sortButtonClassName="comparisonSortButton"
        sortMarkerClassName="comparisonSortMarker"
      />
    </div>
  );
}
