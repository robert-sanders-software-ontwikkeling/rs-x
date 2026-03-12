import { coreApiItems } from './core-api/core-api.data';

export type DocsLinkItem = {
  href: string;
  title: string;
  meta: string;
};

export type ApiPackageKey = 'core' | 'state-manager' | 'expression-parser';

export type ApiPackageConfig = {
  key: ApiPackageKey;
  name: string;
  href: string;
  description: string;
  links: DocsLinkItem[];
};

function slugify(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

function formatModuleLabel(moduleName: string): string {
  return moduleName.replace(/\.ts$/i, '').replace(/\./g, '-');
}

const coreLinks = Array.from(new Set(coreApiItems.map((item) => item.module)))
  .sort((a, b) => a.localeCompare(b))
  .map((moduleName) => {
    const count = coreApiItems.filter(
      (item) => item.module === moduleName,
    ).length;
    return {
      href: `/docs/core-api/module/${slugify(moduleName)}`,
      title: formatModuleLabel(moduleName),
      meta: `${count} API entries`,
    };
  });

const expressionParserLinks: DocsLinkItem[] = [
  {
    href: '/docs/expression-change-transaction-manager',
    title: 'Change transaction manager',
    meta: 'Suspend/continue/commit',
  },
  {
    href: '/docs/change-hook',
    title: 'ChangeHook',
    meta: 'Custom change callback',
  },
  {
    href: '/docs/expression-change-commit-handler',
    title: 'Commit handler',
    meta: 'Commit callback contract',
  },
  {
    href: '/docs/expression-type',
    title: 'ExpressionType',
    meta: 'Node type enum',
  },
  {
    href: '/docs/abstract-expression',
    title: 'AbstractExpression',
    meta: 'Expression tree base class',
  },
  {
    href: '/docs/iexpression',
    title: 'IExpression',
    meta: 'Runtime expression object',
  },
  {
    href: '/docs/rsx-function',
    title: 'rsx function',
    meta: 'Binding entry point',
  },
  {
    href: '/docs/expression-change-tracker-manager',
    title: 'Tracker manager',
    meta: 'Track history streams',
  },
];

const stateManagerLinks: DocsLinkItem[] = [
  {
    href: '/docs/index-watch-rule',
    title: 'IIndexWatchRule',
    meta: 'Leaf index watch rule',
  },
];

export const apiPackages: ApiPackageConfig[] = [
  {
    key: 'core',
    name: '@rs-x/core',
    href: '/docs/api/core',
    description:
      'Core DI, value access, cloning, metadata, and runtime utilities.',
    links: coreLinks,
  },
  {
    key: 'state-manager',
    name: '@rs-x/state-manager',
    href: '/docs/api/state-manager',
    description: 'Observers, proxy pairs, and state change tracking services.',
    links: stateManagerLinks,
  },
  {
    key: 'expression-parser',
    name: '@rs-x/expression-parser',
    href: '/docs/api/expression-parser',
    description: 'Expression parsing, tracking, and reactive evaluation APIs.',
    links: expressionParserLinks,
  },
];

export const apiPackagesByKey: Record<ApiPackageKey, ApiPackageConfig> = {
  core: apiPackages[0],
  'state-manager': apiPackages[1],
  'expression-parser': apiPackages[2],
};
