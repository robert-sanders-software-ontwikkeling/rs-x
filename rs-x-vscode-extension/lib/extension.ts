import * as path from 'node:path';

import ts from 'typescript';
import * as vscode from 'vscode';

import {
  createRsxSemanticClassificationContext,
  getRsxExpressionExports,
  parseRsxFileExpressions,
  resolveRsxSemanticTokenType,
  shouldEmitRsxSemanticToken,
  tokenizeRsxExpression,
} from '@rs-x/compiler';

import {
  canRenameRsxSymbolAtPosition,
  createRsxStandaloneLanguageService,
  getRsxCodeFixes,
  getRsxCompletionsAtPosition,
  getRsxDefinitionsAtPosition,
  getRsxDiagnostics,
  getRsxDocumentSymbols,
  getRsxHeaderImportDiagnosticsForText,
  getRsxHeaderImportHoverAtTextPosition,
  getRsxHeaderImportTypeDefinitionsAtTextPosition,
  getRsxHoverAtPosition,
  getRsxImplementationsAtPosition,
  getRsxReferencesAtPosition,
  getRsxRenameLocationsAtPosition,
  getRsxSemanticTokens,
  getRsxSignatureHelpAtPosition,
  getRsxSyntacticTokensForText,
  getRsxTypeDefinitionsAtPosition,
  rsxSemanticTokenModifiers,
  rsxSemanticTokenTypes,
} from './rsx-standalone-language-service';

const RSX_LANGUAGE_ID = 'rsx';
const WRAPPED_EXPRESSION_PREFIX = 'const __rsxExpression = (\n';
const WRAPPED_EXPRESSION_SUFFIX = '\n);\n';
const MODULE_TOP_LEVEL_HEADER_KEYS = ['defaults', 'expression'] as const;
const STANDALONE_TOP_LEVEL_HEADER_KEYS = ['model', 'return'] as const;
const FRESH_FILE_TOP_LEVEL_HEADER_KEYS = [
  ...MODULE_TOP_LEVEL_HEADER_KEYS,
  ...STANDALONE_TOP_LEVEL_HEADER_KEYS,
] as const;
const MODULE_EXPRESSION_HEADER_KEYS = [
  'model',
  'preparse',
  'lazy',
  'lazyGroup',
  'compiled',
  'compile',
  'return',
] as const;
const MODULE_OPTION_HEADER_KEYS = [
  'preparse',
  'lazy',
  'lazyGroup',
  'compiled',
  'compile',
] as const;
const RSX_HEADER_DIRECTIVE_KEYS = new Set<string>([
  ...MODULE_TOP_LEVEL_HEADER_KEYS,
  ...STANDALONE_TOP_LEVEL_HEADER_KEYS,
  ...MODULE_EXPRESSION_HEADER_KEYS,
]);
const RSX_HEADER_DIRECTIVE_HOVER_TEXT: Record<string, string> = {
  expression: 'expression: starts a named exported RS-X expression',
  defaults: 'defaults: shared headers for following expressions',
  model: 'model: expression input type',
  return: 'return: expression result type',
  preparse: 'preparse: pre-parse this expression during build',
  lazy: 'lazy: defer expression evaluation until observed',
  lazyGroup: 'lazyGroup: group lazy expression evaluation',
  compiled: 'compiled: emit compiled expression runtime code',
  compile: 'compile: emit compiled expression runtime code',
};
const HEADER_COMPLETION_TRIGGER_CHARACTERS = [
  ...'abcdefghijklmnopqrstuvwxyz',
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  '_',
] as const;
const RSX_DOCUMENT_SEMANTIC_TOKEN_POLICY = Object.freeze({
  emitOperatorTokens: false,
});

interface IRsxFileParts {
  headers: string[];
  body: string;
}

type IParsedRsxExpression = NonNullable<
  ReturnType<typeof parseRsxFileExpressions>
>['expressions'][number];

interface IModuleExpressionStandaloneService {
  document: NonNullable<ReturnType<typeof createRsxStandaloneLanguageService>>;
  position: number;
  expression: IParsedRsxExpression;
  standaloneExpressionStart: number;
}

interface IModuleHeaderStandaloneService {
  document: NonNullable<ReturnType<typeof createRsxStandaloneLanguageService>>;
  position: number;
  key: 'model' | 'return';
  originalValueStart: number;
  originalValueEnd: number;
}

interface IStandaloneServiceCacheEntry {
  version: number;
  service: ReturnType<typeof createRsxStandaloneLanguageService>;
}

interface IDocumentSemanticTokenCacheEntry {
  version: number;
  tokens: IRsxSemanticToken[];
}

interface IModuleExpressionCacheEntry {
  version: number;
  parsed: ReturnType<typeof parseRsxFileExpressions>;
  servicesByExpressionIndex: Map<
    number,
    IModuleExpressionStandaloneService | null
  >;
  diagnosticsByExpressionIndex: Map<number, vscode.Diagnostic[]>;
  semanticTokensByExpressionIndex: Map<number, IRsxSemanticToken[]>;
}

type IRsxSemanticToken = ReturnType<typeof getRsxSemanticTokens>[number];
type IRsxExpressionExport = ReturnType<typeof getRsxExpressionExports>[number];

interface IHeaderOrderState {
  readonly blockLabel: string;
  readonly seenHeaders: Set<string>;
  readonly expressionLineIndex?: number;
  readonly expressionName?: string;
  readonly expressionKeyStartCharacter?: number;
}

type IRsxModuleDiagnosticState =
  | 'topLevel'
  | 'defaultsHeaders'
  | 'expressionPrelude'
  | 'expressionBody';

interface IRsxExpressionTreeFile {
  readonly kind: 'file';
  readonly uri: vscode.Uri;
  readonly label: string;
  readonly description: string;
  readonly relativePath: string;
  readonly expressions: readonly IRsxExpressionTreeExpression[];
}

interface IRsxExpressionTreeExpression {
  readonly kind: 'expression';
  readonly uri: vscode.Uri;
  readonly exportName: string;
  readonly expression: IRsxExpressionExport['expression'];
  readonly start: number;
  readonly end: number;
}

type IRsxExpressionTreeItem =
  | IRsxExpressionTreeFile
  | IRsxExpressionTreeExpression;

const standaloneServiceCache = new Map<string, IStandaloneServiceCacheEntry>();
const moduleExpressionCache = new Map<string, IModuleExpressionCacheEntry>();
const documentSemanticTokenCache = new Map<
  string,
  IDocumentSemanticTokenCacheEntry
>();
const diagnosticsDebounceTimers = new Map<
  string,
  ReturnType<typeof setTimeout>
>();
const diagnosticsRequestIds = new Map<string, number>();
const modulePrewarmTimers = new Map<string, ReturnType<typeof setTimeout>>();
const moduleBackgroundWarmTimers = new Map<
  string,
  ReturnType<typeof setTimeout>
>();
const moduleBackgroundWarmRequestIds = new Map<string, number>();
let semanticTokensChangeEmitter: vscode.EventEmitter<void> | null = null;
const MODULE_FOCUSED_ANALYSIS_EXPRESSION_THRESHOLD = 50;
const MODULE_FOCUSED_ANALYSIS_TEXT_LENGTH_THRESHOLD = 20_000;

type IDiagnosticsMode = 'auto' | 'focused' | 'full';

export function activate(context: vscode.ExtensionContext): void {
  const diagnostics = vscode.languages.createDiagnosticCollection('rsx');
  context.subscriptions.push(diagnostics);
  const expressionsProvider = new RsxExpressionsTreeDataProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      'rsx.expressions',
      expressionsProvider,
    ),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('rsx.expressions.refresh', () => {
      expressionsProvider.refresh();
    }),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rsx.expressions.open',
      async (item?: IRsxExpressionTreeExpression) => {
        if (item?.kind === 'expression') {
          await openRsxExpressionTreeItem(item);
        }
      },
    ),
  );
  const expressionsWatcher =
    vscode.workspace.createFileSystemWatcher('**/*.rsx');
  context.subscriptions.push(expressionsWatcher);
  context.subscriptions.push(
    expressionsWatcher.onDidCreate(() => expressionsProvider.refresh()),
    expressionsWatcher.onDidChange(() => expressionsProvider.refresh()),
    expressionsWatcher.onDidDelete(() => expressionsProvider.refresh()),
  );
  const semanticTokensLegend = new vscode.SemanticTokensLegend(
    [...rsxSemanticTokenTypes],
    [...rsxSemanticTokenModifiers],
  );

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      RSX_LANGUAGE_ID,
      new RsxCompletionItemProvider(),
      '.',
      ...HEADER_COMPLETION_TRIGGER_CHARACTERS,
    ),
  );
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      RSX_LANGUAGE_ID,
      new RsxHoverProvider(),
    ),
  );
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      RSX_LANGUAGE_ID,
      new RsxDefinitionProvider(),
    ),
  );
  context.subscriptions.push(
    vscode.languages.registerTypeDefinitionProvider(
      RSX_LANGUAGE_ID,
      new RsxTypeDefinitionProvider(),
    ),
  );
  context.subscriptions.push(
    vscode.languages.registerReferenceProvider(
      RSX_LANGUAGE_ID,
      new RsxReferenceProvider(),
    ),
  );
  context.subscriptions.push(
    vscode.languages.registerImplementationProvider(
      RSX_LANGUAGE_ID,
      new RsxImplementationProvider(),
    ),
  );
  context.subscriptions.push(
    vscode.languages.registerRenameProvider(
      RSX_LANGUAGE_ID,
      new RsxRenameProvider(),
    ),
  );
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      RSX_LANGUAGE_ID,
      new RsxDocumentSymbolProvider(),
    ),
  );
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      RSX_LANGUAGE_ID,
      new RsxCodeActionProvider(),
      {
        providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
      },
    ),
  );
  context.subscriptions.push(
    vscode.languages.registerSignatureHelpProvider(
      RSX_LANGUAGE_ID,
      new RsxSignatureHelpProvider(),
      '(',
      ',',
    ),
  );
  semanticTokensChangeEmitter = new vscode.EventEmitter<void>();
  const semanticTokensProvider = new RsxSemanticTokensProvider(
    semanticTokensLegend,
    semanticTokensChangeEmitter,
  );
  context.subscriptions.push(semanticTokensChangeEmitter);
  context.subscriptions.push(
    vscode.languages.registerDocumentSemanticTokensProvider(
      RSX_LANGUAGE_ID,
      semanticTokensProvider,
      semanticTokensLegend,
    ),
  );
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(
      RSX_LANGUAGE_ID,
      new RsxDocumentFormattingEditProvider(),
    ),
  );
  context.subscriptions.push(
    vscode.languages.registerDocumentRangeFormattingEditProvider(
      RSX_LANGUAGE_ID,
      new RsxDocumentRangeFormattingEditProvider(),
    ),
  );

  const refreshDiagnosticsForDocument = (
    document: vscode.TextDocument,
    mode: IDiagnosticsMode = 'auto',
    debounceMs = 150,
  ) => {
    if (document.languageId !== RSX_LANGUAGE_ID) {
      return;
    }

    const key = document.uri.toString();
    const nextRequestId = (diagnosticsRequestIds.get(key) ?? 0) + 1;
    diagnosticsRequestIds.set(key, nextRequestId);

    const existingTimer = diagnosticsDebounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(
      () => {
        diagnosticsDebounceTimers.delete(key);
        if (diagnosticsRequestIds.get(key) !== nextRequestId) {
          return;
        }

        const currentDocument =
          vscode.workspace.textDocuments.find(
            (candidate) => candidate.uri.toString() === key,
          ) ?? document;
        if (currentDocument.languageId !== RSX_LANGUAGE_ID) {
          return;
        }

        const resolvedDiagnostics = computeDiagnosticsForDocument(
          currentDocument,
          mode,
        );
        if (diagnosticsRequestIds.get(key) !== nextRequestId) {
          return;
        }

        diagnostics.set(currentDocument.uri, resolvedDiagnostics);
      },
      Math.max(0, debounceMs),
    );

    diagnosticsDebounceTimers.set(key, timer);
  };

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      invalidateRsxDocumentAnalysis(document);
      scheduleModuleExpressionPrewarm(document, 0);
      refreshDiagnosticsForDocument(document, 'auto', 100);
    }),
  );
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      invalidateRsxDocumentAnalysis(event.document, {
        fireSemanticTokensChanged: true,
      });
      refreshDiagnosticsForDocument(event.document, 'auto', 180);
    }),
  );
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) =>
      scheduleModuleExpressionPrewarm(event.document, 60),
    ),
  );
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      invalidateRsxDocumentAnalysis(document, {
        fireSemanticTokensChanged: true,
      });
      refreshDiagnosticsForDocument(document, 'auto', 100);
    }),
  );
  const onDidChangeActiveTextEditor =
    vscode.window?.onDidChangeActiveTextEditor;
  if (onDidChangeActiveTextEditor) {
    context.subscriptions.push(
      onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          scheduleModuleExpressionPrewarm(editor.document, 0);
        }
      }),
    );
  }
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      if (document.languageId === RSX_LANGUAGE_ID) {
        const key = document.uri.toString();
        const timer = diagnosticsDebounceTimers.get(key);
        if (timer) {
          clearTimeout(timer);
          diagnosticsDebounceTimers.delete(key);
        }
        diagnosticsRequestIds.delete(key);
        const prewarmTimer = modulePrewarmTimers.get(key);
        if (prewarmTimer) {
          clearTimeout(prewarmTimer);
          modulePrewarmTimers.delete(key);
        }
        const backgroundWarmTimer = moduleBackgroundWarmTimers.get(key);
        if (backgroundWarmTimer) {
          clearTimeout(backgroundWarmTimer);
          moduleBackgroundWarmTimers.delete(key);
        }
        moduleBackgroundWarmRequestIds.delete(key);
        standaloneServiceCache.delete(key);
        moduleExpressionCache.delete(key);
        documentSemanticTokenCache.delete(key);
        diagnostics.delete(document.uri);
      }
    }),
  );

  for (const document of vscode.workspace.textDocuments) {
    invalidateRsxDocumentAnalysis(document);
    refreshDiagnosticsForDocument(document, 'auto', 250);
    scheduleModuleExpressionPrewarm(document, 0);
  }
}

export function deactivate(): void {}

function invalidateRsxDocumentAnalysis(
  document: vscode.TextDocument,
  options: { fireSemanticTokensChanged?: boolean } = {},
): void {
  if (document.languageId !== RSX_LANGUAGE_ID) {
    return;
  }

  const key = document.uri.toString();
  standaloneServiceCache.delete(key);
  moduleExpressionCache.delete(key);
  documentSemanticTokenCache.delete(key);
  moduleBackgroundWarmRequestIds.set(
    key,
    (moduleBackgroundWarmRequestIds.get(key) ?? 0) + 1,
  );

  if (options.fireSemanticTokensChanged) {
    semanticTokensChangeEmitter?.fire();
  }
}

class RsxExpressionsTreeDataProvider implements vscode.TreeDataProvider<IRsxExpressionTreeItem> {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<
    IRsxExpressionTreeItem | undefined | null | void
  >();

  public readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  private files: IRsxExpressionTreeFile[] | null = null;

  public refresh(): void {
    this.files = null;
    this.onDidChangeTreeDataEmitter.fire();
  }

  public getTreeItem(
    element: IRsxExpressionTreeItem,
  ): vscode.TreeItem | Thenable<vscode.TreeItem> {
    if (element.kind === 'file') {
      const item = new vscode.TreeItem(
        element.label,
        vscode.TreeItemCollapsibleState.Expanded,
      );
      item.description = element.description;
      item.resourceUri = element.uri;
      item.contextValue = 'rsxExpressionFile';
      item.iconPath = new vscode.ThemeIcon('file-code');
      item.tooltip = `${element.relativePath}\n${element.uri.fsPath}\n${formatExpressionCount(element.expressions.length)}`;
      return item;
    }

    const item = new vscode.TreeItem(
      element.exportName,
      vscode.TreeItemCollapsibleState.None,
    );
    item.description = element.expression.returnTypeText ?? undefined;
    item.resourceUri = element.uri;
    item.contextValue = 'rsxExpression';
    item.iconPath = new vscode.ThemeIcon('symbol-function');
    item.command = {
      command: 'rsx.expressions.open',
      title: 'Open RS-X Expression',
      arguments: [element],
    };
    item.tooltip = new vscode.MarkdownString(
      [
        `**${element.exportName}**`,
        '',
        `\`${element.uri.fsPath}\``,
        '',
        element.expression.returnTypeText
          ? `return: \`${element.expression.returnTypeText}\``
          : '',
        element.expression.modelTypeText
          ? `model: \`${element.expression.modelTypeText}\``
          : '',
      ]
        .filter(Boolean)
        .join('\n'),
    );
    return item;
  }

  public async getChildren(
    element?: IRsxExpressionTreeItem,
  ): Promise<IRsxExpressionTreeItem[]> {
    if (element?.kind === 'file') {
      return [...element.expressions];
    }

    if (element) {
      return [];
    }

    return this.getFiles();
  }

  private async getFiles(): Promise<IRsxExpressionTreeFile[]> {
    if (this.files) {
      return this.files;
    }

    const uris = await vscode.workspace.findFiles(
      '**/*.rsx',
      '**/{node_modules,dist,out-tsc,coverage,.git}/**',
    );
    const files = await Promise.all(
      uris.map((uri) => readRsxExpressionTreeFile(uri)),
    );

    this.files = files
      .filter((file): file is IRsxExpressionTreeFile => file !== null)
      .sort((left, right) =>
        left.relativePath.localeCompare(right.relativePath),
      );

    return this.files;
  }
}

async function readRsxExpressionTreeFile(
  uri: vscode.Uri,
): Promise<IRsxExpressionTreeFile | null> {
  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    const text = new TextDecoder('utf8').decode(bytes);
    const parsed = parseRsxFileExpressions({
      fileName: uri.fsPath,
      text,
    });
    if (!parsed || parsed.expressions.length === 0) {
      return null;
    }

    const expressionExports = getRsxExpressionExports({
      fileName: uri.fsPath,
      expressions: parsed.expressions,
    });
    const expressions = expressionExports.map(
      (entry): IRsxExpressionTreeExpression => {
        const start =
          typeof entry.expression.nameStart === 'number'
            ? entry.expression.nameStart
            : entry.expression.expressionStart;
        const end =
          typeof entry.expression.nameEnd === 'number'
            ? entry.expression.nameEnd
            : Math.max(
                entry.expression.expressionStart + 1,
                entry.expression.expressionEnd,
              );
        return {
          kind: 'expression',
          uri,
          exportName: entry.exportName,
          expression: entry.expression,
          start,
          end,
        };
      },
    );

    const relativePath = vscode.workspace.asRelativePath(uri, false);
    const directoryName = path.dirname(relativePath);

    return {
      kind: 'file',
      uri,
      label: path.basename(relativePath),
      description:
        directoryName === '.'
          ? formatExpressionCount(expressions.length)
          : `${formatExpressionCount(expressions.length)} · ${directoryName}`,
      relativePath,
      expressions,
    };
  } catch {
    return null;
  }
}

function formatExpressionCount(count: number): string {
  return `${count} expression${count === 1 ? '' : 's'}`;
}

async function openRsxExpressionTreeItem(
  item: IRsxExpressionTreeExpression,
): Promise<void> {
  const document = await vscode.workspace.openTextDocument(item.uri);
  const editor = await vscode.window.showTextDocument(document);
  const start = document.positionAt(item.start);
  const end = document.positionAt(item.end);
  const range = new vscode.Range(start, end);
  editor.selection = new vscode.Selection(start, end);
  editor.revealRange(
    range,
    vscode.TextEditorRevealType.InCenterIfOutsideViewport,
  );
}

class RsxCompletionItemProvider implements vscode.CompletionItemProvider<vscode.CompletionItem> {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    const offset = document.offsetAt(position);
    const headerCompletions = getModuleHeaderCompletions(document, position);
    const standalone = createStandaloneLanguageServiceForDocument(document);
    const standaloneCompletions = standalone
      ? getRsxCompletionsAtPosition(standalone, offset)
      : [];

    if (standalone) {
      const completionByLabel = new Map<string, vscode.CompletionItem>();
      for (const item of standaloneCompletions) {
        const completion = new vscode.CompletionItem(
          item.name,
          item.kind === 'method'
            ? vscode.CompletionItemKind.Method
            : item.kind === 'constructor'
              ? vscode.CompletionItemKind.Constructor
              : vscode.CompletionItemKind.Property,
        );
        completion.insertText = item.name;
        completionByLabel.set(completion.label.toString(), completion);
      }
      for (const completion of headerCompletions) {
        completionByLabel.set(completion.label.toString(), completion);
      }
      return [...completionByLabel.values()];
    }

    const moduleExpressionService =
      createModuleExpressionStandaloneLanguageServiceForOffset(
        document,
        offset,
      );
    const expressionCompletions = moduleExpressionService
      ? getRsxCompletionsAtPosition(
          moduleExpressionService.document,
          moduleExpressionService.position,
        )
      : [];
    const moduleHeaderService = moduleExpressionService
      ? null
      : createModuleHeaderStandaloneLanguageServiceForOffset(document, offset);
    const headerValueCompletions = moduleHeaderService
      ? getRsxCompletionsAtPosition(
          moduleHeaderService.document,
          moduleHeaderService.position,
        )
      : [];

    const completionByLabel = new Map<string, vscode.CompletionItem>();
    for (const item of [...expressionCompletions, ...headerValueCompletions]) {
      const completion = new vscode.CompletionItem(
        item.name,
        item.kind === 'method'
          ? vscode.CompletionItemKind.Method
          : item.kind === 'constructor'
            ? vscode.CompletionItemKind.Constructor
            : vscode.CompletionItemKind.Property,
      );
      completion.insertText = item.name;
      completionByLabel.set(completion.label.toString(), completion);
    }
    for (const completion of headerCompletions) {
      completionByLabel.set(completion.label.toString(), completion);
    }

    return [...completionByLabel.values()];
  }
}

class RsxHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.Hover> {
    const directHeaderHover = getDirectModuleHeaderHover(document, position);
    if (directHeaderHover) {
      return directHeaderHover;
    }
    if (isHeaderAuthoringPosition(document, position)) {
      return null;
    }

    const standalone = createStandaloneLanguageServiceForDocument(document);
    const offset = document.offsetAt(position);
    const hover = standalone
      ? getRsxHoverAtPosition(standalone, offset)
      : (() => {
          const moduleExpressionService =
            createModuleExpressionStandaloneLanguageServiceForOffset(
              document,
              offset,
            );
          if (!moduleExpressionService) {
            const moduleHeaderService =
              createModuleHeaderStandaloneLanguageServiceForOffset(
                document,
                offset,
              );
            if (!moduleHeaderService) {
              return null;
            }

            const moduleHeaderHover = getRsxHoverAtPosition(
              moduleHeaderService.document,
              moduleHeaderService.position,
            );
            if (!moduleHeaderHover) {
              return null;
            }

            const mappedHeaderHover = mapModuleHeaderSpanToDocument(
              moduleHeaderService,
              moduleHeaderHover.start,
              moduleHeaderHover.end,
            );
            if (!mappedHeaderHover) {
              return null;
            }

            return {
              ...moduleHeaderHover,
              start: mappedHeaderHover.start,
              end: mappedHeaderHover.end,
            };
          }

          const moduleHover = getRsxHoverAtPosition(
            moduleExpressionService.document,
            moduleExpressionService.position,
          );
          if (!moduleHover) {
            return null;
          }

          return {
            ...moduleHover,
            start: mapModuleExpressionOffsetToDocument(
              moduleExpressionService,
              moduleHover.start,
            ),
            end: mapModuleExpressionOffsetToDocument(
              moduleExpressionService,
              moduleHover.end,
            ),
          };
        })();
    if (!hover) {
      return null;
    }

    return new vscode.Hover(
      new vscode.MarkdownString().appendCodeblock(hover.text, 'typescript'),
      new vscode.Range(
        document.positionAt(hover.start),
        document.positionAt(hover.end),
      ),
    );
  }
}

function getDirectModuleHeaderHover(
  document: vscode.TextDocument,
  position: vscode.Position,
): vscode.Hover | null {
  if (document.languageId !== RSX_LANGUAGE_ID) {
    return null;
  }

  const line = document.lineAt(position.line);
  const parsed = parseHeaderLine(line.text);
  const authoringKey = getHeaderAuthoringKeyAtPosition(document, position);
  if (
    !parsed &&
    authoringKey &&
    RSX_HEADER_DIRECTIVE_KEYS.has(authoringKey.key)
  ) {
    return createHeaderDirectiveHover(
      authoringKey.key,
      position.line,
      authoringKey.keyStartCharacter,
    );
  }
  if (!parsed) {
    return null;
  }

  if (
    RSX_HEADER_DIRECTIVE_KEYS.has(parsed.key) &&
    position.character >= parsed.keyStartCharacter &&
    position.character <= parsed.keyStartCharacter + parsed.key.length
  ) {
    return createHeaderDirectiveHover(
      parsed.key,
      position.line,
      parsed.keyStartCharacter,
    );
  }

  if (parsed.key !== 'model' && parsed.key !== 'return') {
    return null;
  }

  if (document.uri.scheme !== 'file') {
    return null;
  }

  const directImportHover = getRsxHeaderImportHoverAtTextPosition({
    fileName: document.uri.fsPath,
    text: document.getText(),
    position: document.offsetAt(position),
  });
  if (!directImportHover) {
    return null;
  }

  return new vscode.Hover(
    new vscode.MarkdownString().appendCodeblock(
      directImportHover.text,
      'typescript',
    ),
    new vscode.Range(
      document.positionAt(directImportHover.start),
      document.positionAt(directImportHover.end),
    ),
  );
}

function createHeaderDirectiveHover(
  key: string,
  lineIndex: number,
  keyStartCharacter: number,
): vscode.Hover {
  return new vscode.Hover(
    new vscode.MarkdownString().appendCodeblock(
      RSX_HEADER_DIRECTIVE_HOVER_TEXT[key] ?? `${key}: RS-X header`,
      'rsx',
    ),
    new vscode.Range(
      new vscode.Position(lineIndex, keyStartCharacter),
      new vscode.Position(lineIndex, keyStartCharacter + key.length),
    ),
  );
}

function isHeaderAuthoringPosition(
  document: vscode.TextDocument,
  position: vscode.Position,
): boolean {
  const authoringKey = getHeaderAuthoringKeyAtPosition(document, position);
  if (!authoringKey) {
    return false;
  }

  if (
    RSX_HEADER_DIRECTIVE_KEYS.has(authoringKey.key) ||
    [...RSX_HEADER_DIRECTIVE_KEYS].some((key) =>
      key.startsWith(authoringKey.key),
    )
  ) {
    return true;
  }

  if (authoringKey.hasColon) {
    return true;
  }

  return (
    isFirstNonEmptyLine(document, position.line) && !hasAnyRsxHeader(document)
  );
}

function getHeaderAuthoringKeyAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position,
): {
  key: string;
  keyStartCharacter: number;
  hasColon: boolean;
} | null {
  if (document.languageId !== RSX_LANGUAGE_ID) {
    return null;
  }

  const line = document.lineAt(position.line).text;
  const headerKey = scanHeaderAuthoringKey(line);
  if (!headerKey) {
    return null;
  }

  const keyEndCharacter = headerKey.keyStartCharacter + headerKey.key.length;
  if (
    position.character < headerKey.keyStartCharacter ||
    position.character > keyEndCharacter
  ) {
    return null;
  }

  return headerKey;
}

function isFirstNonEmptyLine(
  document: vscode.TextDocument,
  lineIndex: number,
): boolean {
  for (let index = 0; index < document.lineCount; index += 1) {
    if (document.lineAt(index).text.trim().length === 0) {
      continue;
    }
    return index === lineIndex;
  }
  return false;
}

function hasAnyRsxHeader(document: vscode.TextDocument): boolean {
  for (let index = 0; index < document.lineCount; index += 1) {
    const parsed = parseHeaderLine(document.lineAt(index).text);
    if (parsed && RSX_HEADER_DIRECTIVE_KEYS.has(parsed.key)) {
      return true;
    }
  }
  return false;
}

class RsxDefinitionProvider implements vscode.DefinitionProvider {
  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.Definition> {
    const offset = document.offsetAt(position);
    const standalone = createStandaloneLanguageServiceForDocument(document);
    const moduleExpressionService = standalone
      ? null
      : createModuleExpressionStandaloneLanguageServiceForOffset(
          document,
          offset,
        );
    const moduleHeaderService =
      standalone || moduleExpressionService
        ? null
        : createModuleHeaderStandaloneLanguageServiceForOffset(
            document,
            offset,
          );
    const lookupDocument =
      standalone ??
      moduleExpressionService?.document ??
      moduleHeaderService?.document;
    if (!lookupDocument) {
      return [];
    }
    const lookupPosition = standalone
      ? offset
      : (moduleExpressionService?.position ??
        moduleHeaderService?.position ??
        offset);

    return getRsxDefinitionsAtPosition(lookupDocument, lookupPosition).map(
      (definition) =>
        new vscode.Location(
          vscode.Uri.file(definition.fileName),
          new vscode.Range(
            positionForFileOffset(
              document,
              definition.fileName,
              definition.start,
            ),
            positionForFileOffset(
              document,
              definition.fileName,
              definition.end,
            ),
          ),
        ),
    );
  }
}

class RsxTypeDefinitionProvider implements vscode.TypeDefinitionProvider {
  provideTypeDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.Definition> {
    const offset = document.offsetAt(position);
    const headerImportDefinitions =
      getRsxHeaderImportTypeDefinitionsAtTextPosition({
        fileName: document.uri.fsPath,
        text: document.getText(),
        position: offset,
      });
    if (headerImportDefinitions.length > 0) {
      return headerImportDefinitions.map(
        (definition) =>
          new vscode.Location(
            vscode.Uri.file(definition.fileName),
            new vscode.Range(
              positionForFileOffset(
                document,
                definition.fileName,
                definition.start,
              ),
              positionForFileOffset(
                document,
                definition.fileName,
                definition.end,
              ),
            ),
          ),
      );
    }

    const standalone = createStandaloneLanguageServiceForDocument(document);
    const moduleExpressionService = standalone
      ? null
      : createModuleExpressionStandaloneLanguageServiceForOffset(
          document,
          offset,
        );
    const moduleHeaderService =
      standalone || moduleExpressionService
        ? null
        : createModuleHeaderStandaloneLanguageServiceForOffset(
            document,
            offset,
          );
    const lookupDocument =
      standalone ??
      moduleExpressionService?.document ??
      moduleHeaderService?.document;
    if (!lookupDocument) {
      return [];
    }
    const lookupPosition = standalone
      ? offset
      : (moduleExpressionService?.position ??
        moduleHeaderService?.position ??
        offset);

    return getRsxTypeDefinitionsAtPosition(lookupDocument, lookupPosition).map(
      (definition) =>
        new vscode.Location(
          vscode.Uri.file(definition.fileName),
          new vscode.Range(
            positionForFileOffset(
              document,
              definition.fileName,
              definition.start,
            ),
            positionForFileOffset(
              document,
              definition.fileName,
              definition.end,
            ),
          ),
        ),
    );
  }
}

class RsxReferenceProvider implements vscode.ReferenceProvider {
  provideReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.Location[]> {
    const standalone = createStandaloneLanguageServiceForDocument(document);
    if (!standalone) {
      return [];
    }

    return getRsxReferencesAtPosition(
      standalone,
      document.offsetAt(position),
    ).map(
      (reference) =>
        new vscode.Location(
          vscode.Uri.file(reference.fileName),
          new vscode.Range(
            positionForFileOffset(
              document,
              reference.fileName,
              reference.start,
            ),
            positionForFileOffset(document, reference.fileName, reference.end),
          ),
        ),
    );
  }
}

class RsxImplementationProvider implements vscode.ImplementationProvider {
  provideImplementation(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.Definition> {
    const standalone = createStandaloneLanguageServiceForDocument(document);
    if (!standalone) {
      return [];
    }

    return getRsxImplementationsAtPosition(
      standalone,
      document.offsetAt(position),
    ).map(
      (implementation) =>
        new vscode.Location(
          vscode.Uri.file(implementation.fileName),
          new vscode.Range(
            positionForFileOffset(
              document,
              implementation.fileName,
              implementation.start,
            ),
            positionForFileOffset(
              document,
              implementation.fileName,
              implementation.end,
            ),
          ),
        ),
    );
  }
}

class RsxRenameProvider implements vscode.RenameProvider {
  prepareRename(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<
    vscode.Range | { range: vscode.Range; placeholder: string }
  > {
    const standalone = createStandaloneLanguageServiceForDocument(document);
    if (!standalone) {
      return null;
    }

    const renameInfo = canRenameRsxSymbolAtPosition(
      standalone,
      document.offsetAt(position),
    );
    if (!renameInfo.canRename) {
      throw new Error(
        renameInfo.reason ?? 'The symbol at this position cannot be renamed.',
      );
    }

    const wordRange =
      document.getWordRangeAtPosition(position) ??
      new vscode.Range(position, position);

    return {
      range: wordRange,
      placeholder: renameInfo.displayName ?? document.getText(wordRange),
    };
  }

  provideRenameEdits(
    document: vscode.TextDocument,
    position: vscode.Position,
    newName: string,
  ): vscode.ProviderResult<vscode.WorkspaceEdit> {
    const standalone = createStandaloneLanguageServiceForDocument(document);
    if (!standalone) {
      return null;
    }

    const edit = new vscode.WorkspaceEdit();
    for (const location of getRsxRenameLocationsAtPosition({
      document: standalone,
      position: document.offsetAt(position),
      newName,
    })) {
      const uri = vscode.Uri.file(location.fileName);
      edit.replace(
        uri,
        new vscode.Range(
          positionForFileOffset(document, location.fileName, location.start),
          positionForFileOffset(document, location.fileName, location.end),
        ),
        location.newText,
      );
    }

    return edit;
  }
}

class RsxDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  provideDocumentSymbols(
    document: vscode.TextDocument,
  ): vscode.ProviderResult<vscode.DocumentSymbol[]> {
    const standalone = createStandaloneLanguageServiceForDocument(document);
    if (!standalone) {
      return [];
    }

    return getRsxDocumentSymbols(standalone).map((symbol) =>
      toVscodeDocumentSymbol(document, symbol),
    );
  }
}

class RsxCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
  ): vscode.ProviderResult<vscode.CodeAction[]> {
    const standalone = createStandaloneLanguageServiceForDocument(document);
    if (!standalone) {
      return [];
    }

    const seen = new Set<string>();
    const diagnosticContexts =
      context.diagnostics.length > 0
        ? context.diagnostics.map((diagnostic) => ({
            diagnostic,
            range: diagnostic.range,
          }))
        : [{ diagnostic: undefined, range }];

    return diagnosticContexts.flatMap(({ diagnostic, range: targetRange }) =>
      getRsxCodeFixes({
        document: standalone,
        start: document.offsetAt(targetRange.start),
        end: document.offsetAt(targetRange.end),
      }).flatMap((fix) => {
        const key = `${fix.title}:${fix.edits
          .map(
            (edit) =>
              `${edit.fileName}:${edit.start}:${edit.end}:${edit.newText}`,
          )
          .join('|')}`;
        if (seen.has(key)) {
          return [];
        }
        seen.add(key);

        const action = new vscode.CodeAction(
          fix.title,
          vscode.CodeActionKind.QuickFix,
        );
        const edit = new vscode.WorkspaceEdit();
        for (const change of fix.edits) {
          edit.replace(
            vscode.Uri.file(change.fileName),
            new vscode.Range(
              positionForFileOffset(document, change.fileName, change.start),
              positionForFileOffset(document, change.fileName, change.end),
            ),
            change.newText,
          );
        }
        action.edit = edit;
        if (diagnostic) {
          action.diagnostics = [diagnostic];
        }
        action.isPreferred = true;
        return [action];
      }),
    );
  }
}

class RsxSignatureHelpProvider implements vscode.SignatureHelpProvider {
  provideSignatureHelp(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.SignatureHelp> {
    const standalone = createStandaloneLanguageServiceForDocument(document);
    if (!standalone) {
      return null;
    }

    const help = getRsxSignatureHelpAtPosition(
      standalone,
      document.offsetAt(position),
    );
    if (!help) {
      return null;
    }

    const signatureHelp = new vscode.SignatureHelp();
    signatureHelp.activeParameter = help.argumentIndex;
    signatureHelp.activeSignature = 0;
    signatureHelp.signatures = help.items.map((item) => {
      const signature = new vscode.SignatureInformation(
        `(${item.parameters
          .map((parameter) => `${parameter.name}: ${parameter.typeText}`)
          .join(', ')}): ${item.returnTypeText}`,
      );
      signature.parameters = item.parameters.map(
        (parameter) =>
          new vscode.ParameterInformation(
            `${parameter.name}: ${parameter.typeText}`,
          ),
      );
      return signature;
    });

    return signatureHelp;
  }
}

class RsxSemanticTokensProvider
  implements vscode.DocumentSemanticTokensProvider
{
  readonly onDidChangeSemanticTokens: vscode.Event<void>;

  constructor(
    private readonly legend: vscode.SemanticTokensLegend,
    changeEmitter: vscode.EventEmitter<void>,
  ) {
    this.onDidChangeSemanticTokens = changeEmitter.event;
  }

  provideDocumentSemanticTokens(
    document: vscode.TextDocument,
  ): vscode.ProviderResult<vscode.SemanticTokens> {
    const sourceText = document.getText();
    const builder = new vscode.SemanticTokensBuilder(this.legend);
    const tokens = resolveSemanticTokensForDocument(document, sourceText);
    for (const token of tokens) {
      const tokenText = sourceText.slice(
        token.start,
        token.start + token.length,
      );
      if (
        !shouldEmitRsxSemanticToken({
          tokenType: token.tokenType,
          tokenText,
          policy: RSX_DOCUMENT_SEMANTIC_TOKEN_POLICY,
        })
      ) {
        continue;
      }
      const start = document.positionAt(token.start);
      const end = document.positionAt(token.start + token.length);
      if (start.line !== end.line) {
        continue;
      }
      const length = end.character - start.character;
      if (length <= 0) {
        continue;
      }
      builder.push(
        start.line,
        start.character,
        length,
        token.tokenType,
        token.tokenModifiers,
      );
    }

    return builder.build();
  }
}

function resolveSemanticTokensForDocument(
  document: vscode.TextDocument,
  sourceText: string,
): IRsxSemanticToken[] {
  const key = document.uri.toString();
  const cached = documentSemanticTokenCache.get(key);
  if (cached && cached.version === document.version) {
    return cached.tokens;
  }

  const standalone = createStandaloneLanguageServiceForDocument(document);
  if (standalone) {
    const tokens = getRsxSemanticTokens(standalone);
    documentSemanticTokenCache.set(key, {
      version: document.version,
      tokens,
    });
    return tokens;
  }

  const moduleTokens = getModuleExpressionSemanticTokens(document, 'auto');
  const syntacticTokens = getRsxSyntacticTokensForText(sourceText);
  const headerDirectiveTokens = getRsxHeaderDirectiveTokensForText(sourceText);
  const mergedBySpan = new Map<string, IRsxSemanticToken>();
  for (const token of syntacticTokens) {
    mergedBySpan.set(`${token.start}:${token.length}`, token);
  }
  for (const token of moduleTokens) {
    mergedBySpan.set(`${token.start}:${token.length}`, token);
  }
  for (const token of headerDirectiveTokens) {
    mergedBySpan.set(`${token.start}:${token.length}`, token);
  }

  const tokens = [...mergedBySpan.values()].sort(
    (left, right) => left.start - right.start,
  );
  documentSemanticTokenCache.set(key, {
    version: document.version,
    tokens,
  });
  return tokens;
}

function getRsxHeaderDirectiveTokensForText(text: string): IRsxSemanticToken[] {
  const keywordTokenType = rsxSemanticTokenTypes.indexOf('keyword');
  const expressionDirectiveTokenType =
    rsxSemanticTokenTypes.indexOf('namespace');
  const expressionNameTokenType = rsxSemanticTokenTypes.indexOf('function');
  if (
    keywordTokenType < 0 ||
    expressionDirectiveTokenType < 0 ||
    expressionNameTokenType < 0
  ) {
    return [];
  }

  const tokens: IRsxSemanticToken[] = [];
  const lines = text.split('\n');
  let lineOffset = 0;
  for (const line of lines) {
    const trimmedStart = line.length - line.trimStart().length;
    const trimmed = line.slice(trimmedStart);
    const header = parseHeaderLine(trimmed);
    if (header && RSX_HEADER_DIRECTIVE_KEYS.has(header.key)) {
      const key = header.key;
      tokens.push({
        start: lineOffset + trimmedStart,
        length: key.length,
        tokenType:
          key === 'expression'
            ? expressionDirectiveTokenType
            : keywordTokenType,
        tokenModifiers: 0,
      });

      if (key === 'expression') {
        const expressionNameStart = getHeaderValueStartCharacter(trimmed);
        const expressionName = readTypeScriptIdentifierAt(
          trimmed,
          expressionNameStart,
        );
        if (expressionName) {
          tokens.push({
            start: lineOffset + trimmedStart + expressionNameStart,
            length: expressionName.length,
            tokenType: expressionNameTokenType,
            tokenModifiers: 0,
          });
        }
      }
    }

    lineOffset += line.length + 1;
  }

  return tokens;
}

class RsxDocumentFormattingEditProvider
  implements vscode.DocumentFormattingEditProvider
{
  async provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    options: vscode.FormattingOptions,
    token: vscode.CancellationToken,
  ): Promise<vscode.TextEdit[]> {
    const formatted = await formatRsxDocument({ document, options, token });
    if (formatted === null || formatted === document.getText()) {
      return [];
    }

    return [vscode.TextEdit.replace(fullDocumentRange(document), formatted)];
  }
}

class RsxDocumentRangeFormattingEditProvider
  implements vscode.DocumentRangeFormattingEditProvider
{
  async provideDocumentRangeFormattingEdits(
    document: vscode.TextDocument,
    _range: vscode.Range,
    options: vscode.FormattingOptions,
    token: vscode.CancellationToken,
  ): Promise<vscode.TextEdit[]> {
    const formatted = await formatRsxDocument({ document, options, token });
    if (formatted === null || formatted === document.getText()) {
      return [];
    }

    return [vscode.TextEdit.replace(fullDocumentRange(document), formatted)];
  }
}

function computeDiagnosticsForDocument(
  document: vscode.TextDocument,
  mode: IDiagnosticsMode = 'auto',
): vscode.Diagnostic[] {
  if (document.languageId !== RSX_LANGUAGE_ID) {
    return [];
  }

  const standalone = createStandaloneLanguageServiceForDocument(document);
  const headerDiagnostics = [
    ...getModuleHeaderDiagnostics(document),
    ...getModuleHeaderTypeDiagnostics(document),
  ];
  if (!standalone) {
    return [
      ...headerDiagnostics,
      ...getModuleExpressionDiagnostics(document, mode, {
        includeHeaderDiagnostics: false,
      }),
    ];
  }

  return [
    ...headerDiagnostics,
    ...getRsxDiagnostics(standalone).map(
      (diagnostic) =>
        new vscode.Diagnostic(
          new vscode.Range(
            document.positionAt(diagnostic.start),
            document.positionAt(diagnostic.end),
          ),
          diagnostic.message,
          diagnostic.category === 'syntax'
            ? vscode.DiagnosticSeverity.Error
            : diagnostic.category === 'semantic'
              ? vscode.DiagnosticSeverity.Warning
              : vscode.DiagnosticSeverity.Information,
        ),
    ),
  ];
}

async function formatRsxDocument(args: {
  document: vscode.TextDocument;
  options: vscode.FormattingOptions;
  token: vscode.CancellationToken;
}): Promise<string | null> {
  const { document, options, token } = args;
  if (token.isCancellationRequested) {
    return null;
  }

  const parsed = parseRsxFile(document.getText());
  if (!parsed) {
    return null;
  }

  const formattedHeaders = parsed.headers.map(formatHeaderLine);
  const formattedBody = await formatExpressionBody({
    body: parsed.body,
    options,
    token,
  });
  if (formattedBody === null) {
    return null;
  }

  const segments = [...formattedHeaders];
  if (segments.length > 0 && formattedBody.trim().length > 0) {
    segments.push('', formattedBody);
  } else if (formattedBody.trim().length > 0) {
    segments.push(formattedBody);
  }

  const result = segments.join('\n').trimEnd();
  return `${result}\n`;
}

function parseRsxFile(text: string): IRsxFileParts | null {
  const normalizedText = text.replace(/\r\n/gu, '\n');
  // Formatter currently operates on single-expression RS-X files only.
  if (/^\s*expression\s*:/mu.test(normalizedText)) {
    return null;
  }
  const lines = normalizedText.split('\n');
  const headers: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (line.trim().length === 0) {
      index += 1;
      continue;
    }
    if (!/^(model|return)\s*:/u.test(line)) {
      break;
    }

    headers.push(line.trim());
    index += 1;
  }

  const body = lines.slice(index).join('\n').trim();
  if (headers.length === 0 && body.length === 0) {
    return null;
  }

  return { headers, body };
}

function formatHeaderLine(header: string): string {
  const match = /^(model|return)\s*:\s*(.+)$/u.exec(header.trim());
  if (!match) {
    return header.trim();
  }

  return `${match[1]}: ${match[2].trim()}`;
}

async function formatExpressionBody(args: {
  body: string;
  options: vscode.FormattingOptions;
  token: vscode.CancellationToken;
}): Promise<string | null> {
  const { body, options, token } = args;
  if (body.trim().length === 0 || token.isCancellationRequested) {
    return '';
  }

  const wrappedDocument = await vscode.workspace.openTextDocument({
    language: 'typescript',
    content: `${WRAPPED_EXPRESSION_PREFIX}${body}\n${WRAPPED_EXPRESSION_SUFFIX}`,
  });

  const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
    'vscode.executeFormatDocumentProvider',
    wrappedDocument.uri,
    options,
  );

  if (token.isCancellationRequested) {
    return null;
  }

  return unwrapFormattedExpression(
    applyTextEdits(wrappedDocument.getText(), edits ?? []),
  );
}

function createStandaloneLanguageServiceForDocument(
  document: vscode.TextDocument,
) {
  if (
    document.languageId !== RSX_LANGUAGE_ID ||
    document.uri.scheme !== 'file'
  ) {
    return null;
  }

  const key = document.uri.toString();
  const cached = standaloneServiceCache.get(key);
  if (cached && cached.version === document.version) {
    return cached.service;
  }

  const service = safeCreateRsxStandaloneLanguageService({
    fileName: document.uri.fsPath,
    text: document.getText(),
  });
  standaloneServiceCache.set(key, {
    version: document.version,
    service,
  });
  return service;
}

function safeCreateRsxStandaloneLanguageService(
  args: Parameters<typeof createRsxStandaloneLanguageService>[0],
): ReturnType<typeof createRsxStandaloneLanguageService> {
  try {
    return createRsxStandaloneLanguageService(args);
  } catch {
    return null;
  }
}

function getModuleExpressionCacheEntry(
  document: vscode.TextDocument,
): IModuleExpressionCacheEntry | null {
  if (
    document.languageId !== RSX_LANGUAGE_ID ||
    document.uri.scheme !== 'file'
  ) {
    return null;
  }

  const key = document.uri.toString();
  const cached = moduleExpressionCache.get(key);
  if (cached && cached.version === document.version) {
    return cached;
  }

  const parsed = parseRsxFileExpressions({
    fileName: document.uri.fsPath,
    text: document.getText(),
  });
  const entry: IModuleExpressionCacheEntry = {
    version: document.version,
    parsed,
    servicesByExpressionIndex: new Map(),
    diagnosticsByExpressionIndex: new Map(),
    semanticTokensByExpressionIndex: new Map(),
  };
  moduleExpressionCache.set(key, entry);
  return entry;
}

function scheduleModuleExpressionPrewarm(
  document: vscode.TextDocument,
  delayMs: number,
): void {
  if (
    document.languageId !== RSX_LANGUAGE_ID ||
    document.uri.scheme !== 'file'
  ) {
    return;
  }

  const text = document.getText();
  if (!/^\s*expression\s*:/mu.test(text)) {
    return;
  }

  const key = document.uri.toString();
  const existingTimer = modulePrewarmTimers.get(key);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(
    () => {
      modulePrewarmTimers.delete(key);
      prewarmModuleExpressionAnalysis(document);
    },
    Math.max(0, delayMs),
  );
  modulePrewarmTimers.set(key, timer);
}

function scheduleModuleExpressionBackgroundWarm(
  document: vscode.TextDocument,
  delayMs: number,
): void {
  if (
    document.languageId !== RSX_LANGUAGE_ID ||
    document.uri.scheme !== 'file'
  ) {
    return;
  }
  if (!/^\s*expression\s*:/mu.test(document.getText())) {
    return;
  }

  const key = document.uri.toString();
  const requestId = (moduleBackgroundWarmRequestIds.get(key) ?? 0) + 1;
  moduleBackgroundWarmRequestIds.set(key, requestId);

  const existingTimer = moduleBackgroundWarmTimers.get(key);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(
    () => {
      moduleBackgroundWarmTimers.delete(key);
      warmModuleExpressionsInBackground(document, requestId, 0);
    },
    Math.max(0, delayMs),
  );
  moduleBackgroundWarmTimers.set(key, timer);
}

function warmModuleExpressionsInBackground(
  document: vscode.TextDocument,
  requestId: number,
  startIndex: number,
): void {
  const key = document.uri.toString();
  if (moduleBackgroundWarmRequestIds.get(key) !== requestId) {
    return;
  }

  const currentDocument =
    vscode.workspace.textDocuments.find(
      (candidate) => candidate.uri.toString() === key,
    ) ?? document;
  const cacheEntry = getModuleExpressionCacheEntry(currentDocument);
  const parsed = cacheEntry?.parsed;
  if (!cacheEntry || !parsed || parsed.expressions.length === 0) {
    return;
  }

  for (
    let expressionIndex = startIndex;
    expressionIndex < parsed.expressions.length;
    expressionIndex += 1
  ) {
    if (
      cacheEntry.semanticTokensByExpressionIndex.has(expressionIndex) &&
      cacheEntry.diagnosticsByExpressionIndex.has(expressionIndex)
    ) {
      continue;
    }

    getOrCreateMappedExpressionDiagnostics({
      document: currentDocument,
      cacheEntry,
      expressionIndex,
    });

    const continuation = setTimeout(() => {
      moduleBackgroundWarmTimers.delete(key);
      warmModuleExpressionsInBackground(
        currentDocument,
        requestId,
        expressionIndex + 1,
      );
    }, 0);
    moduleBackgroundWarmTimers.set(key, continuation);
    return;
  }
}

function prewarmModuleExpressionAnalysis(document: vscode.TextDocument): void {
  if (
    document.languageId !== RSX_LANGUAGE_ID ||
    document.uri.scheme !== 'file'
  ) {
    return;
  }

  const cacheEntry = getModuleExpressionCacheEntry(document);
  const parsed = cacheEntry?.parsed;
  if (!cacheEntry || !parsed || parsed.expressions.length === 0) {
    return;
  }
  if (!shouldUseFocusedModuleAnalysis(document, parsed)) {
    return;
  }

  const expressionIndexes = resolveExpressionIndexesForMode({
    document,
    parsed,
    mode: 'focused',
  });
  if (expressionIndexes.length === 0) {
    return;
  }

  // Precompute focused diagnostics and semantic tokens so first hover/completion
  // requests avoid cold-start work. Semantic coloring is handled by the fast
  // full-file lexer path and should not be warmed expression-by-expression.
  getModuleExpressionDiagnostics(document, 'focused');
  // Continue warming non-active expressions incrementally in the background.
  scheduleModuleExpressionBackgroundWarm(document, 150);
}

function getExpressionIndexAtOffset(
  parsed: NonNullable<IModuleExpressionCacheEntry['parsed']>,
  offset: number,
): number {
  return parsed.expressions.findIndex(
    (candidate) =>
      offset >= candidate.expressionStart && offset <= candidate.expressionEnd,
  );
}

function getModuleExpressionStandaloneLanguageServiceForIndex(
  document: vscode.TextDocument,
  cacheEntry: IModuleExpressionCacheEntry,
  expressionIndex: number,
): IModuleExpressionStandaloneService | null {
  const cached = cacheEntry.servicesByExpressionIndex.get(expressionIndex);
  if (cached !== undefined) {
    return cached;
  }

  const expression = cacheEntry.parsed?.expressions[expressionIndex];
  if (!expression) {
    cacheEntry.servicesByExpressionIndex.set(expressionIndex, null);
    return null;
  }

  const service = createModuleExpressionStandaloneLanguageService(
    document,
    expression,
    expressionIndex,
  );
  cacheEntry.servicesByExpressionIndex.set(expressionIndex, service);
  return service;
}

function createModuleExpressionStandaloneLanguageServiceForOffset(
  document: vscode.TextDocument,
  offset: number,
): IModuleExpressionStandaloneService | null {
  if (
    document.languageId !== RSX_LANGUAGE_ID ||
    document.uri.scheme !== 'file'
  ) {
    return null;
  }

  const cacheEntry = getModuleExpressionCacheEntry(document);
  const parsed = cacheEntry?.parsed;
  if (!cacheEntry || !parsed || parsed.expressions.length === 0) {
    return null;
  }

  const expressionIndex = getExpressionIndexAtOffset(parsed, offset);
  if (expressionIndex < 0) {
    return null;
  }

  const moduleExpressionService =
    getModuleExpressionStandaloneLanguageServiceForIndex(
      document,
      cacheEntry,
      expressionIndex,
    );
  if (!moduleExpressionService) {
    return null;
  }

  const expression = parsed.expressions[expressionIndex];

  const relativeOffset = Math.max(
    0,
    Math.min(expression.expression.length, offset - expression.expressionStart),
  );
  return {
    ...moduleExpressionService,
    position:
      moduleExpressionService.standaloneExpressionStart + relativeOffset,
  };
}

function createModuleHeaderStandaloneLanguageServiceForOffset(
  document: vscode.TextDocument,
  offset: number,
): IModuleHeaderStandaloneService | null {
  if (
    document.languageId !== RSX_LANGUAGE_ID ||
    document.uri.scheme !== 'file'
  ) {
    return null;
  }

  const position = document.positionAt(offset);
  const line = document.lineAt(position.line);
  const parsed = parseHeaderLine(line.text);
  if (!parsed || (parsed.key !== 'model' && parsed.key !== 'return')) {
    return null;
  }

  const separatorIndex = line.text.indexOf(':');
  if (separatorIndex < 0) {
    return null;
  }
  const valueStartCharacter = (() => {
    let cursor = separatorIndex + 1;
    while (
      cursor < line.text.length &&
      isLineWhitespaceCharacter(line.text[cursor])
    ) {
      cursor += 1;
    }
    return cursor;
  })();
  if (position.character < valueStartCharacter) {
    return null;
  }

  const originalValueStart = document.offsetAt(
    new vscode.Position(position.line, valueStartCharacter),
  );
  const originalValueEnd = document.offsetAt(
    new vscode.Position(position.line, line.text.length),
  );
  const valueOffset = position.character - valueStartCharacter;
  const modelTypeText = parsed.key === 'model' ? parsed.value : 'unknown';
  const returnTypeText = parsed.key === 'return' ? parsed.value : 'unknown';
  const standaloneText = [
    `model: ${modelTypeText}`,
    `return: ${returnTypeText}`,
    '',
    '0',
  ].join('\n');

  const standalone = safeCreateRsxStandaloneLanguageService({
    fileName: document.uri.fsPath,
    text: standaloneText,
    virtualFileNameSuffix: `header_${parsed.key}`,
  });
  if (!standalone) {
    return null;
  }

  const targetPrefix =
    parsed.key === 'model' ? 'model: ' : `model: ${modelTypeText}\nreturn: `;
  const targetPosition = targetPrefix.length + Math.max(0, valueOffset);
  return {
    document: standalone,
    position: targetPosition,
    key: parsed.key,
    originalValueStart,
    originalValueEnd,
  };
}

function mapModuleHeaderSpanToDocument(
  service: IModuleHeaderStandaloneService,
  start: number,
  end: number,
): { start: number; end: number } | null {
  const region =
    service.key === 'model'
      ? service.document.modelTypeRegion
      : service.document.returnTypeRegion;
  if (!region) {
    return null;
  }

  if (end < region.originalStart || start > region.originalEnd) {
    return null;
  }

  const mappedStart =
    service.originalValueStart + Math.max(0, start - region.originalStart);
  const mappedEnd =
    service.originalValueStart +
    Math.min(region.originalEnd, Math.max(end, start + 1)) -
    region.originalStart;

  return {
    start: Math.max(
      service.originalValueStart,
      Math.min(service.originalValueEnd, mappedStart),
    ),
    end: Math.max(
      service.originalValueStart + 1,
      Math.min(service.originalValueEnd, mappedEnd),
    ),
  };
}

function getOrCreateMappedExpressionDiagnostics(args: {
  document: vscode.TextDocument;
  cacheEntry: IModuleExpressionCacheEntry;
  expressionIndex: number;
}): vscode.Diagnostic[] {
  const cachedDiagnostics = args.cacheEntry.diagnosticsByExpressionIndex.get(
    args.expressionIndex,
  );
  if (cachedDiagnostics) {
    return cachedDiagnostics;
  }

  const moduleExpressionService =
    getModuleExpressionStandaloneLanguageServiceForIndex(
      args.document,
      args.cacheEntry,
      args.expressionIndex,
    );
  if (!moduleExpressionService) {
    return [];
  }

  const expressionDiagnostics = getRsxDiagnostics(
    moduleExpressionService.document,
  );
  const mappedDiagnostics: vscode.Diagnostic[] = [];
  const bodyStart = moduleExpressionService.standaloneExpressionStart;
  const bodyEnd =
    bodyStart + moduleExpressionService.expression.expression.length;
  for (const diagnostic of expressionDiagnostics) {
    const overlapsBody =
      diagnostic.end > bodyStart && diagnostic.start < bodyEnd;
    const isReturnMismatchDiagnostic =
      diagnostic.category === 'semantic' &&
      !!moduleExpressionService.expression.returnTypeText &&
      /is not assignable to type/iu.test(diagnostic.message);
    if (!overlapsBody && !isReturnMismatchDiagnostic) {
      continue;
    }

    const mappedStart = overlapsBody
      ? mapModuleExpressionOffsetToDocument(
          moduleExpressionService,
          diagnostic.start,
        )
      : moduleExpressionService.expression.expressionStart;
    const mappedEnd = overlapsBody
      ? mapModuleExpressionOffsetToDocument(
          moduleExpressionService,
          diagnostic.end,
        )
      : moduleExpressionService.expression.expressionEnd;

    mappedDiagnostics.push(
      new vscode.Diagnostic(
        new vscode.Range(
          args.document.positionAt(mappedStart),
          args.document.positionAt(Math.max(mappedEnd, mappedStart + 1)),
        ),
        diagnostic.message,
        diagnostic.category === 'syntax'
          ? vscode.DiagnosticSeverity.Error
          : diagnostic.category === 'semantic'
            ? vscode.DiagnosticSeverity.Warning
            : vscode.DiagnosticSeverity.Information,
      ),
    );
  }

  args.cacheEntry.diagnosticsByExpressionIndex.set(
    args.expressionIndex,
    mappedDiagnostics,
  );
  return mappedDiagnostics;
}

function getOrCreateMappedExpressionSemanticTokens(args: {
  document: vscode.TextDocument;
  cacheEntry: IModuleExpressionCacheEntry;
  expressionIndex: number;
}): IRsxSemanticToken[] {
  const cachedTokens = args.cacheEntry.semanticTokensByExpressionIndex.get(
    args.expressionIndex,
  );
  if (cachedTokens) {
    return cachedTokens;
  }

  const expression = args.cacheEntry.parsed?.expressions[args.expressionIndex];
  if (!expression) {
    return [];
  }

  const mappedExpressionTokens: IRsxSemanticToken[] = [];
  const expressionText = expression.expression;
  const classificationContext =
    createRsxSemanticClassificationContext(expressionText);
  for (const token of tokenizeRsxExpression(expressionText)) {
    const tokenType = resolveRsxSemanticTokenType({
      context: classificationContext,
      text: expressionText,
      token,
    });
    if (tokenType === null) {
      continue;
    }

    const tokenText = expressionText.slice(token.start, token.end);
    if (!shouldEmitRsxSemanticToken({ tokenType, tokenText })) {
      continue;
    }

    const mappedStart = expression.expressionStart + token.start;
    const mappedEnd = expression.expressionStart + token.end;
    const mappedLength = Math.max(mappedEnd - mappedStart, 1);

    mappedExpressionTokens.push({
      start: mappedStart,
      length: mappedLength,
      tokenType,
      tokenModifiers: 0,
    });
  }

  args.cacheEntry.semanticTokensByExpressionIndex.set(
    args.expressionIndex,
    mappedExpressionTokens,
  );
  return mappedExpressionTokens;
}

function getModuleExpressionDiagnostics(
  document: vscode.TextDocument,
  mode: IDiagnosticsMode = 'auto',
  options: { includeHeaderDiagnostics?: boolean } = {},
): vscode.Diagnostic[] {
  if (
    document.languageId !== RSX_LANGUAGE_ID ||
    document.uri.scheme !== 'file'
  ) {
    return [];
  }

  const cacheEntry = getModuleExpressionCacheEntry(document);
  const parsed = cacheEntry?.parsed;
  const diagnostics =
    options.includeHeaderDiagnostics === false
      ? []
      : [
          ...getModuleHeaderDiagnostics(document),
          ...getModuleHeaderTypeDiagnostics(document),
        ];
  if (!cacheEntry || !parsed || parsed.expressions.length === 0) {
    return diagnostics;
  }

  const expressionIndexes = resolveExpressionIndexesForMode({
    document,
    parsed,
    mode,
  });
  for (const expressionIndex of expressionIndexes) {
    diagnostics.push(
      ...getOrCreateMappedExpressionDiagnostics({
        document,
        cacheEntry,
        expressionIndex,
      }),
    );
  }

  return diagnostics;
}

function getModuleExpressionSemanticTokens(
  document: vscode.TextDocument,
  _mode: IDiagnosticsMode = 'auto',
): IRsxSemanticToken[] {
  if (
    document.languageId !== RSX_LANGUAGE_ID ||
    document.uri.scheme !== 'file'
  ) {
    return [];
  }

  const cacheEntry = getModuleExpressionCacheEntry(document);
  const parsed = cacheEntry?.parsed;
  if (!cacheEntry || !parsed || parsed.expressions.length === 0) {
    return [];
  }

  const tokens: IRsxSemanticToken[] = [];
  for (
    let expressionIndex = 0;
    expressionIndex < parsed.expressions.length;
    expressionIndex += 1
  ) {
    tokens.push(
      ...getOrCreateMappedExpressionSemanticTokens({
        document,
        cacheEntry,
        expressionIndex,
      }),
    );
  }

  const deduped = new Map<string, IRsxSemanticToken>();
  for (const token of tokens) {
    deduped.set(
      `${token.start}:${token.length}:${token.tokenType}:${token.tokenModifiers}`,
      token,
    );
  }
  const resolved = [...deduped.values()];
  resolved.sort((left, right) => left.start - right.start);
  return resolved;
}

function resolveExpressionIndexesForMode(args: {
  document: vscode.TextDocument;
  parsed: NonNullable<IModuleExpressionCacheEntry['parsed']>;
  mode: IDiagnosticsMode;
}): number[] {
  const expressionCount = args.parsed.expressions.length;
  const shouldFocus =
    args.mode === 'focused' ||
    (args.mode === 'auto' &&
      shouldUseFocusedModuleAnalysis(args.document, args.parsed));
  if (!shouldFocus) {
    return args.parsed.expressions.map((_, index) => index);
  }

  const activeIndex = getActiveExpressionIndex(args.document, args.parsed);
  if (activeIndex >= 0) {
    return [activeIndex];
  }

  return expressionCount > 0 ? [0] : [];
}

function shouldUseFocusedModuleAnalysis(
  document: vscode.TextDocument,
  parsed: NonNullable<IModuleExpressionCacheEntry['parsed']>,
): boolean {
  return (
    parsed.expressions.length > MODULE_FOCUSED_ANALYSIS_EXPRESSION_THRESHOLD &&
    document.getText().length > MODULE_FOCUSED_ANALYSIS_TEXT_LENGTH_THRESHOLD
  );
}

function getActiveExpressionIndex(
  document: vscode.TextDocument,
  parsed: NonNullable<IModuleExpressionCacheEntry['parsed']>,
): number {
  const activeEditor = vscode.window?.activeTextEditor;
  if (!activeEditor) {
    return -1;
  }
  if (activeEditor.document.uri.toString() !== document.uri.toString()) {
    return -1;
  }

  const activeOffset = document.offsetAt(activeEditor.selection.active);
  return getExpressionIndexAtOffset(parsed, activeOffset);
}

function createModuleExpressionStandaloneLanguageService(
  document: vscode.TextDocument,
  expression: IParsedRsxExpression,
  expressionIndex: number,
): IModuleExpressionStandaloneService | null {
  const standaloneTextLines = [`model: ${expression.modelTypeText}`];
  if (
    expression.returnTypeText &&
    expression.returnTypeText.trim().length > 0
  ) {
    standaloneTextLines.push(`return: ${expression.returnTypeText.trim()}`);
  }
  standaloneTextLines.push('', expression.expression);
  const standaloneText = standaloneTextLines.join('\n');
  const modelPropertyNamesHint = extractTopLevelModelPropertyNamesFromTypeText(
    expression.modelTypeText,
  );
  const standalone = safeCreateRsxStandaloneLanguageService({
    fileName: document.uri.fsPath,
    text: standaloneText,
    modelPropertyNamesHint,
    virtualFileNameSuffix: createModuleExpressionVirtualFileSuffix(
      expression,
      expressionIndex,
    ),
  });
  if (!standalone) {
    return null;
  }

  const expressionBodyStart = standaloneText.indexOf(expression.expression);
  if (expressionBodyStart < 0) {
    return null;
  }

  return {
    document: standalone,
    position: expressionBodyStart,
    expression,
    standaloneExpressionStart: expressionBodyStart,
  };
}

function createModuleExpressionVirtualFileSuffix(
  expression: IParsedRsxExpression,
  expressionIndex: number,
): string {
  const preferredName =
    expression.name ??
    `expr_${String(expressionIndex)}_${String(expression.expressionStart)}`;
  const normalized = preferredName
    .replace(/[^A-Za-z0-9_]+/gu, '_')
    .replace(/^_+/u, '')
    .replace(/_+$/u, '');
  const safeName =
    normalized.length > 0 ? normalized : `expr_${expressionIndex}`;
  return `module_${safeName.slice(0, 80)}`;
}

function mapModuleExpressionOffsetToDocument(
  service: IModuleExpressionStandaloneService,
  standaloneOffset: number,
): number {
  const expressionLength = service.expression.expression.length;
  const relativeOffset = Math.max(
    0,
    Math.min(
      expressionLength,
      standaloneOffset - service.standaloneExpressionStart,
    ),
  );

  return service.expression.expressionStart + relativeOffset;
}

function extractTopLevelModelPropertyNamesFromTypeText(
  modelTypeText: string,
): string[] {
  const trimmed = modelTypeText.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return [];
  }

  const body = trimmed.slice(1, -1);
  const segments: string[] = [];
  let segmentStart = 0;
  let braceDepth = 0;
  let bracketDepth = 0;
  let parenDepth = 0;
  let angleDepth = 0;
  let quote: "'" | '"' | null = null;

  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];
    if (quote) {
      if (character === quote && body[index - 1] !== '\\') {
        quote = null;
      }
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }

    if (character === '{') {
      braceDepth += 1;
      continue;
    }
    if (character === '}') {
      braceDepth = Math.max(0, braceDepth - 1);
      continue;
    }
    if (character === '[') {
      bracketDepth += 1;
      continue;
    }
    if (character === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1);
      continue;
    }
    if (character === '(') {
      parenDepth += 1;
      continue;
    }
    if (character === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
      continue;
    }
    if (character === '<') {
      angleDepth += 1;
      continue;
    }
    if (character === '>') {
      angleDepth = Math.max(0, angleDepth - 1);
      continue;
    }

    const atTopLevel =
      braceDepth === 0 &&
      bracketDepth === 0 &&
      parenDepth === 0 &&
      angleDepth === 0;
    if (atTopLevel && (character === ';' || character === ',')) {
      segments.push(body.slice(segmentStart, index));
      segmentStart = index + 1;
    }
  }
  segments.push(body.slice(segmentStart));

  const names = new Set<string>();
  for (const rawSegment of segments) {
    const segment = rawSegment.trim();
    if (!segment) {
      continue;
    }

    const identifierMatch =
      /^(?:readonly\s+)?([A-Za-z_$][A-Za-z0-9_$]*)(?:\?)?\s*:/u.exec(segment);
    if (identifierMatch?.[1]) {
      names.add(identifierMatch[1]);
      continue;
    }

    const quotedMatch = /^(?:readonly\s+)?['"]([^'"]+)['"](?:\?)?\s*:/u.exec(
      segment,
    );
    if (
      quotedMatch?.[1] &&
      /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(quotedMatch[1])
    ) {
      names.add(quotedMatch[1]);
      continue;
    }

    // Fallback to full compiler-backed model property resolution for any
    // non-simple object member declaration so member-expression behavior
    // remains correct for advanced model type syntaxes.
    return [];
  }

  return [...names];
}

function getModuleHeaderDiagnostics(
  document: vscode.TextDocument,
): vscode.Diagnostic[] {
  const text = document.getText();

  const diagnostics: vscode.Diagnostic[] = [];
  const lines = text.replace(/\r\n/gu, '\n').split('\n');
  const expressionNameFirstLine = new Map<string, number>();
  let state: IRsxModuleDiagnosticState = 'topLevel';
  let defaultsLineIndex: number | null = null;
  let defaultsHasModel = false;
  let defaultsHeaderOrderState = createHeaderOrderState('defaults block');
  let expressionHeaderOrderState: IHeaderOrderState | null = null;
  let expressionSeen = false;
  let topLevelStandaloneHeaderLineIndex: number | null = null;
  const hasModuleTopLevelHeader = lines.some((line) => {
    const parsed = parseHeaderLine(line);
    return (
      parsed !== null &&
      parsed.keyStartCharacter === 0 &&
      (parsed.key === 'defaults' || parsed.key === 'expression')
    );
  });

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }

    const indented = isIndentedLine(line);
    const topLevelHeader = !indented ? parseHeaderLine(line) : null;
    const topLevelExpressionHeader =
      topLevelHeader?.key === 'expression' &&
      topLevelHeader.value.trim().length > 0;
    const topLevelDefaultsHeader =
      topLevelHeader?.key === 'defaults' &&
      topLevelHeader.value.trim().length === 0;

    const finalizeExpressionHeaderBlock = (): void => {
      if (
        expressionHeaderOrderState &&
        !defaultsHasModel &&
        !expressionHeaderOrderState.seenHeaders.has('model')
      ) {
        const expressionNameText = expressionHeaderOrderState.expressionName
          ? ` "${expressionHeaderOrderState.expressionName}"`
          : '';
        addHeaderKeyDiagnostic({
          diagnostics,
          lineIndex:
            expressionHeaderOrderState.expressionLineIndex ?? lineIndex,
          keyStartCharacter:
            expressionHeaderOrderState.expressionKeyStartCharacter ?? 0,
          key: 'expression',
          message: `Expression${expressionNameText} must declare a model header because defaults: does not define one.`,
        });
      }
      expressionHeaderOrderState = null;
    };

    if (topLevelHeader?.key === 'expression' && !topLevelExpressionHeader) {
      finalizeExpressionHeaderBlock();
      addHeaderKeyDiagnostic({
        diagnostics,
        lineIndex,
        keyStartCharacter: topLevelHeader.keyStartCharacter,
        key: topLevelHeader.key,
        message: 'Header "expression" requires an expression name.',
      });
      state = 'topLevel';
      continue;
    }

    if (topLevelHeader?.key === 'defaults' && !topLevelDefaultsHeader) {
      finalizeExpressionHeaderBlock();
      addHeaderKeyDiagnostic({
        diagnostics,
        lineIndex,
        keyStartCharacter: topLevelHeader.keyStartCharacter,
        key: topLevelHeader.key,
        message: 'Header "defaults" must not have a value.',
      });
      state = 'topLevel';
      continue;
    }

    if (!indented && topLevelExpressionHeader) {
      finalizeExpressionHeaderBlock();
      expressionSeen = true;
      if (topLevelStandaloneHeaderLineIndex !== null) {
        addHeaderKeyDiagnostic({
          diagnostics,
          lineIndex,
          keyStartCharacter: 0,
          key: 'expression',
          message:
            'Module-style .rsx files cannot mix top-level model/return headers with expression blocks. Put shared headers under defaults: or indent them under each expression.',
        });
      }

      const expressionNameRaw = topLevelHeader.value;
      const expressionName = expressionNameRaw.trim();
      const expressionNameStart =
        getHeaderValueStartCharacter(line) +
        (expressionNameRaw.length - expressionNameRaw.trimStart().length);
      const expressionNameEnd = expressionNameStart + expressionName.length;
      expressionHeaderOrderState = createHeaderOrderState(
        expressionName ? `expression "${expressionName}"` : 'expression block',
        {
          expressionLineIndex: lineIndex,
          expressionName,
          expressionKeyStartCharacter: 0,
        },
      );

      if (!ts.isIdentifierText(expressionName, ts.ScriptTarget.Latest)) {
        diagnostics.push(
          new vscode.Diagnostic(
            new vscode.Range(
              new vscode.Position(lineIndex, expressionNameStart),
              new vscode.Position(
                lineIndex,
                Math.max(expressionNameEnd, expressionNameStart + 1),
              ),
            ),
            `Invalid expression name "${expressionName}".`,
            vscode.DiagnosticSeverity.Error,
          ),
        );
      } else {
        const firstLine = expressionNameFirstLine.get(expressionName);
        if (typeof firstLine === 'number') {
          diagnostics.push(
            new vscode.Diagnostic(
              new vscode.Range(
                new vscode.Position(lineIndex, expressionNameStart),
                new vscode.Position(lineIndex, expressionNameEnd),
              ),
              `Duplicate expression name "${expressionName}". Expression names must be unique in this file.`,
              vscode.DiagnosticSeverity.Error,
            ),
          );
        } else {
          expressionNameFirstLine.set(expressionName, lineIndex);
        }
      }

      state = 'expressionPrelude';
      continue;
    }

    if (!indented && topLevelDefaultsHeader) {
      finalizeExpressionHeaderBlock();
      if (defaultsLineIndex !== null) {
        addHeaderKeyDiagnostic({
          diagnostics,
          lineIndex,
          keyStartCharacter: 0,
          key: 'defaults',
          message:
            'Duplicate "defaults" header. A module .rsx file can only have one defaults block.',
        });
      }
      if (expressionSeen) {
        addHeaderKeyDiagnostic({
          diagnostics,
          lineIndex,
          keyStartCharacter: 0,
          key: 'defaults',
          message:
            'Header "defaults" must appear before all expression blocks.',
        });
      }
      if (topLevelStandaloneHeaderLineIndex !== null) {
        addHeaderKeyDiagnostic({
          diagnostics,
          lineIndex,
          keyStartCharacter: 0,
          key: 'defaults',
          message:
            'Header "defaults" must be the first module header. Move shared model/return headers under defaults:.',
        });
      }
      defaultsLineIndex = lineIndex;
      defaultsHeaderOrderState = createHeaderOrderState('defaults block');
      state = 'defaultsHeaders';
      continue;
    }

    if (state === 'defaultsHeaders') {
      if (!indented) {
        state = 'topLevel';
      } else {
        const parsed = parseHeaderLine(line);
        if (parsed) {
          addHeaderOrderDiagnosticsForLine({
            diagnostics,
            lineIndex,
            keyStartCharacter: parsed.keyStartCharacter,
            key: parsed.key,
            state: defaultsHeaderOrderState,
          });
          if (parsed.key === 'model') {
            defaultsHasModel = true;
          }
          addHeaderDiagnosticsForLine({
            diagnostics,
            document,
            lineIndex,
            key: parsed.key,
            value: parsed.value,
          });
        }
        continue;
      }
    }

    if (state === 'expressionPrelude') {
      if (!indented) {
        finalizeExpressionHeaderBlock();
        state = 'topLevel';
      } else {
        const headerLineHandled = addExpressionPreludeHeaderDiagnosticsForLine({
          diagnostics,
          document,
          line,
          lineIndex,
          state: expressionHeaderOrderState,
        });
        if (!headerLineHandled) {
          finalizeExpressionHeaderBlock();
          state = 'expressionBody';
        }
        continue;
      }
    }

    if (state === 'expressionBody') {
      if (indented) {
        continue;
      }
      state = 'topLevel';
    }

    if (!topLevelHeader || indented) {
      continue;
    }

    if (hasModuleTopLevelHeader) {
      if (isModuleExpressionHeaderKey(topLevelHeader.key)) {
        if (topLevelStandaloneHeaderLineIndex === null) {
          topLevelStandaloneHeaderLineIndex = lineIndex;
        }
        addHeaderKeyDiagnostic({
          diagnostics,
          lineIndex,
          keyStartCharacter: topLevelHeader.keyStartCharacter,
          key: topLevelHeader.key,
          message: `Header "${topLevelHeader.key}" must be indented under defaults: or an expression block in module-style .rsx files.`,
        });
        continue;
      }
    }

    addHeaderDiagnosticsForLine({
      diagnostics,
      document,
      lineIndex,
      key: topLevelHeader.key,
      value: topLevelHeader.value,
    });
  }

  if (state === 'expressionPrelude') {
    const finalLineIndex = Math.max(0, lines.length - 1);
    if (
      expressionHeaderOrderState &&
      !defaultsHasModel &&
      !expressionHeaderOrderState.seenHeaders.has('model')
    ) {
      const expressionNameText = expressionHeaderOrderState.expressionName
        ? ` "${expressionHeaderOrderState.expressionName}"`
        : '';
      addHeaderKeyDiagnostic({
        diagnostics,
        lineIndex:
          expressionHeaderOrderState.expressionLineIndex ?? finalLineIndex,
        keyStartCharacter:
          expressionHeaderOrderState.expressionKeyStartCharacter ?? 0,
        key: 'expression',
        message: `Expression${expressionNameText} must declare a model header because defaults: does not define one.`,
      });
    }
  }

  return diagnostics;
}

function getModuleHeaderTypeDiagnostics(
  document: vscode.TextDocument,
): vscode.Diagnostic[] {
  const text = document.getText();
  if (!/^\s*expression\s*:/mu.test(text)) {
    return [];
  }

  const diagnostics: vscode.Diagnostic[] = [];
  const seen = new Set<string>();
  let state: IRsxModuleDiagnosticState = 'topLevel';

  for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex += 1) {
    const line = document.lineAt(lineIndex);
    const lineText = line.text;
    const trimmed = lineText.trim();
    if (trimmed.length === 0) {
      continue;
    }

    const indented = isIndentedLine(lineText);
    const topLevelHeader = !indented ? parseHeaderLine(lineText) : null;
    const topLevelExpressionHeader =
      topLevelHeader?.key === 'expression' &&
      topLevelHeader.value.trim().length > 0;
    const topLevelDefaultsHeader =
      topLevelHeader?.key === 'defaults' &&
      topLevelHeader.value.trim().length === 0;

    if (!indented && topLevelExpressionHeader) {
      state = 'expressionPrelude';
      continue;
    }

    if (!indented && topLevelDefaultsHeader) {
      state = 'defaultsHeaders';
      continue;
    }

    if (state === 'defaultsHeaders') {
      if (!indented) {
        state = 'topLevel';
      } else {
        addModuleHeaderTypeDiagnosticsForLine({
          diagnostics,
          document,
          lineIndex,
          lineText,
          seen,
        });
        continue;
      }
    }

    if (state === 'expressionPrelude') {
      if (!indented) {
        state = 'topLevel';
      } else {
        const parsed = parseHeaderLine(lineText);
        if (!parsed) {
          state = 'expressionBody';
          continue;
        }

        addModuleHeaderTypeDiagnosticsForLine({
          diagnostics,
          document,
          lineIndex,
          lineText,
          seen,
        });
        continue;
      }
    }

    if (state === 'expressionBody') {
      if (indented) {
        continue;
      }
      state = 'topLevel';
    }

    if (state !== 'topLevel') {
      continue;
    }

    addModuleHeaderTypeDiagnosticsForLine({
      diagnostics,
      document,
      lineIndex,
      lineText,
      seen,
    });
  }

  return diagnostics;
}

function addModuleHeaderTypeDiagnosticsForLine(args: {
  diagnostics: vscode.Diagnostic[];
  document: vscode.TextDocument;
  lineIndex: number;
  lineText: string;
  seen: Set<string>;
}): void {
  const parsed = parseHeaderLine(args.lineText);
  if (!parsed || (parsed.key !== 'model' && parsed.key !== 'return')) {
    return;
  }

  const separatorIndex = args.lineText.indexOf(':');
  if (separatorIndex < 0) {
    return;
  }
  const valueStartCharacter = getHeaderValueStartCharacter(args.lineText);
  if (valueStartCharacter >= args.lineText.length) {
    return;
  }

  const valueStartOffset = args.document.offsetAt(
    new vscode.Position(args.lineIndex, valueStartCharacter),
  );
  const headerDiagnostics = getFastModuleHeaderTypeDiagnostics({
    document: args.document,
    value: parsed.value,
    valueStartOffset,
  });

  for (const diagnostic of headerDiagnostics) {
    const key = `${diagnostic.start}:${diagnostic.end}:${diagnostic.message}`;
    if (args.seen.has(key)) {
      continue;
    }
    args.seen.add(key);
    args.diagnostics.push(
      new vscode.Diagnostic(
        new vscode.Range(
          args.document.positionAt(diagnostic.start),
          args.document.positionAt(diagnostic.end),
        ),
        diagnostic.message,
        vscode.DiagnosticSeverity.Error,
      ),
    );
  }
}

function getFastModuleHeaderTypeDiagnostics(args: {
  document: vscode.TextDocument;
  value: string;
  valueStartOffset: number;
}): Array<{ message: string; start: number; end: number }> {
  const diagnostics: Array<{ message: string; start: number; end: number }> =
    [];
  const prefix = 'type __RSX_HEADER = ';
  const sourceFile = ts.createSourceFile(
    `${args.document.uri.fsPath}.header.ts`,
    `${prefix}${args.value};`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  for (const diagnostic of sourceFile.parseDiagnostics) {
    const start = Math.max(
      0,
      (diagnostic.start ?? prefix.length) - prefix.length,
    );
    const length = Math.max(1, diagnostic.length ?? 1);
    diagnostics.push({
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      start: args.valueStartOffset + start,
      end: args.valueStartOffset + Math.min(args.value.length, start + length),
    });
  }

  for (const diagnostic of getRsxHeaderImportDiagnosticsForText({
    fileName: args.document.uri.fsPath,
    headerText: args.value,
  })) {
    diagnostics.push({
      message: diagnostic.message,
      start: args.valueStartOffset + diagnostic.start,
      end: args.valueStartOffset + diagnostic.end,
    });
  }

  return diagnostics;
}

function parseHeaderLine(
  line: string,
): { key: string; value: string; keyStartCharacter: number } | null {
  let cursor = 0;
  while (cursor < line.length && isLineWhitespaceCharacter(line[cursor])) {
    cursor += 1;
  }

  const keyStartCharacter = cursor;
  if (!isHeaderKeyStart(line[cursor])) {
    return null;
  }

  cursor += 1;
  while (cursor < line.length && isHeaderKeyPart(line[cursor])) {
    cursor += 1;
  }
  const key = line.slice(keyStartCharacter, cursor);

  while (cursor < line.length && isLineWhitespaceCharacter(line[cursor])) {
    cursor += 1;
  }

  if (line[cursor] !== ':') {
    return null;
  }

  return {
    key,
    value: line.slice(getHeaderValueStartCharacter(line)),
    keyStartCharacter,
  };
}

function scanHeaderAuthoringKey(line: string): {
  key: string;
  keyStartCharacter: number;
  hasColon: boolean;
} | null {
  let cursor = 0;
  while (cursor < line.length && isLineWhitespaceCharacter(line[cursor])) {
    cursor += 1;
  }

  const keyStartCharacter = cursor;
  if (!isHeaderKeyStart(line[cursor])) {
    return null;
  }

  cursor += 1;
  while (cursor < line.length && isHeaderKeyPart(line[cursor])) {
    cursor += 1;
  }
  const key = line.slice(keyStartCharacter, cursor);

  while (cursor < line.length && isLineWhitespaceCharacter(line[cursor])) {
    cursor += 1;
  }

  return {
    key,
    keyStartCharacter,
    hasColon: line[cursor] === ':',
  };
}

function getHeaderValueStartCharacter(line: string): number {
  const separatorIndex = line.indexOf(':');
  if (separatorIndex < 0) {
    return line.length;
  }

  let cursor = separatorIndex + 1;
  while (cursor < line.length && isLineWhitespaceCharacter(line[cursor])) {
    cursor += 1;
  }
  return cursor;
}

function isIndentedLine(line: string): boolean {
  return line.length > 0 && isLineWhitespaceCharacter(line[0]);
}

function isLineWhitespaceCharacter(character: string | undefined): boolean {
  return character !== undefined && character.trim().length === 0;
}

function isHeaderKeyStart(character: string | undefined): boolean {
  if (!character) {
    return false;
  }
  const code = character.charCodeAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function isHeaderKeyPart(character: string | undefined): boolean {
  if (!character) {
    return false;
  }
  const code = character.charCodeAt(0);
  return (
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    (code >= 48 && code <= 57) ||
    character === '_'
  );
}

function isHeaderCompletionKeyPart(character: string | undefined): boolean {
  return isHeaderKeyPart(character) || character === '$';
}

function readTypeScriptIdentifierAt(
  text: string,
  start: number,
): string | null {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    text.slice(start),
  );
  const token = scanner.scan();
  return token === ts.SyntaxKind.Identifier ? scanner.getTokenText() : null;
}

function addHeaderDiagnosticsForLine(args: {
  diagnostics: vscode.Diagnostic[];
  document: vscode.TextDocument;
  lineIndex: number;
  key: string;
  value: string;
}): void {
  const key = args.key;
  const lineText = args.document.lineAt(args.lineIndex).text;
  const parsedLine = parseHeaderLine(lineText);
  if (!parsedLine) {
    return;
  }

  if (
    !MODULE_EXPRESSION_HEADER_KEYS.includes(
      key as (typeof MODULE_EXPRESSION_HEADER_KEYS)[number],
    )
  ) {
    args.diagnostics.push(
      new vscode.Diagnostic(
        new vscode.Range(
          new vscode.Position(args.lineIndex, parsedLine.keyStartCharacter),
          new vscode.Position(
            args.lineIndex,
            parsedLine.keyStartCharacter + key.length,
          ),
        ),
        `Unknown RS-X header key "${key}".`,
        vscode.DiagnosticSeverity.Error,
      ),
    );
    return;
  }

  if (
    (key === 'preparse' ||
      key === 'lazy' ||
      key === 'compiled' ||
      key === 'compile') &&
    args.value !== 'true' &&
    args.value !== 'false'
  ) {
    args.diagnostics.push(
      new vscode.Diagnostic(
        new vscode.Range(
          new vscode.Position(args.lineIndex, parsedLine.keyStartCharacter),
          new vscode.Position(
            args.lineIndex,
            parsedLine.keyStartCharacter + key.length,
          ),
        ),
        `Header "${key}" must be "true" or "false".`,
        vscode.DiagnosticSeverity.Error,
      ),
    );
  }
}

function addExpressionPreludeHeaderDiagnosticsForLine(args: {
  diagnostics: vscode.Diagnostic[];
  document: vscode.TextDocument;
  line: string;
  lineIndex: number;
  state: IHeaderOrderState | null;
}): boolean {
  const parsed = parseHeaderLine(args.line);
  if (!parsed) {
    return false;
  }

  if (args.state) {
    addHeaderOrderDiagnosticsForLine({
      diagnostics: args.diagnostics,
      lineIndex: args.lineIndex,
      keyStartCharacter: parsed.keyStartCharacter,
      key: parsed.key,
      state: args.state,
    });
  }
  addHeaderDiagnosticsForLine({
    diagnostics: args.diagnostics,
    document: args.document,
    lineIndex: args.lineIndex,
    key: parsed.key,
    value: parsed.value,
  });
  return true;
}

function createHeaderOrderState(
  blockLabel: string,
  options: {
    expressionLineIndex?: number;
    expressionName?: string;
    expressionKeyStartCharacter?: number;
  } = {},
): IHeaderOrderState {
  return {
    blockLabel,
    seenHeaders: new Set<string>(),
    ...options,
  };
}

function addHeaderOrderDiagnosticsForLine(args: {
  diagnostics: vscode.Diagnostic[];
  lineIndex: number;
  keyStartCharacter: number;
  key: string;
  state: IHeaderOrderState;
}): void {
  if (!isModuleExpressionHeaderKey(args.key)) {
    return;
  }

  if (args.state.seenHeaders.has(args.key)) {
    addHeaderKeyDiagnostic({
      diagnostics: args.diagnostics,
      lineIndex: args.lineIndex,
      keyStartCharacter: args.keyStartCharacter,
      key: args.key,
      message: `Duplicate "${args.key}" header in ${args.state.blockLabel}.`,
    });
    return;
  }

  if (
    args.key === 'model' &&
    [...args.state.seenHeaders].some((key) => key !== 'model')
  ) {
    addHeaderKeyDiagnostic({
      diagnostics: args.diagnostics,
      lineIndex: args.lineIndex,
      keyStartCharacter: args.keyStartCharacter,
      key: args.key,
      message: `Header "model" must appear before option and return headers in ${args.state.blockLabel}.`,
    });
  }

  if (
    isModuleOptionHeaderKey(args.key) &&
    args.state.seenHeaders.has('return')
  ) {
    addHeaderKeyDiagnostic({
      diagnostics: args.diagnostics,
      lineIndex: args.lineIndex,
      keyStartCharacter: args.keyStartCharacter,
      key: args.key,
      message: `Header "${args.key}" must appear before return: in ${args.state.blockLabel}.`,
    });
  }

  args.state.seenHeaders.add(args.key);
}

function isModuleExpressionHeaderKey(
  key: string,
): key is (typeof MODULE_EXPRESSION_HEADER_KEYS)[number] {
  return MODULE_EXPRESSION_HEADER_KEYS.includes(
    key as (typeof MODULE_EXPRESSION_HEADER_KEYS)[number],
  );
}

function isModuleOptionHeaderKey(
  key: string,
): key is (typeof MODULE_OPTION_HEADER_KEYS)[number] {
  return MODULE_OPTION_HEADER_KEYS.includes(
    key as (typeof MODULE_OPTION_HEADER_KEYS)[number],
  );
}

function addHeaderKeyDiagnostic(args: {
  diagnostics: vscode.Diagnostic[];
  lineIndex: number;
  keyStartCharacter: number;
  key: string;
  message: string;
}): void {
  args.diagnostics.push(
    new vscode.Diagnostic(
      new vscode.Range(
        new vscode.Position(args.lineIndex, args.keyStartCharacter),
        new vscode.Position(
          args.lineIndex,
          args.keyStartCharacter + Math.max(1, args.key.length),
        ),
      ),
      args.message,
      vscode.DiagnosticSeverity.Error,
    ),
  );
}

function getModuleHeaderCompletions(
  document: vscode.TextDocument,
  position: vscode.Position,
): vscode.CompletionItem[] {
  const linePrefix = document
    .lineAt(position.line)
    .text.slice(0, position.character);
  if (linePrefix.includes(':')) {
    return [];
  }

  const prefix = scanHeaderCompletionPrefix(linePrefix);
  if (!prefix) {
    return [];
  }

  const previousNonEmptyLine = getPreviousNonEmptyLine(document, position.line);
  const previousTrimmed = previousNonEmptyLine?.trim() ?? '';
  const previousIsIndented = previousNonEmptyLine
    ? isIndentedLine(previousNonEmptyLine)
    : false;
  const hasDefaultsHeader = hasTopLevelHeader(document, 'defaults');
  const hasExpressionHeader = hasTopLevelHeader(document, 'expression');
  const isModuleDocument = hasExpressionHeader || hasDefaultsHeader;
  let candidates: readonly string[] = [];

  if (prefix.leadingWhitespace.length > 0) {
    if (
      isTopLevelDefaultsHeaderLine(previousTrimmed) ||
      isTopLevelExpressionHeaderLine(previousTrimmed) ||
      isExpressionHeaderLine(previousTrimmed)
    ) {
      candidates = MODULE_EXPRESSION_HEADER_KEYS;
    }
  } else if (
    !previousIsIndented &&
    (isTopLevelExpressionHeaderLine(previousTrimmed) ||
      isExpressionHeaderLine(previousTrimmed))
  ) {
    candidates = MODULE_EXPRESSION_HEADER_KEYS;
  } else if (isModuleDocument) {
    candidates =
      hasDefaultsHeader || hasExpressionHeader
        ? ['expression']
        : MODULE_TOP_LEVEL_HEADER_KEYS;
  } else {
    candidates = FRESH_FILE_TOP_LEVEL_HEADER_KEYS;
  }

  return candidates
    .filter((candidate) => candidate.startsWith(prefix.typedPrefix))
    .map((candidate) => {
      const completion = new vscode.CompletionItem(
        candidate,
        vscode.CompletionItemKind.Property,
      );
      completion.insertText = `${candidate}: `;
      completion.sortText = `0_${candidate}`;
      return completion;
    });
}

function getPreviousNonEmptyLine(
  document: vscode.TextDocument,
  fromLine: number,
): string | null {
  for (let lineIndex = fromLine - 1; lineIndex >= 0; lineIndex -= 1) {
    const lineText = document.lineAt(lineIndex).text;
    if (lineText.trim().length > 0) {
      return lineText;
    }
  }
  return null;
}

function scanHeaderCompletionPrefix(linePrefix: string): {
  leadingWhitespace: string;
  typedPrefix: string;
} | null {
  let cursor = 0;
  while (
    cursor < linePrefix.length &&
    isLineWhitespaceCharacter(linePrefix[cursor])
  ) {
    cursor += 1;
  }

  const keyStart = cursor;
  while (
    cursor < linePrefix.length &&
    isHeaderCompletionKeyPart(linePrefix[cursor])
  ) {
    cursor += 1;
  }

  if (cursor !== linePrefix.length) {
    return null;
  }

  return {
    leadingWhitespace: linePrefix.slice(0, keyStart),
    typedPrefix: linePrefix.slice(keyStart),
  };
}

function hasTopLevelHeader(
  document: vscode.TextDocument,
  key: 'defaults' | 'expression',
): boolean {
  for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex += 1) {
    const line = document.lineAt(lineIndex).text;
    if (isIndentedLine(line)) {
      continue;
    }
    const parsed = parseHeaderLine(line);
    if (parsed?.key === key) {
      return true;
    }
  }
  return false;
}

function isTopLevelDefaultsHeaderLine(line: string): boolean {
  const parsed = parseHeaderLine(line);
  return parsed?.key === 'defaults' && parsed.value.trim().length === 0;
}

function isTopLevelExpressionHeaderLine(line: string): boolean {
  const parsed = parseHeaderLine(line);
  return parsed?.key === 'expression' && parsed.value.trim().length > 0;
}

function isExpressionHeaderLine(line: string): boolean {
  const parsed = parseHeaderLine(line);
  if (!parsed || parsed.value.trim().length === 0) {
    return false;
  }

  return MODULE_EXPRESSION_HEADER_KEYS.includes(
    parsed.key as (typeof MODULE_EXPRESSION_HEADER_KEYS)[number],
  );
}

function applyTextEdits(
  text: string,
  edits: readonly vscode.TextEdit[],
): string {
  if (edits.length === 0) {
    return text;
  }

  const sortedEdits = [...edits].sort((left, right) => {
    const leftOffset = offsetAt(text, left.range.start);
    const rightOffset = offsetAt(text, right.range.start);
    return rightOffset - leftOffset;
  });

  let result = text;
  for (const edit of sortedEdits) {
    const start = offsetAt(text, edit.range.start);
    const end = offsetAt(text, edit.range.end);
    result = `${result.slice(0, start)}${edit.newText}${result.slice(end)}`;
  }

  return result;
}

function offsetAt(text: string, position: vscode.Position): number {
  const lines = text.split('\n');
  let offset = 0;
  for (let index = 0; index < position.line; index += 1) {
    offset += (lines[index]?.length ?? 0) + 1;
  }
  return offset + position.character;
}

function unwrapFormattedExpression(text: string): string {
  const normalizedText = text.replace(/\r\n/gu, '\n');
  const prefixIndex = normalizedText.indexOf(WRAPPED_EXPRESSION_PREFIX);
  const suffixIndex = normalizedText.lastIndexOf(
    WRAPPED_EXPRESSION_SUFFIX.trimStart(),
  );
  if (prefixIndex === -1 || suffixIndex === -1) {
    return normalizedText.trim();
  }

  const bodyStart = prefixIndex + WRAPPED_EXPRESSION_PREFIX.length;
  const body = normalizedText.slice(bodyStart, suffixIndex);

  const bodyLines = body.replace(/\n$/u, '').split('\n');
  const minimumIndent = bodyLines.reduce<number>((current, line) => {
    if (line.trim().length === 0) {
      return current;
    }

    const indent = line.match(/^\s*/u)?.[0].length ?? 0;
    return current === -1 ? indent : Math.min(current, indent);
  }, -1);

  return bodyLines
    .map((line) =>
      minimumIndent > 0 && line.length >= minimumIndent
        ? line.slice(minimumIndent)
        : line,
    )
    .join('\n')
    .trim();
}

function fullDocumentRange(document: vscode.TextDocument): vscode.Range {
  return new vscode.Range(
    document.positionAt(0),
    document.positionAt(document.getText().length),
  );
}

function toVscodeDocumentSymbol(
  document: vscode.TextDocument,
  symbol: ReturnType<typeof getRsxDocumentSymbols>[number],
): vscode.DocumentSymbol {
  const documentSymbol = new vscode.DocumentSymbol(
    symbol.name,
    symbol.detail ?? '',
    toVscodeSymbolKind(symbol.kind),
    new vscode.Range(
      positionForFileOffset(
        document,
        symbol.range.fileName,
        symbol.range.start,
      ),
      positionForFileOffset(document, symbol.range.fileName, symbol.range.end),
    ),
    new vscode.Range(
      positionForFileOffset(
        document,
        symbol.selectionRange.fileName,
        symbol.selectionRange.start,
      ),
      positionForFileOffset(
        document,
        symbol.selectionRange.fileName,
        symbol.selectionRange.end,
      ),
    ),
  );
  documentSymbol.children = symbol.children.map((child) =>
    toVscodeDocumentSymbol(document, child),
  );
  return documentSymbol;
}

function toVscodeSymbolKind(
  kind: 'type' | 'property' | 'function' | 'variable',
): vscode.SymbolKind {
  switch (kind) {
    case 'type':
      return vscode.SymbolKind.Interface;
    case 'property':
      return vscode.SymbolKind.Property;
    case 'function':
      return vscode.SymbolKind.Function;
    case 'variable':
    default:
      return vscode.SymbolKind.Variable;
  }
}

function positionForFileOffset(
  activeDocument: vscode.TextDocument,
  fileName: string,
  offset: number,
): vscode.Position {
  if (
    activeDocument.uri.scheme === 'file' &&
    activeDocument.uri.fsPath === fileName
  ) {
    return activeDocument.positionAt(offset);
  }

  const text = ts.sys.readFile(fileName) ?? '';
  return positionAt(text, offset);
}

function positionAt(text: string, offset: number): vscode.Position {
  const normalizedOffset = Math.max(0, Math.min(offset, text.length));
  const precedingText = text.slice(0, normalizedOffset);
  const lines = precedingText.split('\n');
  const line = Math.max(0, lines.length - 1);
  const character = lines.at(-1)?.length ?? 0;
  return new vscode.Position(line, character);
}
