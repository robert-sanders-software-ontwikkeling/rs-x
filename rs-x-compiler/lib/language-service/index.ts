export interface ILanguageServiceScaffold {
  readonly folder: 'language-service';
  readonly supportsIntelliSense: true;
}

export function createLanguageServiceScaffold(): ILanguageServiceScaffold {
  return {
    folder: 'language-service',
    supportsIntelliSense: true,
  };
}

export * from './rsx-expression-lexing';
export * from './rsx-language-service';
export * from './rsx-semantic-token-classification';
