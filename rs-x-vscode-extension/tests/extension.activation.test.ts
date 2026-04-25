import { jest } from '@jest/globals';

const registerCompletionItemProvider = jest.fn(() => ({ dispose: jest.fn() }));
const registerHoverProvider = jest.fn(() => ({ dispose: jest.fn() }));
const registerDefinitionProvider = jest.fn(() => ({ dispose: jest.fn() }));
const registerTypeDefinitionProvider = jest.fn(() => ({ dispose: jest.fn() }));
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
const registerTreeDataProvider = jest.fn(() => ({ dispose: jest.fn() }));
const registerCommand = jest.fn(() => ({ dispose: jest.fn() }));
const createFileSystemWatcher = jest.fn(() => ({
  onDidCreate: jest.fn(() => ({ dispose: jest.fn() })),
  onDidChange: jest.fn(() => ({ dispose: jest.fn() })),
  onDidDelete: jest.fn(() => ({ dispose: jest.fn() })),
  dispose: jest.fn(),
}));
const onDidOpenTextDocument = jest.fn(() => ({ dispose: jest.fn() }));
const onDidChangeTextDocument = jest.fn(() => ({ dispose: jest.fn() }));
const onDidSaveTextDocument = jest.fn(() => ({ dispose: jest.fn() }));
const onDidCloseTextDocument = jest.fn(() => ({ dispose: jest.fn() }));
const createDiagnosticCollection = jest.fn(() => ({
  set: jest.fn(),
  delete: jest.fn(),
  dispose: jest.fn(),
}));
const eventEmitterInstances: Array<{ fire: jest.Mock }> = [];

jest.mock(
  'vscode',
  () => ({
    languages: {
      createDiagnosticCollection,
      registerCompletionItemProvider,
      registerHoverProvider,
      registerDefinitionProvider,
      registerTypeDefinitionProvider,
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
      createFileSystemWatcher,
      onDidOpenTextDocument,
      onDidChangeTextDocument,
      onDidSaveTextDocument,
      onDidCloseTextDocument,
      textDocuments: [],
    },
    window: {
      registerTreeDataProvider,
    },
    commands: {
      registerCommand,
    },
    SemanticTokensLegend: class SemanticTokensLegend {
      constructor(
        public readonly tokenTypes: readonly string[],
        public readonly tokenModifiers: readonly string[],
      ) {}
    },
    Position: class Position {
      constructor(
        public readonly line: number,
        public readonly character: number,
      ) {}
    },
    Range: class Range {
      constructor(
        public readonly start: unknown,
        public readonly end: unknown,
      ) {}
    },
    CompletionItem: class CompletionItem {
      insertText?: string;
      sortText?: string;
      constructor(
        public readonly label: string,
        public readonly kind: number,
      ) {}
    },
    CompletionItemKind: {
      Method: 0,
      Constructor: 1,
      Property: 2,
    },
    Hover: class Hover {
      constructor(
        public readonly contents: unknown,
        public readonly range: unknown,
      ) {}
    },
    Diagnostic: class Diagnostic {
      constructor(
        public readonly range: unknown,
        public readonly message: string,
        public readonly severity: number,
      ) {}
    },
    DiagnosticSeverity: {
      Error: 0,
      Warning: 1,
      Information: 2,
      Hint: 3,
    },
    MarkdownString: class MarkdownString {
      value = '';
      appendCodeblock(text: string, language: string) {
        this.value += `\`\`\`${language}\n${text}\n\`\`\``;
        return this;
      }
    },
    EventEmitter: class EventEmitter {
      readonly event = jest.fn();
      fire = jest.fn();
      dispose = jest.fn();
      constructor() {
        eventEmitterInstances.push(this);
      }
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
    expect(registerTypeDefinitionProvider).toHaveBeenCalled();
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

  it('offers top-level header completions in fresh .rsx files', () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };

    activate(context as never);

    const provider = registerCompletionItemProvider.mock.calls.at(-1)?.[1] as {
      provideCompletionItems(
        document: unknown,
        position: { line: number; character: number },
      ): Array<{ label: string; insertText?: string }>;
    };
    const completions = provider.provideCompletionItems(
      createTextDocument(''),
      {
        line: 0,
        character: 0,
      },
    );

    expect(completions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'expression',
          insertText: 'expression: ',
        }),
        expect.objectContaining({
          label: 'defaults',
          insertText: 'defaults: ',
        }),
        expect.objectContaining({
          label: 'model',
          insertText: 'model: ',
        }),
        expect.objectContaining({
          label: 'return',
          insertText: 'return: ',
        }),
      ]),
    );

    const filteredCompletions = provider.provideCompletionItems(
      createTextDocument('def'),
      { line: 0, character: 3 },
    );
    expect(filteredCompletions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'defaults',
          insertText: 'defaults: ',
        }),
      ]),
    );
  });

  it('returns a direct hover for the defaults directive without requiring a saved file or valid expression file', () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };

    activate(context as never);

    const provider = registerHoverProvider.mock.calls.at(-1)?.[1] as {
      provideHover(
        document: unknown,
        position: { line: number; character: number },
      ): { contents?: { value?: string } } | null;
    };
    const hover = provider.provideHover(
      createTextDocument('defaults:\n', { scheme: 'untitled' }),
      {
        line: 0,
        character: 2,
      },
    );

    expect(hover?.contents?.value).toContain('shared headers');
  });

  it('does not enter the standalone hover path while authoring fresh headers', () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };

    activate(context as never);

    const provider = registerHoverProvider.mock.calls.at(-1)?.[1] as {
      provideHover(
        document: unknown,
        position: { line: number; character: number },
      ): { contents?: { value?: string } } | null;
    };

    const defaultsHover = provider.provideHover(
      createTextDocument('defaults'),
      {
        line: 0,
        character: 2,
      },
    );
    expect(defaultsHover?.contents?.value).toContain('shared headers');

    expect(
      provider.provideHover(createTextDocument('defaultrs'), {
        line: 0,
        character: 2,
      }),
    ).toBeNull();
  });

  it('reports unknown header keys in fresh incomplete .rsx files', () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };

    activate(context as never);

    const diagnosticCollection = createDiagnosticCollection.mock.results.at(-1)
      ?.value as { set: jest.Mock };
    const openHandler = onDidOpenTextDocument.mock.calls.at(-1)?.[0] as (
      document: unknown,
    ) => void;

    jest.useFakeTimers();
    const document = createTextDocument('defualts:\n');
    openHandler(document);
    jest.runOnlyPendingTimers();
    jest.useRealTimers();

    const diagnostics = diagnosticCollection.set.mock.calls.at(-1)?.[1] as
      | Array<{ message: string }>
      | undefined;
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Unknown RS-X header key "defualts".',
        }),
      ]),
    );
  });

  it('does not treat object literal fields in expression bodies as rsx headers', () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };

    activate(context as never);

    const diagnosticCollection = createDiagnosticCollection.mock.results.at(-1)
      ?.value as { set: jest.Mock };
    const openHandler = onDidOpenTextDocument.mock.calls.at(-1)?.[0] as (
      document: unknown,
    ) => void;

    jest.useFakeTimers();
    const document = createTextDocument(
      [
        'defaults:',
        '  model: { lines: Array<{ id: string; name: string; qty: number; unitPrice: number }> }',
        '',
        'expression: linesRsx',
        '  lines.map((line) => ({',
        '    id: line.id,',
        '    name: line.name,',
        '    qty: line.qty,',
        '    unitPrice: line.unitPrice,',
        '    lineTotal: line.qty * line.unitPrice',
        '  }))',
      ].join('\n'),
    );
    openHandler(document);
    jest.runOnlyPendingTimers();
    jest.useRealTimers();

    const diagnostics = diagnosticCollection.set.mock.calls.at(-1)?.[1] as
      | Array<{ message: string }>
      | undefined;
    expect(diagnostics ?? []).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringMatching(/^Unknown RS-X header key/u),
        }),
      ]),
    );
  });

  it('still reports unknown headers before an expression body starts', () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };

    activate(context as never);

    const diagnosticCollection = createDiagnosticCollection.mock.results.at(-1)
      ?.value as { set: jest.Mock };
    const openHandler = onDidOpenTextDocument.mock.calls.at(-1)?.[0] as (
      document: unknown,
    ) => void;

    jest.useFakeTimers();
    const document = createTextDocument(
      ['expression: totalRsx', '  modelx: { total: number }', '  total'].join(
        '\n',
      ),
    );
    openHandler(document);
    jest.runOnlyPendingTimers();
    jest.useRealTimers();

    const diagnostics = diagnosticCollection.set.mock.calls.at(-1)?.[1] as
      | Array<{ message: string }>
      | undefined;
    expect(diagnostics ?? []).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Unknown RS-X header key "modelx".',
        }),
      ]),
    );
  });

  it('does not fire background semantic-token refreshes for small module .rsx files', () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };

    activate(context as never);

    const semanticTokenEmitter = eventEmitterInstances.at(-1);
    const openHandler = onDidOpenTextDocument.mock.calls.at(-1)?.[0] as (
      document: unknown,
    ) => void;

    jest.useFakeTimers();
    openHandler(
      createTextDocument(
        [
          'defaults:',
          '  model: { value: number }',
          '',
          'expression: firstRsx',
          'value + 1',
          '',
          'expression: secondRsx',
          'value + 2',
          '',
        ].join('\n'),
      ),
    );
    jest.runOnlyPendingTimers();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();

    expect(semanticTokenEmitter?.fire).not.toHaveBeenCalled();
  });
});

function createTextDocument(
  text: string,
  options: { scheme?: string; fsPath?: string } = {},
) {
  const lines = text.replace(/\r\n/gu, '\n').split('\n');
  return {
    languageId: 'rsx',
    version: 1,
    uri: {
      scheme: options.scheme ?? 'file',
      fsPath: options.fsPath ?? '/tmp/fresh-expression.rsx',
      toString: () =>
        `${options.scheme ?? 'file'}://${options.fsPath ?? '/tmp/fresh-expression.rsx'}`,
    },
    getText: () => text,
    get lineCount() {
      return lines.length;
    },
    lineAt: (line: number) => ({
      text: lines[line] ?? '',
    }),
    offsetAt: (position: { line: number; character: number }) => {
      let offset = 0;
      for (let index = 0; index < position.line; index += 1) {
        offset += (lines[index] ?? '').length + 1;
      }
      return offset + position.character;
    },
    positionAt: (offset: number) => {
      let remaining = offset;
      for (let line = 0; line < lines.length; line += 1) {
        const lineLength = (lines[line] ?? '').length;
        if (remaining <= lineLength) {
          return { line, character: remaining };
        }
        remaining -= lineLength + 1;
      }
      return {
        line: Math.max(0, lines.length - 1),
        character: lines.at(-1)?.length ?? 0,
      };
    },
  };
}
