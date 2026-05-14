import { jest } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { TextDecoder, TextEncoder } from 'node:util';

import { invalidLazyPreparseDiagnosticMessage } from '../../rs-x-compiler/lib/compiler/expression-site-validator';

(
  globalThis as typeof globalThis & {
    TextDecoder: typeof TextDecoder;
    TextEncoder: typeof TextEncoder;
  }
).TextDecoder = TextDecoder;
(
  globalThis as typeof globalThis & {
    TextDecoder: typeof TextDecoder;
    TextEncoder: typeof TextEncoder;
  }
).TextEncoder = TextEncoder;

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
const registerCodeLensProvider = jest.fn(() => ({ dispose: jest.fn() }));
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
const registerWebviewViewProvider = jest.fn(() => ({ dispose: jest.fn() }));
const registerWebviewPanelSerializer = jest.fn(() => ({ dispose: jest.fn() }));
const registerCommand = jest.fn(() => ({ dispose: jest.fn() }));
const executeCommand = jest.fn();
const createWebviewPanel = jest.fn(() => ({
  webview: {
    html: '',
    onDidReceiveMessage: jest.fn(() => ({ dispose: jest.fn() })),
    postMessage: jest.fn(),
  },
  onDidDispose: jest.fn(() => ({ dispose: jest.fn() })),
  onDidChangeViewState: jest.fn(() => ({ dispose: jest.fn() })),
  viewColumn: 2,
  dispose: jest.fn(),
}));
const showQuickPick = jest.fn();
const showInputBox = jest.fn();
const showOpenDialog = jest.fn();
const showWarningMessage = jest.fn();
const showInformationMessage = jest.fn();
const showTextDocument = jest.fn();
const createTextEditorDecorationType = jest.fn(() => ({ dispose: jest.fn() }));
const terminalShow = jest.fn();
const terminalSendText = jest.fn();
const createTerminal = jest.fn(() => ({
  show: terminalShow,
  sendText: terminalSendText,
  dispose: jest.fn(),
}));
const visibleTextEditors: unknown[] = [];
const tabGroupsClose = jest.fn(async () => true);
const tabGroupsOnDidChangeTabs = jest.fn(() => ({ dispose: jest.fn() }));
let tabGroupsAll: unknown[] = [];
let activeTextEditor: unknown = null;
let workspaceFolders: unknown[] | undefined;
const findFiles = jest.fn();
const readFile = jest.fn();
const writeFile = jest.fn();
const createDirectory = jest.fn();
const openTextDocument = jest.fn();
const applyEdit = jest.fn(async () => true);
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
const textDocuments: unknown[] = [];

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
      registerCodeLensProvider,
      registerDocumentFormattingEditProvider,
      registerDocumentRangeFormattingEditProvider,
      registerDocumentSemanticTokensProvider,
    },
    workspace: {
      asRelativePath,
      createFileSystemWatcher,
      findFiles,
      fs: {
        createDirectory,
        readFile,
        writeFile,
      },
      get workspaceFolders() {
        return workspaceFolders;
      },
      getWorkspaceFolder: jest.fn((uri: { fsPath?: string }) => {
        const folders = (workspaceFolders ?? []) as Array<{
          uri?: { fsPath?: string };
        }>;
        return folders.find(
          (folder) =>
            folder.uri?.fsPath &&
            uri.fsPath?.startsWith(`${folder.uri.fsPath}${path.sep}`),
        );
      }),
      openTextDocument,
      applyEdit,
      onDidOpenTextDocument,
      onDidChangeTextDocument,
      onDidSaveTextDocument,
      onDidCloseTextDocument,
      textDocuments,
    },
    window: {
      createWebviewPanel,
      get activeTextEditor() {
        return activeTextEditor;
      },
      registerTreeDataProvider,
      registerWebviewViewProvider,
      showInputBox,
      showOpenDialog,
      showInformationMessage,
      showQuickPick,
      showTextDocument,
      showWarningMessage,
      createTerminal,
      createTextEditorDecorationType,
      registerWebviewPanelSerializer,
      tabGroups: {
        get all() {
          return tabGroupsAll;
        },
        close: tabGroupsClose,
        onDidChangeTabs: tabGroupsOnDidChangeTabs,
      },
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
    WorkspaceEdit: class WorkspaceEdit {
      readonly replacements: Array<{
        uri: unknown;
        range: unknown;
        text: string;
      }> = [];
      replace(uri: unknown, range: unknown, text: string) {
        this.replacements.push({ uri, range, text });
      }
    },
    TextEdit: class TextEdit {
      constructor(
        public readonly range: unknown,
        public readonly newText: string,
      ) {}
      static insert(position: unknown, newText: string) {
        return new TextEdit({ start: position, end: position }, newText);
      }
    },
    CompletionItem: class CompletionItem {
      insertText?: string;
      sortText?: string;
      detail?: string;
      documentation?: unknown;
      range?: unknown;
      additionalTextEdits?: unknown[];
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
    CodeLens: class CodeLens {
      constructor(
        public readonly range: unknown,
        public readonly command?: unknown,
      ) {}
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
      constructor(
        public readonly id: string,
        public readonly color?: unknown,
      ) {}
    },
    ThemeColor: class ThemeColor {
      constructor(public readonly id: string) {}
    },
    TabInputText: class TabInputText {
      constructor(public readonly uri: { fsPath: string }) {}
    },
    TabInputWebview: class TabInputWebview {
      constructor(public readonly viewType: string) {}
    },
    Uri: class Uri {
      constructor(public readonly fsPath: string) {}
      static file(fsPath: string) {
        return new Uri(fsPath);
      }
      static parse(value: string) {
        return new Uri(value.replace(/^file:\/\//u, ''));
      }
      static joinPath(base: { fsPath: string }, ...segments: string[]) {
        return new Uri(
          [base.fsPath, ...segments].join('/').replace(/\/+/gu, '/'),
        );
      }
      get path() {
        return this.fsPath;
      }
      with(change: { path?: string }) {
        return new Uri(change.path ?? this.fsPath);
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
      InCenter: 1,
      InCenterIfOutsideViewport: 0,
    },
    OverviewRulerLane: {
      Center: 2,
    },
    ViewColumn: {
      Active: 1,
      One: 1,
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
    expect(registerWebviewViewProvider).toHaveBeenCalledWith(
      'rsx.expressions',
      expect.anything(),
      expect.objectContaining({
        webviewOptions: expect.objectContaining({
          retainContextWhenHidden: false,
        }),
      }),
    );
    expect(context.subscriptions.length).toBeGreaterThan(0);
  });

  it('runs CLI init from the Explorer-selected project folder', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    const packageJsonPath = path.resolve(__dirname, '../../package.json');
    const projectRoot = path.dirname(packageJsonPath);

    registerCommand.mockClear();
    createTerminal.mockClear();
    terminalShow.mockClear();
    terminalSendText.mockClear();
    activate(context as never);

    const command = registerCommand.mock.calls.find(
      ([commandName]) => commandName === 'rsx.project.init',
    )?.[1] as ((resource?: { fsPath: string }) => Promise<void>) | undefined;

    await command?.(createUri(packageJsonPath));

    expect(createTerminal).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'RS-X Init',
        cwd: projectRoot,
      }),
    );
    expect(terminalShow).toHaveBeenCalled();
    expect(terminalSendText).toHaveBeenCalledWith(
      expect.stringMatching(/\sinit$/u),
    );
  });

  it('creates a module rsx expression from the expressions panel add command', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    const files = new Map<string, string>([
      [
        '/workspace/rsx.config.json',
        JSON.stringify({
          cli: { add: { defaultDirectory: 'src/rules' } },
        }),
      ],
    ]);

    registerCommand.mockClear();
    workspaceFolders = [{ name: 'workspace', uri: createUri('/workspace') }];
    showQuickPick.mockImplementation(async (items: unknown[]) => items[0]);
    showInputBox.mockImplementation(
      async (options: { prompt?: string; value?: string }) => {
        if (options.prompt === 'Expression export name') {
          return 'grandTotalRsx';
        }
        if (options.prompt === 'Initial expression body') {
          return 'price * quantity';
        }
        if (options.prompt === 'Expression file path') {
          return options.value;
        }
        return undefined;
      },
    );
    readFile.mockImplementation(async (uri: { fsPath: string }) => {
      const text = files.get(uri.fsPath);
      if (text === undefined) {
        throw new Error('ENOENT');
      }
      return new TextEncoder().encode(text);
    });
    writeFile.mockImplementation(
      async (uri: { fsPath: string }, bytes: Uint8Array) => {
        files.set(uri.fsPath, new TextDecoder().decode(bytes));
      },
    );
    createDirectory.mockResolvedValue(undefined as never);
    openTextDocument.mockImplementation(async (uri: { fsPath: string }) =>
      createTextDocument(files.get(uri.fsPath) ?? '', { fsPath: uri.fsPath }),
    );
    showTextDocument.mockImplementation(async (document: unknown) => ({
      document,
      revealRange: jest.fn(),
    }));

    try {
      activate(context as never);

      const addCommand = registerCommand.mock.calls.find(
        ([command]) => command === 'rsx.expressions.add',
      )?.[1] as (() => Promise<void>) | undefined;
      expect(addCommand).toBeDefined();
      await addCommand?.();

      const targetPath = '/workspace/src/rules/grand-total-rsx.expressions.rsx';
      expect(files.get(targetPath)).toBe(
        [
          'expression: grandTotalRsx',
          '  model: { price: number; quantity: number }',
          '  price * quantity',
          '',
        ].join('\n'),
      );
      expect(createDirectory).toHaveBeenCalledWith(
        expect.objectContaining({ fsPath: '/workspace/src/rules' }),
      );
      expect(showInformationMessage).toHaveBeenCalledWith(
        'Added RS-X expression grandTotalRsx.',
      );
    } finally {
      workspaceFolders = undefined;
      showQuickPick.mockReset();
      showInputBox.mockReset();
      showWarningMessage.mockReset();
      showInformationMessage.mockReset();
      readFile.mockReset();
      writeFile.mockReset();
      createDirectory.mockReset();
      openTextDocument.mockReset();
      showTextDocument.mockReset();
    }
  });

  it('adds a module rsx expression directly to an explorer-selected rsx file', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    const targetUri = createUri(
      '/workspace/src/rules/shipping.expressions.rsx',
    );
    const files = new Map<string, string>([
      [
        targetUri.fsPath,
        [
          'expression: shippingTotalRsx',
          '  model: { price: number; quantity: number }',
          '  price * quantity',
          '',
        ].join('\n'),
      ],
    ]);

    registerCommand.mockClear();
    workspaceFolders = [{ name: 'workspace', uri: createUri('/workspace') }];
    showQuickPick.mockClear();
    showInputBox.mockImplementation(
      async (options: { prompt?: string; value?: string }) => {
        if (options.prompt === 'Expression export name') {
          return 'shippingTaxRsx';
        }
        if (options.prompt === 'Initial expression body') {
          return 'shippingTotal * taxRate';
        }
        return undefined;
      },
    );
    readFile.mockImplementation(async (uri: { fsPath: string }) => {
      const text = files.get(uri.fsPath);
      if (text === undefined) {
        throw new Error('ENOENT');
      }
      return new TextEncoder().encode(text);
    });
    writeFile.mockImplementation(
      async (uri: { fsPath: string }, bytes: Uint8Array) => {
        files.set(uri.fsPath, new TextDecoder().decode(bytes));
      },
    );
    createDirectory.mockResolvedValue(undefined as never);
    openTextDocument.mockImplementation(async (uri: { fsPath: string }) =>
      createTextDocument(files.get(uri.fsPath) ?? '', { fsPath: uri.fsPath }),
    );
    showTextDocument.mockImplementation(async (document: unknown) => ({
      document,
      revealRange: jest.fn(),
    }));

    try {
      activate(context as never);

      const addCommand = registerCommand.mock.calls.find(
        ([command]) => command === 'rsx.expressions.add',
      )?.[1] as ((resource?: { fsPath: string }) => Promise<void>) | undefined;
      expect(addCommand).toBeDefined();
      await addCommand?.(targetUri);

      expect(showQuickPick).not.toHaveBeenCalled();
      expect(files.get(targetUri.fsPath)).toBe(
        [
          'expression: shippingTotalRsx',
          '  model: { price: number; quantity: number }',
          '  price * quantity',
          '',
          'expression: shippingTaxRsx',
          '  model: { shippingTotal: number; taxRate: number }',
          '  shippingTotal * taxRate',
          '',
        ].join('\n'),
      );
      expect(showInformationMessage).toHaveBeenCalledWith(
        'Added RS-X expression shippingTaxRsx.',
      );
    } finally {
      workspaceFolders = undefined;
      showQuickPick.mockReset();
      showInputBox.mockReset();
      showInformationMessage.mockReset();
      readFile.mockReset();
      writeFile.mockReset();
      createDirectory.mockReset();
      openTextDocument.mockReset();
      showTextDocument.mockReset();
    }
  });

  it('opens the panel add expression form for an rsx context target', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    const targetUri = createUri(
      '/workspace/src/rules/shipping.expressions.rsx',
    );

    registerCommand.mockClear();
    workspaceFolders = [{ name: 'workspace', uri: createUri('/workspace') }];
    findFiles.mockResolvedValue([targetUri] as never);
    readFile.mockImplementation(async () => {
      throw new Error('ENOENT');
    });

    try {
      activate(context as never);
      const searchView = {
        webview: {
          html: '',
          options: {},
          onDidReceiveMessage: jest.fn(() => ({ dispose: jest.fn() })),
          postMessage: jest.fn(),
        },
        onDidDispose: jest.fn(() => ({ dispose: jest.fn() })),
      };
      const searchProvider = registerWebviewViewProvider.mock.calls
        .filter(([viewId]) => viewId === 'rsx.expressions')
        .at(-1)?.[1] as
        | {
            view?: unknown;
          }
        | undefined;
      if (searchProvider) {
        searchProvider.view = searchView;
      }

      const addCommand = registerCommand.mock.calls.find(
        ([command]) => command === 'rsx.expressions.add',
      )?.[1] as ((resource?: { fsPath: string }) => Promise<void>) | undefined;
      await addCommand?.(targetUri);

      expect(showQuickPick).not.toHaveBeenCalled();
      expect(searchView.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'addExpressionForm',
          rootUri: 'file:///workspace',
          directory: 'src/rules',
          fileName: 'shipping',
          existingFilePath: 'src/rules/shipping.expressions.rsx',
          lockExpressionFile: true,
          expressionSource: '',
          files: ['src/rules/shipping.expressions.rsx'],
          modelFiles: [],
          newModelDirectory: 'src/rsx/models',
          newModelFileName: 'new-expression.model',
          newModelInterfaceName: 'NewExpressionModel',
        }),
      );
      if (searchProvider) {
        searchProvider.view = null;
      }
    } finally {
      workspaceFolders = undefined;
      findFiles.mockReset();
      readFile.mockReset();
      showQuickPick.mockReset();
      registerCommand.mockClear();
    }
  });

  it('opens the panel add expression form for an rsx tree file target', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    const workspaceUri = createUri('/workspace-defaults-lock');
    const targetUri = createUri(
      '/workspace-defaults-lock/src/rsx/expressions/ab.expressions.rsx',
    );
    const modelUri = createUri(
      '/workspace-defaults-lock/src/rsx/models/ab.model.ts',
    );
    const files = new Map<string, string>([
      [
        targetUri.fsPath,
        [
          'defaults:',
          "  model: import('../models/ab.model').AB",
          '',
          'expression: aPlusB',
          '  a + b',
        ].join('\n'),
      ],
      [modelUri.fsPath, 'export interface AB { a: number; b: number }'],
    ]);

    registerCommand.mockClear();
    workspaceFolders = [{ name: 'workspace', uri: workspaceUri }];
    findFiles.mockImplementation(async (pattern: string) => {
      if (pattern === '**/*.rsx') {
        return [targetUri] as never;
      }
      if (
        pattern.includes(
          '{model,contract,types,type,interface,interfaces,schema,dto}',
        )
      ) {
        return [modelUri] as never;
      }
      return [] as never;
    });
    readFile.mockImplementation(async (uri: { fsPath: string }) => {
      const text = files.get(uri.fsPath);
      if (text === undefined) {
        throw new Error('ENOENT');
      }
      return Buffer.from(text, 'utf8');
    });

    try {
      activate(context as never);
      const searchView = {
        webview: {
          html: '',
          options: {},
          onDidReceiveMessage: jest.fn(() => ({ dispose: jest.fn() })),
          postMessage: jest.fn(),
        },
        onDidDispose: jest.fn(() => ({ dispose: jest.fn() })),
      };
      const searchProvider = registerWebviewViewProvider.mock.calls
        .filter(([viewId]) => viewId === 'rsx.expressions')
        .at(-1)?.[1] as
        | {
            view?: unknown;
          }
        | undefined;
      if (searchProvider) {
        searchProvider.view = searchView;
      }

      const addCommand = registerCommand.mock.calls.find(
        ([command]) => command === 'rsx.expressions.add',
      )?.[1] as
        | ((resource?: {
            kind?: string;
            uri?: { fsPath: string; toString(): string };
          }) => Promise<void>)
        | undefined;
      await addCommand?.({
        kind: 'file',
        uri: targetUri,
      });

      expect(searchView.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'addExpressionForm',
          rootUri: 'file:///workspace-defaults-lock',
          directory: 'src/rsx/expressions',
          fileName: 'ab',
          existingFilePath: 'src/rsx/expressions/ab.expressions.rsx',
          lockExpressionFile: true,
          lockModelContract: false,
          selectedModelFilePath: 'src/rsx/models/ab.model.ts',
          selectedModelInterfaceName: 'AB',
          defaultsModelSelections: {
            'src/rsx/expressions/ab.expressions.rsx': {
              modelFilePath: 'src/rsx/models/ab.model.ts',
              modelInterfaceName: 'AB',
            },
          },
          files: ['src/rsx/expressions/ab.expressions.rsx'],
          modelFiles: [
            {
              path: 'src/rsx/models/ab.model.ts',
              contracts: ['AB'],
            },
          ],
        }),
      );
      if (searchProvider) {
        searchProvider.view = null;
      }
    } finally {
      workspaceFolders = undefined;
      findFiles.mockReset();
      readFile.mockReset();
      registerCommand.mockClear();
    }
  });

  it('uses an existing matching defaults model when adding a panel expression', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    const targetUri = createUri(
      '/workspace/src/rsx/expressions/math.expressions.rsx',
    );
    const files = new Map<string, string>([
      [
        targetUri.fsPath,
        [
          'defaults:',
          "  model: import('../models/ab.model').AB",
          '',
          'expression: aPlusB',
          '  a + b',
          '',
        ].join('\n'),
      ],
    ]);

    registerCommand.mockClear();
    workspaceFolders = [{ name: 'workspace', uri: createUri('/workspace') }];
    findFiles.mockResolvedValue([] as never);
    readFile.mockImplementation(async (uri: { fsPath: string }) => {
      const text = files.get(uri.fsPath);
      if (text === undefined) {
        throw new Error('ENOENT');
      }
      return new TextEncoder().encode(text);
    });
    writeFile.mockImplementation(
      async (uri: { fsPath: string }, bytes: Uint8Array) => {
        files.set(uri.fsPath, new TextDecoder().decode(bytes));
      },
    );
    createDirectory.mockResolvedValue(undefined as never);
    openTextDocument.mockImplementation(async (uri: { fsPath: string }) =>
      createTextDocument(files.get(uri.fsPath) ?? '', { fsPath: uri.fsPath }),
    );
    showTextDocument.mockImplementation(async (document: unknown) => ({
      document,
      revealRange: jest.fn(),
    }));

    try {
      activate(context as never);
      let messageHandler:
        | ((message: Record<string, unknown>) => Promise<void>)
        | undefined;
      const searchView = {
        webview: {
          html: '',
          options: {},
          onDidReceiveMessage: jest.fn((handler) => {
            messageHandler = handler;
            return { dispose: jest.fn() };
          }),
          postMessage: jest.fn(),
        },
        onDidDispose: jest.fn(() => ({ dispose: jest.fn() })),
      };
      const searchProvider = registerWebviewViewProvider.mock.calls
        .filter(([viewId]) => viewId === 'rsx.expressions')
        .at(-1)?.[1] as
        | {
            resolveWebviewView(view: unknown): void;
          }
        | undefined;
      searchProvider?.resolveWebviewView(searchView);

      await messageHandler?.({
        type: 'createExpression',
        rootUri: 'file:///workspace',
        expressionName: 'aMultiplyB',
        expressionSource: 'a * b',
        useExistingModel: true,
        shareModel: true,
        modelFilePath: 'src/rsx/models/ab.model.ts',
        modelInterfaceName: 'AB',
        existingFilePath: 'src/rsx/expressions/math.expressions.rsx',
        relativePath: 'src/rsx/expressions/math.expressions.rsx',
      });

      expect(files.get(targetUri.fsPath)).toBe(
        [
          'defaults:',
          "  model: import('../models/ab.model').AB",
          '',
          'expression: aPlusB',
          '  a + b',
          '',
          'expression: aMultiplyB',
          '  a * b',
          '',
        ].join('\n'),
      );
      expect(files.get(targetUri.fsPath)).not.toContain(
        "expression: aMultiplyB\n  model: import('../models/ab.model').AB",
      );
    } finally {
      workspaceFolders = undefined;
      findFiles.mockReset();
      readFile.mockReset();
      writeFile.mockReset();
      createDirectory.mockReset();
      openTextDocument.mockReset();
      showTextDocument.mockReset();
      registerCommand.mockClear();
    }
  });

  it('uses the rsx base directory for new expression and model defaults', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    const configUri = createUri('/workspace/rsx.config.json');

    registerCommand.mockClear();
    workspaceFolders = [{ name: 'workspace', uri: createUri('/workspace') }];
    findFiles.mockResolvedValue([] as never);
    readFile.mockImplementation(async (uri: { fsPath: string }) => {
      if (uri.fsPath === configUri.fsPath) {
        return Buffer.from(
          JSON.stringify({
            cli: {
              add: {
                baseDirectory: 'src/rsx',
                defaultDirectory: 'src/expressions',
              },
            },
          }),
          'utf8',
        );
      }
      throw new Error('ENOENT');
    });

    try {
      activate(context as never);
      const searchView = {
        webview: {
          html: '',
          options: {},
          onDidReceiveMessage: jest.fn(() => ({ dispose: jest.fn() })),
          postMessage: jest.fn(),
        },
        onDidDispose: jest.fn(() => ({ dispose: jest.fn() })),
      };
      const searchProvider = registerWebviewViewProvider.mock.calls
        .filter(([viewId]) => viewId === 'rsx.expressions')
        .at(-1)?.[1] as
        | {
            view?: unknown;
          }
        | undefined;
      if (searchProvider) {
        searchProvider.view = searchView;
      }

      const addCommand = registerCommand.mock.calls.find(
        ([command]) => command === 'rsx.expressions.add',
      )?.[1] as (() => Promise<void>) | undefined;
      await addCommand?.();

      expect(searchView.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'addExpressionForm',
          directory: 'src/rsx/expressions',
          fileName: 'new-expression-rsx',
          existingFilePath: '',
          newModelDirectory: 'src/rsx/models',
        }),
      );
      if (searchProvider) {
        searchProvider.view = null;
      }
    } finally {
      workspaceFolders = undefined;
      findFiles.mockReset();
      readFile.mockReset();
      registerCommand.mockClear();
    }
  });

  it('treats cli add defaultDirectory equal to the rsx base as a base directory', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    const configUri = createUri('/workspace/rsx.config.json');

    registerCommand.mockClear();
    workspaceFolders = [{ name: 'workspace', uri: createUri('/workspace') }];
    findFiles.mockResolvedValue([] as never);
    readFile.mockImplementation(async (uri: { fsPath: string }) => {
      if (uri.fsPath === configUri.fsPath) {
        return Buffer.from(
          JSON.stringify({
            cli: {
              add: {
                defaultDirectory: 'src/rsx',
              },
            },
          }),
          'utf8',
        );
      }
      throw new Error('ENOENT');
    });

    try {
      activate(context as never);
      const searchView = {
        webview: {
          html: '',
          options: {},
          onDidReceiveMessage: jest.fn(() => ({ dispose: jest.fn() })),
          postMessage: jest.fn(),
        },
        onDidDispose: jest.fn(() => ({ dispose: jest.fn() })),
      };
      const searchProvider = registerWebviewViewProvider.mock.calls
        .filter(([viewId]) => viewId === 'rsx.expressions')
        .at(-1)?.[1] as
        | {
            view?: unknown;
          }
        | undefined;
      if (searchProvider) {
        searchProvider.view = searchView;
      }

      const addCommand = registerCommand.mock.calls.find(
        ([command]) => command === 'rsx.expressions.add',
      )?.[1] as (() => Promise<void>) | undefined;
      await addCommand?.();

      expect(searchView.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'addExpressionForm',
          directory: 'src/rsx/expressions',
          newModelDirectory: 'src/rsx/models',
        }),
      );
      if (searchProvider) {
        searchProvider.view = null;
      }
    } finally {
      workspaceFolders = undefined;
      findFiles.mockReset();
      readFile.mockReset();
      registerCommand.mockClear();
    }
  });

  it('uses configured source root for the add hook form default path', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    const rsxUri = createUri('/workspace/src/app/expressions/matrix.rsx');
    const files = new Map<string, string>([
      [
        '/workspace/rsx.config.json',
        JSON.stringify({
          cli: { add: { defaultDirectory: 'src/app/expressions' } },
        }),
      ],
    ]);
    workspaceFolders = [{ name: 'workspace', uri: createUri('/workspace') }];
    readFile.mockImplementation(async (uri: { fsPath: string }) => {
      const text = files.get(uri.fsPath);
      if (text === undefined) {
        throw new Error('ENOENT');
      }
      return new TextEncoder().encode(text);
    });

    try {
      activate(context as never);
      const searchView = {
        webview: {
          html: '',
          options: {},
          onDidReceiveMessage: jest.fn(() => ({ dispose: jest.fn() })),
          postMessage: jest.fn(),
        },
        onDidDispose: jest.fn(() => ({ dispose: jest.fn() })),
      };
      const searchProvider = registerWebviewViewProvider.mock.calls
        .filter(([viewId]) => viewId === 'rsx.expressions')
        .at(-1)?.[1] as
        | {
            resolveWebviewView(view: unknown): void;
            enableDebugHooksSelected(
              key?: string,
              anchorUri?: { fsPath: string; toString(): string },
            ): Promise<void>;
          }
        | undefined;
      searchProvider?.resolveWebviewView(searchView);

      await searchProvider?.enableDebugHooksSelected('customHooks', rsxUri);

      expect(searchView.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'addHookForm',
          relativePath: 'src/app/rsx-debug-change-hook.ts',
        }),
      );
    } finally {
      workspaceFolders = undefined;
      readFile.mockReset();
    }
  });

  it('enables and merges non-production debug change hooks from the expressions panel command', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    const rsxUri = createUri('/workspace/src/rules/shipping.expressions.rsx');
    const rsxText = [
      'expression: remoteAreaFeeRsx',
      '  model: { remoteArea: boolean }',
      '  remoteArea ? 14 : 0',
    ].join('\n');
    const files = new Map<string, string>([
      ['/workspace/rsx.config.json', JSON.stringify({ build: {} })],
      [rsxUri.fsPath, rsxText],
    ]);
    workspaceFolders = [{ name: 'workspace', uri: createUri('/workspace') }];
    findFiles.mockImplementation(async (pattern: string) =>
      pattern === '**/*.rsx' ? [rsxUri] : [],
    );
    showQuickPick.mockImplementation(async (items: Array<{ label: string }>) =>
      items.find((item) => item.label === 'Create new hook file'),
    );
    showInputBox.mockImplementation(
      async (options: { prompt?: string; value?: string }) => {
        if (options.prompt === 'Hook export name') {
          expect(options.value).toBe('remoteAreaFeeDebugChangeHook');
          return options.value;
        }
        return options.value;
      },
    );
    readFile.mockImplementation(async (uri: { fsPath: string }) => {
      const text = files.get(uri.fsPath);
      if (text === undefined) {
        throw new Error('ENOENT');
      }
      return new TextEncoder().encode(text);
    });
    writeFile.mockImplementation(
      async (uri: { fsPath: string }, bytes: Uint8Array) => {
        files.set(uri.fsPath, new TextDecoder().decode(bytes));
      },
    );

    try {
      activate(context as never);

      const searchProvider = registerWebviewViewProvider.mock.calls
        .filter(([viewId]) => viewId === 'rsx.expressions')
        .at(-1)?.[1] as
        | {
            enableDebugHooksSelected(
              key?: string,
              anchorUri?: { fsPath: string; toString(): string },
            ): Promise<void>;
            assignDebugHookForPanelKeys(
              action: { scope: 'group'; standardHook: 'breakpoint' },
              keys: readonly string[],
            ): Promise<void>;
          }
        | undefined;
      const expressionKey = `expression:${rsxUri.toString()}#remoteAreaFeeRsx`;
      await searchProvider?.enableDebugHooksSelected(expressionKey, rsxUri);
      expect(showQuickPick.mock.calls[0]?.[0]).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ label: 'Use module specifier' }),
        ]),
      );
      expect(showInputBox).not.toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'Hook module specifier to import in generated .rsx modules',
        }),
      );

      expect(
        JSON.parse(files.get('/workspace/rsx.config.json') ?? '{}'),
      ).toEqual({
        build: {
          debugChangeHooks: {
            remoteAreaFeeRsx: {
              group: {
                moduleSpecifier: '../rsx/remote-area-fee-debug-change-hook',
                exportName: 'remoteAreaFeeDebugChangeHook',
                enabled: true,
              },
            },
          },
        },
      });
      expect(
        files.get('/workspace/src/rsx/remote-area-fee-debug-change-hook.ts'),
      ).toContain('export const remoteAreaFeeDebugChangeHook: ChangeHook = (');
      expect(
        files.get('/workspace/src/rsx/remote-area-fee-debug-change-hook.ts'),
      ).toContain("import type { ChangeHook } from '@rs-x/expression-parser';");
      expect(
        files.get('/workspace/src/rsx/remote-area-fee-debug-change-hook.ts'),
      ).not.toContain('IRsxDebugHookInstance');
      expect(
        files.get('/workspace/src/rsx/remote-area-fee-debug-change-hook.ts'),
      ).not.toContain('RsxDebugChangeHook');
      expect(showInformationMessage).toHaveBeenCalledWith(
        'Enabled RS-X debug change hook remoteAreaFeeDebugChangeHook from ../rsx/remote-area-fee-debug-change-hook for expression default remoteAreaFeeRsx.',
      );

      await searchProvider?.assignDebugHookForPanelKeys(
        { scope: 'group', standardHook: 'breakpoint' },
        [expressionKey],
      );
      expect(
        JSON.parse(files.get('/workspace/rsx.config.json') ?? '{}').build
          .debugChangeHooks.remoteAreaFeeRsx.group,
      ).toEqual([
        {
          moduleSpecifier: '../rsx/remote-area-fee-debug-change-hook',
          exportName: 'remoteAreaFeeDebugChangeHook',
          enabled: true,
        },
        {
          moduleSpecifier: '../rsx/hooks/rsx-standard-debug-hooks',
          exportName: 'rsxBreakpointDebugHook',
          enabled: true,
          standardHook: 'breakpoint',
        },
      ]);
      expect(
        files.get('/workspace/src/rsx/hooks/rsx-standard-debug-hooks.ts'),
      ).toContain('export const rsxBreakpointDebugHook: ChangeHook = (');
      expect(
        files.get('/workspace/src/rsx/hooks/rsx-standard-debug-hooks.ts'),
      ).toContain("import type { ChangeHook } from '@rs-x/expression-parser';");
      expect(
        files.get('/workspace/src/rsx/hooks/rsx-standard-debug-hooks.ts'),
      ).not.toContain('RsxDebugChangeHook');
    } finally {
      workspaceFolders = undefined;
      findFiles.mockReset();
      showQuickPick.mockReset();
      showInputBox.mockReset();
      readFile.mockReset();
      writeFile.mockReset();
      showInformationMessage.mockReset();
    }
  });

  it('stores debug hook metadata in the nearest nested rsx config', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    const rsxUri = createUri(
      '/workspace/packages/shop/src/rules/shipping.expressions.rsx',
    );
    const rootConfigUri = createUri('/workspace/rsx.config.json');
    const nestedConfigUri = createUri(
      '/workspace/packages/shop/rsx.config.json',
    );
    const rsxText = [
      'expression: remoteAreaFeeRsx',
      '  model: { remoteArea: boolean }',
      '  remoteArea ? 14 : 0',
    ].join('\n');
    const files = new Map<string, string>([
      [rootConfigUri.fsPath, JSON.stringify({ build: {} })],
      [nestedConfigUri.fsPath, JSON.stringify({ build: { keep: true } })],
      [rsxUri.fsPath, rsxText],
    ]);
    workspaceFolders = [{ name: 'workspace', uri: createUri('/workspace') }];
    findFiles.mockImplementation(async (pattern: string) =>
      pattern === '**/*.rsx' ? [rsxUri] : [],
    );
    showQuickPick.mockImplementation(async (items: Array<{ label: string }>) =>
      items.find((item) => item.label === 'Create new hook file'),
    );
    showInputBox.mockImplementation(
      async (options: { prompt?: string; value?: string }) => options.value,
    );
    readFile.mockImplementation(async (uri: { fsPath: string }) => {
      const text = files.get(uri.fsPath);
      if (text === undefined) {
        throw new Error('ENOENT');
      }
      return new TextEncoder().encode(text);
    });
    writeFile.mockImplementation(
      async (uri: { fsPath: string }, bytes: Uint8Array) => {
        files.set(uri.fsPath, new TextDecoder().decode(bytes));
      },
    );

    try {
      activate(context as never);

      const searchProvider = registerWebviewViewProvider.mock.calls
        .filter(([viewId]) => viewId === 'rsx.expressions')
        .at(-1)?.[1] as
        | {
            enableDebugHooksSelected(
              key?: string,
              anchorUri?: { fsPath: string; toString(): string },
            ): Promise<void>;
          }
        | undefined;
      await searchProvider?.enableDebugHooksSelected(
        `expression:${rsxUri.toString()}#remoteAreaFeeRsx`,
        rsxUri,
      );

      const rootConfig = JSON.parse(files.get(rootConfigUri.fsPath) ?? '{}');
      const nestedConfig = JSON.parse(
        files.get(nestedConfigUri.fsPath) ?? '{}',
      );
      expect(rootConfig).toEqual({ build: {} });
      expect(nestedConfig.build.keep).toBe(true);
      expect(
        nestedConfig.build.debugChangeHooks.remoteAreaFeeRsx.group,
      ).toEqual({
        moduleSpecifier: '../rsx/remote-area-fee-debug-change-hook',
        exportName: 'remoteAreaFeeDebugChangeHook',
        enabled: true,
      });
      expect(
        files.get(
          '/workspace/packages/shop/src/rsx/remote-area-fee-debug-change-hook.ts',
        ),
      ).toContain('export const remoteAreaFeeDebugChangeHook: ChangeHook = (');
      expect(
        files.get(
          '/workspace/packages/shop/src/rsx/remote-area-fee-debug-change-hook.ts',
        ),
      ).toContain("import type { ChangeHook } from '@rs-x/expression-parser';");
      expect(
        files.get(
          '/workspace/packages/shop/src/rsx/remote-area-fee-debug-change-hook.ts',
        ),
      ).not.toContain('IRsxDebugHookInstance');
      expect(
        files.get(
          '/workspace/packages/shop/src/rsx/remote-area-fee-debug-change-hook.ts',
        ),
      ).not.toContain('RsxDebugChangeHook');
    } finally {
      workspaceFolders = undefined;
      findFiles.mockReset();
      showQuickPick.mockReset();
      showInputBox.mockReset();
      readFile.mockReset();
      writeFile.mockReset();
      showInformationMessage.mockReset();
    }
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

  it('offers rsx dot TypeScript completions for compatible expression model contracts', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    const rsxUri = createUri(
      '/workspace/src/rsx/expressions/math.expressions.rsx',
    );
    const rsxText = [
      'expression: aPlusB',
      '  model: { a: number; b: number }',
      '  a + b',
      '',
      'expression: cOnly',
      '  model: { c: number }',
      '  c',
      '',
    ].join('\n');
    workspaceFolders = [{ name: 'workspace', uri: createUri('/workspace') }];
    findFiles.mockImplementation(async (pattern: string) =>
      pattern === '**/*.rsx' ? [rsxUri] : [],
    );
    readFile.mockImplementation(async (uri: { fsPath: string }) => {
      if (uri.fsPath === rsxUri.fsPath) {
        return Buffer.from(rsxText, 'utf8');
      }
      throw new Error(`No mock file for ${uri.fsPath}`);
    });
    registerCompletionItemProvider.mockClear();

    try {
      activate(context as never);
      const provider = registerCompletionItemProvider.mock.calls.find(
        ([selector]) =>
          Array.isArray(selector) &&
          selector.some(
            (entry: { language?: string }) => entry.language === 'typescript',
          ),
      )?.[1] as
        | {
            provideCompletionItems(
              document: ReturnType<typeof createTextDocument>,
              position: { line: number; character: number },
            ): Promise<
              Array<{
                label: string;
                insertText?: string;
                additionalTextEdits?: Array<{ newText?: string }>;
              }>
            >;
          }
        | undefined;
      const document = createTextDocument(
        [
          'interface AB { a: number; b: number }',
          'function run(model: AB) {',
          '  const expr = rsx.',
          '}',
        ].join('\n'),
        { languageId: 'typescript', fsPath: '/workspace/src/app.ts' },
      );

      const completions = await provider?.provideCompletionItems(document, {
        line: 2,
        character: '  const expr = rsx.'.length,
      });

      expect(completions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            label: 'aPlusB',
            insertText: 'aPlusB(model)',
            filterText: 'rsx.aPlusB',
          }),
        ]),
      );
      expect(completions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            label: 'cOnly',
            insertText: 'cOnly(model)',
            filterText: 'rsx.cOnly',
          }),
        ]),
      );
      expect(
        completions?.find((completion) => completion.label === 'aPlusB')
          ?.additionalTextEdits?.[0]?.newText,
      ).toBe("import { aPlusB } from './rsx/expressions/math.expressions';\n");
    } finally {
      workspaceFolders = undefined;
      findFiles.mockReset();
      readFile.mockReset();
      registerCompletionItemProvider.mockClear();
    }
  });

  it('offers rsx dot TypeScript completions with a model placeholder when no candidate exists', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    const rsxUri = createUri(
      '/workspace/src/rsx/expressions/ab.expressions.rsx',
    );
    workspaceFolders = [{ name: 'workspace', uri: createUri('/workspace') }];
    findFiles.mockImplementation(async (pattern: string) =>
      pattern === '**/*.rsx' ? [rsxUri] : [],
    );
    readFile.mockImplementation(async (uri: { fsPath: string }) => {
      if (uri.fsPath === rsxUri.fsPath) {
        return Buffer.from(
          [
            'defaults:',
            "  model: import('../models/ab.model').AB",
            '',
            'expression: aPlusB',
            '  a + b',
            '',
          ].join('\n'),
          'utf8',
        );
      }
      throw new Error(`No mock file for ${uri.fsPath}`);
    });
    registerCompletionItemProvider.mockClear();

    try {
      activate(context as never);
      const provider = registerCompletionItemProvider.mock.calls.find(
        ([selector]) =>
          Array.isArray(selector) &&
          selector.some(
            (entry: { language?: string }) => entry.language === 'typescript',
          ),
      )?.[1] as
        | {
            provideCompletionItems(
              document: ReturnType<typeof createTextDocument>,
              position: { line: number; character: number },
            ): Promise<Array<{ label: string; insertText?: string }>>;
          }
        | undefined;
      const document = createTextDocument('const expr = rsx.', {
        languageId: 'typescript',
        fsPath: '/workspace/src/main.ts',
      });

      const completions = await provider?.provideCompletionItems(document, {
        line: 0,
        character: 'const expr = rsx.'.length,
      });

      expect(completions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            label: 'aPlusB',
            insertText: 'aPlusB(model)',
            filterText: 'rsx.aPlusB',
          }),
        ]),
      );
    } finally {
      workspaceFolders = undefined;
      findFiles.mockReset();
      readFile.mockReset();
      registerCompletionItemProvider.mockClear();
    }
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

  it('reports defaults model diagnostics for every expression in normal-sized module files', () => {
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
        '  model: {}',
        '',
        'expression: aPlusB',
        '  a + b',
        '',
        'expression: aMultiplyB',
        '  a * b',
      ].join('\n'),
    );
    openHandler(document);
    jest.runOnlyPendingTimers();
    jest.useRealTimers();

    const diagnostics = diagnosticCollection.set.mock.calls.at(-1)?.[1] as
      | Array<{ message: string }>
      | undefined;
    const unknownModelDiagnostics = (diagnostics ?? []).filter((diagnostic) =>
      /Cannot find name '(?:a|b)'/u.test(diagnostic.message),
    );
    expect(
      unknownModelDiagnostics.map((diagnostic) => diagnostic.message),
    ).toEqual([
      "Cannot find name 'a'.",
      "Cannot find name 'b'.",
      "Cannot find name 'a'.",
      "Cannot find name 'b'.",
    ]);
  });

  it('refreshes open rsx diagnostics when an imported model file is saved', () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };

    activate(context as never);

    const diagnosticCollection = createDiagnosticCollection.mock.results.at(-1)
      ?.value as { set: jest.Mock };
    const saveHandler = onDidSaveTextDocument.mock.calls.at(-1)?.[0] as (
      document: unknown,
    ) => void;
    const importedRsxDocument = createTextDocument(
      [
        'defaults:',
        "  model: import('../models/ab.model').IAbModel",
        '',
        'expression: aPlusB',
        '  a + b',
      ].join('\n'),
      { fsPath: '/workspace/src/rsx/expressions/ab.expressions.rsx' },
    );
    const unrelatedRsxDocument = createTextDocument(
      [
        'defaults:',
        "  model: import('../models/other.model').IOtherModel",
        '',
        'expression: otherRsx',
        '  value',
      ].join('\n'),
      { fsPath: '/workspace/src/rsx/expressions/other.expressions.rsx' },
    );
    const modelDocument = createTextDocument('export interface IAbModel {}', {
      languageId: 'typescript',
      fsPath: '/workspace/src/rsx/models/ab.model.ts',
    });
    try {
      textDocuments.push(importedRsxDocument, unrelatedRsxDocument);
      diagnosticCollection.set.mockClear();

      jest.useFakeTimers();
      saveHandler(modelDocument);
      jest.runOnlyPendingTimers();
      jest.useRealTimers();

      expect(
        diagnosticCollection.set.mock.calls.map(
          ([uri]: [{ fsPath: string }, unknown]) => uri.fsPath,
        ),
      ).toEqual(['/workspace/src/rsx/expressions/ab.expressions.rsx']);
    } finally {
      jest.useRealTimers();
      textDocuments.splice(0, textDocuments.length);
    }
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
    const largeModelType = `{ value: number; ${Array.from(
      { length: 40 },
      (_, index) => `padding${index}: number`,
    ).join('; ')} }`;
    const expressionBlocks = Array.from({ length: 60 }, (_, index) =>
      [
        `expression: expression${index}Rsx`,
        `  model: ${largeModelType}`,
        index === 1 ? '  value.toUpperCase()' : '  value + 1',
      ].join('\n'),
    );
    const document = createTextDocument(expressionBlocks.join('\n\n'));
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

  it('reports a required body diagnostic for generated expression placeholders', () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };

    activate(context as never);

    const diagnosticCollection = createDiagnosticCollection.mock.results.at(-1)
      ?.value as { set: jest.Mock };
    const openHandler = onDidOpenTextDocument.mock.calls.at(-1)?.[0] as (
      document: unknown,
    ) => void;
    const text = [
      'defaults:',
      '  model: { a: number }',
      '',
      'expression: aPlusB',
      '  /* expression body required */',
    ].join('\n');
    const document = createTextDocument(text, {
      fsPath: '/workspace/src/rules/a-plus-b.expressions.rsx',
    });

    jest.useFakeTimers();
    activeTextEditor = {
      document,
      selection: {
        active: document.positionAt(text.indexOf('expression body required')),
      },
    };
    openHandler(document);
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    activeTextEditor = null;

    const diagnostics = diagnosticCollection.set.mock.calls.at(-1)?.[1] as
      | Array<{ message: string }>
      | undefined;
    expect(diagnostics ?? []).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Expression body is required.',
        }),
      ]),
    );
  });

  it('shows expression dependencies in the expressions tree', async () => {
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

    findFiles.mockResolvedValue([modelUri, derivedUri]);
    readFile.mockImplementation((uri: { fsPath: string }) =>
      Buffer.from(fixtureText.get(uri.fsPath) ?? '', 'utf8'),
    );

    activate(context as never);

    const provider = getRegisteredExpressionsProvider() as {
      getChildren(element?: unknown): Promise<unknown[]>;
      getTreeItem(element: unknown): {
        label: string;
        collapsibleState: number;
        description?: string;
        command?: unknown;
        iconPath?: { id?: string; color?: { id?: string } };
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
    expect(rootItem.iconPath).toEqual(
      expect.objectContaining({
        id: 'symbol-namespace',
        color: expect.objectContaining({ id: 'charts.blue' }),
      }),
    );
    const modelsRootItem = provider.getTreeItem(modelsRoot);
    expect(modelsRootItem.description).toBe('8 models');
    expect(modelsRootItem.iconPath).toEqual(
      expect.objectContaining({
        id: 'database',
        color: expect.objectContaining({ id: 'charts.purple' }),
      }),
    );

    const models = (await provider.getChildren(modelsRoot)) as Array<{
      kind: string;
      label: string;
      uri?: { fsPath: string };
      start?: number;
      end?: number;
      fields?: unknown[];
      expressions: unknown[];
    }>;
    expect(models.map((model) => model.label)).toEqual(
      expect.arrayContaining([
        'ShippingQuoteModelContract',
        'ImportedCompositionModel',
      ]),
    );
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
    expect(valueModelItem.iconPath).toEqual(
      expect.objectContaining({
        id: 'symbol-interface',
        color: expect.objectContaining({ id: 'descriptionForeground' }),
      }),
    );
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

    expect(
      models.filter((model) => model.label === 'ShippingQuoteModelContract'),
    ).toHaveLength(1);
    const valueFieldItem = provider.getTreeItem(valueFields[0]);
    expect(valueFieldItem.description).toBe('number · 4 expressions');
    expect(valueFieldItem.iconPath).toEqual(
      expect.objectContaining({
        id: 'symbol-field',
        color: expect.objectContaining({ id: 'charts.orange' }),
      }),
    );
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
    const valueExpressionUseItem = provider.getTreeItem(valueExpressionUses[0]);
    expect(valueExpressionUseItem.iconPath).toEqual(
      expect.objectContaining({
        id: 'symbol-function',
        color: expect.objectContaining({ id: 'charts.green' }),
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
    const linesFieldUses = (await provider.getChildren(linesField)) as Array<{
      kind?: string;
      expression: { exportName: string };
      start: number;
      end: number;
    }>;
    const lineProjectionLinesUse = linesFieldUses
      .filter((use) => use.kind === 'modelFieldExpression')
      .find((use) => use.expression.exportName === 'lineProjectionRsx');
    const lineProjectionText = fixtureText.get(derivedUri.fsPath) ?? '';
    const linesReceiverOffset = lineProjectionText.indexOf('lines.map');
    expect(lineProjectionLinesUse).toEqual(
      expect.objectContaining({
        start: linesReceiverOffset,
        end: linesReceiverOffset + 'lines'.length,
      }),
    );
    expect(
      lineProjectionText.slice(
        lineProjectionLinesUse?.start,
        lineProjectionLinesUse?.end,
      ),
    ).toBe('lines');
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
    expect(grandTotalItem.iconPath).toEqual(
      expect.objectContaining({
        id: 'symbol-function',
        color: expect.objectContaining({ id: 'charts.green' }),
      }),
    );
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
    expect(dependencyItem.iconPath).toEqual(
      expect.objectContaining({
        id: 'references',
        color: expect.objectContaining({ id: 'charts.blue' }),
      }),
    );
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
    const sameFileTotalDependencies = (await provider.getChildren(
      sameFileTotal,
    )) as Array<{
      edge: { targetExportName: string; identifier: string; matchKind: string };
    }>;
    expect(
      sameFileTotalDependencies.map((dependency) => dependency.edge),
    ).toEqual([
      expect.objectContaining({
        targetExportName: 'subtotalRsx',
        identifier: 'subtotal',
        matchKind: 'exportValueName',
      }),
    ]);

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
    const discountLabelDependencies = (await provider.getChildren(
      discountLabel,
    )) as Array<{
      edge: { targetExportName: string; identifier: string; matchKind: string };
    }>;
    expect(
      discountLabelDependencies.map((dependency) => dependency.edge),
    ).toEqual([
      expect.objectContaining({
        targetExportName: 'couponRsx',
        identifier: 'coupon',
        matchKind: 'exportValueName',
      }),
      expect.objectContaining({
        targetExportName: 'customerTierRsx',
        identifier: 'customerTier',
        matchKind: 'exportValueName',
      }),
    ]);

    const searchCommand = registerCommand.mock.calls
      .filter(([command]) => command === 'rsx.expressions.search')
      .at(-1)?.[1] as (() => Promise<void>) | undefined;
    await searchCommand?.();
    expect(executeCommand).toHaveBeenCalledWith('workbench.view.extension.rsx');

    const currentSearchViewProvider = registerWebviewViewProvider.mock.calls
      .filter(([viewId]) => viewId === 'rsx.expressions')
      .at(-1)?.[1] as
      | {
          resolveWebviewView(view: unknown): void;
        }
      | undefined;
    let searchMessageHandler:
      | ((message: {
          type?: string;
          query?: string;
          uri?: string;
          start?: number;
          end?: number;
        }) => Promise<void>)
      | undefined;
    const searchView = {
      webview: {
        html: '',
        options: {},
        onDidReceiveMessage: jest.fn((handler) => {
          searchMessageHandler = handler;
          return { dispose: jest.fn() };
        }),
        postMessage: jest.fn(),
      },
      onDidDispose: jest.fn(() => ({ dispose: jest.fn() })),
    };
    currentSearchViewProvider?.resolveWebviewView(searchView);
    expect(searchView.webview.html).toContain('id="query"');
    expect(searchView.webview.html).toContain("addEventListener('input'");
    expect(searchView.webview.html).toContain('class="treeToggle"');
    expect(searchView.webview.html).toContain('const expandedKeys');
    expect(searchView.webview.html).toContain('let currentTree');
    expect(searchView.webview.html).toContain('vscode.getState');
    expect(searchView.webview.html).toContain('vscode.setState');
    expect(searchView.webview.html).toContain("type: 'ready'");
    expect(searchView.webview.html).toContain("type: 'restoreSelection'");
    expect(searchView.webview.html).toContain(
      'function restoreEditorSelection()',
    );
    expect(searchView.webview.html).toContain('function getSelectedLocation()');
    expect(searchView.webview.html).toContain('data-expanded="');
    expect(searchView.webview.html).toContain('hasChildren && isExpanded');
    expect(searchView.webview.html).toContain(
      'const isExpanded = expandedKeys.has(key);',
    );
    expect(searchView.webview.html).not.toContain('hasHookChild');
    expect(searchView.webview.html).toContain(
      'grid-template-columns: 18px 18px minmax(0, 1fr) auto;',
    );
    expect(searchView.webview.html).toContain(
      'grid-template-rows: auto auto auto auto;',
    );
    expect(searchView.webview.html).toContain('align-content: start;');
    expect(searchView.webview.html).toContain('#hookPickerHost {');
    expect(searchView.webview.html).toContain('min-height: max-content;');
    expect(searchView.webview.html).toContain('overflow: visible;');
    expect(searchView.webview.html).toContain('justify-self: end;');
    expect(searchView.webview.html).toContain('cursor: pointer;');
    expect(searchView.webview.html).toContain(
      "const canPreview = node.kind === 'expression' || node.kind === 'instanceGroup';",
    );
    expect(searchView.webview.html).toContain(
      "const canTest = node.kind === 'expression' || node.kind === 'field' || node.kind === 'instanceGroup';",
    );
    expect(searchView.webview.html).not.toContain(
      "node.kind === 'model' || node.kind === 'field'",
    );
    expect(searchView.webview.html).toContain('data-vscode-context');
    expect(searchView.webview.html).toContain('preventDefaultContextMenuItems');
    expect(searchView.webview.html).toContain("addEventListener('contextmenu'");
    expect(searchView.webview.html).toContain(
      'function hasRsxWebviewContextMenu',
    );
    expect(searchView.webview.html).toContain('event.stopPropagation();');
    expect(searchView.webview.html).toContain(
      "hookPickerState?.mode !== 'addExpression'",
    );
    expect(searchView.webview.html).toContain(
      'isEditableContextMenuTarget(target) || hasRsxWebviewContextMenu(target)',
    );
    expect(searchView.webview.html).toContain('{ capture: true }');
    expect(searchView.webview.html).not.toContain(
      "addEventListener('pointerdown'",
    );
    expect(searchView.webview.html).toContain("type: 'select'");
    expect(searchView.webview.html).toContain('data-action="preview"');
    expect(searchView.webview.html).toContain('data-action="test"');
    expect(searchView.webview.html).toContain('id="hookPickerHost"');
    expect(searchView.webview.html).toContain('assignedHooksPicker');
    expect(searchView.webview.html).toContain('addHookForm');
    expect(searchView.webview.html).toContain('addExpressionForm');
    expect(searchView.webview.html).toContain('modelFileSelected');
    expect(searchView.webview.html).toContain("type: 'createCustomHook'");
    expect(searchView.webview.html).toContain("type: 'createExpression'");
    expect(searchView.webview.html).toContain("type: 'selectModelFile'");
    expect(searchView.webview.html).toContain(
      'data-hook-form-field="exportName"',
    );
    expect(searchView.webview.html).toContain(
      'data-expression-form-field="expressionName"',
    );
    expect(searchView.webview.html).toContain('hookFormInlineField');
    expect(searchView.webview.html).toContain(
      'const lockExpressionFile = message.lockExpressionFile === true;',
    );
    expect(searchView.webview.html).toContain('lockExpressionFile ?');
    expect(searchView.webview.html).toContain('.expressionPicker {');
    expect(searchView.webview.html).toContain(
      '<section class="expressionPicker" role="dialog" aria-label="Add expression">',
    );
    expect(searchView.webview.html).not.toContain(
      '<section class="hookPicker expressionPicker"',
    );
    expect(searchView.webview.html).toContain('display: flex;');
    expect(searchView.webview.html).toContain('flex-direction: column;');
    expect(searchView.webview.html).toContain('height: fit-content;');
    expect(searchView.webview.html).toContain('min-height: max-content;');
    expect(searchView.webview.html).toContain('max-height: none !important;');
    expect(searchView.webview.html).toContain(
      'overflow-y: visible !important;',
    );
    expect(searchView.webview.html).toContain(
      '.expressionPicker .hookFormFields {',
    );
    expect(searchView.webview.html).toContain('grid-template-columns: 1fr;');
    expect(searchView.webview.html).toContain('>Browse</button>');
    expect(searchView.webview.html).not.toContain(
      'Select model file...</button>',
    );
    expect(searchView.webview.html).toContain(
      'data-hook-picker-action="createHook"',
    );
    expect(searchView.webview.html).toContain(
      'data-hook-picker-action="createExpression"',
    );
    expect(searchView.webview.html).toContain(
      'data-hook-picker-action="selectModelFile"',
    );
    expect(searchView.webview.html).toContain('contracts.length === 1');
    expect(searchView.webview.html).toContain(
      "String(message.file.contracts[0] || '')",
    );
    expect(searchView.webview.html).toContain(
      'data-expression-form-field="shareModel"',
    );
    expect(searchView.webview.html).toContain('relativePath: existingFilePath');
    expect(searchView.webview.html).toContain('expandAncestorsForKey');
    expect(searchView.webview.html).not.toContain(
      'relativePath: existingFilePath || [directory, fileName]',
    );
    expect(searchView.webview.html).toContain("type: 'applyAssignedHooks'");
    expect(searchView.webview.html).toContain('positionHookPicker');
    expect(searchView.webview.html).toContain(
      'data-hook-picker-action="apply"',
    );
    expect(searchView.webview.html).toContain('rsxWebviewHookCanUnassignAll');
    expect(searchView.webview.html).toContain('rsxWebviewCustomHookCanDelete');
    expect(searchView.webview.html).toContain(
      'function getCommandActionKeyFromEventTarget',
    );
    expect(searchView.webview.html).toContain(
      'function getCommandActionKeyForVisualKey',
    );
    expect(searchView.webview.html).toContain(
      'function collectExpressionCommandKeysForTreeNode',
    );
    expect(searchView.webview.html).toContain(
      "node.kind === 'instance' || node.kind === 'file'",
    );
    expect(searchView.webview.html).toContain('data-command-key="');
    expect(searchView.webview.html).toContain('data-expression-key');
    expect(searchView.webview.html).toContain('data-drag-visual-key');
    expect(searchView.webview.html).toContain('activeDropFeedbackTarget');
    expect(searchView.webview.html).toContain('function setDropFeedbackTarget');
    expect(searchView.webview.html).toContain(
      'outline: 2px solid var(--vscode-focusBorder);',
    );
    expect(searchView.webview.html).toContain('.treeRow.dropTarget::before');
    expect(searchView.webview.html).toContain('rsxExpressionOptionGroup');
    expect(searchView.webview.html).toContain('rsxWebviewOptionCanDeleteAll');
    expect(searchView.webview.html).toContain('function isDeletableTreeNode');
    expect(searchView.webview.html).toContain("type: 'deleteSelected'");
    expect(searchView.webview.html).toContain("event.key === 'Delete'");
    expect(searchView.webview.html).toContain(
      "vscode.postMessage({ type: 'select', key: actionKey, visualKey });",
    );
    expect(searchView.webview.html).toContain(
      'const anchorKey = String(message.anchorKey ?? key);',
    );
    expect(searchView.webview.html).toContain(
      "return 'rsxExpressionHookAssignment';",
    );
    expect(searchView.webview.html).toContain("return 'rsxExpressionFile';");
    expect(searchView.webview.html).toContain(
      "String(key).endsWith(':expressions:definitions')",
    );
    expect(searchView.webview.html).toContain(
      "rsxWebviewHookEnabled: node.hookState === 'enabled'",
    );
    expect(searchView.webview.html).toContain(
      "rsxWebviewHookDisabled: node.hookState === 'disabled'",
    );
    expect(searchView.webview.html).toContain(
      'key: commandKey,\n        visualKey,\n        uri: button.dataset.uri,',
    );
    expect(searchView.webview.html).not.toContain(
      'data-action="enableDebugHooks"',
    );
    expect(searchView.webview.html).not.toContain(
      'data-action="enableConfiguredDebugHooks"',
    );
    expect(searchView.webview.html).not.toContain(
      'data-action="disableDebugHooks"',
    );
    expect(searchView.webview.html).not.toContain(
      'data-action="deleteDebugHooks"',
    );
    expect(searchView.webview.html).not.toContain('renderDebugActionIcon');
    expect(searchView.webview.html).not.toContain('hookSwitch');
    expect(searchView.webview.html).not.toContain('hookDisabledText');
    expect(searchView.webview.html).toContain('hookDisabledRow');
    expect(searchView.webview.html).toContain('class="treeRoot"');
    expect(searchView.webview.html).toContain('data-root-key="');
    expect(searchView.webview.html).toContain('function selectNode(key)');
    expect(searchView.webview.html).toContain(
      'vscode-list-activeSelectionBackground',
    );
    expect(searchView.webview.html).toContain('--rsx-selected-fg:');
    expect(searchView.webview.html).toContain('--rsx-selected-bg:');
    expect(searchView.webview.html).toContain('--rsx-selected-border:');
    expect(searchView.webview.html).toContain(
      '.treeNode[data-selected="true"] > .treeRow',
    );
    expect(searchView.webview.html).toContain('color: var(--rsx-selected-fg);');
    expect(searchView.webview.html).toContain(
      'background: var(--rsx-selected-bg);',
    );
    expect(searchView.webview.html).toContain(
      'outline: 1px solid var(--rsx-selected-border);',
    );
    expect(searchView.webview.html).toContain('outline-offset: 1px;');
    expect(searchView.webview.html).toContain('padding: 0 4px;');
    expect(searchView.webview.html).not.toContain(
      'outline-offset: -1px;\n      background: var(--rsx-selected-bg);',
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    const initialPanelMessage = searchView.webview.postMessage.mock.calls.at(
      -1,
    )?.[0] as
      | {
          type?: string;
          query?: string;
          mode?: string;
          tree?: Array<{
            kind: string;
            label: string;
            children?: unknown[];
          }>;
        }
      | undefined;
    expect(initialPanelMessage).toEqual(
      expect.objectContaining({
        type: 'results',
        query: '',
        mode: 'tree',
      }),
    );
    expect(initialPanelMessage?.tree?.map((node) => node.label)).toEqual([
      'Expressions',
      'Models',
    ]);
    expect(initialPanelMessage?.tree?.[0]?.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Definitions' }),
        expect.objectContaining({ label: 'Instances' }),
        expect.objectContaining({ label: 'Eager' }),
        expect.objectContaining({ label: 'Lazy' }),
        expect.objectContaining({ label: 'Compiled' }),
        expect.objectContaining({ label: 'Preparsed' }),
      ]),
    );
    expect(initialPanelMessage?.tree?.[0]?.children).not.toContainEqual(
      expect.objectContaining({ label: 'Models' }),
    );
    expect(JSON.stringify(initialPanelMessage?.tree)).toContain('subtotalRsx');
    expect(JSON.stringify(initialPanelMessage?.tree)).toContain('subtotal');

    searchView.webview.postMessage.mockClear();
    await searchMessageHandler?.({ type: 'ready', query: '' });
    const restoredPanelMessage = searchView.webview.postMessage.mock.calls.at(
      -1,
    )?.[0] as
      | {
          type?: string;
          query?: string;
          mode?: string;
          tree?: Array<{
            label: string;
          }>;
        }
      | undefined;
    expect(restoredPanelMessage).toEqual(
      expect.objectContaining({
        type: 'results',
        query: '',
        mode: 'tree',
      }),
    );
    expect(restoredPanelMessage?.tree?.map((node) => node.label)).toEqual([
      'Expressions',
      'Models',
    ]);

    await searchMessageHandler?.({ type: 'search', query: 'subtotal' });
    const liveSearchMessage = searchView.webview.postMessage.mock.calls.at(
      -1,
    )?.[0] as
      | {
          type?: string;
          query?: string;
          mode?: string;
          results?: Array<{
            kind: string;
            key: string;
            label: string;
            description?: string;
            uri: string;
            start: number;
            end: number;
          }>;
        }
      | undefined;
    expect(liveSearchMessage).toEqual(
      expect.objectContaining({
        type: 'results',
        query: 'subtotal',
        mode: 'search',
      }),
    );
    expect(liveSearchMessage?.results?.map((result) => result.kind)).toEqual(
      expect.arrayContaining(['expression', 'field']),
    );
    for (const result of liveSearchMessage?.results ?? []) {
      for (const text of [result.label, result.description]) {
        if (!text) {
          continue;
        }
        expect(text).not.toMatch(
          /(?:^|[\s·])(?:\.{1,2}[\\/]|[A-Za-z]:[\\/]|\/|(?:src|app|rules|domain|packages)[\\/])/u,
        );
        expect(text).not.toMatch(/\.[cm]?[tj]sx?:\d+/u);
        expect(text).not.toContain(' from ./');
      }
    }
    expect(
      liveSearchMessage?.results?.some(
        (result) =>
          result.kind === 'expression' && result.label === 'subtotalRsx',
      ),
    ).toBe(true);
    const subtotalSearchResult = liveSearchMessage?.results?.find(
      (result) =>
        result.kind === 'expression' && result.label === 'subtotalRsx',
    );
    const searchDocument = createTextDocument(
      fixtureText.get(derivedUri.fsPath) ?? '',
      { fsPath: derivedUri.fsPath },
    );
    const searchEditor = {
      document: searchDocument,
      revealRange: jest.fn(),
      setDecorations: jest.fn(),
      selection: undefined,
    };
    visibleTextEditors.length = 0;
    openTextDocument.mockResolvedValueOnce(searchDocument);
    showTextDocument.mockResolvedValueOnce(searchEditor);
    const emptyPanelOpenGroup = { viewColumn: 1, tabs: [] };
    tabGroupsAll = [emptyPanelOpenGroup, { viewColumn: 2, tabs: [{}] }];
    tabGroupsClose.mockClear();

    await searchMessageHandler?.({
      type: 'open',
      uri: subtotalSearchResult?.uri,
      start: subtotalSearchResult?.start,
      end: subtotalSearchResult?.end,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(showTextDocument).toHaveBeenCalledWith(
      searchDocument,
      expect.objectContaining({
        viewColumn: 1,
        preview: true,
      }),
    );
    expect(tabGroupsClose).toHaveBeenCalledWith([emptyPanelOpenGroup], true);
    expect(searchEditor.setDecorations).toHaveBeenCalledWith(
      expect.anything(),
      [expect.anything()],
    );

    openTextDocument.mockClear();
    showTextDocument.mockClear();
    searchEditor.revealRange.mockClear();
    searchEditor.setDecorations.mockClear();
    visibleTextEditors.length = 0;
    openTextDocument.mockResolvedValueOnce(searchDocument);
    showTextDocument.mockResolvedValueOnce(searchEditor);

    await searchMessageHandler?.({
      type: 'restoreSelection',
      key: subtotalSearchResult?.key,
      uri: subtotalSearchResult?.uri,
      start: subtotalSearchResult?.start,
      end: subtotalSearchResult?.end,
    });

    expect(showTextDocument).toHaveBeenCalledWith(
      searchDocument,
      expect.objectContaining({
        viewColumn: 1,
        preview: true,
      }),
    );
    expect(searchEditor.selection).toEqual(
      expect.objectContaining({
        start: searchDocument.positionAt(subtotalSearchResult?.start ?? 0),
        end: searchDocument.positionAt(subtotalSearchResult?.start ?? 0),
      }),
    );
    expect(searchEditor.setDecorations).toHaveBeenCalledWith(
      expect.anything(),
      [
        expect.objectContaining({
          start: searchDocument.positionAt(subtotalSearchResult?.start ?? 0),
          end: searchDocument.positionAt(subtotalSearchResult?.end ?? 0),
        }),
      ],
    );
    tabGroupsAll = [];

    provider.setSearchQuery('subtotal');
    const searchResults = (await provider.getChildren()) as Array<{
      kind: string;
      target: {
        kind: string;
        exportName?: string;
        label?: string;
        path?: string[];
      };
    }>;
    expect(
      searchResults.every((result) => result.kind === 'searchResult'),
    ).toBe(true);
    expect(searchResults.map((result) => result.target.kind)).toEqual(
      expect.arrayContaining(['expression', 'modelField']),
    );
    expect(
      searchResults.some(
        (result) =>
          result.target.kind === 'expression' &&
          result.target.exportName === 'subtotalRsx',
      ),
    ).toBe(true);
    expect(
      searchResults.some(
        (result) =>
          result.target.kind === 'modelField' &&
          result.target.path?.join('.') === 'subtotal',
      ),
    ).toBe(true);
    const searchExpressionItem = provider.getTreeItem(
      searchResults.find((result) => result.target.kind === 'expression'),
    );
    expect(searchExpressionItem.collapsibleState).toBe(0);
    expect(searchExpressionItem.description).toContain('expression');
    const searchFieldItem = provider.getTreeItem(
      searchResults.find((result) => result.target.kind === 'modelField'),
    );
    expect(searchFieldItem.description).toContain('field');

    provider.setSearchQuery('');
    await expect(provider.getChildren()).resolves.toHaveLength(2);
  });

  it('keeps panel full-text search results anchored to the matched text', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    const uri = createUri('/workspace/src/rules/shipping.expressions.rsx');
    const text = [
      'expression: discountLabelRsx',
      '  model: { coupon: string; customerTier: string; remoteArea: boolean }',
      "  coupon === 'VIP25' ? 'Promo code discount applied' : 'No active discount'",
      '',
      'expression: remoteAreaFeeRsx',
      '  model: { remoteArea: boolean }',
      '  remoteArea ? 14 : 0',
      '',
      'expression: handlingFeeRsx',
      '  model: { signatureFee: number; remoteAreaFee: number }',
      '  signatureFee + remoteAreaFee',
      '',
      'expression: riskBadgeRsx',
      '  model: { remoteArea: boolean }',
      "  remoteArea ? 'Remote area surcharge active' : 'ok'",
    ].join('\n');

    findFiles.mockResolvedValueOnce([uri]);
    readFile.mockImplementation((target: { fsPath: string }) =>
      Buffer.from(target.fsPath === uri.fsPath ? text : '', 'utf8'),
    );

    activate(context as never);

    const provider = getRegisteredExpressionsProvider() as {
      getChildren(element?: unknown): Promise<unknown[]>;
      setSearchQuery(query: string): void;
    };
    provider.setSearchQuery('remo');
    const results = (await provider.getChildren()) as Array<{
      matchStart: number;
      matchEnd: number;
      target: {
        kind: string;
        exportName?: string;
        label?: string;
        path?: readonly string[];
      };
    }>;
    const labels = results.map(
      (result) =>
        result.target.exportName ??
        result.target.path?.join('.') ??
        result.target.label,
    );

    expect(labels).toContain('remoteAreaFeeRsx');
    expect(labels).toContain('remoteArea');
    expect(labels).toContain('discountLabelRsx');
    expect(labels).toContain('handlingFeeRsx');
    expect(labels).toContain('riskBadgeRsx');
    expect(results.map((result) => result.target.kind)).not.toContain('model');
    expect(labels.slice(0, 2)).toContain('remoteAreaFeeRsx');

    const discountLabel = results.find(
      (result) => result.target.exportName === 'discountLabelRsx',
    );
    expect(text.slice(discountLabel?.matchStart, discountLabel?.matchEnd)).toBe(
      'remo',
    );
    const handlingFee = results.find(
      (result) => result.target.exportName === 'handlingFeeRsx',
    );
    expect(text.slice(handlingFee?.matchStart, handlingFee?.matchEnd)).toBe(
      'remo',
    );
    const riskBadge = results.find(
      (result) => result.target.exportName === 'riskBadgeRsx',
    );
    expect(text.slice(riskBadge?.matchStart, riskBadge?.matchEnd)).toBe('remo');
  });

  it('adds expression instances to the panel tree and opens the call site', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    workspaceFolders = [{ name: 'workspace', uri: createUri('/workspace') }];
    const rsxUri = createUri('/workspace/src/rules/shipping.expressions.rsx');
    const consumerUri = createUri('/workspace/src/app/shipping.ts');
    const configUri = createUri('/workspace/rsx.config.json');
    const rsxText = [
      'expression: remoteAreaFeeRsx',
      '  model: { remoteArea: boolean }',
      '  remoteArea ? 14 : 0',
    ].join('\n');
    const consumerText = [
      "import { remoteAreaFeeRsx } from '../rules/shipping.expressions.rsx';",
      "const fee = remoteAreaFeeRsx({ remoteArea: true }, undefined, 'manual-instance');",
    ].join('\n');
    const configText = JSON.stringify({
      build: {
        debugChangeHooks: {
          remoteAreaFeeRsx: {
            group: {
              moduleSpecifier: './src/rsx-debug-change-hook',
              exportName: 'rsxDebugChangeHook',
              enabled: true,
            },
            instances: {
              'manual-instance': {
                moduleSpecifier: './src/rsx-instance-debug-change-hook',
                exportName: 'rsxInstanceDebugChangeHook',
                enabled: true,
              },
            },
          },
        },
      },
    });

    const files = new Map<string, string>([
      [rsxUri.fsPath, rsxText],
      [consumerUri.fsPath, consumerText],
      [configUri.fsPath, configText],
    ]);
    findFiles.mockImplementation(async (pattern: string) => {
      if (pattern === '**/*.rsx') {
        return [rsxUri];
      }
      return [consumerUri];
    });
    readFile.mockImplementation((target: { fsPath: string }) => {
      const text = files.get(target.fsPath);
      if (text === undefined) {
        throw new Error(`No mock file for ${target.fsPath}`);
      }
      return Buffer.from(text, 'utf8');
    });

    try {
      activate(context as never);

      const provider = getRegisteredExpressionsProvider() as {
        search(query: string): Promise<
          Array<{
            matchUri: { toString(): string };
            matchStart: number;
            matchEnd: number;
            target: {
              kind: string;
              expression?: { exportName: string };
              relativePath?: string;
            };
            description?: string;
          }>
        >;
        getPanelTree(): Promise<
          Array<{
            key: string;
            label: string;
            description?: string;
            hookState?: string;
            hookLabel?: string;
            hookModuleSpecifier?: string;
            hookExportName?: string;
            children?: Array<{
              key?: string;
              actionKey?: string;
              label: string;
              kind?: string;
              description?: string;
              uri?: string;
              hookState?: string;
              hookLabel?: string;
              children?: Array<{
                kind: string;
                actionKey?: string;
                uri: string;
                start: number;
                end: number;
                label?: string;
                description?: string;
                hookState?: string;
                hookLabel?: string;
              }>;
            }>;
          }>
        >;
        getTreeItem(element: unknown): {
          label?: string;
          description?: string | boolean;
        };
      };
      const tree = await provider.getPanelTree();
      const assertNoVisiblePathText = (
        nodes: readonly Array<{
          label?: string;
          description?: string;
          children?: readonly {
            label?: string;
            description?: string;
            children?: readonly unknown[];
          }[];
        }>,
      ): void => {
        for (const node of nodes) {
          for (const text of [node.label, node.description]) {
            if (!text) {
              continue;
            }
            expect(text).not.toMatch(
              /(?:^|[\s·])(?:\.{1,2}[\\/]|[A-Za-z]:[\\/]|\/|(?:src|app|rules|domain|packages)[\\/])/u,
            );
            expect(text).not.toMatch(/[\\/].*\.[cm]?[tj]sx?:\d+/u);
            expect(text).not.toMatch(/\.rsx:\d+/u);
            expect(text).not.toContain(' from ./');
          }
          assertNoVisiblePathText(
            (node.children ?? []) as Parameters<
              typeof assertNoVisiblePathText
            >[0],
          );
        }
      };
      assertNoVisiblePathText(tree);
      const definitionsRoot = tree
        .find((node) => node.key === 'root:expressions')
        ?.children?.find((node) => node.label === 'Definitions');
      const definitionsHooks = definitionsRoot?.children?.[0];
      const definitionExpression = definitionsRoot?.children
        ?.find((node) => node.label === 'shipping.expressions.rsx')
        ?.children?.find((node) => node.label === 'remoteAreaFeeRsx');
      const eagerExpression = tree
        .find((node) => node.key === 'root:expressions')
        ?.children?.find((node) => node.label === 'Eager')
        ?.children?.find((node) => node.label === 'remoteAreaFeeRsx');
      const instancesRoot = tree
        .find((node) => node.key === 'root:expressions')
        ?.children?.find((node) => node.label === 'Instances');
      const instancesHooks = instancesRoot?.children?.[0];
      const group = instancesRoot?.children?.find(
        (node) =>
          node.label === 'Definition' &&
          node.description?.startsWith('remoteAreaFeeRsx'),
      );
      const instance = group?.children?.[0];

      expect(tree.map((node) => node.key)).not.toContain('root:hooks');
      expect(definitionsHooks).toEqual(
        expect.objectContaining({
          key: 'hooks:definitions',
          label: 'Assigned hooks',
          kind: 'hookGroup',
          description: '3 hooks',
          canUnassignHookAll: true,
        }),
      );
      expect(definitionsHooks?.children?.slice(0, 2)).toEqual([
        expect.objectContaining({
          kind: 'hookConfig',
          label: 'Breakpoint',
          standardHook: 'breakpoint',
          canDeleteHook: false,
        }),
        expect.objectContaining({
          kind: 'hookConfig',
          label: 'Log',
          standardHook: 'log',
          canDeleteHook: false,
        }),
      ]);
      const definitionConfiguredHook = definitionsHooks?.children?.find(
        (node) => node.label === 'rsxDebugChangeHook',
      );
      expect(definitionConfiguredHook).toEqual(
        expect.objectContaining({
          kind: 'hookConfig',
          label: 'rsxDebugChangeHook',
          canUnassignHookAll: true,
        }),
      );
      expect(definitionConfiguredHook?.description).toBeUndefined();
      expect(definitionConfiguredHook?.children?.[0]).toEqual(
        expect.objectContaining({
          kind: 'expression',
          label: 'remoteAreaFeeRsx',
        }),
      );
      expect(definitionExpression).toEqual(
        expect.objectContaining({
          kind: 'expression',
          label: 'remoteAreaFeeRsx',
        }),
      );
      expect(definitionExpression?.hookState).toBeUndefined();
      expect(definitionExpression?.hookLabel).toBeUndefined();
      expect(eagerExpression).toEqual(
        expect.objectContaining({
          kind: 'expression',
          label: 'remoteAreaFeeRsx',
        }),
      );
      expect(eagerExpression?.hookState).toBeUndefined();
      expect(eagerExpression?.hookLabel).toBeUndefined();
      expect(eagerExpression?.children).toBeUndefined();
      expect(instancesHooks).toEqual(
        expect.objectContaining({
          key: 'hooks:instances',
          label: 'Assigned hooks',
          kind: 'hookGroup',
          description: '3 hooks',
          canUnassignHookAll: true,
        }),
      );
      expect(instancesHooks?.children?.map((node) => node.label)).toEqual([
        'Breakpoint',
        'Log',
        'rsxInstanceDebugChangeHook',
      ]);
      const instanceConfiguredHook = instancesHooks?.children?.find(
        (node) => node.label === 'rsxInstanceDebugChangeHook',
      );
      expect(instanceConfiguredHook).toEqual(
        expect.objectContaining({
          canUnassignHookAll: true,
        }),
      );
      expect(instanceConfiguredHook?.children?.[0]).toEqual(
        expect.objectContaining({
          kind: 'instance',
          label: 'shipping.ts:2',
          description: 'remoteAreaFeeRsx',
          actionKey: expect.stringContaining(
            `instance:${rsxUri.toString()}#remoteAreaFeeRsx:`,
          ),
          uri: consumerUri.toString(),
        }),
      );
      expect(instanceConfiguredHook?.children?.[0]?.children).toEqual([
        expect.objectContaining({
          kind: 'expression',
          label: 'Definition',
          actionKey: `expression:${rsxUri.toString()}#remoteAreaFeeRsx`,
          uri: rsxUri.toString(),
        }),
      ]);
      expect(instancesRoot?.label).toBe('Instances');
      expect(group).toEqual(
        expect.objectContaining({
          kind: 'instanceGroup',
          label: 'Definition',
          description: 'remoteAreaFeeRsx · 1 instance',
          uri: rsxUri.toString(),
        }),
      );
      expect(instance).toEqual(
        expect.objectContaining({
          kind: 'instance',
          label: 'shipping.ts:2',
          description: 'remoteAreaFeeRsx',
          uri: consumerUri.toString(),
          start: consumerText.indexOf('remoteAreaFeeRsx({'),
          end:
            consumerText.indexOf('remoteAreaFeeRsx({') +
            'remoteAreaFeeRsx'.length,
          tooltip: 'src/app/shipping.ts:2',
        }),
      );
      expect(instance?.hookState).toBeUndefined();
      expect(instance?.children).toBeUndefined();
      const searchResults = await provider.search('remoteAreaFee');
      for (const result of searchResults) {
        const item = provider.getTreeItem(result);
        for (const text of [item.label, item.description]) {
          if (!text || typeof text !== 'string') {
            continue;
          }
          expect(text).not.toMatch(
            /(?:^|[\s·])(?:\.{1,2}[\\/]|[A-Za-z]:[\\/]|\/|(?:src|app|rules|domain|packages)[\\/])/u,
          );
          expect(text).not.toMatch(/\.[cm]?[tj]sx?:\d+/u);
          expect(text).not.toContain(' from ./');
        }
      }
      const instanceSearchResult = searchResults.find(
        (result) => result.target.kind === 'expressionInstance',
      );
      expect(instanceSearchResult).toEqual(
        expect.objectContaining({
          matchUri: consumerUri,
          matchStart: consumerText.indexOf('remoteAreaFeeRsx({'),
          matchEnd:
            consumerText.indexOf('remoteAreaFeeRsx({') + 'remoteAreaFee'.length,
        }),
      );
    } finally {
      workspaceFolders = undefined;
      findFiles.mockReset();
      readFile.mockReset();
    }
  });

  it('shows configured definition hook nodes even when no instances are discovered', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    workspaceFolders = [{ name: 'workspace', uri: createUri('/workspace') }];
    const rsxUri = createUri('/workspace/src/rules/shipping.expressions.rsx');
    const configUri = createUri('/workspace/rsx.config.json');
    const hookUri = createUri('/workspace/src/hooks/custom-debug-hook.ts');
    const rsxText = [
      'expression: remoteAreaFeeRsx',
      '  model: { remoteArea: boolean }',
      '  remoteArea ? 14 : 0',
    ].join('\n');
    const configText = JSON.stringify({
      build: {
        debugChangeHooks: {
          remoteAreaFeeRsx: {
            group: {
              moduleSpecifier: './src/rsx-debug-change-hook',
              exportName: 'rsxDebugChangeHook',
              enabled: true,
            },
          },
        },
      },
    });
    const hookText = [
      "import type { ChangeHook } from '@rs-x/expression-parser';",
      '',
      'export const customDebugHook: ChangeHook = () => {};',
    ].join('\n');
    const files = new Map<string, string>([
      [rsxUri.fsPath, rsxText],
      [configUri.fsPath, configText],
      [hookUri.fsPath, hookText],
    ]);
    findFiles.mockImplementation(async (pattern: string) =>
      pattern === '**/*.rsx' ? [rsxUri] : [hookUri],
    );
    readFile.mockImplementation((target: { fsPath: string }) => {
      const text = files.get(target.fsPath);
      if (text === undefined) {
        throw new Error(`No mock file for ${target.fsPath}`);
      }
      return Buffer.from(text, 'utf8');
    });

    try {
      activate(context as never);

      const provider = getRegisteredExpressionsProvider() as {
        getPanelTree(): Promise<
          Array<{
            key: string;
            children?: Array<{
              label: string;
              children?: Array<{
                label: string;
                children?: Array<{
                  kind: string;
                  label: string;
                  description?: string;
                }>;
              }>;
            }>;
          }>
        >;
      };
      const tree = await provider.getPanelTree();
      const expressionRoot = tree.find(
        (node) => node.key === 'root:expressions',
      );
      const customHooks = expressionRoot?.children?.find(
        (node) => node.label === 'Hooks',
      );
      const definitionsRoot = tree
        .find((node) => node.key === 'root:expressions')
        ?.children?.find((node) => node.label === 'Definitions');
      const definitionHooks = definitionsRoot?.children?.[0];
      const configuredHook = definitionHooks?.children?.find(
        (node) => node.label === 'rsxDebugChangeHook',
      );
      const definitionExpression = definitionsRoot?.children
        ?.find((node) => node.label === 'shipping.expressions.rsx')
        ?.children?.find((node) => node.label === 'remoteAreaFeeRsx');

      expect(customHooks).toEqual(
        expect.objectContaining({
          key: 'customHooks',
          label: 'Hooks',
          kind: 'customHookGroup',
          description: '1 hook',
          canDeleteCustomHooks: true,
        }),
      );
      expect(customHooks?.children?.[0]).toEqual(
        expect.objectContaining({
          kind: 'customHook',
          label: 'customDebugHook',
          uri: hookUri.toString(),
          canDeleteCustomHooks: true,
          hookDropAction: expect.objectContaining({
            moduleSpecifier: expect.stringContaining('custom-debug-hook'),
            hookUri: hookUri.toString(),
            exportName: 'customDebugHook',
          }),
        }),
      );
      expect(definitionHooks).toEqual(
        expect.objectContaining({
          key: 'hooks:definitions',
          label: 'Assigned hooks',
          kind: 'hookGroup',
          description: '4 hooks',
        }),
      );
      expect(definitionHooks?.children?.slice(0, 2)).toEqual([
        expect.objectContaining({
          kind: 'hookConfig',
          label: 'Breakpoint',
          standardHook: 'breakpoint',
          canDeleteHook: false,
        }),
        expect.objectContaining({
          kind: 'hookConfig',
          label: 'Log',
          standardHook: 'log',
          canDeleteHook: false,
        }),
      ]);
      expect(configuredHook).toEqual(
        expect.objectContaining({
          kind: 'hookConfig',
          label: 'rsxDebugChangeHook',
          hookModuleSpecifier: './src/rsx-debug-change-hook',
          hookAnchorUri: rsxUri.toString(),
        }),
      );
      expect(
        definitionHooks?.children?.find(
          (node) => node.label === 'customDebugHook',
        ),
      ).toEqual(
        expect.objectContaining({
          kind: 'customHook',
          hookDropAction: expect.objectContaining({
            scope: 'group',
            hookUri: hookUri.toString(),
            exportName: 'customDebugHook',
          }),
        }),
      );
      expect(definitionExpression).toEqual(
        expect.objectContaining({
          kind: 'expression',
          label: 'remoteAreaFeeRsx',
        }),
      );
      expect(definitionExpression?.hookState).toBeUndefined();
    } finally {
      workspaceFolders = undefined;
      findFiles.mockReset();
      readFile.mockReset();
    }
  });

  it('detects expression instances through common static factory shapes', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    workspaceFolders = [{ name: 'workspace', uri: createUri('/workspace') }];
    const rsxUri = createUri('/workspace/src/rules/shipping.expressions.rsx');
    const consumerUri = createUri('/workspace/src/app/expression-cases.ts');
    const rsxText = [
      'expression: remoteAreaFeeRsx',
      '  model: { remoteArea: boolean }',
      '  remoteArea ? 14 : 0',
    ].join('\n');
    const consumerText = [
      "import { remoteAreaFeeRsx as remoteAreaFeeFactory } from '../rules/shipping.expressions.rsx';",
      "import * as shippingExpressions from '../rules/shipping.expressions.rsx';",
      '',
      'const localRemoteAreaFactory = remoteAreaFeeFactory;',
      'export const direct = remoteAreaFeeFactory({ remoteArea: true });',
      'export const local = localRemoteAreaFactory({ remoteArea: false });',
      'export const namespace = shippingExpressions.remoteAreaFeeRsx({ remoteArea: true });',
      'export const cases = [',
      '  {',
      "    id: 'imported-alias',",
      '    create: remoteAreaFeeFactory,',
      '  },',
      '  {',
      "    id: 'local-alias',",
      '    create: localRemoteAreaFactory,',
      '  },',
      '  {',
      "    id: 'namespace',",
      '    create: shippingExpressions.remoteAreaFeeRsx,',
      '  },',
      '];',
    ].join('\n');
    const files = new Map<string, string>([
      [rsxUri.fsPath, rsxText],
      [consumerUri.fsPath, consumerText],
    ]);
    findFiles.mockImplementation(async (pattern: string) => {
      if (pattern === '**/*.rsx') {
        return [rsxUri];
      }
      return [consumerUri];
    });
    readFile.mockImplementation((target: { fsPath: string }) => {
      const text = files.get(target.fsPath);
      if (text === undefined) {
        throw new Error(`No mock file for ${target.fsPath}`);
      }
      return Buffer.from(text, 'utf8');
    });

    try {
      activate(context as never);

      const provider = getRegisteredExpressionsProvider() as {
        getPanelTree(): Promise<
          Array<{
            key: string;
            children?: Array<{
              label: string;
              description?: string;
              children?: Array<{
                kind: string;
                uri: string;
                start: number;
                end: number;
              }>;
            }>;
          }>
        >;
      };
      const tree = await provider.getPanelTree();
      const instancesRoot = tree
        .find((node) => node.key === 'root:expressions')
        ?.children?.find((node) => node.label === 'Instances');
      const group = instancesRoot?.children?.find(
        (node) =>
          node.label === 'Definition' &&
          node.description?.startsWith('remoteAreaFeeRsx'),
      );
      const instance = group?.children?.[0];

      expect(group).toEqual(
        expect.objectContaining({
          label: 'Definition',
          description: 'remoteAreaFeeRsx · 6 instances',
        }),
      );
      expect(group?.children).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: 'instance',
            uri: consumerUri.toString(),
            start: consumerText.indexOf('remoteAreaFeeFactory({'),
            end:
              consumerText.indexOf('remoteAreaFeeFactory({') +
              'remoteAreaFeeFactory'.length,
          }),
          expect.objectContaining({
            kind: 'instance',
            uri: consumerUri.toString(),
            start: consumerText.indexOf('localRemoteAreaFactory({'),
            end:
              consumerText.indexOf('localRemoteAreaFactory({') +
              'localRemoteAreaFactory'.length,
          }),
          expect.objectContaining({
            kind: 'instance',
            uri: consumerUri.toString(),
            start: consumerText.indexOf(
              'shippingExpressions.remoteAreaFeeRsx({',
            ),
            end:
              consumerText.indexOf('shippingExpressions.remoteAreaFeeRsx({') +
              'shippingExpressions.remoteAreaFeeRsx'.length,
          }),
          expect.objectContaining({
            kind: 'instance',
            uri: consumerUri.toString(),
            start: consumerText.lastIndexOf('remoteAreaFeeFactory'),
            end:
              consumerText.lastIndexOf('remoteAreaFeeFactory') +
              'remoteAreaFeeFactory'.length,
          }),
          expect.objectContaining({
            kind: 'instance',
            uri: consumerUri.toString(),
            start: consumerText.lastIndexOf('localRemoteAreaFactory'),
            end:
              consumerText.lastIndexOf('localRemoteAreaFactory') +
              'localRemoteAreaFactory'.length,
          }),
          expect.objectContaining({
            kind: 'instance',
            uri: consumerUri.toString(),
            start: consumerText.lastIndexOf(
              'shippingExpressions.remoteAreaFeeRsx',
            ),
            end:
              consumerText.lastIndexOf('shippingExpressions.remoteAreaFeeRsx') +
              'shippingExpressions.remoteAreaFeeRsx'.length,
          }),
        ]),
      );
    } finally {
      workspaceFolders = undefined;
      findFiles.mockReset();
      readFile.mockReset();
    }
  });

  it('keeps a configured debug hook visible after enabling it from the panel', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    workspaceFolders = [{ name: 'workspace', uri: createUri('/workspace') }];
    const rsxUri = createUri('/workspace/src/rules/shipping.expressions.rsx');
    const localRsxUri = createUri('/workspace/src/rules/local.expressions.rsx');
    const consumerUri = createUri('/workspace/src/app/shipping.ts');
    const configUri = createUri('/workspace/rsx.config.json');
    const rsxText = [
      'expression: remoteAreaFeeRsx',
      '  model: { remoteArea: boolean }',
      '  remoteArea ? 14 : 0',
    ].join('\n');
    const localRsxText = [
      'expression: localAreaFeeRsx',
      '  model: { localArea: boolean }',
      '  localArea ? 4 : 0',
    ].join('\n');
    const consumerText = [
      "import { remoteAreaFeeRsx } from '../rules/shipping.expressions.rsx';",
      "import { localAreaFeeRsx } from '../rules/local.expressions.rsx';",
      'const fee = remoteAreaFeeRsx({ remoteArea: true });',
      'const localFee = localAreaFeeRsx({ localArea: true });',
    ].join('\n');
    const files = new Map<string, string>([
      [rsxUri.fsPath, rsxText],
      [localRsxUri.fsPath, localRsxText],
      [consumerUri.fsPath, consumerText],
      [
        configUri.fsPath,
        JSON.stringify({
          build: {
            debugChangeHooks: {
              remoteAreaFeeRsx: {
                group: {
                  moduleSpecifier: './src/rsx-debug-change-hook',
                  exportName: 'rsxDebugChangeHook',
                  enabled: false,
                },
              },
            },
          },
        }),
      ],
    ]);
    findFiles.mockImplementation(async (pattern: string) => {
      if (pattern === '**/*.rsx') {
        return [rsxUri, localRsxUri];
      }
      return [consumerUri];
    });
    readFile.mockImplementation((target: { fsPath: string }) => {
      const text = files.get(target.fsPath);
      if (text === undefined) {
        throw new Error(`No mock file for ${target.fsPath}`);
      }
      return Buffer.from(text, 'utf8');
    });
    writeFile.mockImplementation(
      async (uri: { fsPath: string }, bytes: Uint8Array) => {
        files.set(uri.fsPath, new TextDecoder().decode(bytes));
      },
    );

    try {
      activate(context as never);

      const searchProvider = registerWebviewViewProvider.mock.calls
        .filter(([viewId]) => viewId === 'rsx.expressions')
        .at(-1)?.[1] as
        | {
            setDebugHooksEnabledSelected(
              enabled: boolean,
              key?: string,
              anchorUri?: { fsPath: string; toString(): string },
            ): Promise<void>;
          }
        | undefined;
      const provider = getRegisteredExpressionsProvider() as {
        getPanelTree(): Promise<
          Array<{
            key: string;
            children?: Array<{
              key: string;
              label: string;
              hookState?: string;
              hookLabel?: string;
            }>;
          }>
        >;
      };

      const beforeTree = await provider.getPanelTree();
      const beforeExpression = beforeTree
        .find((node) => node.key === 'root:expressions')
        ?.children?.find((node) => node.label === 'Definitions')
        ?.children?.find((node) => node.label === 'shipping.expressions.rsx')
        ?.children?.find((node) => node.label === 'remoteAreaFeeRsx');
      expect(beforeExpression).toEqual(
        expect.objectContaining({
          kind: 'expression',
          label: 'remoteAreaFeeRsx',
        }),
      );
      expect(beforeExpression?.hookState).toBeUndefined();
      const beforeHook = beforeTree
        .find((node) => node.key === 'root:expressions')
        ?.children?.find((node) => node.label === 'Definitions')
        ?.children?.find((node) => node.key === 'hooks:definitions')
        ?.children?.find((node) => node.label === 'rsxDebugChangeHook');
      expect(beforeHook).toEqual(
        expect.objectContaining({
          kind: 'hookConfig',
          hookState: 'disabled',
          hookLabel: expect.stringContaining(
            'rsxDebugChangeHook from ./src/rsx-debug-change-hook',
          ),
        }),
      );

      await searchProvider?.setDebugHooksEnabledSelected(
        true,
        beforeExpression?.key,
        rsxUri,
      );

      expect(JSON.parse(files.get(configUri.fsPath) ?? '{}')).toEqual({
        build: {
          debugChangeHooks: {
            remoteAreaFeeRsx: {
              group: {
                moduleSpecifier: './src/rsx-debug-change-hook',
                exportName: 'rsxDebugChangeHook',
                enabled: true,
              },
            },
          },
        },
      });

      const afterTree = await provider.getPanelTree();
      const afterExpression = afterTree
        .find((node) => node.key === 'root:expressions')
        ?.children?.find((node) => node.label === 'Definitions')
        ?.children?.find((node) => node.label === 'shipping.expressions.rsx')
        ?.children?.find((node) => node.label === 'remoteAreaFeeRsx');
      expect(afterExpression).toEqual(
        expect.objectContaining({
          kind: 'expression',
          label: 'remoteAreaFeeRsx',
        }),
      );
      expect(afterExpression?.hookState).toBeUndefined();
      const afterHook = afterTree
        .find((node) => node.key === 'root:expressions')
        ?.children?.find((node) => node.label === 'Definitions')
        ?.children?.find((node) => node.key === 'hooks:definitions')
        ?.children?.find((node) => node.label === 'rsxDebugChangeHook');
      expect(afterHook).toEqual(
        expect.objectContaining({
          kind: 'hookConfig',
          hookState: 'enabled',
          hookLabel: expect.stringContaining(
            'rsxDebugChangeHook from ./src/rsx-debug-change-hook',
          ),
        }),
      );
    } finally {
      workspaceFolders = undefined;
      findFiles.mockReset();
      readFile.mockReset();
      writeFile.mockReset();
      showInformationMessage.mockReset();
    }
  });

  it('shows standard debug hook assignments under the standard hook node', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    workspaceFolders = [{ name: 'workspace', uri: createUri('/workspace') }];
    const rsxUri = createUri('/workspace/src/rules/shipping.expressions.rsx');
    const consumerUri = createUri('/workspace/src/app/shipping.ts');
    const configUri = createUri('/workspace/rsx.config.json');
    const rsxText = [
      'expression: remoteAreaFeeRsx',
      '  model: { remoteArea: boolean }',
      '  remoteArea ? 14 : 0',
    ].join('\n');
    const consumerText = [
      "import { remoteAreaFeeRsx } from '../rules/shipping.expressions.rsx';",
      'const fee = remoteAreaFeeRsx({ remoteArea: true });',
    ].join('\n');
    const files = new Map<string, string>([
      [rsxUri.fsPath, rsxText],
      [consumerUri.fsPath, consumerText],
      [
        configUri.fsPath,
        JSON.stringify({
          build: {
            debugChangeHooks: {
              remoteAreaFeeRsx: {
                group: {
                  moduleSpecifier: './src/rsx-debug-change-hook',
                  exportName: 'rsxBreakpointDebugHook',
                  enabled: true,
                },
              },
            },
          },
        }),
      ],
    ]);
    findFiles.mockImplementation(async (pattern: string) => {
      if (pattern === '**/*.rsx') {
        return [rsxUri];
      }
      if (pattern === '**/rsx.config.json') {
        return [configUri];
      }
      return [consumerUri];
    });
    readFile.mockImplementation((target: { fsPath: string }) => {
      const text = files.get(target.fsPath);
      if (text !== undefined) {
        return Buffer.from(text, 'utf8');
      }
      throw new Error(`No mock file for ${target.fsPath}`);
    });
    writeFile.mockImplementation(
      async (uri: { fsPath: string }, bytes: Uint8Array) => {
        files.set(uri.fsPath, new TextDecoder().decode(bytes));
      },
    );

    try {
      activate(context as never);
      const provider = getRegisteredExpressionsProvider() as {
        getPanelTree(): Promise<
          Array<{
            key: string;
            label: string;
            children?: Array<{
              key: string;
              label: string;
              hookState?: string;
              children?: Array<{
                key: string;
                actionKey?: string;
                label: string;
                hookState?: string;
              }>;
            }>;
          }>
        >;
      };
      const searchProvider = registerWebviewViewProvider.mock.calls
        .filter(([viewId]) => viewId === 'rsx.expressions')
        .at(-1)?.[1] as
        | {
            setSelectedActionKey(
              key: string,
              visualKey?: string,
            ): Promise<void>;
            setDebugHooksEnabledSelected(enabled: boolean): Promise<void>;
          }
        | undefined;

      const hooks = (await provider.getPanelTree())
        .find((node) => node.key === 'root:expressions')
        ?.children?.find((node) => node.label === 'Definitions')
        ?.children?.find((node) => node.key === 'hooks:definitions')?.children;
      const breakpoint = hooks?.find((node) => node.label === 'Breakpoint');

      expect(breakpoint?.children?.map((node) => node.label)).toEqual([
        'remoteAreaFeeRsx',
      ]);
      expect(breakpoint?.hookState).toBe('enabled');
      const assignment = breakpoint?.children?.[0];
      expect(assignment?.hookState).toBe('enabled');
      expect(hooks?.map((node) => node.label)).not.toContain(
        'rsxBreakpointDebugHook',
      );

      await searchProvider?.setSelectedActionKey(
        assignment?.actionKey ?? '',
        assignment?.key,
      );
      await searchProvider?.setDebugHooksEnabledSelected(false);

      expect(
        JSON.parse(files.get(configUri.fsPath) ?? '{}').build.debugChangeHooks
          .remoteAreaFeeRsx.group,
      ).toEqual({
        moduleSpecifier: './src/rsx-debug-change-hook',
        exportName: 'rsxBreakpointDebugHook',
        enabled: false,
      });

      const disabledBreakpoint = (await provider.getPanelTree())
        .find((node) => node.key === 'root:expressions')
        ?.children?.find((node) => node.label === 'Definitions')
        ?.children?.find((node) => node.key === 'hooks:definitions')
        ?.children?.find((node) => node.label === 'Breakpoint');
      expect(disabledBreakpoint?.children?.map((node) => node.label)).toEqual([
        'remoteAreaFeeRsx',
      ]);
      expect(disabledBreakpoint?.hookState).toBe('disabled');
      expect(disabledBreakpoint?.children?.[0]?.hookState).toBe('disabled');
    } finally {
      workspaceFolders = undefined;
      findFiles.mockReset();
      readFile.mockReset();
      writeFile.mockReset();
    }
  });

  it('uses explicit debugInstanceId values from factory tables for hook lookup', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    workspaceFolders = [{ name: 'workspace', uri: createUri('/workspace') }];
    const rsxUri = createUri('/workspace/src/rules/shipping.expressions.rsx');
    const consumerUri = createUri('/workspace/src/app/expression-cases.ts');
    const configUri = createUri('/workspace/rsx.config.json');
    const rsxText = [
      'expression: remoteAreaFeeRsx',
      '  model: { remoteArea: boolean }',
      '  remoteArea ? 14 : 0',
    ].join('\n');
    const consumerText = [
      "import { remoteAreaFeeRsx as remoteAreaFeeFactory } from '../rules/shipping.expressions.rsx';",
      '',
      'export const cases = [',
      '  {',
      "    id: 'remote-area',",
      "    debugInstanceId: 'manual:remote-area',",
      '    create: remoteAreaFeeFactory,',
      '  },',
      '];',
    ].join('\n');
    const files = new Map<string, string>([
      [rsxUri.fsPath, rsxText],
      [consumerUri.fsPath, consumerText],
      [
        configUri.fsPath,
        JSON.stringify({
          build: {
            debugChangeHooks: {
              remoteAreaFeeRsx: {
                instances: {
                  'manual:remote-area': {
                    moduleSpecifier: './src/rsx-debug-change-hook',
                    exportName: 'rsxDebugChangeHook',
                    enabled: true,
                  },
                },
              },
            },
          },
        }),
      ],
    ]);
    findFiles.mockImplementation(async (pattern: string) => {
      if (pattern === '**/*.rsx') {
        return [rsxUri];
      }
      return [consumerUri];
    });
    readFile.mockImplementation((target: { fsPath: string }) => {
      const text = files.get(target.fsPath);
      if (text === undefined) {
        throw new Error(`No mock file for ${target.fsPath}`);
      }
      return Buffer.from(text, 'utf8');
    });

    try {
      activate(context as never);

      const provider = getRegisteredExpressionsProvider() as {
        getPanelTree(): Promise<
          Array<{
            key: string;
            children?: Array<{
              label: string;
              children?: Array<{
                kind: string;
                hookState?: string;
                hookLabel?: string;
                description?: string;
              }>;
            }>;
          }>
        >;
      };
      const tree = await provider.getPanelTree();
      const instancesRoot = tree
        .find((node) => node.key === 'root:expressions')
        ?.children?.find((node) => node.label === 'Instances');
      const instanceHooks = instancesRoot?.children?.[0];
      const group = instancesRoot?.children?.find(
        (node) =>
          node.label === 'Definition' &&
          node.description?.startsWith('remoteAreaFeeRsx'),
      );
      const instance = group?.children?.[0];

      expect(group).toEqual(
        expect.objectContaining({
          kind: 'instanceGroup',
          label: 'Definition',
          description: 'remoteAreaFeeRsx · 1 instance',
        }),
      );
      expect(instance).toEqual(
        expect.objectContaining({
          kind: 'instance',
          label: 'expression-cases.ts:7',
          description: 'remoteAreaFeeRsx',
          tooltip: 'src/app/expression-cases.ts:7',
        }),
      );
      expect(instance?.hookState).toBeUndefined();
      expect(instance?.hookLabel).toBeUndefined();
      expect(instanceHooks).toEqual(
        expect.objectContaining({
          key: 'hooks:instances',
          label: 'Assigned hooks',
          kind: 'hookGroup',
          description: '3 hooks',
        }),
      );
      expect(instanceHooks?.children?.slice(0, 2)).toEqual([
        expect.objectContaining({
          kind: 'hookConfig',
          label: 'Breakpoint',
          standardHook: 'breakpoint',
          canDeleteHook: false,
        }),
        expect.objectContaining({
          kind: 'hookConfig',
          label: 'Log',
          standardHook: 'log',
          canDeleteHook: false,
        }),
      ]);
      const instanceConfiguredHook = instanceHooks?.children?.find(
        (node) => node.label === 'rsxDebugChangeHook',
      );
      expect(instanceConfiguredHook).toEqual(
        expect.objectContaining({
          kind: 'hookConfig',
          label: 'rsxDebugChangeHook',
        }),
      );
      expect(instanceConfiguredHook?.description).toBeUndefined();
      expect(instanceConfiguredHook?.children?.[0]).toEqual(
        expect.objectContaining({
          kind: 'instance',
          label: 'expression-cases.ts:7',
          description: 'remoteAreaFeeRsx',
          actionKey: expect.stringContaining(
            `instance:${rsxUri.toString()}#remoteAreaFeeRsx:`,
          ),
          uri: consumerUri.toString(),
        }),
      );
      expect(instanceConfiguredHook?.children?.[0]?.children).toEqual([
        expect.objectContaining({
          kind: 'expression',
          label: 'Definition',
          actionKey: `expression:${rsxUri.toString()}#remoteAreaFeeRsx`,
          uri: rsxUri.toString(),
        }),
      ]);
    } finally {
      workspaceFolders = undefined;
      findFiles.mockReset();
      readFile.mockReset();
    }
  });

  it('keeps the previous panel tree during a transient empty rsx file scan', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    workspaceFolders = [{ name: 'workspace', uri: createUri('/workspace') }];
    const rsxUri = createUri('/workspace/src/rules/shipping.expressions.rsx');
    const consumerUri = createUri('/workspace/src/app/shipping.ts');
    const rsxText = [
      'expression: remoteAreaFeeRsx',
      '  model: { remoteArea: boolean }',
      '  remoteArea ? 14 : 0',
    ].join('\n');
    const consumerText = [
      "import { remoteAreaFeeRsx } from '../rules/shipping.expressions.rsx';",
      'const fee = remoteAreaFeeRsx({ remoteArea: true });',
    ].join('\n');
    const files = new Map<string, string>([
      [rsxUri.fsPath, rsxText],
      [consumerUri.fsPath, consumerText],
    ]);
    let rsxScanHasFiles = true;
    findFiles.mockImplementation(async (pattern: string) => {
      if (pattern === '**/*.rsx') {
        return rsxScanHasFiles ? [rsxUri] : [];
      }
      return [consumerUri];
    });
    readFile.mockImplementation((target: { fsPath: string }) => {
      const text = files.get(target.fsPath);
      if (text === undefined) {
        throw new Error(`No mock file for ${target.fsPath}`);
      }
      return Buffer.from(text, 'utf8');
    });

    try {
      activate(context as never);

      const provider = getRegisteredExpressionsProvider() as {
        refresh(): void;
        getPanelTree(): Promise<
          Array<{
            key: string;
            children?: Array<{ label: string }>;
          }>
        >;
      };
      const initialTree = await provider.getPanelTree();
      expect(
        initialTree
          .find((node) => node.key === 'root:expressions')
          ?.children?.find((node) => node.label === 'Definitions')
          ?.children?.map((node) => node.label),
      ).toContain('shipping.expressions.rsx');

      rsxScanHasFiles = false;
      provider.refresh();
      const treeAfterTransientEmptyScan = await provider.getPanelTree();

      expect(
        treeAfterTransientEmptyScan
          .find((node) => node.key === 'root:expressions')
          ?.children?.find((node) => node.label === 'Definitions')
          ?.children?.map((node) => node.label),
      ).toContain('shipping.expressions.rsx');
    } finally {
      workspaceFolders = undefined;
      findFiles.mockReset();
      readFile.mockReset();
    }
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

    const previewCommand = registerCommand.mock.calls
      .filter(([command]) => command === 'rsx.expressions.preview')
      .at(-1)?.[1] as (() => Promise<void>) | undefined;
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

  it('opens an expression report with config, rsx, and code settings', async () => {
    const workspaceStateValues = new Map<string, unknown>();
    const workspaceState = {
      get: jest.fn((key: string) => workspaceStateValues.get(key)),
      update: jest.fn(async (key: string, value: unknown) => {
        workspaceStateValues.set(key, value);
      }),
    };
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
      workspaceState,
    };
    workspaceFolders = [{ name: 'workspace', uri: createUri('/workspace') }];
    const rootConfigUri = createUri('/workspace/rsx.config.json');
    const nestedConfigUri = createUri('/workspace/src/rsx.config.json');
    const rsxUri = createUri('/workspace/src/rules/totals.expressions.rsx');
    const consumerUri = createUri('/workspace/src/app.ts');
    const rsxText = [
      'defaults:',
      '  model: { base: number; adjustment: number }',
      '  preparse: false',
      '',
      'expression: totalRsx',
      '  compiled: true',
      '  lazy: true',
      '  return: number',
      '  base + adjustment',
    ].join('\n');
    const consumerText = [
      "import { totalRsx } from './rules/totals.expressions.rsx';",
      "const total = totalRsx({ base: 1, adjustment: 2 }, undefined, 'manual-total');",
    ].join('\n');
    const files = new Map<string, string>([
      [
        rootConfigUri.fsPath,
        JSON.stringify({
          build: { format: 'esm', compiled: false },
          cli: { add: { defaultDirectory: 'src/rules' } },
        }),
      ],
      [
        nestedConfigUri.fsPath,
        JSON.stringify({
          build: {
            debugChangeHooks: {
              totalRsx: {
                group: [
                  {
                    moduleSpecifier: './breakpoint-hook',
                    exportName: 'breakpointHook',
                  },
                  { moduleSpecifier: './log-hook', exportName: 'logHook' },
                ],
                instances: {
                  'manual-total': {
                    moduleSpecifier: './instance-hook',
                    exportName: 'instanceHook',
                  },
                },
              },
              otherRsx: {
                group: {
                  moduleSpecifier: './other-hook',
                  exportName: 'otherHook',
                },
              },
            },
          },
        }),
      ],
      [rsxUri.fsPath, rsxText],
      [consumerUri.fsPath, consumerText],
    ]);
    findFiles.mockImplementation(async (pattern: string) =>
      pattern === '**/*.rsx' ? [rsxUri] : [consumerUri],
    );
    readFile.mockImplementation(async (uri: { fsPath: string }) => {
      const text = files.get(uri.fsPath);
      if (text === undefined) {
        throw new Error(`No mock file for ${uri.fsPath}`);
      }
      return Buffer.from(text, 'utf8');
    });

    try {
      registerCommand.mockClear();
      createWebviewPanel.mockClear();
      activate(context as never);
      const provider = getRegisteredExpressionsProvider() as {
        getPanelActionTarget(key: string): Promise<unknown>;
      };
      const target = await provider.getPanelActionTarget(
        `expression:${rsxUri.toString()}#totalRsx`,
      );
      const command = registerCommand.mock.calls
        .filter(([commandName]) => commandName === 'rsx.expressions.report')
        .at(-1)?.[1] as ((item?: unknown) => Promise<void>) | undefined;

      await command?.(target);
      expect(workspaceState.update).toHaveBeenCalledWith(
        'rsx.expressionReport.lastTargetKey',
        `expression:${rsxUri.toString()}#totalRsx`,
      );

      const panel = createWebviewPanel.mock.results.at(-1)?.value as
        | {
            viewColumn: number;
            webview: { html: string; onDidReceiveMessage: jest.Mock };
            onDidChangeViewState: jest.Mock;
            onDidDispose: jest.Mock;
          }
        | undefined;
      expect(panel?.webview.html).toContain('RS-X Report: totalRsx');
      expect(panel?.webview.html).toContain('Settings');
      expect(panel?.webview.html).toContain('Expression behavior');
      expect(panel?.webview.html).toMatch(
        /Expression behavior[\s\S]*compiled[\s\S]*true[\s\S]*src\/rules\/totals\.expressions\.rsx \(\.rsx definition\)/u,
      );
      expect(panel?.webview.html).toContain('Build');
      expect(panel?.webview.html).toContain('build.format');
      expect(panel?.webview.html).not.toContain('build.compiled');
      expect(panel?.webview.html).toContain('Hooks');
      expect(panel?.webview.html).not.toContain('Debug hooks');
      expect(panel?.webview.html).toContain('hookCards');
      expect(panel?.webview.html).toContain('hookCardHeader');
      expect(panel?.webview.html).toContain(
        'data-action="openDebugHookImplementation"',
      );
      expect(panel?.webview.html).toContain(
        'data-hook-module-specifier="./breakpoint-hook"',
      );
      expect(panel?.webview.html).toContain(
        'data-hook-export-name="breakpointHook"',
      );
      expect(panel?.webview.html).toContain(
        'data-hook-anchor-uri="file:///workspace/src/rules/totals.expressions.rsx"',
      );
      expect(
        panel?.webview.html.match(/Definition hook \d/gu) ?? [],
      ).toHaveLength(0);
      expect(panel?.webview.html).toContain('detailLabel');
      expect(panel?.webview.html).toContain('breakpointHook');
      expect(panel?.webview.html).not.toContain('>Name<');
      expect(panel?.webview.html).toContain('detailSource');
      expect(panel?.webview.html).toContain('Definition (all instances)');
      expect(panel?.webview.html).toContain(
        'src/rules/totals.expressions.rsx · expression definition',
      );
      const nestedConfigText = files.get(nestedConfigUri.fsPath) ?? '';
      const groupKeyStart = nestedConfigText.indexOf('"group"');
      const moduleValueStart = nestedConfigText.indexOf('"./breakpoint-hook"');
      const expressionNameStart = rsxText.indexOf('totalRsx');
      expect(panel?.webview.html).toContain(
        `<span class="detailLabel">Scope</span><button type="button" class="value detailValue" data-uri="file:///workspace/src/rules/totals.expressions.rsx" data-start="${expressionNameStart}" data-end="${expressionNameStart + 'totalRsx'.length}">Definition (all instances)</button>`,
      );
      expect(groupKeyStart).toBeGreaterThanOrEqual(0);
      expect(panel?.webview.html).toContain(
        `<span class="detailLabel">Configured as</span><button type="button" class="value detailValue" data-uri="file:///workspace/src/rsx.config.json" data-start="${groupKeyStart}" data-end="${groupKeyStart + '"group"'.length}">Definition hook entry</button>`,
      );
      expect(panel?.webview.html).toContain(
        'src/rsx.config.json · build.debugChangeHooks.totalRsx.group.0',
      );
      expect(panel?.webview.html).toContain(
        `<span class="detailLabel">Module</span><button type="button" class="value detailValue" data-uri="file:///workspace/src/rsx.config.json" data-start="${moduleValueStart}" data-end="${moduleValueStart + '"./breakpoint-hook"'.length}">./breakpoint-hook</button>`,
      );
      expect(panel?.webview.html).toContain('default: enabled when omitted');
      expect(panel?.webview.html).toContain('Module');
      expect(panel?.webview.html).toContain('./breakpoint-hook');
      expect(panel?.webview.html).toContain(
        'build.debugChangeHooks.totalRsx.group.0.moduleSpecifier',
      );
      expect(panel?.webview.html).toContain('Export');
      expect(panel?.webview.html).toContain(
        'build.debugChangeHooks.totalRsx.group.0.exportName',
      );
      expect(panel?.webview.html).toContain('logHook');
      expect(
        panel?.webview.html.match(/class="hookCard"/gu) ?? [],
      ).toHaveLength(2);
      expect(panel?.webview.html).not.toContain('definition: breakpointHook');
      expect(panel?.webview.html).not.toContain('module: ./breakpoint-hook');
      expect(panel?.webview.html).not.toContain('export: breakpointHook');
      expect(panel?.webview.html).not.toContain('definition.exportName');
      expect(panel?.webview.html).not.toContain('definition.moduleSpecifier');
      expect(panel?.webview.html).not.toContain('Definition hook: totalRsx');
      expect(panel?.webview.html).not.toContain('otherRsx');
      expect(panel?.webview.html).not.toContain('otherHook');
      expect(panel?.webview.html).not.toContain(
        'build.debugChangeHooks.totalRsx.group.exportName',
      );
      expect(panel?.webview.html).not.toContain('.rsx Definition Settings');
      expect(panel?.webview.html).not.toContain('Defaults headers');
      expect(panel?.webview.html).toContain('preparse');
      expect(panel?.webview.html).toContain('Expression declaration');
      expect(panel?.webview.html).toContain('Expression');
      expect(panel?.webview.html).toContain('tok-variable');
      expect(panel?.webview.html).toContain('base');
      expect(panel?.webview.html).toContain('adjustment');
      expect(panel?.webview.html).toContain('compiled');
      expect(panel?.webview.html).toContain('Usages');
      expect(panel?.webview.html).toContain('Usage 1');
      expect(panel?.webview.html).toContain('debugInstanceId');
      expect(panel?.webview.html).toContain('data-uri="');
      expect(panel?.webview.html).toContain(
        'vscode.setState?.({ targetKey });',
      );
      expect(panel?.webview.html).toContain(
        JSON.stringify(`expression:${rsxUri.toString()}#totalRsx`),
      );
      const reportSerializer = registerWebviewPanelSerializer.mock.calls.find(
        ([viewType]) => viewType === 'rsx.expressionReport',
      )?.[1] as
        | {
            deserializeWebviewPanel(
              panel: {
                title?: string;
                viewColumn: number;
                webview: {
                  html: string;
                  options?: unknown;
                  onDidReceiveMessage: jest.Mock;
                };
                onDidChangeViewState: jest.Mock;
                onDidDispose: jest.Mock;
              },
              state: unknown,
            ): Promise<void>;
          }
        | undefined;
      expect(reportSerializer).toBeDefined();
      const restoredPanel = createWebviewPanel() as {
        title?: string;
        viewColumn: number;
        webview: {
          html: string;
          options?: unknown;
          onDidReceiveMessage: jest.Mock;
        };
        onDidChangeViewState: jest.Mock;
        onDidDispose: jest.Mock;
      };
      await reportSerializer?.deserializeWebviewPanel(restoredPanel, {
        targetKey: `expression:${rsxUri.toString()}#totalRsx`,
      });
      expect(restoredPanel.webview.options).toEqual({ enableScripts: true });
      expect(restoredPanel.title).toBe('RS-X Report: totalRsx');
      expect(restoredPanel.webview.html).toContain('RS-X Report: totalRsx');
      expect(restoredPanel.webview.html).toContain('breakpointHook');
      const fallbackRestoredPanel = createWebviewPanel() as {
        title?: string;
        viewColumn: number;
        webview: {
          html: string;
          options?: unknown;
          onDidReceiveMessage: jest.Mock;
        };
        onDidChangeViewState: jest.Mock;
        onDidDispose: jest.Mock;
      };
      await reportSerializer?.deserializeWebviewPanel(
        fallbackRestoredPanel,
        {},
      );
      expect(workspaceState.get).toHaveBeenCalledWith(
        'rsx.expressionReport.lastTargetKey',
      );
      expect(fallbackRestoredPanel.title).toBe('RS-X Report: totalRsx');
      expect(fallbackRestoredPanel.webview.html).toContain('breakpointHook');
      const reportMessageHandler = (
        panel?.webview as
          | {
              onDidReceiveMessage: jest.Mock;
            }
          | undefined
      )?.onDidReceiveMessage.mock.calls.at(-1)?.[0] as
        | ((message: unknown) => Promise<void>)
        | undefined;
      const vscode = await import('vscode');
      const closedReportGroup = { viewColumn: 7, tabs: [] };
      const tabChangeHandler = tabGroupsOnDidChangeTabs.mock.calls.at(
        -1,
      )?.[0] as ((event: { closed: unknown[] }) => void) | undefined;
      tabGroupsAll = [closedReportGroup];
      tabGroupsClose.mockClear();
      tabChangeHandler?.({
        closed: [
          {
            group: closedReportGroup,
            input: new vscode.TabInputWebview('rsx.expressionReport'),
          },
        ],
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(tabGroupsClose).toHaveBeenCalledWith([closedReportGroup], true);

      const reportDocument = createTextDocument(rsxText, {
        fsPath: rsxUri.fsPath,
      });
      const reportEditor = {
        document: reportDocument,
        viewColumn: 1,
        revealRange: jest.fn(),
        setDecorations: jest.fn(),
      };
      openTextDocument.mockClear();
      showTextDocument.mockClear();
      openTextDocument.mockResolvedValueOnce(reportDocument);
      showTextDocument.mockResolvedValueOnce(reportEditor);
      await reportMessageHandler?.({
        type: 'open',
        uri: rsxUri.toString(),
        start: expressionNameStart,
        end: expressionNameStart + 'totalRsx'.length,
      });
      expect(showTextDocument).toHaveBeenCalledWith(
        reportDocument,
        expect.objectContaining({
          viewColumn: 1,
          preview: false,
        }),
      );
      expect(panel?.onDidChangeViewState).toHaveBeenCalled();
      const movedReportGroup = { viewColumn: 3, tabs: [] };
      const reportViewStateHandler = panel?.onDidChangeViewState.mock.calls.at(
        -1,
      )?.[0] as
        | ((event: { webviewPanel: { viewColumn: number } }) => void)
        | undefined;
      reportViewStateHandler?.({ webviewPanel: movedReportGroup });
      const reportDisposeHandler = panel?.onDidDispose.mock.calls.at(
        -1,
      )?.[0] as (() => void) | undefined;
      tabGroupsAll = [movedReportGroup];
      tabGroupsClose.mockClear();
      reportDisposeHandler?.();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(tabGroupsClose).toHaveBeenCalledWith([movedReportGroup], true);

      const instanceStart = consumerText.indexOf('totalRsx({');
      const instanceTarget = await provider.getPanelActionTarget(
        `instance:${rsxUri.toString()}#totalRsx:${consumerUri.toString()}:${instanceStart}`,
      );
      await command?.(instanceTarget);
      const instancePanel = createWebviewPanel.mock.results.at(-1)?.value as
        | { webview: { html: string } }
        | undefined;
      expect(instancePanel?.webview.html).toContain(
        'RS-X Report: totalRsx instance',
      );
      expect(instancePanel?.webview.html).toContain('instanceHook');
      expect(instancePanel?.webview.html).toContain(
        'data-hook-module-specifier="./instance-hook"',
      );
      expect(instancePanel?.webview.html).not.toContain('breakpointHook');
      expect(instancePanel?.webview.html).not.toContain('logHook');
      expect(instancePanel?.webview.html).toContain(
        'Specific instance (manual-total)',
      );
      expect(instancePanel?.webview.html).toContain('Instance hook entry');
    } finally {
      workspaceFolders = undefined;
      findFiles.mockReset();
      readFile.mockReset();
      createWebviewPanel.mockClear();
    }
  });

  it('opens a model-backed expression tester for expression and field selections', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    workspaceFolders = [{ name: 'workspace', uri: createUri('/workspace') }];
    const uri = createUri('/workspace/src/rules/model.expressions.rsx');
    const fixtureText = [
      'defaults:',
      '  model: { value: number; enabled: boolean }',
      '',
      'expression: valueRsx',
      '  value',
      '',
      'expression: subtotalRsx',
      '  value + 1',
      '',
      'expression: valuePositiveRsx',
      '  value > 0',
      '',
      'expression: positiveScoreRsx',
      '  valuePositive ? 1 : 0',
      '',
      'expression: totalRsx',
      '  value + 2',
      '',
      'expression: enabledLabelRsx',
      "  enabled ? 'yes' : 'no'",
    ].join('\n');

    findFiles.mockResolvedValue([uri]);
    readFile.mockImplementation((target: { fsPath: string }) =>
      Buffer.from(target.fsPath === uri.fsPath ? fixtureText : '', 'utf8'),
    );
    let modelText = '';
    let modelDocument: ReturnType<typeof createMutableTextDocument>;
    writeFile.mockImplementation(
      async (_target: unknown, content: Uint8Array) => {
        modelText = new TextDecoder().decode(content);
      },
    );
    openTextDocument.mockImplementation(async (target: { fsPath?: string }) => {
      modelDocument = createMutableTextDocument(() => modelText, {
        languageId: 'typescript',
        scheme: 'file',
        fsPath:
          target.fsPath ?? '/workspace/src/rules/subtotalRsx.rsx-model.ts',
      });
      textDocuments.push(modelDocument);
      return modelDocument;
    });
    showTextDocument.mockImplementation(async (document: unknown) => ({
      document,
      edit: async (
        callback: (builder: {
          insert(position: unknown, text: string): void;
          replace(range: unknown, text: string): void;
        }) => void,
      ) => {
        callback({
          insert: (_position, text) => {
            modelText = text;
          },
          replace: (_range, text) => {
            modelText = text;
          },
        });
        return true;
      },
      revealRange: jest.fn(),
    }));

    activate(context as never);

    const provider = getRegisteredExpressionsProvider() as {
      getChildren(element?: unknown): Promise<unknown[]>;
    };
    const roots = await provider.getChildren();
    const files = await provider.getChildren(roots[0]);
    const expressions = (await provider.getChildren(files[0])) as Array<{
      exportName: string;
    }>;
    const subtotal = expressions.find(
      (expression) => expression.exportName === 'subtotalRsx',
    );
    const total = expressions.find(
      (expression) => expression.exportName === 'totalRsx',
    );
    const positiveScore = expressions.find(
      (expression) => expression.exportName === 'positiveScoreRsx',
    );

    const testCommand = registerCommand.mock.calls
      .filter(([command]) => command === 'rsx.expressions.test')
      .at(-1)?.[1] as ((item: unknown) => Promise<void>) | undefined;
    expect(testCommand).toBeDefined();

    await testCommand?.(subtotal);

    expect(createWebviewPanel).not.toHaveBeenCalledWith(
      'rsx.expressionTester',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
    expect(modelText).toContain('export default');
    expect(modelText).toContain('value: 0');
    expect(modelText).toContain('RS-X Expression Values');
    expect(openTextDocument.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        fsPath: expect.stringMatching(
          /subtotalRsx-\d{14}-[a-z0-9]{6}\.rsx-model\.ts$/u,
        ),
      }),
    );
    expect(openTextDocument.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        fsPath: expect.stringContaining(`${path.sep}.rsx${path.sep}`),
      }),
    );
    expect(openTextDocument.mock.calls.at(-1)?.[0]).toEqual(
      expect.not.objectContaining({
        fsPath: expect.stringContaining('/workspace/src/rules'),
      }),
    );
    expect(showTextDocument).toHaveBeenCalledWith(
      modelDocument!,
      expect.objectContaining({
        viewColumn: 1,
        preview: false,
      }),
    );
    const codeLensProvider = registerCodeLensProvider.mock.calls.at(-1)?.[1] as
      | {
          provideCodeLenses(
            document: unknown,
          ): Array<{ command?: { command: string } }>;
        }
      | undefined;
    expect(
      codeLensProvider?.provideCodeLenses(modelDocument!)[0]?.command,
    ).toEqual(expect.objectContaining({ command: 'rsx.expressions.test.run' }));
    expect(
      codeLensProvider?.provideCodeLenses(modelDocument!)[1]?.command,
    ).toEqual(
      expect.objectContaining({ command: 'rsx.expressions.test.load' }),
    );
    expect(registerCodeLensProvider.mock.calls.at(-1)?.[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ language: 'typescript', scheme: 'file' }),
      ]),
    );
    const extensionPackage = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'),
    ) as {
      contributes?: {
        menus?: {
          'editor/title'?: Array<{
            command?: string;
            when?: string;
          }>;
          'webview/context'?: Array<{
            command?: string;
            when?: string;
          }>;
        };
      };
    };
    expect(
      extensionPackage.contributes?.menus?.['editor/title'],
    ).toContainEqual(
      expect.objectContaining({
        command: 'rsx.expressions.test.run',
        when: 'resourceFilename =~ /\\.rsx-model\\.ts$/',
      }),
    );
    expect(extensionPackage.contributes?.menus?.['webview/context']).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          command: 'rsx.expressions.panel.preview',
          when: expect.stringContaining("webviewId == 'rsx.expressions'"),
        }),
        expect.objectContaining({
          command: 'rsx.expressions.panel.test',
          when: expect.stringContaining("webviewId == 'rsx.expressions'"),
        }),
      ]),
    );
    expect(
      extensionPackage.contributes?.menus?.['editor/title'],
    ).toContainEqual(
      expect.objectContaining({
        command: 'rsx.expressions.test.load',
        when: 'resourceFilename =~ /\\.rsx-model\\.ts$/',
      }),
    );
    expect(createDirectory).toHaveBeenCalledWith(
      expect.objectContaining({
        fsPath: expect.stringContaining(`${path.sep}.rsx`),
      }),
    );
    expect(writeFile).toHaveBeenCalledWith(
      expect.objectContaining({
        fsPath: expect.stringMatching(
          /subtotalRsx-\d{14}-[a-z0-9]{6}\.rsx-model\.ts$/u,
        ),
      }),
      expect.anything(),
    );
    const loadCommand = registerCommand.mock.calls
      .filter(([command]) => command === 'rsx.expressions.test.load')
      .at(-1)?.[1] as ((uri: unknown) => Promise<void>) | undefined;
    expect(loadCommand).toBeDefined();
    showOpenDialog.mockResolvedValueOnce([
      createUri('/workspace/saved-models/subtotal.rsx-model.ts'),
    ]);
    readFile.mockImplementationOnce((target: { fsPath: string }) =>
      Buffer.from(
        target.fsPath.endsWith('subtotal.rsx-model.ts')
          ? 'export default { value: 6 };'
          : '',
        'utf8',
      ),
    );
    applyEdit.mockImplementationOnce(
      async (edit: { replacements?: Array<{ text: string }> }) => {
        modelText = edit.replacements?.[0]?.text ?? modelText;
        return true;
      },
    );
    await loadCommand?.(modelDocument!.uri);
    expect(modelText).toBe('export default { value: 6 };');
    expect(modelDocument!.save).toHaveBeenCalled();
    showOpenDialog.mockResolvedValueOnce([
      createUri('/workspace/saved-models/subtotal-full.rsx-model.ts'),
    ]);
    readFile.mockImplementationOnce((target: { fsPath: string }) =>
      Buffer.from(
        target.fsPath.endsWith('subtotal-full.rsx-model.ts')
          ? [
              'export default { value: 9 };',
              '',
              '/* RS-X Expression Values',
              '[]',
              '*/',
            ].join('\n')
          : '',
        'utf8',
      ),
    );
    activeTextEditor = {
      document: createTextDocument('', { fsPath: '/workspace/other.ts' }),
    };
    visibleTextEditors.length = 0;
    visibleTextEditors.push({ document: modelDocument! });
    applyEdit.mockImplementationOnce(
      async (edit: { replacements?: Array<{ text: string }> }) => {
        modelText = edit.replacements?.[0]?.text ?? modelText;
        return true;
      },
    );
    await loadCommand?.(undefined);
    expect(modelText).toBe('export default { value: 9 };');
    activeTextEditor = null;
    visibleTextEditors.length = 0;
    const runCommand = registerCommand.mock.calls
      .filter(([command]) => command === 'rsx.expressions.test.run')
      .at(-1)?.[1] as ((uri: unknown) => Promise<void>) | undefined;
    expect(runCommand).toBeDefined();

    modelText = '{ value: 4, enabled: false }';
    await runCommand?.(modelDocument!.uri);
    expect(modelText).toBe('{ value: 4, enabled: false }');
    const reportPanel = createWebviewPanel.mock.results.at(-1)?.value as
      | {
          webview: {
            html: string;
            onDidReceiveMessage: jest.Mock;
            postMessage: jest.Mock;
          };
        }
      | undefined;
    expect(createWebviewPanel).toHaveBeenLastCalledWith(
      'rsx.expressionTesterReport',
      'RS-X Results: subtotalRsx',
      expect.anything(),
      expect.objectContaining({ enableScripts: true }),
    );
    expect(reportPanel?.webview.html).toContain(
      'Evaluated 1 affected expression.',
    );
    expect(reportPanel?.webview.html).toContain('subtotalRsx');
    expect(reportPanel?.webview.html).toContain('New value');
    expect(reportPanel?.webview.html).toContain('Old value');
    expect(reportPanel?.webview.html).toContain('4');
    expect(reportPanel?.webview.html).toContain('class="treeIconButton"');
    expect(reportPanel?.webview.html).toContain(
      'aria-label="Open expression tree"',
    );
    expect(reportPanel?.webview.html).toContain('class="nameText"');
    expect(reportPanel?.webview.html).toContain('data-action="openExpression"');
    expect(reportPanel?.webview.html).toContain('class="linkItems"');
    expect(reportPanel?.webview.html).toContain(
      'grid-template-columns: minmax(112px, 32%) 72px minmax(42px, 1fr);',
    );
    expect(reportPanel?.webview.html).not.toContain('Show tree');
    expect(reportPanel?.webview.html).not.toContain('Show expression');
    expect(reportPanel?.webview.html).toContain('color: var(--rsx-accent);');
    const treeClickMessages = clickRsxTesterReportTreeIcon(
      reportPanel?.webview.html ?? '',
      `${uri.toString()}#subtotalRsx`,
    );
    expect(treeClickMessages).toContainEqual({
      type: 'openTree',
      key: `${uri.toString()}#subtotalRsx`,
    });
    expect(reportPanel?.webview.html).toContain('--rsx-accent');
    expect(reportPanel?.webview.html).toContain('border-left: 2px solid');
    expect(reportPanel?.webview.html).not.toContain('button class="primary"');
    let entriesJson = reportPanel?.webview.html.match(
      /const entries = (?<json>.*?);\n\s*const diagnostics/su,
    )?.groups?.json;
    let entries = JSON.parse(entriesJson ?? '[]') as Array<{
      exportName: string;
      current: string;
      previous: string;
    }>;
    expect(entries).toContainEqual(
      expect.objectContaining({
        exportName: 'subtotalRsx',
        current: 'Waiting for value...',
        previous: 'No previous run',
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(reportPanel?.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'valueUpdate',
        current: '5',
        previous: 'No previous run',
      }),
    );

    modelText = 'export default { value: 6, enabled: false };';
    await runCommand?.(modelDocument!.uri);
    entriesJson = reportPanel?.webview.html.match(
      /const entries = (?<json>.*?);\n\s*const diagnostics/su,
    )?.groups?.json;
    entries = JSON.parse(entriesJson ?? '[]') as Array<{
      exportName: string;
      current: string;
      previous: string;
    }>;
    expect(entries).toContainEqual(
      expect.objectContaining({
        exportName: 'subtotalRsx',
        current: 'Waiting for value...',
        previous: '5',
      }),
    );
    expect(reportPanel?.webview.html).not.toContain('No previous run');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(reportPanel?.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'valueUpdate',
        current: '7',
        previous: '5',
      }),
    );

    showOpenDialog.mockResolvedValueOnce([
      createUri('/workspace/saved-models/subtotal-resource.rsx-model.ts'),
    ]);
    readFile.mockImplementationOnce((target: { fsPath: string }) =>
      Buffer.from(
        target.fsPath.endsWith('subtotal-resource.rsx-model.ts')
          ? 'export default { value: 12, enabled: false };'
          : '',
        'utf8',
      ),
    );
    await loadCommand?.({ resourceUri: modelDocument!.uri });
    expect(modelText).toBe('export default { value: 12, enabled: false };');
    expect(showInformationMessage).toHaveBeenCalledWith(
      'Loaded RS-X model from subtotal-resource.rsx-model.ts.',
    );
    await runCommand?.({ resourceUri: modelDocument!.uri });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(reportPanel?.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'valueUpdate',
        current: '13',
        previous: 'No previous run',
      }),
    );

    modelText = '{ value: "bad", enabled: false }';
    await runCommand?.(modelDocument!.uri);
    expect(reportPanel?.webview.html).toContain(
      'Model template has validation errors.',
    );
    expect(reportPanel?.webview.html).toContain(
      "Type 'string' is not assignable",
    );

    const reportMessageHandler = reportPanel?.webview.onDidReceiveMessage.mock
      .calls[0]?.[0] as ((message: unknown) => Promise<void>) | undefined;
    await reportMessageHandler?.({
      type: 'openTree',
      key: `${uri.toString()}#subtotalRsx`,
    });
    expect(reportPanel?.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'treeVisibility',
        key: `${uri.toString()}#subtotalRsx`,
        visible: true,
      }),
    );
    const treePanel = createWebviewPanel.mock.results.at(-1)?.value as
      | { webview: { html: string } }
      | undefined;
    expect(treePanel?.webview.html).toContain('RS-X Tree: subtotalRsx');
    expect(treePanel?.webview.html).toContain('nodeValueLabel');
    const testerTreeGraphJson = treePanel?.webview.html.match(
      /const graph = (?<json>.*?);\n    const canvas/su,
    )?.groups?.json;
    const testerTreeGraph = JSON.parse(testerTreeGraphJson ?? '{}') as {
      nodes: Array<{ expressionText: string; valueText?: string }>;
    };
    expect(testerTreeGraph.nodes.length).toBeGreaterThan(0);
    expect(testerTreeGraph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          expressionText: 'value',
          valueText: '12',
        }),
      ]),
    );
    expect(testerTreeGraph.nodes.every((node) => node.valueText)).toBe(true);

    await testCommand?.(total);
    modelText = '{ value: 4, enabled: false }';
    await runCommand?.(modelDocument!.uri);
    const linkedReportPanel = createWebviewPanel.mock.results.at(-1)?.value as
      | { webview: { html: string } }
      | undefined;
    const totalEntriesJson = linkedReportPanel?.webview.html.match(
      /const entries = (?<json>.*?);\n\s*const diagnostics/su,
    )?.groups?.json;
    const totalEntries = JSON.parse(totalEntriesJson ?? '[]') as Array<{
      exportName: string;
      dependencies: unknown[];
    }>;
    expect(totalEntries).toContainEqual(
      expect.objectContaining({
        exportName: 'totalRsx',
        dependencies: [],
      }),
    );
    expect(linkedReportPanel?.webview.html).not.toContain('Depends on');

    await testCommand?.(positiveScore);
    modelText = '{ value: 4, enabled: false }';
    await runCommand?.(modelDocument!.uri);
    const expressionDependencyPanel = createWebviewPanel.mock.results.at(-1)
      ?.value as
      | {
          webview: {
            html: string;
            postMessage: jest.Mock;
          };
        }
      | undefined;
    expect(expressionDependencyPanel?.webview.html).toContain(
      'Evaluated 1 affected expression.',
    );
    expect(expressionDependencyPanel?.webview.html).toContain(
      'dependencyInspector',
    );
    expect(expressionDependencyPanel?.webview.html).toContain(
      'positiveScoreRsx',
    );
    expect(expressionDependencyPanel?.webview.html).toContain(
      'class="expressionCodeLink"',
    );
    expect(expressionDependencyPanel?.webview.html).toContain(
      '"label":"valuePositive"',
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(expressionDependencyPanel?.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        key: `${uri.toString()}#positiveScoreRsx`,
        current: '1',
        dependencies: expect.arrayContaining([
          expect.objectContaining({
            label: 'valuePositive',
            source: 'expression',
            state: 'ready',
            value: 'true',
          }),
        ]),
      }),
    );

    const models = await provider.getChildren(roots[1]);
    const fields = (await provider.getChildren(models[0])) as Array<{
      label: string;
    }>;
    const valueField = fields.find((field) => field.label === 'value');
    await testCommand?.(valueField);
    expect(modelText).toContain('value: 0');
    expect(modelText).not.toContain('enabled: false');

    modelText = '{ value: 8 }';
    await runCommand?.(modelDocument!.uri);
    const fieldPanel = createWebviewPanel.mock.results.at(-1)?.value as
      | { webview: { html: string } }
      | undefined;
    expect(fieldPanel?.webview.html).toContain('Test RS-X Field: value');
    expect(fieldPanel?.webview.html).toContain('subtotalRsx');
    expect(fieldPanel?.webview.html).not.toContain('enabledLabelRsx');
  });

  it('replaces an already-open tester document with a fresh model template', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    registerCommand.mockClear();
    registerTreeDataProvider.mockClear();
    workspaceFolders = [{ name: 'workspace', uri: createUri('/workspace') }];
    const uri = createUri('/workspace/src/rules/model.expressions.rsx');
    const fixtureText = [
      'defaults:',
      '  model: { value: number }',
      '',
      'expression: subtotalRsx',
      '  value + 1',
    ].join('\n');
    let diskModelText = '';
    let openBufferText = [
      'const model: __RsxTesterModel = {',
      '  value: 999',
      '};',
      '',
      'export default model;',
      '',
      '/* RS-X Expression Values',
      '[]',
      '*/',
    ].join('\n');
    let openedDocument:
      | ReturnType<typeof createMutableTextDocument>
      | undefined;

    findFiles.mockResolvedValue([uri]);
    readFile.mockImplementation((target: { fsPath: string }) =>
      Buffer.from(target.fsPath === uri.fsPath ? fixtureText : '', 'utf8'),
    );
    writeFile.mockImplementation(
      async (_target: unknown, content: Uint8Array) => {
        diskModelText = new TextDecoder().decode(content);
      },
    );
    openTextDocument.mockImplementation(async (target: { fsPath?: string }) => {
      openedDocument = createMutableTextDocument(() => openBufferText, {
        languageId: 'typescript',
        scheme: 'file',
        fsPath: target.fsPath ?? '/workspace/.rsx/subtotalRsx.rsx-model.ts',
      });
      textDocuments.push(openedDocument);
      return openedDocument;
    });
    applyEdit.mockImplementationOnce(
      async (edit: { replacements?: Array<{ text: string }> }) => {
        openBufferText = edit.replacements?.[0]?.text ?? openBufferText;
        return true;
      },
    );
    showTextDocument.mockImplementation(async (document: unknown) => ({
      document,
      revealRange: jest.fn(),
    }));

    try {
      activate(context as never);

      const provider = getRegisteredExpressionsProvider() as {
        getChildren(element?: unknown): Promise<unknown[]>;
      };
      const roots = await provider.getChildren();
      const files = await provider.getChildren(roots[0]);
      const expressions = (await provider.getChildren(files[0])) as Array<{
        exportName: string;
      }>;
      const subtotal = expressions.find(
        (expression) => expression.exportName === 'subtotalRsx',
      );
      const testCommand = registerCommand.mock.calls
        .filter(([command]) => command === 'rsx.expressions.test')
        .at(-1)?.[1] as ((item: unknown) => Promise<void>) | undefined;

      await testCommand?.(subtotal);

      expect(openBufferText).toBe(diskModelText);
      expect(openBufferText).toContain('value: 0');
      expect(openBufferText).not.toContain('value: 999');
      expect(applyEdit).toHaveBeenCalled();
      expect(openedDocument?.save).toHaveBeenCalled();

      const firstTesterPath = (
        writeFile.mock.calls.at(-1)?.[0] as {
          fsPath?: string;
        }
      )?.fsPath;
      await testCommand?.(subtotal);
      const secondTesterPath = (
        writeFile.mock.calls.at(-1)?.[0] as {
          fsPath?: string;
        }
      )?.fsPath;
      expect(secondTesterPath).toMatch(
        /subtotalRsx-\d{14}-[a-z0-9]{6}\.rsx-model\.ts$/u,
      );
      expect(secondTesterPath).not.toBe(firstTesterPath);
    } finally {
      workspaceFolders = undefined;
      findFiles.mockReset();
      readFile.mockReset();
      writeFile.mockReset();
      openTextDocument.mockReset();
      showTextDocument.mockReset();
      applyEdit.mockReset();
    }
  });

  it('keeps expression-valued dependency inspector entries ready after parent emits', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    workspaceFolders = [{ name: 'workspace', uri: createUri('/workspace') }];
    const uri = createUri('/workspace/src/rules/shipping.expressions.rsx');
    const fixtureText = [
      'defaults:',
      '  model: { country: string; hazmat: boolean; customerTier: string; getHandlingFee(country: string, ground: boolean): number }',
      '',
      'expression: countryRsx',
      '  country',
      '',
      'expression: availableGroundRsx',
      "  (country === 'NL' || country === 'DE') && !hazmat",
      '',
      'expression: availableAirRsx',
      "  customerTier !== 'starter'",
      '',
      'expression: availableCourierRsx',
      "  country !== 'NO' && customerTier !== 'starter'",
      '',
      'expression: handlingFeeRsx',
      '  getHandlingFee(country, availableGround)',
      '',
      'expression: availableMethodCountRsx',
      '  availableGround',
      '    ? (availableAir ? (availableCourier ? 3 : 2) : (availableCourier ? 2 : 1))',
      '    : (availableAir ? (availableCourier ? 2 : 1) : (availableCourier ? 1 : 0))',
    ].join('\n');
    let modelText = '';
    let modelDocument: ReturnType<typeof createMutableTextDocument>;

    findFiles.mockResolvedValue([uri]);
    readFile.mockImplementation((target: { fsPath: string }) =>
      Buffer.from(target.fsPath === uri.fsPath ? fixtureText : '', 'utf8'),
    );
    writeFile.mockImplementation(
      async (_target: unknown, content: Uint8Array) => {
        modelText = new TextDecoder().decode(content);
      },
    );
    openTextDocument.mockImplementation(async (target: { fsPath?: string }) => {
      modelDocument = createMutableTextDocument(() => modelText, {
        languageId: 'typescript',
        scheme: 'file',
        fsPath:
          target.fsPath ??
          '/workspace/.rsx/availableMethodCountRsx.rsx-model.ts',
      });
      textDocuments.push(modelDocument);
      return modelDocument;
    });
    showTextDocument.mockImplementation(async (document: unknown) => ({
      document,
      edit: async (
        callback: (builder: {
          replace(range: unknown, text: string): void;
        }) => void,
      ) => {
        callback({
          replace: (_range, text) => {
            modelText = text;
          },
        });
        return true;
      },
      revealRange: jest.fn(),
    }));

    try {
      activate(context as never);

      const provider = getRegisteredExpressionsProvider() as {
        getChildren(element?: unknown): Promise<unknown[]>;
      };
      const roots = await provider.getChildren();
      const files = await provider.getChildren(roots[0]);
      const expressions = (await provider.getChildren(files[0])) as Array<{
        exportName: string;
      }>;
      const methodCount = expressions.find(
        (expression) => expression.exportName === 'availableMethodCountRsx',
      );
      const availableGround = expressions.find(
        (expression) => expression.exportName === 'availableGroundRsx',
      );
      const testCommand = registerCommand.mock.calls
        .filter(([command]) => command === 'rsx.expressions.test')
        .at(-1)?.[1] as ((item: unknown) => Promise<void>) | undefined;
      const runCommand = registerCommand.mock.calls
        .filter(([command]) => command === 'rsx.expressions.test.run')
        .at(-1)?.[1] as ((uri: unknown) => Promise<void>) | undefined;

      await testCommand?.(methodCount);
      modelText = [
        'export default {',
        "  country: 'NL',",
        '  hazmat: false,',
        "  customerTier: 'pro',",
        '  getHandlingFee: () => 7,',
        '};',
      ].join('\n');
      await runCommand?.(modelDocument!.uri);
      const reportPanel = createWebviewPanel.mock.results.at(-1)?.value as
        | {
            webview: {
              html: string;
              postMessage: jest.Mock;
            };
          }
        | undefined;

      expect(reportPanel?.webview.html).toContain('dependencyInspector');
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(reportPanel?.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          key: `${uri.toString()}#availableMethodCountRsx`,
          current: '3',
          dependencies: expect.arrayContaining([
            expect.objectContaining({
              label: 'availableGround',
              source: 'expression',
              state: 'ready',
              value: 'true',
            }),
            expect.objectContaining({
              label: 'availableAir',
              source: 'expression',
              state: 'ready',
              value: 'true',
            }),
            expect.objectContaining({
              label: 'availableCourier',
              source: 'expression',
              state: 'ready',
              value: 'true',
            }),
          ]),
        }),
      );

      const models = await provider.getChildren(roots[1]);
      await testCommand?.(models[0]);
      modelText = [
        'export default {',
        "  country: 'NL',",
        '  hazmat: false,',
        "  customerTier: 'pro',",
        '  getHandlingFee: () => 7,',
        '};',
      ].join('\n');
      await runCommand?.(modelDocument!.uri);
      const modelReportPanel = createWebviewPanel.mock.results.at(-1)?.value as
        | {
            webview: {
              html: string;
              postMessage: jest.Mock;
            };
          }
        | undefined;
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(modelReportPanel?.webview.html).toContain(
        'Evaluated 6 affected expressions.',
      );
      expect(modelReportPanel?.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          key: `${uri.toString()}#availableMethodCountRsx`,
          current: '3',
          dependencies: expect.arrayContaining([
            expect.objectContaining({
              label: 'availableGround',
              source: 'expression',
              state: 'ready',
              value: 'true',
            }),
            expect.objectContaining({
              label: 'availableAir',
              source: 'expression',
              state: 'ready',
              value: 'true',
            }),
            expect.objectContaining({
              label: 'availableCourier',
              source: 'expression',
              state: 'ready',
              value: 'true',
            }),
          ]),
        }),
      );
      const readyDependencyMessage =
        modelReportPanel?.webview.postMessage.mock.calls
          .map((call) => call[0])
          .find(
            (
              message,
            ): message is {
              type: string;
              key: string;
              current: string;
              previous: string;
              changed: boolean;
              dependencies: Array<{
                label: string;
                source: string;
                state: string;
                value: string;
                children?: Array<{
                  label: string;
                  source: string;
                  value: string;
                }>;
              }>;
            } =>
              message?.type === 'valueUpdate' &&
              message.key === `${uri.toString()}#availableMethodCountRsx` &&
              Array.isArray(message.dependencies) &&
              message.dependencies.every(
                (dependency: { state?: string }) =>
                  dependency.state === 'ready',
              ),
          );
      expect(readyDependencyMessage).toBeDefined();
      const renderedDependency = renderRsxTesterReportAfterValueUpdate(
        modelReportPanel?.webview.html ?? '',
        readyDependencyMessage!,
        `${uri.toString()}#availableMethodCountRsx`,
      );
      const renderedDependencyText = renderedDependency.text;
      expect(renderedDependencyText).toContain('availableGround');
      expect(renderedDependencyText).toContain('expression');
      expect(renderedDependencyText).toContain('true');
      expect(renderedDependencyText).not.toContain('ready · expression');
      expect(renderedDependencyText).not.toContain('pending · expression');
      expect(renderedDependencyText).not.toContain('Waiting for value...');
      expect(renderedDependency.html).toContain('class="dependencyStatusName"');
      expect(renderedDependency.html).toContain('data-action="openDependency"');
      expect(renderedDependency.html).toContain(
        `data-key="${uri.toString()}#availableGroundRsx"`,
      );

      await testCommand?.(availableGround);
      modelText = [
        'export default {',
        "  country: 'NL',",
        '  hazmat: false,',
        "  customerTier: 'pro',",
        '  getHandlingFee: () => 7,',
        '};',
      ].join('\n');
      await runCommand?.(modelDocument!.uri);
      const groundReportPanel = createWebviewPanel.mock.results.at(-1)
        ?.value as
        | { webview: { html: string; postMessage: jest.Mock } }
        | undefined;
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(groundReportPanel?.webview.html).toContain('availableGroundRsx');
      expect(groundReportPanel?.webview.html).toContain('country ===');
      expect(groundReportPanel?.webview.html).not.toContain(
        'data-key="' + `${uri.toString()}#countryRsx` + '"',
      );
      expect(groundReportPanel?.webview.html).not.toContain(
        'class="expressionCodeLink" data-action="openLinkedExpression" data-key="' +
          `${uri.toString()}#countryRsx` +
          '"',
      );
      const groundDependencyMessage =
        groundReportPanel?.webview.postMessage.mock.calls
          .map((call) => call[0])
          .find(
            (
              message,
            ): message is {
              type: string;
              key: string;
              dependencies: Array<{
                key: string;
                label: string;
                source: string;
                state: string;
                value: string;
                uri: string;
                start: number;
                end: number;
              }>;
            } =>
              message?.type === 'valueUpdate' &&
              message.key === `${uri.toString()}#availableGroundRsx` &&
              Array.isArray(message.dependencies) &&
              message.dependencies.some(
                (dependency) =>
                  dependency.label === 'country' &&
                  dependency.source === 'model' &&
                  dependency.value === '"NL"',
              ) &&
              message.dependencies.some(
                (dependency) =>
                  dependency.label === 'hazmat' &&
                  dependency.source === 'model' &&
                  dependency.value === 'false',
              ),
          );
      expect(groundDependencyMessage).toBeDefined();
      const renderedGroundDependency = renderRsxTesterReportAfterValueUpdate(
        groundReportPanel?.webview.html ?? '',
        groundDependencyMessage!,
        `${uri.toString()}#availableGroundRsx`,
      );
      expect(renderedGroundDependency.text).toContain('country');
      expect(renderedGroundDependency.text).toContain('field');
      expect(renderedGroundDependency.text).toContain('"NL"');
      expect(renderedGroundDependency.text).not.toContain('ready · model');
      const dependencyClickMessages =
        clickRsxTesterReportDependencyAfterValueUpdate(
          groundReportPanel?.webview.html ?? '',
          groundDependencyMessage!,
          `${uri.toString()}#availableGroundRsx`,
          groundDependencyMessage!.dependencies.find(
            (dependency) => dependency.label === 'country',
          )!.key,
        );
      expect(dependencyClickMessages).toContainEqual({
        type: 'openExpression',
        uri: uri.toString(),
        start: expect.any(Number),
        end: expect.any(Number),
      });

      const handlingFee = expressions.find(
        (expression) => expression.exportName === 'handlingFeeRsx',
      );
      await testCommand?.(handlingFee);
      modelText = [
        'export default {',
        "  country: 'NL',",
        '  hazmat: false,',
        "  customerTier: 'pro',",
        '  getHandlingFee: () => 7,',
        '};',
      ].join('\n');
      await runCommand?.(modelDocument!.uri);
      const methodReportPanel = createWebviewPanel.mock.results.at(-1)
        ?.value as
        | { webview: { html: string; postMessage: jest.Mock } }
        | undefined;
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
      const methodDependencyMessage =
        methodReportPanel?.webview.postMessage.mock.calls
          .map((call) => call[0])
          .find(
            (
              message,
            ): message is {
              type: string;
              key: string;
              current: string;
              dependencies: Array<{
                key: string;
                label: string;
                source: string;
                state: string;
                value: string;
              }>;
            } =>
              message?.type === 'valueUpdate' &&
              message.key === `${uri.toString()}#handlingFeeRsx` &&
              message.current === '7' &&
              Array.isArray(message.dependencies) &&
              message.dependencies.some(
                (dependency) =>
                  dependency.label === 'getHandlingFee' &&
                  dependency.source === 'model' &&
                  dependency.value === '[function]' &&
                  Array.isArray(dependency.children) &&
                  dependency.children.some(
                    (child) =>
                      child.label === 'country' &&
                      child.source === 'model' &&
                      child.value === '"NL"',
                  ) &&
                  dependency.children.some(
                    (child) =>
                      child.label === 'availableGround' &&
                      child.source === 'expression' &&
                      child.value === 'true',
                  ),
              ),
          );
      expect(methodDependencyMessage).toBeDefined();
      const renderedMethodDependency = renderRsxTesterReportAfterValueUpdate(
        methodReportPanel?.webview.html ?? '',
        methodDependencyMessage!,
        `${uri.toString()}#handlingFeeRsx`,
      );
      expect(renderedMethodDependency.text).toContain('getHandlingFee');
      expect(renderedMethodDependency.text).toContain('field');
      expect(renderedMethodDependency.text).toContain('[function]');
      expect(renderedMethodDependency.text).toContain('country');
      expect(renderedMethodDependency.text).toContain('"NL"');
      expect(renderedMethodDependency.text).toContain('availableGround');
      expect(renderedMethodDependency.text).not.toContain('model');
    } finally {
      workspaceFolders = undefined;
      findFiles.mockReset();
      readFile.mockReset();
      writeFile.mockReset();
      openTextDocument.mockReset();
      showTextDocument.mockReset();
    }
  });

  it('generates contract-aware expression tester model documents', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    const fixtureDirectory = path.resolve(__dirname, 'fixtures');
    const uri = createUri(
      path.join(fixtureDirectory, 'rsx-tester-contract.fixture.rsx'),
    );

    findFiles.mockResolvedValue([uri]);
    readFile.mockImplementation((target: { fsPath: string }) =>
      fs.existsSync(target.fsPath)
        ? fs.readFileSync(target.fsPath)
        : Buffer.from('', 'utf8'),
    );
    let modelText = '';
    let modelDocument: ReturnType<typeof createMutableTextDocument>;
    writeFile.mockImplementation(
      async (_target: unknown, content: Uint8Array) => {
        modelText = new TextDecoder().decode(content);
      },
    );
    openTextDocument.mockImplementation(async (target: { fsPath?: string }) => {
      modelDocument = createMutableTextDocument(() => modelText, {
        languageId: 'typescript',
        scheme: 'file',
        fsPath:
          target.fsPath ??
          path.join(fixtureDirectory, 'contractRsx.rsx-model.ts'),
      });
      textDocuments.push(modelDocument);
      return modelDocument;
    });
    showTextDocument.mockImplementation(async (document: unknown) => ({
      document,
      edit: jest.fn(),
      revealRange: jest.fn(),
    }));

    activate(context as never);

    const provider = getRegisteredExpressionsProvider() as {
      getChildren(element?: unknown): Promise<unknown[]>;
    };
    const roots = await provider.getChildren();
    const files = await provider.getChildren(roots[0]);
    const expressions = (await provider.getChildren(files[0])) as Array<{
      exportName: string;
    }>;
    const contractRsx = expressions.find(
      (expression) => expression.exportName === 'defaultExpression',
    );
    const testCommand = registerCommand.mock.calls
      .filter(([command]) => command === 'rsx.expressions.test')
      .at(-1)?.[1] as ((item: unknown) => Promise<void>) | undefined;

    await testCommand?.(contractRsx);

    expect(modelText).toContain('type __RsxTesterModel =');
    expect(modelText).toContain('ShippingQuoteModelContract');
    expect(modelText).toContain('const model: __RsxTesterModel = {');
    expect(modelText).toContain('customerTier: "starter"');
    expect(modelText).toContain('country: "NL"');
    expect(modelText).toContain('destinationsByCode: {');
    expect(modelText).toContain('home: {');
    expect(modelText).toContain('destination: {');
    expect(modelText).toContain("city: ''");
    expect(modelText).toContain('priority: "standard"');
    expect(modelText).toContain('hazmat: false');
    expect(modelText).toContain('lines: [');
    expect(
      (modelText.match(/quantity: 0/gu) ?? []).length,
    ).toBeGreaterThanOrEqual(2);
    expect(modelText).toContain("sku: ''");
    expect(modelText).toContain('quantity: 0');
    expect(modelText).toContain('scoresByCode: {');
    expect(modelText).not.toContain('customerTier: undefined');

    const runCommand = registerCommand.mock.calls
      .filter(([command]) => command === 'rsx.expressions.test.run')
      .at(-1)?.[1] as ((uri: unknown) => Promise<void>) | undefined;
    modelText = modelText.replace(
      'customerTier: "starter"',
      'customerTier: undefined',
    );
    await runCommand?.(modelDocument!.uri);

    const reportPanel = createWebviewPanel.mock.results.at(-1)?.value as
      | { webview: { html: string } }
      | undefined;
    expect(reportPanel?.webview.html).toContain(
      'Model template has validation errors.',
    );
    expect(reportPanel?.webview.html).toContain(
      "Type 'undefined' is not assignable",
    );
  });

  it('runs field tester reports for descendant collection field dependencies', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    workspaceFolders = [{ name: 'workspace', uri: createUri('/workspace') }];
    const uri = createUri('/workspace/src/rules/line-model.expressions.rsx');
    const fixtureText = [
      'defaults:',
      '  model: { lines: Array<{ sku: string; qty: number; unitPrice: number }>; enabled: boolean }',
      '',
      'expression: lineCountRsx',
      '  lines.length',
      '',
      'expression: lineQuantityRsx',
      '  lines.reduce((sum, line) => sum + line.qty, 0)',
      '',
      'expression: lineProjectionRsx',
      '  lines.map((line) => ({ sku: line.sku, total: line.qty * line.unitPrice }))',
      '',
      'expression: enabledLabelRsx',
      "  enabled ? 'yes' : 'no'",
    ].join('\n');

    findFiles.mockResolvedValue([uri]);
    readFile.mockImplementation((target: { fsPath: string }) =>
      Buffer.from(target.fsPath === uri.fsPath ? fixtureText : '', 'utf8'),
    );
    let modelText = '';
    let modelDocument: ReturnType<typeof createMutableTextDocument>;
    writeFile.mockImplementation(
      async (_target: unknown, content: Uint8Array) => {
        modelText = new TextDecoder().decode(content);
      },
    );
    openTextDocument.mockImplementation(async (target: { fsPath?: string }) => {
      modelDocument = createMutableTextDocument(() => modelText, {
        languageId: 'typescript',
        scheme: 'file',
        fsPath: target.fsPath ?? '/workspace/.rs/lines.rsx-model.ts',
      });
      textDocuments.push(modelDocument);
      return modelDocument;
    });
    showTextDocument.mockImplementation(async (document: unknown) => ({
      document,
      edit: jest.fn(),
      revealRange: jest.fn(),
    }));

    activate(context as never);

    const provider = getRegisteredExpressionsProvider() as {
      getChildren(element?: unknown): Promise<unknown[]>;
    };
    const roots = await provider.getChildren();
    const models = await provider.getChildren(roots[1]);
    const model = models[0];
    const testCommand = registerCommand.mock.calls
      .filter(([command]) => command === 'rsx.expressions.test')
      .at(-1)?.[1] as ((item: unknown) => Promise<void>) | undefined;
    const runCommand = registerCommand.mock.calls
      .filter(([command]) => command === 'rsx.expressions.test.run')
      .at(-1)?.[1] as ((uri: unknown) => Promise<void>) | undefined;

    await testCommand?.(model);
    expect(modelText).toContain('lines: [');
    expect(modelText).toContain('enabled: false');
    await runCommand?.(modelDocument!.uri);

    const modelReportPanel = createWebviewPanel.mock.results.at(-1)?.value as
      | { webview: { html: string } }
      | undefined;
    expect(modelReportPanel?.webview.html).toContain(
      'Evaluated 4 affected expressions.',
    );
    expect(modelReportPanel?.webview.html).toContain('lineCountRsx');
    expect(modelReportPanel?.webview.html).toContain('lineQuantityRsx');
    expect(modelReportPanel?.webview.html).toContain('lineProjectionRsx');
    expect(modelReportPanel?.webview.html).toContain('enabledLabelRsx');

    const modelFields = (await provider.getChildren(models[0])) as Array<{
      label: string;
    }>;
    const linesField = modelFields.find((field) => field.label === 'lines');
    await testCommand?.(linesField);
    expect(modelText).toContain('lines: [');
    expect(modelText).not.toContain('enabled: false');

    await runCommand?.(modelDocument!.uri);

    const reportPanel = createWebviewPanel.mock.results.at(-1)?.value as
      | { webview: { html: string } }
      | undefined;
    expect(reportPanel?.webview.html).toContain(
      'Evaluated 3 affected expressions.',
    );
    expect(reportPanel?.webview.html).toContain('lineCountRsx');
    expect(reportPanel?.webview.html).toContain('lineQuantityRsx');
    expect(reportPanel?.webview.html).toContain('lineProjectionRsx');
    expect(reportPanel?.webview.html).not.toContain('enabledLabelRsx');
  });

  it('validates expression tester model templates against extensionless rsx imports', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    const fixtureDirectory = path.resolve(
      __dirname,
      '../../rs-x-compiler/tests/fixtures',
    );
    const sourceUri = createUri(
      path.join(
        fixtureDirectory,
        'expression-file-external-expression-ref-source.fixture.rsx',
      ),
    );
    const consumerUri = createUri(
      path.join(
        fixtureDirectory,
        'expression-file-external-expression-ref-consumer.fixture.rsx',
      ),
    );

    findFiles.mockResolvedValue([sourceUri, consumerUri]);
    readFile.mockImplementation((target: { fsPath: string }) =>
      fs.existsSync(target.fsPath)
        ? fs.readFileSync(target.fsPath)
        : Buffer.from('', 'utf8'),
    );
    let modelText = '';
    let modelDocument: ReturnType<typeof createMutableTextDocument>;
    writeFile.mockImplementation(
      async (_target: unknown, content: Uint8Array) => {
        modelText = new TextDecoder().decode(content);
      },
    );
    openTextDocument.mockImplementation(async (target: { fsPath?: string }) => {
      modelDocument = createMutableTextDocument(() => modelText, {
        languageId: 'typescript',
        scheme: 'untitled',
        fsPath:
          target.fsPath ??
          path.join(fixtureDirectory, 'composedExternalTotal.rsx-model.ts'),
      });
      textDocuments.push(modelDocument);
      return modelDocument;
    });
    showTextDocument.mockImplementation(async (document: unknown) => ({
      document,
      edit: async (
        callback: (builder: {
          insert(position: unknown, text: string): void;
          replace(range: unknown, text: string): void;
        }) => void,
      ) => {
        callback({
          insert: (_position, text) => {
            modelText = text;
          },
          replace: (_range, text) => {
            modelText = text;
          },
        });
        return true;
      },
      revealRange: jest.fn(),
    }));

    activate(context as never);

    const provider = getRegisteredExpressionsProvider() as {
      getChildren(element?: unknown): Promise<unknown[]>;
    };
    const roots = await provider.getChildren();
    const files = await provider.getChildren(roots[0]);
    const expressions = (
      await Promise.all(files.map((file) => provider.getChildren(file)))
    ).flat() as Array<{ exportName: string }>;
    const composedExternalTotal = expressions.find(
      (expression) => expression.exportName === 'composedExternalTotal',
    );

    const testCommand = registerCommand.mock.calls
      .filter(([command]) => command === 'rsx.expressions.test')
      .at(-1)?.[1] as ((item: unknown) => Promise<void>) | undefined;
    await testCommand?.(composedExternalTotal);

    const runCommand = registerCommand.mock.calls
      .filter(([command]) => command === 'rsx.expressions.test.run')
      .at(-1)?.[1] as ((uri: unknown) => Promise<void>) | undefined;
    expect(modelText).toContain(
      "import { rsx } from '@rs-x/expression-parser';",
    );
    expect(modelText).toContain('const __rsxTester_sourceTotal = rsx<number>');
    expect(modelText).toContain('c: __rsxTester_sourceTotal({');
    expect(modelText).toContain('value: 0');
    expect(modelText).not.toContain('/Users/robertsanders');
    await runCommand?.(modelDocument!.uri);

    expect(modelText).not.toContain(
      "Cannot find module './expression-file-external-expression-ref-source.fixture'",
    );
    const reportPanel = createWebviewPanel.mock.results.at(-1)?.value as
      | { webview: { html: string } }
      | undefined;
    expect(reportPanel?.webview.html).toContain(
      'Evaluated 1 affected expression.',
    );
    expect(reportPanel?.webview.html).not.toContain(
      'Model template has validation errors.',
    );
    expect(reportPanel?.webview.html).toContain('composedExternalTotal');
    expect(reportPanel?.webview.html).toContain('2');

    modelText = 'export default { c: 4 };';
    await runCommand?.(modelDocument!.uri);
    expect(reportPanel?.webview.html).toContain(
      'Model template has validation errors.',
    );
    expect(reportPanel?.webview.html).toContain(
      "Type 'number' is not assignable",
    );
  });

  it('opens expression tree selections in the first editor group and reuses visible editors', async () => {
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

    const provider = getRegisteredExpressionsProvider() as {
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
      setDecorations: jest.fn(),
      selection: undefined,
      viewColumn: 1,
    };
    visibleTextEditors.length = 0;
    openTextDocument.mockResolvedValueOnce(document);
    showTextDocument.mockResolvedValueOnce(editor);
    const emptyEditorGroup = { viewColumn: 1, tabs: [] };
    const openedEditorGroup = { viewColumn: 2, tabs: [{}] };
    tabGroupsAll = [emptyEditorGroup, openedEditorGroup];
    tabGroupsClose.mockClear();

    await openCommand?.(expression);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(showTextDocument).toHaveBeenCalledWith(
      document,
      expect.objectContaining({
        viewColumn: 1,
        preview: true,
      }),
    );
    expect(tabGroupsClose).toHaveBeenCalledWith([emptyEditorGroup], true);
    expect(editor.revealRange).toHaveBeenCalled();
    expect(createTextEditorDecorationType).toHaveBeenCalledWith(
      expect.objectContaining({
        isWholeLine: true,
        borderWidth: '0 0 0 4px',
        borderStyle: 'solid',
        borderColor: expect.objectContaining({ id: 'focusBorder' }),
        overviewRulerColor: expect.objectContaining({
          id: 'focusBorder',
        }),
      }),
    );
    expect(createTextEditorDecorationType).toHaveBeenCalledWith(
      expect.objectContaining({
        backgroundColor: 'rgba(0, 95, 184, 0.82)',
        color: '#ffffff',
      }),
    );
    expect(createTextEditorDecorationType).not.toHaveBeenCalledWith(
      expect.objectContaining({
        textDecoration: expect.anything(),
        border: expect.anything(),
        outline: expect.anything(),
        outlineColor: expect.anything(),
        outlineOffset: expect.anything(),
      }),
    );
    expect(editor.setDecorations).toHaveBeenCalledWith(expect.anything(), [
      expect.anything(),
    ]);
    expect(editor.setDecorations).not.toHaveBeenCalledWith(
      expect.anything(),
      [],
    );
    expect(editor.setDecorations).not.toHaveBeenCalledWith(
      expect.anything(),
      [],
    );
    tabGroupsAll = [];

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
        viewColumn: 1,
        preview: true,
      }),
    );
    expect(editor.selection).toEqual(
      expect.objectContaining({
        start: document.positionAt(text.indexOf('{ value: number }')),
        end: document.positionAt(text.indexOf('{ value: number }')),
      }),
    );
    expect(editor.setDecorations).toHaveBeenLastCalledWith(expect.anything(), [
      expect.objectContaining({
        start: document.positionAt(text.indexOf('{ value: number }')),
        end: document.positionAt(
          text.indexOf('{ value: number }') + '{ value: number }'.length,
        ),
      }),
    ]);
    tabGroupsClose.mockClear();
    const tabsChanged = tabGroupsOnDidChangeTabs.mock.calls.at(-1)?.[0] as
      | ((event: { closed: unknown[] }) => void)
      | undefined;
    tabsChanged?.({
      closed: [{ group: { viewColumn: 1, tabs: [] } }],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(tabGroupsClose).not.toHaveBeenCalled();

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
        end: document.positionAt(text.indexOf('value: number')),
      }),
    );
    expect(editor.setDecorations).toHaveBeenLastCalledWith(expect.anything(), [
      expect.objectContaining({
        start: document.positionAt(text.indexOf('value: number')),
        end: document.positionAt(
          text.indexOf('value: number') + 'value'.length,
        ),
      }),
    ]);

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
        end: document.positionAt(expressionValueOffset),
      }),
    );
    expect(editor.setDecorations).toHaveBeenLastCalledWith(expect.anything(), [
      expect.objectContaining({
        start: document.positionAt(expressionValueOffset),
        end: document.positionAt(expressionValueOffset + 'value'.length),
      }),
    ]);
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

  it('reports invalid lazy options while editing module .rsx headers', () => {
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
        '  model: { base: number; adjustment: number }',
        '',
        'expression: matrixPreparsedTreeLazyNoneRsx',
        '  preparse: false',
        '  compiled: false',
        '  lazy: true',
        '  return: number',
        '  base + adjustment + 252',
        '',
        'expression: matrixLazyGroupImplicitRsx',
        '  preparse: false',
        '  compiled: false',
        '  lazyGroup: matrix',
        '  return: number',
        '  base + adjustment + 259',
      ].join('\n'),
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
          message: invalidLazyPreparseDiagnosticMessage,
        }),
      ]),
    );
    expect(
      (diagnostics ?? []).filter(
        (diagnostic) =>
          diagnostic.message === invalidLazyPreparseDiagnosticMessage,
      ),
    ).toHaveLength(2);
  });

  it('sets module .rsx compiler options from the editor context menu command', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };

    registerCommand.mockClear();
    showQuickPick.mockImplementation(async (items: Array<{ label: string }>) =>
      items.find((item) => item.label === 'Toggle lazy'),
    );
    activate(context as never);

    const command = registerCommand.mock.calls.find(
      ([commandName]) => commandName === 'rsx.expressions.setCompilerOption',
    )?.[1] as (() => Promise<void>) | undefined;
    const text = [
      'defaults:',
      '  model: { base: number; adjustment: number }',
      '',
      'expression: totalRsx',
      '  preparse: true',
      '  compiled: false',
      '  return: number',
      '  base + adjustment',
    ].join('\n');
    const document = createTextDocument(text, {
      fsPath: '/workspace/src/rules/total.expressions.rsx',
    });
    activeTextEditor = {
      document,
      selection: {
        active: { line: 5, character: 4 },
      },
    };

    await command?.();

    const edit = applyEdit.mock.calls.at(-1)?.[0] as
      | { replacements?: Array<{ range: unknown; text: string }> }
      | undefined;
    expect(edit?.replacements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: '  lazy: true\n',
        }),
      ]),
    );
    expect(showWarningMessage).not.toHaveBeenCalledWith(
      invalidLazyPreparseDiagnosticMessage,
    );
    activeTextEditor = null;
    showQuickPick.mockReset();
    applyEdit.mockClear();
  });

  it('sets module .rsx compiler options from an expression panel node context menu command', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };

    registerCommand.mockClear();
    openTextDocument.mockClear();
    activate(context as never);

    const command = registerCommand.mock.calls.find(
      ([commandName]) => commandName === 'rsx.expressions.toggleLazy',
    )?.[1] as ((item?: unknown) => Promise<void>) | undefined;
    const text = [
      'defaults:',
      '  model: { base: number; adjustment: number }',
      '',
      'expression: totalRsx',
      '  preparse: true',
      '  compiled: false',
      '  return: number',
      '  base + adjustment',
    ].join('\n');
    const document = createTextDocument(text, {
      fsPath: '/workspace/src/rules/total.expressions.rsx',
    });
    openTextDocument.mockResolvedValueOnce(document);
    activeTextEditor = null;

    await command?.({
      kind: 'expression',
      uri: document.uri,
      start: text.indexOf('totalRsx'),
    });

    expect(openTextDocument).toHaveBeenCalledWith(document.uri);
    const edit = applyEdit.mock.calls.at(-1)?.[0] as
      | { replacements?: Array<{ range: unknown; text: string }> }
      | undefined;
    expect(edit?.replacements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: '  lazy: true\n',
        }),
      ]),
    );
    activeTextEditor = null;
    applyEdit.mockClear();
    openTextDocument.mockReset();
  });

  it('organizes expression panel nodes and applies compiler options to dropped selections', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    const rsxUri = createUri('/workspace/src/rules/matrix.expressions.rsx');
    const text = [
      'expression: eagerRsx',
      '  model: {}',
      '  preparse: false',
      '  compiled: false',
      '  return: number',
      '  1',
      '',
      'expression: groupedLazyRsx',
      '  model: {}',
      '  preparse: true',
      '  compiled: false',
      '  lazyGroup: matrix',
      '  return: number',
      '  2',
      '',
      'expression: compiledGroupedLazyRsx',
      '  model: {}',
      '  preparse: true',
      '  compiled: true',
      '  lazyGroup: matrix',
      '  return: number',
      '  3',
    ].join('\n');
    workspaceFolders = [{ name: 'workspace', uri: createUri('/workspace') }];
    findFiles.mockResolvedValue([rsxUri]);
    readFile.mockImplementation(async (uri: { fsPath: string }) => {
      if (uri.fsPath !== rsxUri.fsPath) {
        throw new Error(`No mock file for ${uri.fsPath}`);
      }
      return Buffer.from(text, 'utf8');
    });
    const saveDocument = jest.fn(async () => true);
    applyEdit.mockResolvedValue(true as never);
    openTextDocument.mockImplementation(async (uri: { fsPath: string }) => ({
      ...createTextDocument(text, { fsPath: uri.fsPath }),
      save: saveDocument,
    }));

    try {
      activate(context as never);
      const provider = getRegisteredExpressionsProvider() as {
        getPanelTree(): Promise<
          Array<{
            key: string;
            label: string;
            children?: Array<{
              key: string;
              label: string;
              dropAction?: { option: string; value?: string };
              deleteOptionAction?: { option: string; remove?: boolean };
              canDeleteOptionAll?: boolean;
              children?: Array<{
                key: string;
                label: string;
                description?: string;
                tooltip?: string;
                children?: Array<{
                  key: string;
                  label: string;
                  description?: string;
                  tooltip?: string;
                }>;
              }>;
            }>;
          }>
        >;
      };
      const searchProvider = registerWebviewViewProvider.mock.calls
        .filter(([viewId]) => viewId === 'rsx.expressions')
        .at(-1)?.[1] as
        | {
            setCompilerOptionForPanelKeys(
              action: { option: string; value?: string; remove?: boolean },
              keys: readonly string[],
            ): Promise<void>;
          }
        | undefined;

      const tree = await provider.getPanelTree();
      const panelKeys = new Map<string, string[]>();
      const collectPanelKeys = (
        nodes: Array<{
          key: string;
          label: string;
          children?: Array<{
            key: string;
            label: string;
            children?: unknown[];
          }>;
        }>,
        pathParts: string[] = [],
      ): void => {
        for (const node of nodes) {
          const pathText = [...pathParts, node.label].join(' > ');
          panelKeys.set(node.key, [
            ...(panelKeys.get(node.key) ?? []),
            pathText,
          ]);
          collectPanelKeys(
            (node.children ?? []) as Array<{
              key: string;
              label: string;
              children?: unknown[];
            }>,
            [...pathParts, node.label],
          );
        }
      };
      collectPanelKeys(tree);
      expect(
        [...panelKeys.entries()].filter(([, paths]) => paths.length > 1),
      ).toEqual([]);
      expect(tree.map((node) => node.label)).toEqual(['Expressions', 'Models']);
      const expressionRoot = tree.find(
        (node) => node.key === 'root:expressions',
      );
      expect(expressionRoot?.children?.map((node) => node.label)).toEqual([
        'Hooks',
        'Definitions',
        'Instances',
        'Eager',
        'Lazy',
        'Compiled',
        'Preparsed',
      ]);
      const definitions = expressionRoot?.children?.find(
        (node) => node.label === 'Definitions',
      );
      const eager = expressionRoot?.children?.find(
        (node) => node.label === 'Eager',
      );
      const lazy = expressionRoot?.children?.find(
        (node) => node.label === 'Lazy',
      );
      const compiled = expressionRoot?.children?.find(
        (node) => node.label === 'Compiled',
      );

      expect(definitions?.children?.[0]).toEqual(
        expect.objectContaining({
          key: 'hooks:definitions',
          label: 'Assigned hooks',
          kind: 'hookGroup',
        }),
      );
      expect(definitions?.children?.[1]).toEqual(
        expect.objectContaining({ label: 'matrix.expressions.rsx' }),
      );
      expect(
        definitions?.children?.[1]?.children?.map((node) => node.label),
      ).toEqual(['compiledGroupedLazyRsx', 'eagerRsx', 'groupedLazyRsx']);
      expect(eager).toEqual(
        expect.objectContaining({
          dropAction: { option: 'lazy', value: 'false' },
        }),
      );
      expect(lazy?.children).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ label: 'Default' }),
          expect.objectContaining({ label: 'matrix' }),
        ]),
      );
      const lazyMatrixExpression = lazy?.children
        ?.find((node) => node.label === 'matrix')
        ?.children?.find((node) => node.label === 'groupedLazyRsx');
      expect(
        lazy?.children
          ?.find((node) => node.label === 'matrix')
          ?.children?.map((node) => node.label),
      ).toEqual(['compiledGroupedLazyRsx', 'groupedLazyRsx']);
      const lazyMatrixCompiledExpression = lazy?.children
        ?.find((node) => node.label === 'matrix')
        ?.children?.find((node) => node.label === 'compiledGroupedLazyRsx');
      const compiledGroupedExpression = compiled?.children?.find(
        (node) => node.label === 'compiledGroupedLazyRsx',
      );
      expect(lazyMatrixExpression).toEqual(
        expect.objectContaining({
          label: 'groupedLazyRsx',
          description: 'number',
          tooltip: 'src/rules/matrix.expressions.rsx',
        }),
      );
      expect(lazyMatrixExpression?.description).not.toContain('src/');
      expect(lazyMatrixExpression?.description).not.toContain('.rsx');
      expect(lazyMatrixCompiledExpression?.key).toContain(
        '::scope:expressions%3AlazyGroup%3Amatrix',
      );
      expect(compiledGroupedExpression?.key).toContain(
        '::scope:expressions%3Acompiled',
      );
      expect(compiledGroupedExpression?.key).not.toBe(
        lazyMatrixCompiledExpression?.key,
      );
      expect(compiled).toEqual(
        expect.objectContaining({
          dropAction: { option: 'compiled', value: 'true' },
          deleteOptionAction: { option: 'compiled', remove: true },
          canDeleteOptionAll: true,
        }),
      );
      const compiledExpressionKeys =
        compiled?.children?.map((node) => node.key) ?? [];
      applyEdit.mockClear();
      await searchProvider?.setCompilerOptionForPanelKeys(
        { option: 'compiled', remove: true },
        compiledExpressionKeys,
      );
      expect(applyEdit).toHaveBeenCalledTimes(1);
      expect(saveDocument).toHaveBeenCalledTimes(1);
      expect(
        (
          applyEdit.mock.calls[0]?.[0] as {
            replacements?: Array<{ text: string }>;
          }
        ).replacements?.[0]?.text,
      ).toBe('');
      textDocuments.push(
        createTextDocument(text.replace('compiled: false', 'compiled: true'), {
          fsPath: rsxUri.fsPath,
        }),
      );
      provider.refresh?.();
      const refreshedTree = await provider.getPanelTree();
      const refreshedExpressionRoot = refreshedTree.find(
        (node) => node.key === 'root:expressions',
      );
      const refreshedCompiled = refreshedExpressionRoot?.children?.find(
        (node) => node.label === 'Compiled',
      );
      expect(refreshedCompiled?.children?.map((node) => node.label)).toEqual([
        'compiledGroupedLazyRsx',
        'eagerRsx',
      ]);
      textDocuments.splice(0, textDocuments.length);
      applyEdit.mockClear();
      saveDocument.mockClear();

      const expressionKeys =
        definitions?.children?.[1]?.children?.map((node) => node.key) ?? [];
      const firstExpressionKey = expressionKeys[0] ?? '';
      await searchProvider?.setCompilerOptionForPanelKeys(
        { option: 'compiled', value: 'true' },
        expressionKeys,
      );

      expect(applyEdit).toHaveBeenCalledTimes(3);
      expect(saveDocument).toHaveBeenCalledTimes(3);
      expect(
        applyEdit.mock.calls.map(
          ([edit]) =>
            (
              edit as {
                replacements?: Array<{ text: string }>;
              }
            ).replacements?.[0]?.text,
        ),
      ).toEqual(['true', 'true', 'true']);

      applyEdit.mockClear();
      saveDocument.mockClear();
      await searchProvider?.setCompilerOptionForPanelKeys(
        { option: 'compiled', value: 'false' },
        expressionKeys,
      );
      await searchProvider?.setCompilerOptionForPanelKeys(
        { option: 'compiled', value: 'true' },
        [`instanceGroup:${firstExpressionKey.replace(/^expression:/u, '')}`],
      );
      await searchProvider?.setCompilerOptionForPanelKeys(
        { option: 'compiled', value: 'true' },
        ['model:anyModel'],
      );

      expect(applyEdit).not.toHaveBeenCalled();
      expect(saveDocument).not.toHaveBeenCalled();
    } finally {
      workspaceFolders = undefined;
      findFiles.mockReset();
      readFile.mockReset();
      openTextDocument.mockReset();
      textDocuments.splice(0, textDocuments.length);
      applyEdit.mockClear();
    }
  });

  it('groups expression panel roots by explicit rsx config projects', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    const shopUri = createUri(
      '/workspace/apps/shop/src/rules/shop.expressions.rsx',
    );
    const adminUri = createUri(
      '/workspace/apps/admin/src/rules/admin.expressions.rsx',
    );
    const configUri = createUri('/workspace/rsx.config.json');
    const shopText = [
      'expression: shopTotalRsx',
      '  model: { total: number }',
      '  return: number',
      '  total',
    ].join('\n');
    const adminText = [
      'expression: adminTotalRsx',
      '  model: { total: number }',
      '  return: number',
      '  total',
    ].join('\n');
    const configText = JSON.stringify({
      projects: [
        { name: 'shop', root: 'apps/shop' },
        { name: 'admin', root: 'apps/admin' },
      ],
    });
    workspaceFolders = [{ name: 'workspace', uri: createUri('/workspace') }];
    findFiles.mockImplementation(async (pattern: string) => {
      if (pattern === '**/*.rsx') {
        return [shopUri, adminUri];
      }
      if (pattern === '**/rsx.config.json') {
        return [configUri];
      }
      return [];
    });
    readFile.mockImplementation(async (uri: { fsPath: string }) => {
      if (uri.fsPath === shopUri.fsPath) {
        return Buffer.from(shopText, 'utf8');
      }
      if (uri.fsPath === adminUri.fsPath) {
        return Buffer.from(adminText, 'utf8');
      }
      if (uri.fsPath === configUri.fsPath) {
        return Buffer.from(configText, 'utf8');
      }
      throw new Error(`No mock file for ${uri.fsPath}`);
    });

    try {
      activate(context as never);
      const provider = getRegisteredExpressionsProvider() as {
        getPanelTree(): Promise<
          Array<{
            label: string;
            children?: Array<{ key: string; label: string }>;
          }>
        >;
      };

      const tree = await provider.getPanelTree();
      expect(tree.map((node) => node.label)).toEqual(['admin', 'shop']);
      expect(tree[0]?.children?.map((node) => node.label)).toEqual([
        'Expressions',
        'Models',
      ]);
      expect(tree[1]?.children?.map((node) => node.key)).toEqual([
        expect.stringContaining('root:expressions'),
        expect.stringContaining('root:models'),
      ]);
    } finally {
      workspaceFolders = undefined;
      findFiles.mockReset();
      readFile.mockReset();
    }
  });

  it('does not treat nested rsx config overrides as panel projects', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };
    const rootUri = createUri('/workspace/src/app/expressions/root-matrix.rsx');
    const overrideUri = createUri(
      '/workspace/src/app/expressions/override/nested-matrix.rsx',
    );
    const overrideConfigUri = createUri(
      '/workspace/src/app/expressions/override/rsx.config.json',
    );
    const packageUri = createUri('/workspace/package.json');
    const rootText = [
      'expression: rootMatrixRsx',
      '  model: { value: number }',
      '  return: number',
      '  value',
    ].join('\n');
    const overrideText = [
      'expression: overrideMatrixRsx',
      '  model: { value: number }',
      '  return: number',
      '  value + 1',
    ].join('\n');
    workspaceFolders = [{ name: 'workspace', uri: createUri('/workspace') }];
    findFiles.mockImplementation(async (pattern: string) => {
      if (pattern === '**/*.rsx') {
        return [rootUri, overrideUri];
      }
      if (pattern === '**/rsx.config.json') {
        return [overrideConfigUri];
      }
      return [];
    });
    readFile.mockImplementation(async (uri: { fsPath: string }) => {
      if (uri.fsPath === rootUri.fsPath) {
        return Buffer.from(rootText, 'utf8');
      }
      if (uri.fsPath === overrideUri.fsPath) {
        return Buffer.from(overrideText, 'utf8');
      }
      if (uri.fsPath === overrideConfigUri.fsPath) {
        return Buffer.from(
          JSON.stringify({ build: { debugChangeHooks: {} } }),
          'utf8',
        );
      }
      if (uri.fsPath === packageUri.fsPath) {
        return Buffer.from(JSON.stringify({ name: 'matrix' }), 'utf8');
      }
      throw new Error(`No mock file for ${uri.fsPath}`);
    });

    try {
      activate(context as never);
      const provider = getRegisteredExpressionsProvider() as {
        getPanelTree(): Promise<Array<{ label: string; children?: unknown[] }>>;
      };

      const tree = await provider.getPanelTree();
      expect(tree.map((node) => node.label)).toEqual(['Expressions', 'Models']);
      expect(tree.map((node) => node.label)).not.toContain('override');
    } finally {
      workspaceFolders = undefined;
      findFiles.mockReset();
      readFile.mockReset();
    }
  });

  it('contributes RS-X compiler option commands to expression panel node context menus', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'),
    ) as {
      activationEvents: string[];
      contributes: {
        commands: Array<{
          command: string;
          title: string;
        }>;
        menus: Record<
          string,
          Array<{
            command: string;
            when?: string;
            group?: string;
            toggled?: string;
          }>
        >;
      };
    };
    const expressionMenuCommands = [
      ...new Set(
        (manifest.contributes.menus['view/item/context'] ?? [])
          .filter(
            (item) =>
              item.when ===
              'view == rsx.expressions && viewItem =~ /(^|\\s)rsxExpression(\\s|$)/',
          )
          .map((item) => item.command),
      ),
    ];

    expect(expressionMenuCommands).toEqual(
      expect.arrayContaining([
        'rsx.expressions.toggleCompiled',
        'rsx.expressions.togglePreparse',
        'rsx.expressions.toggleLazy',
      ]),
    );
    expect(expressionMenuCommands).not.toContain(
      'rsx.expressions.editLazyGroup',
    );
    const webviewMenuCommands = [
      ...new Set(
        (manifest.contributes.menus['webview/context'] ?? [])
          .filter((item) =>
            item.when?.startsWith(
              "webviewId == 'rsx.expressions' && webviewSection == 'rsxExpression'",
            ),
          )
          .map((item) => item.command),
      ),
    ];
    expect(webviewMenuCommands).toEqual(
      expect.arrayContaining([
        'rsx.expressions.panel.toggleCompiled',
        'rsx.expressions.panel.togglePreparse',
        'rsx.expressions.panel.toggleLazy',
      ]),
    );
    expect(manifest.contributes.menus['webview/context']).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          command: 'rsx.expressions.panel.manageAssignedHooks',
          when: "webviewId == 'rsx.expressions' && (webviewSection == 'rsxExpression' || webviewSection == 'rsxExpressionInstance')",
        }),
        expect.objectContaining({
          command: 'rsx.expressions.panel.unassignDebugHook',
          when: "webviewId == 'rsx.expressions' && webviewSection == 'rsxExpressionHookAssignment'",
        }),
        expect.objectContaining({
          command: 'rsx.expressions.panel.enableAllExpressionHooks',
          when: "webviewId == 'rsx.expressions' && webviewSection == 'rsxExpressionHook' && rsxWebviewHookCanEnableAll",
        }),
        expect.objectContaining({
          command: 'rsx.expressions.panel.disableAllExpressionHooks',
          when: "webviewId == 'rsx.expressions' && webviewSection == 'rsxExpressionHook' && rsxWebviewHookCanDisableAll",
        }),
        expect.objectContaining({
          command: 'rsx.expressions.panel.unassignAllDebugHooks',
          when: "webviewId == 'rsx.expressions' && (webviewSection == 'rsxExpressionHooks' || webviewSection == 'rsxExpressionHook') && rsxWebviewHookCanUnassignAll",
        }),
        expect.objectContaining({
          command: 'rsx.expressions.panel.deleteCustomHooks',
          when: "webviewId == 'rsx.expressions' && (webviewSection == 'rsxCustomHooks' || webviewSection == 'rsxCustomHook') && rsxWebviewCustomHookCanDelete",
        }),
        expect.objectContaining({
          command: 'rsx.expressions.panel.deleteAllCompilerOption',
          when: "webviewId == 'rsx.expressions' && webviewSection == 'rsxExpressionOptionGroup' && rsxWebviewOptionCanDeleteAll",
        }),
        expect.objectContaining({
          command: 'rsx.expressions.add',
          when: "webviewId == 'rsx.expressions' && (webviewSection == 'rsxExpressionDefinitions' || webviewSection == 'rsxExpressionFile' || webviewSection == 'rsxExpression' || webviewSection == 'rsxExpressionInstance' || webviewSection == 'rsxModelFieldExpression')",
        }),
      ]),
    );
    const modelTestMenuItems = Object.values(manifest.contributes.menus)
      .flat()
      .filter(
        (item) =>
          (item.command === 'rsx.expressions.test' ||
            item.command === 'rsx.expressions.panel.test') &&
          item.when?.includes('rsxExpressionModel'),
      );
    expect(modelTestMenuItems).toEqual([]);
    expect(manifest.activationEvents).toContain('onCommand:rsx.project.init');
    expect(manifest.contributes.commands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          command: 'rsx.project.init',
          title: 'Init RS-X Project',
        }),
      ]),
    );
    expect(manifest.contributes.menus['explorer/context']).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          command: 'rsx.project.init',
          when: 'explorerResourceIsFolder || resourceFilename == package.json',
        }),
      ]),
    );
    expect(webviewMenuCommands).not.toContain(
      'rsx.expressions.panel.editLazyGroup',
    );
    expect(JSON.stringify(manifest.contributes.commands)).not.toContain(
      'rsx.expressions.panel.deleteDebugHooks',
    );
    expect(JSON.stringify(manifest.contributes.menus)).not.toContain(
      'rsx.expressions.panel.deleteDebugHooks',
    );
    expect(
      (manifest.contributes.menus['webview/context'] ?? [])
        .filter((item) => item.when?.includes('rsxExpressionHookAssignment'))
        .map((item) => item.command),
    ).toEqual(['rsx.expressions.panel.unassignDebugHook']);
    const webviewOptionMenuItems = (
      manifest.contributes.menus['webview/context'] ?? []
    )
      .filter((item) => item.group?.startsWith('rsx/options@'))
      .map((item) => ({
        command: item.command,
        when: item.when,
        toggled: item.toggled,
      }));
    expect(webviewOptionMenuItems).toEqual([
      {
        command: 'rsx.expressions.panel.toggleCompiled',
        when: "webviewId == 'rsx.expressions' && webviewSection == 'rsxExpression'",
        toggled: 'rsxWebviewExpressionCompiled',
      },
      {
        command: 'rsx.expressions.panel.togglePreparse',
        when: "webviewId == 'rsx.expressions' && webviewSection == 'rsxExpression'",
        toggled: 'rsxWebviewExpressionPreparse',
      },
      {
        command: 'rsx.expressions.panel.toggleLazy',
        when: "webviewId == 'rsx.expressions' && webviewSection == 'rsxExpression'",
        toggled: 'rsxWebviewExpressionLazy',
      },
      {
        command: 'rsx.expressions.panel.deleteAllCompilerOption',
        when: "webviewId == 'rsx.expressions' && webviewSection == 'rsxExpressionOptionGroup' && rsxWebviewOptionCanDeleteAll",
        toggled: undefined,
      },
    ]);
    expect(
      Object.values(manifest.contributes.menus)
        .flat()
        .filter((item) => item.group?.startsWith('rsx/options@'))
        .map((item) => item.command),
    ).not.toContain('rsx.expressions.editLazyGroup');
    expect(
      Object.values(manifest.contributes.menus)
        .flat()
        .filter((item) => item.group?.startsWith('rsx/options@'))
        .map((item) => item.command),
    ).not.toContain('rsx.expressions.panel.editLazyGroup');
    expect(
      manifest.contributes.commands
        .filter((item) => item.command.endsWith('Checked'))
        .map((item) => item.title),
    ).toEqual([]);
    expect(JSON.stringify(manifest.contributes.commands)).not.toContain('\\t✓');
  });

  it('blocks invalid lazy option changes from the editor context menu command', async () => {
    const context = {
      subscriptions: [] as Array<{ dispose(): void }>,
    };

    registerCommand.mockClear();
    showWarningMessage.mockClear();
    showQuickPick.mockImplementation(async (items: Array<{ label: string }>) =>
      items.find((item) => item.label === 'Toggle lazy'),
    );
    activate(context as never);

    const command = registerCommand.mock.calls.find(
      ([commandName]) => commandName === 'rsx.expressions.setCompilerOption',
    )?.[1] as (() => Promise<void>) | undefined;
    const text = [
      'defaults:',
      '  model: { base: number; adjustment: number }',
      '',
      'expression: totalRsx',
      '  preparse: false',
      '  compiled: false',
      '  return: number',
      '  base + adjustment',
    ].join('\n');
    const document = createTextDocument(text, {
      fsPath: '/workspace/src/rules/total.expressions.rsx',
    });
    activeTextEditor = {
      document,
      selection: {
        active: { line: 5, character: 4 },
      },
    };

    await command?.();

    expect(showWarningMessage).toHaveBeenCalledWith(
      invalidLazyPreparseDiagnosticMessage,
    );
    expect(applyEdit).not.toHaveBeenCalled();
    activeTextEditor = null;
    showQuickPick.mockReset();
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

function createMutableTextDocument(
  getText: () => string,
  options: { languageId?: string; scheme?: string; fsPath?: string } = {},
) {
  return {
    ...createTextDocument('', options),
    getText,
    save: jest.fn(async () => true),
  };
}

function getRegisteredExpressionsProvider(): unknown {
  return (
    registerWebviewViewProvider.mock.calls
      .filter(([viewId]) => viewId === 'rsx.expressions')
      .at(-1)?.[1] as { provider?: unknown } | undefined
  )?.provider;
}

function renderRsxTesterReportAfterValueUpdate(
  html: string,
  message: unknown,
  rowKey: string,
): { readonly html: string; readonly text: string } {
  const harness = createRsxTesterReportDomHarness(html);
  harness.dispatchMessage(message);
  const inspector = harness.document.querySelector(
    `.row[data-key="${harness.css.escape(rowKey)}"] [data-role="dependencyInspector"]`,
  );
  return {
    html: inspector?.innerHTML ?? '',
    text: inspector?.textContent ?? '',
  };
}

function clickRsxTesterReportDependencyAfterValueUpdate(
  html: string,
  message: unknown,
  rowKey: string,
  dependencyKey: string,
): unknown[] {
  const harness = createRsxTesterReportDomHarness(html);
  harness.dispatchMessage(message);
  const dependencyButton = harness.document.querySelector(
    `.row[data-key="${harness.css.escape(rowKey)}"] button[data-action="openDependency"][data-key="${harness.css.escape(dependencyKey)}"]`,
  );
  expect(dependencyButton).toBeDefined();
  dependencyButton?.dispatchEvent(
    new harness.window.MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    }),
  );
  return harness.messages;
}

function clickRsxTesterReportTreeIcon(html: string, rowKey: string): unknown[] {
  const harness = createRsxTesterReportDomHarness(html);
  const iconPath = harness.document.querySelector(
    `.row[data-key="${harness.css.escape(rowKey)}"] button[data-action="openTree"] svg path`,
  );
  expect(iconPath).toBeDefined();
  iconPath?.dispatchEvent(
    new harness.window.MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    }),
  );
  return harness.messages;
}

function createRsxTesterReportDomHarness(html: string): {
  readonly css: { escape(value: string): string };
  readonly document: Document;
  readonly dispatchMessage: (message: unknown) => void;
  readonly messages: unknown[];
  readonly window: Window;
} {
  const script = html.match(
    /<script nonce="[^"]*">(?<script>[\s\S]*?)<\/script>/u,
  )?.groups?.script;
  expect(script).toBeDefined();
  const reportDocument = document.implementation.createHTMLDocument('report');
  reportDocument.documentElement.innerHTML = html;
  const messages: unknown[] = [];
  const listeners = new Map<string, EventListener[]>();
  const reportWindow = {
    MouseEvent: window.MouseEvent,
    addEventListener: (type: string, listener: EventListener) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
  };
  const css = {
    escape: (value: string) => value.replace(/["\\]/gu, '\\$&'),
  };
  Function(
    'window',
    'document',
    'acquireVsCodeApi',
    'CSS',
    script!,
  )(
    reportWindow,
    reportDocument,
    () => ({ postMessage: (message: unknown) => messages.push(message) }),
    css,
  );
  return {
    css,
    document: reportDocument,
    dispatchMessage(message: unknown) {
      for (const listener of listeners.get('message') ?? []) {
        listener({ data: message } as MessageEvent);
      }
    },
    messages,
    window: reportWindow as Window,
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
    path: fsPath,
    with: (change: { path?: string }) => createUri(change.path ?? fsPath),
    toString: () => `file://${fsPath}`,
  };
}
