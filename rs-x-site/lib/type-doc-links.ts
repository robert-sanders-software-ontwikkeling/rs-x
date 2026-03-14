import { coreApiItems } from '../app/docs/core-api/core-api.data';
import { stateManagerApiItems } from '../app/docs/state-manager-api/state-manager-api.data';

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
  IIndexWatchRule: '/docs/index-watch-rule',
  IProxyRegistry: '/docs/iproxy-registry',
  IMultiInjectService: '/docs/core-api/IMultiInjectService',
  ServiceIdentifier: 'https://inversify.io/docs/api/service-identifier/',
  KeyedInstanceFactory: '/docs/core-api/KeyedInstanceFactory',
  rsx: '/docs/rsx-function',
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
