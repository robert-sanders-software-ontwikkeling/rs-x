import { coreApiItems } from '../core-api.data';

export function slugify(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

export function formatModuleLabel(moduleName: string): string {
  return moduleName.replace(/\.ts$/i, '').replace(/\./g, '-');
}

export const groupedByModule = coreApiItems.reduce<
  Record<string, typeof coreApiItems>
>((acc, item) => {
  if (!acc[item.module]) {
    acc[item.module] = [];
  }
  acc[item.module].push(item);
  return acc;
}, {});

export const moduleEntries = Object.keys(groupedByModule)
  .sort((a, b) => a.localeCompare(b))
  .map((moduleName) => ({
    moduleName,
    slug: slugify(moduleName),
    items: [...groupedByModule[moduleName]].sort((a, b) =>
      a.symbol.localeCompare(b.symbol),
    ),
  }));

export const moduleBySlug = new Map(
  moduleEntries.map((entry) => [entry.slug, entry]),
);
export const apiDescriptionBySymbol = new Map(
  coreApiItems.map((item) => [item.symbol, item.description] as const),
);

export type TokenReferenceRow = {
  token: string;
  symbol?: string;
  description?: string;
};

export const injectionTokenReferenceRows: TokenReferenceRow[] = [
  { token: 'IInjectionContainer', symbol: 'InjectionContainer' },
  { token: 'IErrorLog', symbol: 'IErrorLog' },
  { token: 'IGlobalIndexAccessor', symbol: 'IGlobalIndexAccessor' },
  { token: 'IIndexValueAccessor', symbol: 'IIndexValueAccessor' },
  { token: 'IMapKeyAccessor', symbol: 'IMapKeyAccessor' },
  { token: 'ISetKeyAccessor', symbol: 'ISetKeyAccessor' },
  { token: 'IArrayIndexAccessor', symbol: 'IArrayIndexAccessor' },
  { token: 'IPropertyValueAccessor', symbol: 'IPropertyValueAccessor' },
  { token: 'IMethodAccessor', symbol: 'IMethodAccessor' },
  { token: 'IDatePropertyAccessor', symbol: 'IDatePropertyAccessor' },
  { token: 'IDeepClone', symbol: 'IDeepClone' },
  { token: 'IEqualityService', symbol: 'IEqualityService' },
  { token: 'IObservableAccessor', symbol: 'IObservableAccessor' },
  { token: 'IPromiseAccessor', symbol: 'IPromiseAccessor' },
  {
    token: 'IIndexValueAccessorList',
    symbol: 'defaultIndexValueAccessorList',
  },
  { token: 'ISequenceIdFactory', symbol: 'ISequenceIdFactory' },
  { token: 'IFunctionCallIndexFactory', symbol: 'IFunctionCallIndexFactory' },
  { token: 'IFunctionCallResultCache', symbol: 'IFunctionCallResultCache' },
  { token: 'IGuidFactory', symbol: 'IGuidFactory' },
  { token: 'IStructuredDeepClone', symbol: 'StructuredDeepClone' },
  { token: 'ILodashDeepClone', symbol: 'LodashDeepClone' },
  {
    token: 'IDeepCloneList',
    symbol: 'defaultDeepCloneList',
  },
  { token: 'IResolvedValueCache', symbol: 'IResolvedValueCache' },
  { token: 'IDeepCloneExcept', symbol: 'IDeepCloneExcept' },
  { token: 'DefaultDeepCloneExcept', symbol: 'DeepCloneValueExcept' },
  {
    token: 'IValueMetadataList',
    symbol: 'defaultValueMetadataList',
  },
  { token: 'ArrayMetadata', symbol: 'ArrayMetadata' },
  { token: 'DateMetadata', symbol: 'DateMetadata' },
  { token: 'DummyMetadata', symbol: 'DummyMetadata' },
  { token: 'MapMetadata', symbol: 'MapMetadata' },
  { token: 'ObservableMetadata', symbol: 'ObservableMetadata' },
  { token: 'PromiseMetadata', symbol: 'PromiseMetadata' },
  { token: 'SetMetadata', symbol: 'SetMetadata' },
  { token: 'IValueMetadata', symbol: 'IValueMetadata' },
  {
    token: 'IDBFactory',
    description:
      'Browser IndexedDB factory used to open IndexedDB databases (resolved from window.indexedDB in browser runtime).',
  },
  { token: 'IObjectStorage', symbol: 'IObjectStorage' },
  { token: 'IProxyRegistry', symbol: 'IProxyRegistry' },
];

export const tokenReferenceRows = [...injectionTokenReferenceRows]
  .sort((a, b) => a.token.localeCompare(b.token))
  .map((row) => ({
    token: row.token,
    symbol: row.symbol,
    responsibility: row.symbol
      ? (apiDescriptionBySymbol.get(row.symbol) ?? '-')
      : (row.description ?? '-'),
  }));
