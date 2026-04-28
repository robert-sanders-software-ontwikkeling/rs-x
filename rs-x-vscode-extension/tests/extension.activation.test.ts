import { jest } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { TextDecoder } from 'node:util';

(
  globalThis as typeof globalThis & { TextDecoder: typeof TextDecoder }
).TextDecoder = TextDecoder;

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
const executeCommand = jest.fn();
const createWebviewPanel = jest.fn(() => ({
  webview: {
    html: '',
    onDidReceiveMessage: jest.fn(() => ({ dispose: jest.fn() })),
  },
  onDidDispose: jest.fn(() => ({ dispose: jest.fn() })),
  dispose: jest.fn(),
}));
const showTextDocument = jest.fn();
const visibleTextEditors: unknown[] = [];
let activeTextEditor: unknown = null;
const findFiles = jest.fn();
const readFile = jest.fn();
const openTextDocument = jest.fn();
const asRelativePath = jest.fn((uri: { fsPath: string }) =>
  uri.fsPath.replace(/^\/workspace\//u, ''),
);
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
      asRelativePath,
      createFileSystemWatcher,
      findFiles,
      fs: {
        readFile,
      },
      openTextDocument,
      onDidOpenTextDocument,
      onDidChangeTextDocument,
      onDidSaveTextDocument,
      onDidCloseTextDocument,
      textDocuments: [],
    },
    window: {
      createWebviewPanel,
      get activeTextEditor() {
        return activeTextEditor;
      },
      registerTreeDataProvider,
      showTextDocument,
      visibleTextEditors,
    },
    commands: {
      executeCommand,
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
      constructor(value = '') {
        this.value = value;
      }
      appendCodeblock(text: string, language: string) {
        this.value += `\`\`\`${language}\n${text}\n\`\`\``;
        return this;
      }
    },
    ThemeIcon: class ThemeIcon {
      constructor(public readonly id: string) {}
    },
    Uri: class Uri {
      constructor(public readonly fsPath: string) {}
      static file(fsPath: string) {
        return new Uri(fsPath);
      }
      static parse(value: string) {
        return new Uri(value.replace(/^file:\/\//u, ''));
      }
      toString() {
        return `file://${this.fsPath}`;
      }
    },
    Selection: class Selection {
      constructor(
        public readonly start: unknown,
        public readonly end: unknown,
      ) {}
    },
    TextEditorRevealType: {
      InCenterIfOutsideViewport: 0,
    },
    ViewColumn: {
      Beside: 2,
    },
    TreeItem: class TreeItem {
      description?: string;
      resourceUri?: unknown;
      contextValue?: string;
      iconPath?: unknown;
      command?: unknown;
      tooltip?: unknown;
      constructor(
        public readonly label: string,
        public readonly collapsibleState: number,
      ) {}
    },
    TreeItemCollapsibleState: {
      None: 0,
      Collapsed: 1,
      Expanded: 2,
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
    expect(registerCompletionItemProvider.mock.calls.at(-1)?.[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ language: 'rsx' }),
        expect.objectContaining({ pattern: '**/*.rsx' }),
      ]),
    );
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
          range: expect.objectContaining({
            start: expect.objectContaining({ line: 0, character: 0 }),
            end: expect.objectContaining({ line: 0, character: 3 }),
          }),
        }),
      ]),
    );

    expect(
      provider.provideCompletionItems(createTextDocument('defs'), {
        line: 0,
        character: 4,
      }),
    ).toEqual([]);

    const untitledPathCompletions = provider.provideCompletionItems(
      createTextDocument('def', {
        fsPath: '/tmp/unsaved-authoring.rsx',
        languageId: 'plaintext',
        scheme: 'untitled',
      }),
      { line: 0, character: 3 },
    );
    expect(untitledPathCompletions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'defaults',
          insertText: 'defaults: ',
        }),
      ]),
    );
  });

  it('offers contextual module header completions beyond defaults', () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };

    activate(context as never);

    const provider = registerCompletionItemProvider.mock.calls.at(-1)?.[1] as {
      provideCompletionItems(
        document: unknown,
        position: { line: number; character: number },
      ): Array<{ label: string; insertText?: string; range?: unknown }>;
    };

    expect(
      provider.provideCompletionItems(createTextDocument('defaults:\nmod'), {
        line: 1,
        character: 3,
      }),
    ).toEqual([
      expect.objectContaining({
        label: 'model',
        insertText: '  model: ',
      }),
    ]);

    expect(
      provider.provideCompletionItems(createTextDocument('defaults:\nmods'), {
        line: 1,
        character: 4,
      }),
    ).toEqual([]);

    expect(
      provider.provideCompletionItems(createTextDocument('defaults:\n  mod'), {
        line: 1,
        character: 5,
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'model',
          insertText: 'model: ',
        }),
      ]),
    );

    const defaultsBlockCompletions = provider.provideCompletionItems(
      createTextDocument('defaults:\n  '),
      { line: 1, character: 2 },
    );
    expect(defaultsBlockCompletions).toEqual(
      expect.arrayContaining(
        [
          'model',
          'preparse',
          'lazy',
          'lazyGroup',
          'compiled',
          'compile',
          'return',
        ].map((label) =>
          expect.objectContaining({
            label,
            insertText: `${label}: `,
          }),
        ),
      ),
    );

    expect(
      provider.provideCompletionItems(
        createTextDocument('defaults:\n  model: { value: number }\nexp'),
        { line: 2, character: 3 },
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'expression',
          insertText: 'expression: ',
        }),
      ]),
    );

    expect(
      provider.provideCompletionItems(
        createTextDocument('defaults:\n  model: { value: number }\n  exp'),
        { line: 2, character: 5 },
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'expression',
          insertText: 'expression: ',
          range: expect.objectContaining({
            start: expect.objectContaining({ line: 2, character: 0 }),
            end: expect.objectContaining({ line: 2, character: 5 }),
          }),
        }),
      ]),
    );

    const expressionBlockCompletions = provider.provideCompletionItems(
      createTextDocument('expression: valueRsx\n  '),
      { line: 1, character: 2 },
    );
    expect(expressionBlockCompletions).toEqual(
      expect.arrayContaining(
        [
          'model',
          'preparse',
          'lazy',
          'lazyGroup',
          'compiled',
          'compile',
          'return',
        ].map((label) =>
          expect.objectContaining({
            label,
            insertText: `${label}: `,
          }),
        ),
      ),
    );

    expect(
      provider.provideCompletionItems(
        createTextDocument('expression: valueRsx\ncomp'),
        { line: 1, character: 4 },
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'compile',
          insertText: '  compile: ',
        }),
        expect.objectContaining({
          label: 'compiled',
          insertText: '  compiled: ',
        }),
      ]),
    );

    expect(
      provider.provideCompletionItems(
        createTextDocument('expression: valueRsx\nret'),
        { line: 1, character: 3 },
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'return',
          insertText: '  return: ',
        }),
      ]),
    );
  });

  it('enables automatic suggestions for rsx header authoring', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'),
    ) as {
      contributes?: {
        configurationDefaults?: Record<string, unknown>;
      };
    };

    expect(
      packageJson.contributes?.configurationDefaults?.['[rsx]'],
    ).toMatchObject({
      'editor.quickSuggestions': {
        other: 'on',
        strings: 'on',
      },
      'editor.suggestOnTriggerCharacters': true,
    });
  });

  it('actively triggers suggestions while typing rsx header keys', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };

    activate(context as never);

    const assertTriggersSuggest = async (
      document: ReturnType<typeof createTextDocument>,
      change: { text: string; rangeOffset: number },
    ) => {
      executeCommand.mockClear();
      activeTextEditor = { document };
      for (const [listener] of onDidChangeTextDocument.mock.calls) {
        listener({
          document,
          contentChanges: [change],
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(executeCommand).toHaveBeenCalledWith(
        'editor.action.triggerSuggest',
      );
    };

    try {
      await assertTriggersSuggest(createTextDocument('def'), {
        text: 'f',
        rangeOffset: 2,
      });
      await assertTriggersSuggest(createTextDocument('defaults:\nmod'), {
        text: 'd',
        rangeOffset: 'defaults:\nmo'.length,
      });
      await assertTriggersSuggest(
        createTextDocument('expression: valueRsx\ncomp'),
        {
          text: 'p',
          rangeOffset: 'expression: valueRsx\ncom'.length,
        },
      );
      await assertTriggersSuggest(
        createTextDocument('expression: valueRsx\nret'),
        {
          text: '\nret',
          rangeOffset: 'expression: valueRsx'.length,
        },
      );
      executeCommand.mockClear();
      const partialDocument = createTextDocument('defaults:\nmo');
      const completeDocument = createTextDocument('defaults:\nmod');
      activeTextEditor = { document: partialDocument };
      for (const [listener] of onDidChangeTextDocument.mock.calls) {
        listener({
          document: partialDocument,
          contentChanges: [{ text: 'o', rangeOffset: 'defaults:\nm'.length }],
        });
      }
      activeTextEditor = { document: completeDocument };
      for (const [listener] of onDidChangeTextDocument.mock.calls) {
        listener({
          document: completeDocument,
          contentChanges: [{ text: 'd', rangeOffset: 'defaults:\nmo'.length }],
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(executeCommand).toHaveBeenCalledTimes(1);
      expect(executeCommand).toHaveBeenCalledWith(
        'editor.action.triggerSuggest',
      );
    } finally {
      activeTextEditor = null;
    }
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

  it('returns direct hover while authoring contextual module headers', () => {
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

    const hover = provider.provideHover(createTextDocument('defaults: \nmod'), {
      line: 1,
      character: 2,
    });

    expect(hover?.contents?.value).toContain('model');
  });

  it('returns direct hover for completed option headers across the whole header line', () => {
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
    const document = createTextDocument(
      [
        'defaults:',
        '  model: { x: 10, y: 20 }',
        '',
        'expression: xPlusY',
        '    compile: false',
        '    preparse: true',
        '    lazy: true',
        '    lazyGroup: "math"',
        '    return: string',
        '    x + y',
      ].join('\n'),
    );

    const keyHover = provider.provideHover(document, {
      line: 7,
      character: '    lazyGroup'.length - 1,
    });
    expect(keyHover?.contents?.value).toContain('group lazy expression');

    const valueHover = provider.provideHover(document, {
      line: 7,
      character: '    lazyGroup: "math"'.length - 2,
    });
    expect(valueHover?.contents?.value).toContain('group lazy expression');
  });

  it('keeps module expression model completions with option headers', () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };

    activate(context as never);

    const text = [
      'defaults:',
      '  model: { x: 10, y: 20 }',
      '',
      'expression: xPlusY',
      '    compile: false',
      '    preparse: true',
      '    lazy: true',
      '    lazyGroup: "math"',
      '    return: string',
      '    x + y',
    ].join('\n');
    const document = createTextDocument(text, {
      fsPath: '/workspace/src/rules/math.expressions.rsx',
    });

    const provider = registerCompletionItemProvider.mock.calls.at(-1)?.[1] as {
      provideCompletionItems(
        document: ReturnType<typeof createTextDocument>,
        position: { line: number; character: number },
      ): Array<{ label: string; insertText?: string }>;
    };
    const completions = provider.provideCompletionItems(document, {
      line: 9,
      character: '    x'.length,
    });
    expect(completions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'x' }),
        expect.objectContaining({ label: 'y' }),
      ]),
    );
  });

  it('supports multi-line model headers and typeof expression-reference shorthand', () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };

    activate(context as never);

    const text = [
      'defaults:',
      '  model: { x: 10, y: 20 }',
      '',
      'expression: xPlusY',
      '    compile: false',
      '    preparse: true',
      '    lazy: true',
      '    lazyGroup: "math"',
      '    return: number',
      '    x + y',
      '',
      'expression: xTimesY',
      '    compile: false',
      '    preparse: true',
      '    lazy: true',
      '    lazyGroup: "math"',
      '    return: number',
      '    x * y',
      '',
      'expression: xSquared',
      '    compile: false',
      '    preparse: true',
      '    lazy: true',
      '    lazyGroup: "math"',
      '    return: number',
      '    x * x',
      '',
      'expression: composed',
      '    model: {',
      '        xPlusY: typeof xPlusY,',
      '        xTimesY: typeof xTimesY,',
      '        xSquared: typeof xSquared',
      '    }',
      '    xPlusY + xTimesY + xSquared',
    ].join('\n');
    const document = createTextDocument(text, {
      fsPath: '/workspace/src/rules/math.expressions.rsx',
    });

    const diagnosticCollection = createDiagnosticCollection.mock.results.at(-1)
      ?.value as { set: jest.Mock };
    const openHandler = onDidOpenTextDocument.mock.calls.at(-1)?.[0] as (
      document: unknown,
    ) => void;

    jest.useFakeTimers();
    activeTextEditor = {
      document,
      selection: {
        active: document.positionAt(text.indexOf('xPlusY + xTimesY')),
      },
    };
    openHandler(document);
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    activeTextEditor = null;

    const diagnostics = getDiagnosticsSetByMock(diagnosticCollection.set);
    expect(diagnostics).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining("Cannot find name 'xPlusY'"),
        }),
      ]),
    );
    expect(diagnostics).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining("Cannot find name 'xTimesY'"),
        }),
      ]),
    );
    expect(diagnostics).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining("Cannot find name 'xSquared'"),
        }),
      ]),
    );
    expect(diagnostics).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringMatching(/^Unknown RS-X header key/u),
        }),
      ]),
    );

    const provider = registerHoverProvider.mock.calls.at(-1)?.[1] as {
      provideHover(
        document: ReturnType<typeof createTextDocument>,
        position: { line: number; character: number },
      ): { contents?: { value?: string } } | null;
    };
    const headerHover = provider.provideHover(document, {
      line: 29,
      character: '        xPlusY: typeof x'.length,
    });
    expect(headerHover?.contents?.value ?? '').toContain('xPlusY');
    expect(headerHover?.contents?.value ?? '').not.toContain(
      "Cannot find name 'xPlusY'",
    );
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

  it('returns no hover while a model header type is syntactically incomplete', () => {
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
    const document = createTextDocument(
      'defaults:\n  model: { x: number, y: number',
    );

    expect(
      provider.provideHover(document, {
        line: 1,
        character: '  model: { x'.length,
      }),
    ).toBeNull();
  });

  it('does not request completions from a standalone service while a model header type is syntactically incomplete', () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };

    activate(context as never);

    const provider = registerCompletionItemProvider.mock.calls.at(-1)?.[1] as {
      provideCompletionItems(
        document: unknown,
        position: { line: number; character: number },
      ): unknown[] | null;
    };
    const document = createTextDocument(
      'defaults:\n  model: { x: number, y: number',
    );

    expect(
      provider.provideCompletionItems(document, {
        line: 1,
        character: '  model: { x: number, y'.length,
      }),
    ).toEqual([]);
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

  it('keeps initial module diagnostics focused so opening .rsx files does not block IntelliSense behind whole-file analysis', () => {
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
        'expression: firstRsx',
        '  model: { value: number }',
        '  value + 1',
        '',
        'expression: secondRsx',
        '  model: { value: number }',
        '  value.toUpperCase()',
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
          message: expect.stringContaining('toUpperCase'),
        }),
      ]),
    );
  });

  it('shows only real expression-reference dependencies in the expressions tree', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    const fixtureDirectory = path.resolve(__dirname, './fixtures');
    const modelUri = createUri(
      path.join(fixtureDirectory, 'dependency-model.expressions.rsx'),
    );
    const derivedUri = createUri(
      path.join(fixtureDirectory, 'derived.expressions.rsx'),
    );
    const fixtureText = new Map([
      [
        modelUri.fsPath,
        [
          'defaults:',
          "  model: import('./shipping-quote-model.contract').ShippingQuoteModelContract",
          '',
          'expression: couponRsx',
          '  coupon',
          '',
          'expression: customerTierRsx',
          '  customerTier',
          '',
          'expression: discountLabelRsx',
          "  coupon === 'VIP25' && customerTier !== 'enterprise'",
          "    ? 'VIP25 only unlocks for enterprise accounts'",
          "    : 'No active discount'",
          '',
          'expression: subtotalRsx',
          '  model: { value: number }',
          '  value',
          '',
          'expression: shippingFeeRsx',
          '  model: { value: number }',
          '  value',
          '',
          'expression: lineRsx',
          '  model: { value: number }',
          '  value',
          '',
          'expression: circularModelRsx',
          "  model: import('./dependency-model').CircularModelA",
          '  child.parent',
        ].join('\n'),
      ],
      [
        derivedUri.fsPath,
        [
          'expression: grandTotalRsx',
          '  model: { subtotal: number; shippingFee: number }',
          '  subtotal + shippingFee',
          '',
          'expression: composedTotalRsx',
          "  model: { subtotal: import('@rs-x/expression-parser').IExpression<number>; shippingFee: import('@rs-x/expression-parser').IExpression<number> }",
          '  subtotal + shippingFee',
          '',
          'expression: typedCompositionTotalRsx',
          "  model: { subtotal: ReturnType<typeof import('./model.expressions').subtotalRsx>; shippingFee: ReturnType<typeof import('./model.expressions').shippingFeeRsx> }",
          '  subtotal + shippingFee',
          '',
          'expression: importedModelCompositionTotalRsx',
          "  model: import('./dependency-model').ImportedCompositionModel",
          '  subtotal + shippingFee + genericExpression',
          '',
          'expression: lineProjectionRsx',
          '  model: { lines: Array<{ id: string; lineTotal: number }> }',
          '  lines.map((line) => ({',
          '    id: line.id,',
          '    lineTotal: line.lineTotal',
          '  }))',
          '',
          'expression: sameFileTotalRsx',
          '  model: { value: number }',
          '  subtotal + 1',
          '',
          'expression: exactExportUseRsx',
          '  model: { value: number }',
          '  subtotalRsx({ value })',
        ].join('\n'),
      ],
    ]);

    findFiles.mockResolvedValueOnce([modelUri, derivedUri]);
    readFile.mockImplementation((uri: { fsPath: string }) =>
      Buffer.from(fixtureText.get(uri.fsPath) ?? '', 'utf8'),
    );

    activate(context as never);

    const provider = registerTreeDataProvider.mock.calls.at(-1)?.[1] as {
      getChildren(element?: unknown): Promise<unknown[]>;
      getTreeItem(element: unknown): {
        label: string;
        collapsibleState: number;
        description?: string;
        command?: unknown;
        tooltip?: string | { value?: string };
      };
    };
    const roots = (await provider.getChildren()) as Array<{
      kind: string;
      section: string;
      label: string;
      files?: unknown[];
      models?: unknown[];
    }>;
    expect(roots).toHaveLength(2);
    const expressionsRoot = roots.find(
      (root) => root.section === 'expressions',
    );
    const modelsRoot = roots.find((root) => root.section === 'models');
    expect(expressionsRoot).toEqual(
      expect.objectContaining({
        kind: 'root',
        label: 'Expressions',
      }),
    );
    expect(modelsRoot).toEqual(
      expect.objectContaining({
        kind: 'root',
        label: 'Models',
      }),
    );
    const rootItem = provider.getTreeItem(expressionsRoot);
    expect(rootItem.description).toBe('14 expressions');
    const modelsRootItem = provider.getTreeItem(modelsRoot);
    expect(modelsRootItem.description).toBe('8 models');

    const models = (await provider.getChildren(modelsRoot)) as Array<{
      kind: string;
      label: string;
      uri?: { fsPath: string };
      start?: number;
      end?: number;
      fields?: unknown[];
      expressions: unknown[];
    }>;
    const valueModel = models.find(
      (model) => model.label === '{ value: number }',
    );
    expect(valueModel).toEqual(
      expect.objectContaining({
        kind: 'model',
      }),
    );
    const valueModelItem = provider.getTreeItem(valueModel);
    expect(valueModelItem.description).toBe('1 field · 5 expressions');
    expect(valueModelItem.command).toEqual(
      expect.objectContaining({
        command: 'rsx.expressions.open',
      }),
    );
    const valueFields = (await provider.getChildren(valueModel)) as Array<{
      kind: string;
      label: string;
      typeText?: string;
    }>;
    expect(valueFields).toEqual([
      expect.objectContaining({
        kind: 'modelField',
        label: 'value',
        typeText: 'number',
      }),
    ]);
    const valueFieldItem = provider.getTreeItem(valueFields[0]);
    expect(valueFieldItem.description).toBe('number · 4 expressions');
    const valueExpressionUses = (await provider.getChildren(
      valueFields[0],
    )) as Array<{
      kind: string;
      expression: { exportName: string };
      fieldPath: string[];
    }>;
    expect(valueExpressionUses.map((use) => use.expression.exportName)).toEqual(
      ['lineRsx', 'shippingFeeRsx', 'subtotalRsx', 'exactExportUseRsx'],
    );
    expect(valueExpressionUses[0]).toEqual(
      expect.objectContaining({
        kind: 'modelFieldExpression',
        fieldPath: ['value'],
      }),
    );
    const importedModel = models.find((model) =>
      model.label.includes('ImportedCompositionModel'),
    );
    const importedModelPath = path.join(
      fixtureDirectory,
      'dependency-model.ts',
    );
    const importedModelText = fs.readFileSync(importedModelPath, 'utf8');
    const importedModelStart = importedModelText.indexOf(
      'ImportedCompositionModel',
    );
    expect(importedModel).toEqual(
      expect.objectContaining({
        uri: expect.objectContaining({ fsPath: importedModelPath }),
        start: importedModelStart,
        end: importedModelStart + 'ImportedCompositionModel'.length,
      }),
    );
    const importedModelFields = (await provider.getChildren(
      importedModel,
    )) as Array<{
      label: string;
      uri?: { fsPath: string };
      start?: number;
    }>;
    expect(importedModelFields.map((field) => field.label)).toEqual([
      'subtotal',
      'shippingFee',
      'genericExpression',
    ]);
    expect(importedModelFields[0]).toEqual(
      expect.objectContaining({
        uri: expect.objectContaining({ fsPath: importedModelPath }),
        start: importedModelText.indexOf('subtotal:'),
      }),
    );
    const subtotalExpressionUses = (await provider.getChildren(
      importedModelFields[0],
    )) as Array<{ expression: { exportName: string }; fieldPath: string[] }>;
    expect(subtotalExpressionUses).toEqual([
      expect.objectContaining({
        expression: expect.objectContaining({
          exportName: 'importedModelCompositionTotalRsx',
        }),
        fieldPath: ['subtotal'],
      }),
    ]);
    const linesModel = models.find((model) => model.label.includes('lines'));
    const linesFields = (await provider.getChildren(linesModel)) as Array<{
      label: string;
    }>;
    const linesField = linesFields.find((field) => field.label === 'lines');
    const nestedLineFields = (await provider.getChildren(linesField)) as Array<{
      label: string;
    }>;
    expect(nestedLineFields.map((field) => field.label)).toEqual([
      'id',
      'lineTotal',
    ]);
    const lineIdUses = (await provider.getChildren(
      nestedLineFields[0],
    )) as Array<{ expression: { exportName: string }; fieldPath: string[] }>;
    expect(lineIdUses).toEqual([
      expect.objectContaining({
        expression: expect.objectContaining({
          exportName: 'lineProjectionRsx',
        }),
        fieldPath: ['lines', 'id'],
      }),
    ]);
    const circularModel = models.find((model) =>
      model.label.includes('CircularModelA'),
    );
    const circularFields = (await provider.getChildren(
      circularModel,
    )) as Array<{
      label: string;
    }>;
    expect(circularFields.map((field) => field.label)).toEqual(['child']);
    const childFields = (await provider.getChildren(
      circularFields[0],
    )) as Array<{
      kind?: string;
      label: string;
    }>;
    const circularNestedFields = childFields.filter(
      (field) => field.kind === 'modelField',
    );
    expect(circularNestedFields.map((field) => field.label)).toEqual([
      'parent',
    ]);
    const circularParentChildren = await provider.getChildren(
      circularNestedFields[0],
    );
    expect(
      circularParentChildren.filter(
        (child) => (child as { kind?: string }).kind === 'modelField',
      ),
    ).toEqual([]);

    const files = (await provider.getChildren(expressionsRoot)) as Array<{
      kind: string;
      label: string;
    }>;
    const modelFile = files.find(
      (file) => file.label === 'dependency-model.expressions.rsx',
    );
    const derivedFile = files.find(
      (file) => file.label === 'derived.expressions.rsx',
    );
    const derivedFileItem = provider.getTreeItem(derivedFile);
    expect(derivedFileItem.description).toBe('7 expressions');
    expect(String(derivedFileItem.tooltip ?? '')).not.toContain('/workspace');
    expect(String(derivedFileItem.tooltip ?? '')).not.toContain('domain/');
    const expressions = (await provider.getChildren(derivedFile)) as Array<{
      kind: string;
      exportName: string;
    }>;
    const grandTotal = expressions.find(
      (expression) => expression.exportName === 'grandTotalRsx',
    );
    const lineProjection = expressions.find(
      (expression) => expression.exportName === 'lineProjectionRsx',
    );
    const composedTotal = expressions.find(
      (expression) => expression.exportName === 'composedTotalRsx',
    );
    const typedCompositionTotal = expressions.find(
      (expression) => expression.exportName === 'typedCompositionTotalRsx',
    );
    const importedModelCompositionTotal = expressions.find(
      (expression) =>
        expression.exportName === 'importedModelCompositionTotalRsx',
    );
    const sameFileTotal = expressions.find(
      (expression) => expression.exportName === 'sameFileTotalRsx',
    );
    const exactExportUse = expressions.find(
      (expression) => expression.exportName === 'exactExportUseRsx',
    );

    const grandTotalItem = provider.getTreeItem(grandTotal);
    expect(grandTotalItem.collapsibleState).toBe(0);
    expect(grandTotalItem.description).not.toContain('deps');
    expect((grandTotalItem.tooltip as { value?: string })?.value).not.toContain(
      '/workspace',
    );
    await expect(provider.getChildren(grandTotal)).resolves.toEqual([]);

    const composedTotalItem = provider.getTreeItem(composedTotal);
    expect(composedTotalItem.collapsibleState).toBe(0);
    expect(composedTotalItem.description).not.toContain('deps');
    await expect(provider.getChildren(composedTotal)).resolves.toEqual([]);

    const typedCompositionTotalItem = provider.getTreeItem(
      typedCompositionTotal,
    );
    expect(typedCompositionTotalItem.collapsibleState).toBe(1);
    expect(typedCompositionTotalItem.description).toContain('2 deps');

    const dependencies = (await provider.getChildren(
      typedCompositionTotal,
    )) as Array<{
      kind: string;
      edge: { targetExportName: string; identifier: string };
    }>;
    expect(
      dependencies.map((dependency) => dependency.edge.targetExportName),
    ).toEqual(['subtotalRsx', 'shippingFeeRsx']);
    expect(
      dependencies.map((dependency) => dependency.edge.identifier),
    ).toEqual(['subtotal', 'shippingFee']);
    const dependencyItem = provider.getTreeItem(dependencies[0]);
    expect(dependencyItem.description).not.toContain('domain/');
    expect((dependencyItem.tooltip as { value?: string })?.value).not.toContain(
      '/workspace',
    );

    const importedModelDependencies = (await provider.getChildren(
      importedModelCompositionTotal,
    )) as Array<{
      kind: string;
      edge: { targetExportName: string; identifier: string };
    }>;
    expect(
      importedModelDependencies.map(
        (dependency) => dependency.edge.targetExportName,
      ),
    ).toEqual(['subtotalRsx', 'shippingFeeRsx']);
    expect(
      importedModelDependencies.map((dependency) => dependency.edge.identifier),
    ).toEqual(['subtotal', 'shippingFee']);

    await expect(provider.getChildren(lineProjection)).resolves.toEqual([]);
    await expect(provider.getChildren(sameFileTotal)).resolves.toEqual([]);

    const exactExportDependencies = (await provider.getChildren(
      exactExportUse,
    )) as Array<{
      edge: { targetExportName: string; identifier: string };
    }>;
    expect(
      exactExportDependencies.map((dependency) => dependency.edge),
    ).toEqual([
      expect.objectContaining({
        targetExportName: 'subtotalRsx',
        identifier: 'subtotalRsx',
      }),
    ]);

    const modelExpressions = (await provider.getChildren(modelFile)) as Array<{
      exportName: string;
    }>;
    const discountLabel = modelExpressions.find(
      (expression) => expression.exportName === 'discountLabelRsx',
    );
    await expect(provider.getChildren(discountLabel)).resolves.toEqual([]);
  });

  it('opens a themed webview preview for the RS-X expression tree', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    const modelUri = createUri('/workspace/src/rules/model.expressions.rsx');
    const derivedUri = createUri(
      '/workspace/src/rules/derived.expressions.rsx',
    );
    const fixtureText = new Map<string, string>([
      [
        modelUri.fsPath,
        [
          'defaults:',
          '  model: { value: number }',
          '',
          'expression: subtotalRsx',
          '  value',
        ].join('\n'),
      ],
      [
        derivedUri.fsPath,
        [
          'expression: grandTotalRsx',
          '  model: { subtotal: ReturnType<typeof subtotalRsx> }',
          '  subtotal + 1',
        ].join('\n'),
      ],
    ]);

    findFiles.mockResolvedValueOnce([modelUri, derivedUri]);
    readFile.mockImplementation((uri: { fsPath: string }) =>
      Buffer.from(fixtureText.get(uri.fsPath) ?? '', 'utf8'),
    );

    activate(context as never);

    const previewCommand = registerCommand.mock.calls.find(
      ([command]) => command === 'rsx.expressions.preview',
    )?.[1] as (() => Promise<void>) | undefined;
    expect(previewCommand).toBeDefined();

    await previewCommand?.();

    const panel = createWebviewPanel.mock.results.at(-1)?.value as
      | { webview: { html: string } }
      | undefined;
    expect(createWebviewPanel).toHaveBeenCalled();
    expect(panel?.webview.html).toContain('RS-X Tree: grandTotalRsx');
    expect(panel?.webview.html).toContain('--vscode-editor-background');
    expect(panel?.webview.html).toContain('grandTotalRsx');
    expect(panel?.webview.html).toContain('subtotal + 1');
    expect(panel?.webview.html).not.toContain('nodeName');
    expect(panel?.webview.html).not.toContain('relativePath');

    const graphJson = panel?.webview.html.match(
      /const graph = (?<json>.*?);\n    const canvas/su,
    )?.groups?.json;
    expect(graphJson).toBeDefined();
    const graph = JSON.parse(graphJson ?? '{}') as {
      nodes: Array<{ expressionText: string; start: number; end: number }>;
    };
    const subtotalNode = graph.nodes.find(
      (node) => node.expressionText === 'subtotal',
    );
    const derivedText = fixtureText.get(derivedUri.fsPath) ?? '';
    const expectedStart = derivedText.indexOf('subtotal + 1');
    expect(subtotalNode).toEqual(
      expect.objectContaining({
        start: expectedStart,
        end: expectedStart + 'subtotal'.length,
      }),
    );
  });

  it('opens expression tree selections beside the preview and reuses visible editors', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    const uri = createUri('/workspace/src/rules/model.expressions.rsx');
    const text = [
      'expression: subtotalRsx',
      '  model: { value: number }',
      '  value',
    ].join('\n');

    findFiles.mockResolvedValueOnce([uri]);
    readFile.mockImplementation((candidate: { fsPath: string }) =>
      Buffer.from(candidate.fsPath === uri.fsPath ? text : '', 'utf8'),
    );

    activate(context as never);

    const provider = registerTreeDataProvider.mock.calls.at(-1)?.[1] as {
      getChildren(element?: unknown): Promise<unknown[]>;
    };
    const roots = await provider.getChildren();
    const files = await provider.getChildren(roots[0]);
    const models = await provider.getChildren(roots[1]);
    const expressions = (await provider.getChildren(files[0])) as unknown[];
    const expression = expressions[0];
    const model = models[0];
    const modelFields = await provider.getChildren(model);
    const modelField = modelFields[0];
    const modelFieldUses = await provider.getChildren(modelField);
    const modelFieldUse = modelFieldUses[0];
    const openCommand = registerCommand.mock.calls.find(
      ([command]) => command === 'rsx.expressions.open',
    )?.[1] as ((item: unknown) => Promise<void>) | undefined;
    expect(openCommand).toBeDefined();

    const document = createTextDocument(text, { fsPath: uri.fsPath });
    const editor = {
      document,
      revealRange: jest.fn(),
      selection: undefined,
    };
    visibleTextEditors.length = 0;
    openTextDocument.mockResolvedValueOnce(document);
    showTextDocument.mockResolvedValueOnce(editor);

    await openCommand?.(expression);

    expect(showTextDocument).toHaveBeenCalledWith(
      document,
      expect.objectContaining({
        viewColumn: 2,
        preview: true,
      }),
    );
    expect(editor.revealRange).toHaveBeenCalled();

    openTextDocument.mockClear();
    showTextDocument.mockClear();
    editor.revealRange.mockClear();
    visibleTextEditors.push(editor);

    await openCommand?.(expression);

    expect(openTextDocument).not.toHaveBeenCalled();
    expect(showTextDocument).not.toHaveBeenCalled();
    expect(editor.revealRange).toHaveBeenCalled();
    visibleTextEditors.length = 0;

    openTextDocument.mockClear();
    showTextDocument.mockClear();
    editor.revealRange.mockClear();
    visibleTextEditors.length = 0;
    openTextDocument.mockResolvedValueOnce(document);
    showTextDocument.mockResolvedValueOnce(editor);

    await openCommand?.(model);

    expect(showTextDocument).toHaveBeenCalledWith(
      document,
      expect.objectContaining({
        viewColumn: 2,
        preview: true,
      }),
    );
    expect(editor.selection).toEqual(
      expect.objectContaining({
        start: document.positionAt(text.indexOf('{ value: number }')),
        end: document.positionAt(
          text.indexOf('{ value: number }') + '{ value: number }'.length,
        ),
      }),
    );

    openTextDocument.mockClear();
    showTextDocument.mockClear();
    editor.revealRange.mockClear();
    visibleTextEditors.length = 0;
    openTextDocument.mockResolvedValueOnce(document);
    showTextDocument.mockResolvedValueOnce(editor);

    await openCommand?.(modelField);

    expect(editor.selection).toEqual(
      expect.objectContaining({
        start: document.positionAt(text.indexOf('value: number')),
        end: document.positionAt(
          text.indexOf('value: number') + 'value'.length,
        ),
      }),
    );

    openTextDocument.mockClear();
    showTextDocument.mockClear();
    editor.revealRange.mockClear();
    visibleTextEditors.length = 0;
    openTextDocument.mockResolvedValueOnce(document);
    showTextDocument.mockResolvedValueOnce(editor);

    await openCommand?.(modelFieldUse);

    const expressionValueOffset = text.lastIndexOf('value');
    expect(editor.selection).toEqual(
      expect.objectContaining({
        start: document.positionAt(expressionValueOffset),
        end: document.positionAt(expressionValueOffset + 'value'.length),
      }),
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

  it('keeps fresh header typing on the fast path instead of analyzing it as an expression', () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };

    activate(context as never);

    const diagnosticCollection = createDiagnosticCollection.mock.results.at(-1)
      ?.value as { set: jest.Mock };
    const openHandler = onDidOpenTextDocument.mock.calls.at(-1)?.[0] as (
      document: unknown,
    ) => void;
    const codeActionProvider = registerCodeActionsProvider.mock.calls.at(
      -1,
    )?.[1] as {
      provideCodeActions(
        document: ReturnType<typeof createTextDocument>,
        range: unknown,
        context: { diagnostics: Array<{ message: string; range: unknown }> },
      ): unknown[];
    };
    const formattingProvider =
      registerDocumentFormattingEditProvider.mock.calls.at(-1)?.[1] as {
        provideDocumentFormattingEdits(
          document: ReturnType<typeof createTextDocument>,
          options: unknown,
          token: { isCancellationRequested: boolean },
        ): Promise<unknown[]>;
      };

    jest.useFakeTimers();
    const partialHeaderDocument = createTextDocument('def', {
      fsPath: '/workspace/fresh-header.rsx',
    });
    openHandler(partialHeaderDocument);
    jest.runOnlyPendingTimers();
    jest.useRealTimers();

    expect(diagnosticCollection.set.mock.calls.at(-1)?.[1]).toEqual([]);
    expect(
      codeActionProvider.provideCodeActions(
        partialHeaderDocument,
        {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 3 },
        },
        { diagnostics: [] },
      ),
    ).toEqual([]);

    jest.useFakeTimers();
    const contextualHeaderDocument = createTextDocument('defaults:\nmod', {
      fsPath: '/workspace/contextual-header.rsx',
    });
    openHandler(contextualHeaderDocument);
    jest.runOnlyPendingTimers();
    jest.useRealTimers();

    expect(diagnosticCollection.set.mock.calls.at(-1)?.[1]).toEqual([]);
    expect(
      codeActionProvider.provideCodeActions(
        contextualHeaderDocument,
        {
          start: { line: 1, character: 0 },
          end: { line: 1, character: 3 },
        },
        { diagnostics: [] },
      ),
    ).toEqual([]);

    const invalidHeaderDiagnostic = {
      message: 'Unknown RS-X header key "defualts".',
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 7 },
      },
    };
    expect(
      codeActionProvider.provideCodeActions(
        createTextDocument('defualts:', {
          fsPath: '/workspace/invalid-header.rsx',
        }),
        invalidHeaderDiagnostic.range,
        { diagnostics: [invalidHeaderDiagnostic] },
      ),
    ).toEqual([]);

    return expect(
      formattingProvider.provideDocumentFormattingEdits(
        contextualHeaderDocument,
        {},
        { isCancellationRequested: false },
      ),
    ).resolves.toEqual([]);
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

  it('returns hover info for same-file expression references in module .rsx files', () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    const fixturePath = '/workspace/src/rules/model.expressions.rsx';
    const text = [
      'defaults:',
      '  model: import("./shipping-quote-model.contract").ShippingQuoteModelContract',
      '',
      'expression: merchandiseSubtotalRsx',
      '  lines.reduce((sum, line) => sum + (line.qty * line.unitPrice), 0)',
      '',
      'expression: discountAmountRsx',
      '  merchandiseSubtotal * discountRate',
      '',
      'expression: grandTotalRsx',
      '  merchandiseSubtotal - discountAmount',
    ].join('\n');

    activate(context as never);

    const provider = registerHoverProvider.mock.calls.at(-1)?.[1] as {
      provideHover(
        document: ReturnType<typeof createTextDocument>,
        position: { line: number; character: number },
      ): { contents?: { value?: string } } | null;
    };
    const document = createTextDocument(text, { fsPath: fixturePath });
    const referenceOffset = text.indexOf(
      'merchandiseSubtotal - discountAmount',
    );
    expect(referenceOffset).toBeGreaterThanOrEqual(0);

    const hover = provider.provideHover(
      document,
      document.positionAt(referenceOffset + 'merchandiseSubtotal'.length - 1),
    );

    expect(hover?.contents?.value).toContain('merchandiseSubtotal');
    expect(hover?.contents?.value).toContain(
      'ReturnType<typeof merchandiseSubtotalRsx>',
    );
  });
});

function createTextDocument(
  text: string,
  options: { languageId?: string; scheme?: string; fsPath?: string } = {},
) {
  const lines = text.replace(/\r\n/gu, '\n').split('\n');
  return {
    languageId: options.languageId ?? 'rsx',
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

function getDiagnosticsSetByMock(set: jest.Mock): Array<{ message: string }> {
  return set.mock.calls.flatMap(
    (call) => (call[1] as Array<{ message: string }> | undefined) ?? [],
  );
}

function createUri(fsPath: string) {
  return {
    scheme: 'file',
    fsPath,
    toString: () => `file://${fsPath}`,
  };
}
