export interface IDiagnosticsScaffold {
  readonly folder: 'diagnostics';
  readonly categories: readonly ['syntax', 'semantic', 'unsupported'];
}

export function createDiagnosticsScaffold(): IDiagnosticsScaffold {
  return {
    folder: 'diagnostics',
    categories: ['syntax', 'semantic', 'unsupported'],
  };
}

export * from './expression-diagnostics';
