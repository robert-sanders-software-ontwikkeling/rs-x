import { jest } from '@jest/globals';

const registerCompletionItemProvider = jest.fn(() => ({ dispose: jest.fn() }));
const registerHoverProvider = jest.fn(() => ({ dispose: jest.fn() }));
const registerDefinitionProvider = jest.fn(() => ({ dispose: jest.fn() }));
const registerReferenceProvider = jest.fn(() => ({ dispose: jest.fn() }));
const registerImplementationProvider = jest.fn(() => ({ dispose: jest.fn() }));
const registerRenameProvider = jest.fn(() => ({ dispose: jest.fn() }));
const registerDocumentSymbolProvider = jest.fn(() => ({ dispose: jest.fn() }));
const registerCodeActionsProvider = jest.fn(() => ({ dispose: jest.fn() }));
const registerSignatureHelpProvider = jest.fn(() => ({ dispose: jest.fn() }));
const registerDocumentFormattingEditProvider = jest.fn(() => ({
  dispose: jest.fn(),
}));
const registerDocumentRangeFormattingEditProvider = jest.fn(() => ({
  dispose: jest.fn(),
}));
const registerDocumentSemanticTokensProvider = jest.fn(() => ({
  dispose: jest.fn(),
}));
const createDiagnosticCollection = jest.fn(() => ({
  set: jest.fn(),
  delete: jest.fn(),
  dispose: jest.fn(),
}));

jest.mock(
  'vscode',
  () => ({
    languages: {
      createDiagnosticCollection,
      registerCompletionItemProvider,
      registerHoverProvider,
      registerDefinitionProvider,
      registerReferenceProvider,
      registerImplementationProvider,
      registerRenameProvider,
      registerDocumentSymbolProvider,
      registerCodeActionsProvider,
      registerSignatureHelpProvider,
      registerDocumentFormattingEditProvider,
      registerDocumentRangeFormattingEditProvider,
      registerDocumentSemanticTokensProvider,
    },
    workspace: {
      onDidOpenTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
      onDidChangeTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
      onDidSaveTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
      onDidCloseTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
      textDocuments: [],
    },
    SemanticTokensLegend: class SemanticTokensLegend {
      constructor(
        public readonly tokenTypes: readonly string[],
        public readonly tokenModifiers: readonly string[],
      ) {}
    },
    EventEmitter: class EventEmitter {
      readonly event = jest.fn();
      fire = jest.fn();
      dispose = jest.fn();
    },
    CodeActionKind: {
      QuickFix: 'quickfix',
    },
  }),
  { virtual: true },
);

describe('rsx vscode extension activation', () => {
  let activate: typeof import('../lib/extension').activate;

  beforeAll(async () => {
    ({ activate } = await import('../lib/extension'));
  });

  it('registers standalone rsx editor providers', () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };

    activate(context as never);

    expect(createDiagnosticCollection).toHaveBeenCalledWith('rsx');
    expect(registerCompletionItemProvider).toHaveBeenCalled();
    expect(registerHoverProvider).toHaveBeenCalled();
    expect(registerDefinitionProvider).toHaveBeenCalled();
    expect(registerReferenceProvider).toHaveBeenCalled();
    expect(registerImplementationProvider).toHaveBeenCalled();
    expect(registerRenameProvider).toHaveBeenCalled();
    expect(registerDocumentSymbolProvider).toHaveBeenCalled();
    expect(registerCodeActionsProvider).toHaveBeenCalled();
    expect(registerSignatureHelpProvider).toHaveBeenCalled();
    expect(registerDocumentFormattingEditProvider).toHaveBeenCalled();
    expect(registerDocumentRangeFormattingEditProvider).toHaveBeenCalled();
    expect(registerDocumentSemanticTokensProvider).toHaveBeenCalled();
    expect(context.subscriptions.length).toBeGreaterThan(0);
  });
});
