export interface ICompilerScaffold {
  readonly phase: 0;
  readonly scope: 'project-setup';
  readonly packageName: '@rs-x/compiler';
}

export function createCompilerScaffold(): ICompilerScaffold {
  return {
    phase: 0,
    scope: 'project-setup',
    packageName: '@rs-x/compiler',
  };
}

export * from './expression-site-detector';
export * from './expression-site-validator';
export * from './expression-aot-generator';
