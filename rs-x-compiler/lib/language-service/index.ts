export interface ILanguageServiceScaffold {
  readonly folder: 'language-service';
  readonly supportsIntelliSense: false;
}

export function createLanguageServiceScaffold(): ILanguageServiceScaffold {
  return {
    folder: 'language-service',
    supportsIntelliSense: false,
  };
}
