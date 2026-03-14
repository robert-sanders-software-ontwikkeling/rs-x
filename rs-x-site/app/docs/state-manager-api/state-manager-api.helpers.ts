import {
  type StateManagerApiItem,
  stateManagerApiItems,
} from './state-manager-api.data';

export { stateManagerApiItems };

export function slugify(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

export function formatModuleLabel(moduleName: string): string {
  return moduleName.replace(/\.ts$/i, '').replace(/\./g, '-');
}

export type StateManagerApiGroupKey =
  | 'state-runtime'
  | 'watch-rules'
  | 'observer-core'
  | 'property-observers'
  | 'proxies'
  | 'module-wiring';

export type StateManagerApiModuleEntry = {
  moduleName: string;
  slug: string;
  items: StateManagerApiItem[];
};

type GroupDefinition = {
  key: StateManagerApiGroupKey;
  title: string;
  description: string;
  includes: (moduleName: string) => boolean;
};

export type StateManagerApiGroupEntry = GroupDefinition & {
  href: string;
  moduleEntries: readonly StateManagerApiModuleEntry[];
  moduleCount: number;
  apiEntryCount: number;
};

const groupedByModule = stateManagerApiItems.reduce<
  Record<string, StateManagerApiItem[]>
>((acc, item) => {
  const moduleName = item.module;
  if (!acc[moduleName]) {
    acc[moduleName] = [];
  }
  acc[moduleName].push(item);
  return acc;
}, {});

export const stateManagerApiModuleEntries: readonly StateManagerApiModuleEntry[] =
  Object.keys(groupedByModule)
  .sort((a, b) => a.localeCompare(b))
  .map((moduleName) => {
    const items = [...groupedByModule[moduleName]].sort((a, b) =>
      a.symbol.localeCompare(b.symbol),
    );
    return {
      moduleName,
      slug: slugify(moduleName),
      items,
    };
  });

export const stateManagerApiModuleByPath = new Map(
  stateManagerApiModuleEntries.map((entry) => [entry.moduleName, entry]),
);

export const stateManagerApiBySymbol = new Map(
  stateManagerApiItems.map((item) => [item.symbol, item]),
);

const groupDefinitions: readonly GroupDefinition[] = [
  {
    key: 'state-runtime',
    title: 'State runtime',
    description:
      'Core state lifecycle, rebinding payloads, and grouped state subscriptions.',
    includes: (moduleName) =>
      moduleName === 'state-manager' ||
      moduleName === 'state-manager/state-change-subscription-manager' ||
      moduleName === 'grouped-change-subscriptions-for-context-manager' ||
      moduleName === 'object-change',
  },
  {
    key: 'watch-rules',
    title: 'Watch rules',
    description:
      'Index watch-rule contracts and rule implementations used for recursive branch tracking.',
    includes: (moduleName) => moduleName === 'index-watch-rule-registry',
  },
  {
    key: 'observer-core',
    title: 'Observer core',
    description:
      'Object observer managers, observer composition primitives, and observer factory contracts.',
    includes: (moduleName) =>
      moduleName === 'object-observer' ||
      moduleName === 'object-observer/factories' ||
      moduleName === 'object-property-observer-proxy-pair-manager' ||
      moduleName === 'observer-group' ||
      moduleName === 'observer.interface',
  },
  {
    key: 'property-observers',
    title: 'Property observers',
    description:
      'Property-level observers and specialized factories for non-iterable, collection, and date properties.',
    includes: (moduleName) =>
      moduleName === 'property-observer' ||
      moduleName === 'property-observer/factories' ||
      moduleName.startsWith('property-observer/factories/'),
  },
  {
    key: 'proxies',
    title: 'Proxies',
    description:
      'Array/Map/Set/Date/Promise/Observable proxy factories and emitted change contracts.',
    includes: (moduleName) => moduleName.startsWith('proxies/'),
  },
  {
    key: 'module-wiring',
    title: 'Module wiring',
    description:
      'DI module registration and injection token surfaces for state-manager services.',
    includes: (moduleName) =>
      moduleName === 'rs-x-state-manager.module' ||
      moduleName === 'rs-x-state-manager-injection-tokens',
  },
];

const modulesByGroupKey = new Map<StateManagerApiGroupKey, string[]>();
const unmatchedModules: string[] = [];

for (const entry of stateManagerApiModuleEntries) {
  const moduleName = entry.moduleName;
  const definition = groupDefinitions.find((group) => group.includes(moduleName));
  if (!definition) {
    unmatchedModules.push(moduleName);
    continue;
  }

  const list = modulesByGroupKey.get(definition.key) ?? [];
  list.push(moduleName);
  modulesByGroupKey.set(definition.key, list);
}

if (unmatchedModules.length > 0) {
  throw new Error(
    `Unmatched state-manager module groups: ${unmatchedModules.join(', ')}`,
  );
}

export const stateManagerApiGroupEntries: readonly StateManagerApiGroupEntry[] =
  groupDefinitions.map((group) => {
    const moduleNames = modulesByGroupKey.get(group.key) ?? [];
    const moduleEntries = moduleNames
      .map((moduleName) => stateManagerApiModuleByPath.get(moduleName))
      .filter((entry): entry is NonNullable<typeof entry> => !!entry)
      .sort((a, b) => a.moduleName.localeCompare(b.moduleName));

    return {
      ...group,
      href: `/docs/state-manager-api/group/${group.key}`,
      moduleEntries,
      moduleCount: moduleEntries.length,
      apiEntryCount: moduleEntries.reduce(
        (sum, moduleEntry) => sum + moduleEntry.items.length,
        0,
      ),
    };
  });

export const stateManagerApiGroupByKey = new Map(
  stateManagerApiGroupEntries.map((entry) => [entry.key, entry]),
);

export const stateManagerApiGroupByModulePath = new Map(
  stateManagerApiGroupEntries.flatMap((group) =>
    group.moduleEntries.map((entry) => [entry.moduleName, group] as const),
  ),
);
