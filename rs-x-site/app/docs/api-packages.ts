import { coreApiItems } from './core-api/core-api.data';
import {
  stateManagerApiGroupEntries,
  stateManagerApiItems,
} from './state-manager-api/state-manager-api.helpers';

export type DocsLinkItem = {
  href: string;
  title: string;
  meta: string;
};

export type ApiPackageKey =
  | 'core'
  | 'state-manager'
  | 'expression-parser'
  | 'compiler'
  | 'typescript-plugin'
  | 'cli'
  | 'angular'
  | 'react'
  | 'vue'
  | 'react-components'
  | 'dev-tools';

export type ApiPackageConfig = {
  key: ApiPackageKey;
  name: string;
  href: string;
  description: string;
  links: DocsLinkItem[];
  moduleCount?: number;
  apiEntryCount?: number;
};

function slugify(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

function formatModuleLabel(moduleName: string): string {
  return moduleName.replace(/\.ts$/i, '').replace(/\./g, '-');
}

export const coreLinks = Array.from(
  new Set(coreApiItems.map((item) => item.module)),
)
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

export const expressionParserLinks: DocsLinkItem[] = [
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
    href: '/docs/irsx-options',
    title: 'IRsxOptions',
    meta: 'Declaration options for rsx(expression, options)',
  },
  {
    href: '/docs/expression-change-tracker-manager',
    title: 'Tracker manager',
    meta: 'Track history streams',
  },
  {
    href: '/docs/iidentifier-owner-resolver',
    title: 'IIdentifierOwnerResolver',
    meta: 'Identifier owner resolver contract',
  },
  {
    href: '/docs/default-identifier-owner-resolver',
    title: 'DefaultIdentifierOwnerResolver',
    meta: 'Default list-iterating owner resolver',
  },
  {
    href: '/docs/property-owner-resolver',
    title: 'PropertyOwnerResolver',
    meta: 'Property / field owner lookup',
  },
  {
    href: '/docs/array-index-owner-resolver',
    title: 'ArrayIndexOwnerResolver',
    meta: 'Array index owner lookup',
  },
  {
    href: '/docs/set-key-owner-resolver',
    title: 'SetKeyOwnerResolver',
    meta: 'Set membership owner lookup',
  },
  {
    href: '/docs/map-key-owner-resolver',
    title: 'MapKeyOwnerResolver',
    meta: 'Map key owner lookup',
  },
  {
    href: '/docs/global-identifier-owner-resolver',
    title: 'GlobalIdentifierOwnerResolver',
    meta: 'Built-in globals (Math, Date, console…)',
  },
];

export const stateManagerLinks: DocsLinkItem[] = [
  ...stateManagerApiGroupEntries.map((group) => ({
    href: `/docs/state-manager-api#${group.key}`,
    title: group.title,
    meta: `${group.apiEntryCount} API entries`,
  })),
];

const compilerLinks: DocsLinkItem[] = [
  {
    href: '/docs/core-concepts/compiler',
    title: 'Compiler',
    meta: 'Build-time parsing, validation, and compiled expressions',
  },
  {
    href: '/docs/core-concepts/cli',
    title: 'CLI',
    meta: 'Install compiler tooling via rsx install compiler',
  },
];

const typescriptPluginLinks: DocsLinkItem[] = [
  {
    href: '/docs/core-concepts/compiler',
    title: 'Compiler integration',
    meta: 'Language service and TypeScript plugin behavior',
  },
];

const cliLinks: DocsLinkItem[] = [
  {
    href: '/docs/core-concepts/cli',
    title: 'CLI',
    meta: 'Install, setup, build, and typecheck workflows',
  },
  {
    href: '/get-started',
    title: 'Get started',
    meta: 'Bootstrap an rs-x project',
  },
];

const reactLinks: DocsLinkItem[] = [
  {
    href: '/docs/frameworks/react',
    title: 'React integration',
    meta: 'useRsxExpression and useRsxModel hooks',
  },
];

const vueLinks: DocsLinkItem[] = [
  {
    href: '/docs/frameworks/vue',
    title: 'Vue integration',
    meta: 'useRsxExpression composable',
  },
];

const angularLinks: DocsLinkItem[] = [
  {
    href: '/docs/frameworks/angular',
    title: 'Angular integration',
    meta: 'RsxPipe and providexRsx() for templates',
  },
];

const reactComponentsLinks: DocsLinkItem[] = [
  {
    href: '/docs',
    title: 'Docs UI',
    meta: 'Shared docs components and playground UI',
  },
];

const devToolsLinks: DocsLinkItem[] = [
  {
    href: '/docs/core-concepts/performance-report',
    title: 'Performance report',
    meta: 'Benchmarks and performance dashboards',
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
    moduleCount: coreLinks.length,
    apiEntryCount: coreApiItems.length,
  },
  {
    key: 'state-manager',
    name: '@rs-x/state-manager',
    href: '/docs/state-manager-api',
    description: 'Observers, proxy pairs, and state change tracking services.',
    links: stateManagerLinks,
    apiEntryCount: stateManagerApiItems.length,
  },
  {
    key: 'expression-parser',
    name: '@rs-x/expression-parser',
    href: '/docs/api/expression-parser',
    description: 'Expression parsing, tracking, and reactive evaluation APIs.',
    links: expressionParserLinks,
  },
  {
    key: 'compiler',
    name: '@rs-x/compiler',
    href: '/docs/core-concepts/compiler',
    description: 'Build-time parsing, validation, and compiled expressions.',
    links: compilerLinks,
  },
  {
    key: 'typescript-plugin',
    name: '@rs-x/typescript-plugin',
    href: '/docs/core-concepts/compiler',
    description: 'Language service plugin for rsx diagnostics.',
    links: typescriptPluginLinks,
  },
  {
    key: 'cli',
    name: '@rs-x/cli',
    href: '/docs/core-concepts/cli',
    description: 'Project setup, build, and tooling automation.',
    links: cliLinks,
  },
  {
    key: 'angular',
    name: '@rs-x/angular',
    href: '/docs/frameworks/angular',
    description: 'Angular integration and rsx pipe bindings.',
    links: angularLinks,
  },
  {
    key: 'react',
    name: '@rs-x/react',
    href: '/docs/frameworks/react',
    description: 'React hooks integration for rs-x expressions.',
    links: reactLinks,
  },
  {
    key: 'vue',
    name: '@rs-x/vue',
    href: '/docs/frameworks/vue',
    description: 'Vue composable integration for rs-x expressions.',
    links: vueLinks,
  },
  {
    key: 'react-components',
    name: '@rs-x/react-components',
    href: '/docs',
    description: 'Shared UI components for docs and playgrounds.',
    links: reactComponentsLinks,
  },
  {
    key: 'dev-tools',
    name: '@rs-x/dev-tools',
    href: '/docs/core-concepts/performance-report',
    description: 'Benchmarks, reports, and dev tooling utilities.',
    links: devToolsLinks,
  },
];

export const apiPackagesByKey: Record<ApiPackageKey, ApiPackageConfig> = {
  core: apiPackages.find((pkg) => pkg.key === 'core')!,
  'state-manager': apiPackages.find((pkg) => pkg.key === 'state-manager')!,
  'expression-parser': apiPackages.find(
    (pkg) => pkg.key === 'expression-parser',
  )!,
  compiler: apiPackages.find((pkg) => pkg.key === 'compiler')!,
  'typescript-plugin': apiPackages.find(
    (pkg) => pkg.key === 'typescript-plugin',
  )!,
  cli: apiPackages.find((pkg) => pkg.key === 'cli')!,
  angular: apiPackages.find((pkg) => pkg.key === 'angular')!,
  react: apiPackages.find((pkg) => pkg.key === 'react')!,
  vue: apiPackages.find((pkg) => pkg.key === 'vue')!,
  'react-components': apiPackages.find(
    (pkg) => pkg.key === 'react-components',
  )!,
  'dev-tools': apiPackages.find((pkg) => pkg.key === 'dev-tools')!,
};
