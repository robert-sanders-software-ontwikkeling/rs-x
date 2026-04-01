import Link from 'next/link';
import { type ReactNode } from 'react';

import { coreApiItems } from '../app/docs/core-api/core-api.data';
import { stateManagerApiItems } from '../app/docs/state-manager-api/state-manager-api.data';

const INVERSIFY_URL = 'https://inversify.io/';
const CORE_API_SYMBOLS = new Set(coreApiItems.map((item) => item.symbol));
const STATE_MANAGER_API_SYMBOLS = new Set(
  stateManagerApiItems.map((item) => item.symbol),
);

const TYPE_DOC_LINKS: Record<string, string> = {
  AbstractExpression: '/docs/abstract-expression',
  ChangeHook: '/docs/change-hook',
  Container: 'https://inversify.io/docs/api/container/',
  ContainerModuleLoadOptions: 'https://inversify.io/docs/api/container-module/',
  ExpressionType: '/docs/expression-type',
  IExpression: '/docs/iexpression',
  IExpressionChangeCommitHandler: '/docs/expression-change-commit-handler',
  IExpressionChangeTrackerManager: '/docs/expression-change-tracker-manager',
  IExpressionChangeTransactionManager:
    '/docs/expression-change-transaction-manager',
  IRsxOptions: '/docs/irsx-options',
  IIndexWatchRule: '/docs/index-watch-rule',
  IProxyRegistry: '/docs/iproxy-registry',
  IMultiInjectService: '/docs/core-api/IMultiInjectService',
  ServiceIdentifier: 'https://inversify.io/docs/api/service-identifier/',
  KeyedInstanceFactory: '/docs/core-api/KeyedInstanceFactory',
  rsx: '/docs/rsx-function',
  'read-only properties': '/docs/core-concepts/readonly-properties',
  'state manager': '/docs/state-manager-api/StateManager',
};

export function extractTypeCandidates(type: string): string[] {
  const normalized = type
    .replace(/\breadonly\b/g, ' ')
    .replace(/\[\]/g, ' ')
    .replace(/[<>{}()[\],|&?:]/g, ' ')
    .replace(/\bextends\b/g, ' ');
  const matches = normalized.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [];
  return Array.from(new Set(matches));
}

export function resolveSymbolDocumentationLink(
  symbol: string,
): string | undefined {
  const direct = Object.prototype.hasOwnProperty.call(TYPE_DOC_LINKS, symbol)
    ? TYPE_DOC_LINKS[symbol]
    : undefined;
  if (typeof direct === 'string') {
    return direct;
  }

  if (CORE_API_SYMBOLS.has(symbol)) {
    return `/docs/core-api/${encodeURIComponent(symbol)}`;
  }
  if (STATE_MANAGER_API_SYMBOLS.has(symbol)) {
    return `/docs/state-manager-api/${encodeURIComponent(symbol)}`;
  }

  return undefined;
}

export function resolveTypeDocumentationLink(type: string): string | undefined {
  const direct = resolveSymbolDocumentationLink(type);
  if (direct) {
    return direct;
  }

  const candidates = extractTypeCandidates(type);
  for (const candidate of candidates) {
    const href = resolveSymbolDocumentationLink(candidate);
    if (href) {
      return href;
    }
  }

  return undefined;
}

export function renderTextWithCoreLinks(
  text: string,
  currentSymbol?: string,
): ReactNode {
  const segments = text.split(/(`[^`]*`)/g);
  const externalWordLinks: Record<string, string> = {
    Inversify: INVERSIFY_URL,
  };
  const plainWordNoLink = new Set(['Type']);

  return segments.flatMap((segment, segmentIndex) => {
    const isCode = segment.startsWith('`') && segment.endsWith('`');
    if (isCode) {
      const codeText = segment.slice(1, -1);
      const href = resolveSymbolDocumentationLink(codeText);

      if (href && codeText !== currentSymbol) {
        if (href.startsWith('http')) {
          return (
            <a
              key={`code-ext-${segmentIndex}`}
              className="codeInline"
              href={href}
              target="_blank"
              rel="noreferrer"
            >
              {codeText}
            </a>
          );
        }

        return (
          <Link
            key={`code-lnk-${segmentIndex}`}
            className="codeInline"
            href={href}
          >
            {codeText}
          </Link>
        );
      }

      return (
        <span key={`code-${segmentIndex}`} className="codeInline">
          {codeText}
        </span>
      );
    }

    const nodes: ReactNode[] = [];
    const identifierRe = /[A-Za-z_][A-Za-z0-9_]*/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = identifierRe.exec(segment)) !== null) {
      const [word] = match;
      const start = match.index;
      const end = start + word.length;

      if (start > lastIndex) {
        nodes.push(
          <span key={`txt-${segmentIndex}-${lastIndex}`}>
            {segment.slice(lastIndex, start)}
          </span>,
        );
      }

      const previousChar = start > 0 ? segment[start - 1] : '';
      const isMemberSegment = previousChar === '.';
      const externalHref = externalWordLinks[word];
      const href = resolveSymbolDocumentationLink(word);

      if (externalHref) {
        nodes.push(
          <a
            key={`ext-${segmentIndex}-${start}`}
            href={externalHref}
            target="_blank"
            rel="noreferrer"
          >
            {word}
          </a>,
        );
        lastIndex = end;
        continue;
      }

      if (
        word === currentSymbol ||
        !href ||
        isMemberSegment ||
        plainWordNoLink.has(word)
      ) {
        nodes.push(<span key={`txt-${segmentIndex}-${start}`}>{word}</span>);
      } else {
        nodes.push(
          <Link key={`lnk-${segmentIndex}-${start}`} href={href}>
            {word}
          </Link>,
        );
      }

      lastIndex = end;
    }

    if (lastIndex < segment.length) {
      nodes.push(
        <span key={`txt-${segmentIndex}-${lastIndex}`}>
          {segment.slice(lastIndex)}
        </span>,
      );
    }

    return nodes;
  });
}
