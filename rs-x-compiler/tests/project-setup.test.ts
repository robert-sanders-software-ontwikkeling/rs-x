import {
  createCompilerScaffold,
  createDiagnosticsScaffold,
  createLanguageServiceScaffold,
  createTransformerScaffold,
} from '../lib';

describe('rs-x-compiler phase 0 project setup', () => {
  it('creates compiler scaffold metadata', () => {
    expect(createCompilerScaffold()).toEqual({
      phase: 0,
      scope: 'project-setup',
      packageName: '@rs-x/compiler',
    });
  });

  it('creates transformer scaffold metadata', () => {
    expect(createTransformerScaffold()).toEqual({
      folder: 'transformer',
      enabled: false,
    });
  });

  it('creates diagnostics scaffold metadata', () => {
    expect(createDiagnosticsScaffold()).toEqual({
      folder: 'diagnostics',
      categories: ['syntax', 'semantic', 'unsupported'],
    });
  });

  it('creates language-service scaffold metadata', () => {
    expect(createLanguageServiceScaffold()).toEqual({
      folder: 'language-service',
      supportsIntelliSense: false,
    });
  });
});
