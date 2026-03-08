'use client';

import { useMemo, useState } from 'react';

export interface IComparisonRow {
  dimension: string;
  values: Record<string, string>;
}

export interface IFeaturesComparisonProps {
  frameworks: string[];
  rsxKey: string;
  rows: IComparisonRow[];
}

const AUTO_LINKS: Array<{ token: string; href: string; label?: string }> = [
  { token: 'IExpressionChangeTransactionManager', href: '/docs/expression-change-transaction-manager' },
  { token: 'IExpressionChangeTrackerManager', href: '/docs/expression-change-tracker-manager' },
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

  if (!linkRegex.test(cleaned)) {
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
      nodes.push(...renderTextWithAutoLinks(cleaned.slice(lastIndex, start), `${keyPrefix}-part-${start}`));
    }

    nodes.push(
      <a key={`${keyPrefix}-${href}-${start}`} href={href}>
        {label}
      </a>,
    );

    lastIndex = end;
    match = linkRegex.exec(cleaned);
  }

  if (lastIndex < cleaned.length) {
    nodes.push(...renderTextWithAutoLinks(cleaned.slice(lastIndex), `${keyPrefix}-tail-${lastIndex}`));
  }

  return <>{nodes}</>;
}

function renderTextWithAutoLinks(text: string, keyPrefix: string): React.ReactNode[] {
  if (!text) {
    return [];
  }

  const orderedTokens = [...AUTO_LINKS].sort((a, b) => b.token.length - a.token.length);
  const tokenRegex = new RegExp(orderedTokens.map((item) => escapeRegExp(item.token)).join('|'), 'g');
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
        <a key={`${keyPrefix}-auto-${start}`} href={target.href}>
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

function renderCell(value: string): React.ReactNode {
  const cleaned = cleanCell(value);
  return renderInlineText(cleaned || '—', 'plain');
}

export function FeaturesComparisonClient({
  frameworks,
  rsxKey,
  rows,
}: IFeaturesComparisonProps) {
  const [selectedFramework, setSelectedFramework] = useState<string>('');

  const visibleColumns = useMemo(() => {
    if (!selectedFramework) {
      return [rsxKey];
    }

    return [rsxKey, selectedFramework];
  }, [rsxKey, selectedFramework]);

  return (
    <div className='featuresShell'>
      <header className='featuresHeader'>
        <div className='featuresTitleWrap'>
          <h1 className='featuresTitle'>Features</h1>
        </div>

        <div className='comparisonControls'>
          <label htmlFor='framework-select' className='comparisonLabel'>
            Compare with
          </label>
          <select
            id='framework-select'
            className='comparisonSelect'
            value={selectedFramework}
            onChange={(event) => {
              setSelectedFramework(event.target.value);
            }}
          >
            <option value=''>None (RS-X only)</option>
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

      <div className='comparisonWrap'>
        <table className='comparisonTable'>
          <thead>
            <tr>
              <th>Dimension</th>
              {visibleColumns.map((column) => {
                return <th key={column}>{column}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              return (
                <tr key={row.dimension}>
                  <td>{cleanCell(row.dimension)}</td>
                  {visibleColumns.map((column) => {
                    return (
                      <td key={`${row.dimension}-${column}`}>
                        {renderCell(row.values[column] ?? '—')}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
