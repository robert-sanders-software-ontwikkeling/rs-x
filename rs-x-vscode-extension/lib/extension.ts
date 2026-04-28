import * as path from 'node:path';

import ts from 'typescript';
import * as vscode from 'vscode';

import {
  createRsxSemanticClassificationContext,
  getRsxExpressionExports,
  normalizeRsxModelExpressionReferenceTypeText,
  parseRsxFileExpressions,
  resolveRsxSemanticTokenType,
  shouldEmitRsxSemanticToken,
  tokenizeRsxExpression,
} from '@rs-x/compiler';
import {
  JsEspreeExpressionParser,
  JsExpressionAstParser,
} from '@rs-x/expression-parser';

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
const RSX_FILE_PATTERN = '**/*.rsx';
const RSX_DOCUMENT_SELECTOR: vscode.DocumentSelector = [
  { language: RSX_LANGUAGE_ID },
  { pattern: RSX_FILE_PATTERN },
];
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

interface ITypeHeaderValueRegion {
  key: 'model' | 'return';
  keyStartCharacter: number;
  value: string;
  valueStartOffset: number;
  valueEndOffset: number;
  startLine: number;
  endLine: number;
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

interface IRsxExpressionTreeExpressionsRoot {
  readonly kind: 'root';
  readonly section: 'expressions';
  readonly label: string;
  readonly files: readonly IRsxExpressionTreeFile[];
}

interface IRsxExpressionTreeModelsRoot {
  readonly kind: 'root';
  readonly section: 'models';
  readonly label: string;
  readonly models: readonly IRsxExpressionTreeModel[];
}

interface IRsxExpressionTreeExpression {
  readonly kind: 'expression';
  readonly key: string;
  readonly uri: vscode.Uri;
  readonly relativePath: string;
  readonly exportName: string;
  readonly expression: IRsxExpressionExport['expression'];
  readonly start: number;
  readonly end: number;
  readonly modelStart: number;
  readonly modelEnd: number;
  readonly modelDefinition?: IRsxExpressionTreeLocation;
  readonly modelFields: readonly IRsxExpressionTreeModelField[];
  readonly dependencies: readonly IRsxExpressionDependencyEdge[];
}

interface IRsxExpressionTreeLocation {
  readonly uri: vscode.Uri;
  readonly start: number;
  readonly end: number;
}

interface IRsxExpressionTreeModel {
  readonly kind: 'model';
  readonly key: string;
  readonly label: string;
  readonly modelTypeText: string;
  readonly uri: vscode.Uri;
  readonly relativePath: string;
  readonly start: number;
  readonly end: number;
  readonly fields: readonly IRsxExpressionTreeModelField[];
  readonly expressions: readonly IRsxExpressionTreeExpression[];
}

interface IRsxExpressionTreeModelField {
  readonly kind: 'modelField';
  readonly key: string;
  readonly label: string;
  readonly path: readonly string[];
  readonly typeText?: string;
  readonly uri: vscode.Uri;
  readonly start: number;
  readonly end: number;
  readonly children: readonly IRsxExpressionTreeModelField[];
  readonly expressionUses: readonly IRsxExpressionTreeModelFieldExpressionUse[];
}

interface IRsxExpressionTreeModelFieldExpressionUse {
  readonly kind: 'modelFieldExpression';
  readonly key: string;
  readonly fieldPath: readonly string[];
  readonly expression: IRsxExpressionTreeExpression;
  readonly uri: vscode.Uri;
  readonly start: number;
  readonly end: number;
}

interface IRsxExpressionDependencyEdge {
  readonly targetKey: string;
  readonly targetUri: vscode.Uri;
  readonly targetRelativePath: string;
  readonly targetExportName: string;
  readonly targetStart: number;
  readonly targetEnd: number;
  readonly identifier: string;
  readonly matchKind: 'exportName' | 'modelFieldExpressionType';
}

interface IRsxExpressionDependencyTreeItem {
  readonly kind: 'dependency';
  readonly source: IRsxExpressionTreeExpression;
  readonly edge: IRsxExpressionDependencyEdge;
  readonly pathKeys: readonly string[];
}

type IRsxExpressionTreeItem =
  | IRsxExpressionTreeExpressionsRoot
  | IRsxExpressionTreeModelsRoot
  | IRsxExpressionTreeFile
  | IRsxExpressionTreeExpression
  | IRsxExpressionTreeModel
  | IRsxExpressionTreeModelField
  | IRsxExpressionTreeModelFieldExpressionUse
  | IRsxExpressionDependencyTreeItem;

interface IRsxExpressionGraphPreviewNode {
  readonly id: string;
  readonly key: string;
  readonly exportName: string;
  readonly uri: string;
  readonly expressionText: string;
  readonly modelTypeText?: string;
  readonly returnTypeText?: string;
  readonly start: number;
  readonly end: number;
  readonly x: number;
  readonly y: number;
}

interface IRsxExpressionGraphPreviewEdge {
  readonly sourceId: string;
  readonly targetId: string;
}

interface IRsxExpressionGraphPreviewData {
  readonly title: string;
  readonly nodes: readonly IRsxExpressionGraphPreviewNode[];
  readonly edges: readonly IRsxExpressionGraphPreviewEdge[];
  readonly nodeWidth: number;
  readonly nodeHeight: number;
  readonly horizontalGap: number;
  readonly verticalGap: number;
  readonly padding: number;
  readonly maxX: number;
  readonly maxDepth: number;
}

interface IRsxExpressionGraphLayoutNode {
  readonly id: string;
  readonly expression: IRsxExpressionGraphParsedNode | null;
  parent?: IRsxExpressionGraphLayoutNode;
  children: IRsxExpressionGraphLayoutNode[];
  depth: number;
  number: number;
  x: number;
  y: number;
  prelim: number;
  mod: number;
  change: number;
  shift: number;
  ancestor: IRsxExpressionGraphLayoutNode;
  thread?: IRsxExpressionGraphLayoutNode;
}

interface IRsxExpressionGraphLayoutResult {
  readonly nodes: readonly IRsxExpressionGraphLayoutNode[];
  readonly edges: readonly {
    readonly source: IRsxExpressionGraphLayoutNode;
    readonly target: IRsxExpressionGraphLayoutNode;
  }[];
  readonly maxX: number;
  readonly maxDepth: number;
}

interface IRsxExpressionGraphParsedNode {
  readonly source: IRsxExpressionTreeExpression;
  readonly expressionString: string;
  readonly typeText: string;
  readonly start: number;
  readonly end: number;
  readonly hidden: boolean;
  readonly childExpressions: readonly IRsxExpressionGraphParsedNode[];
}

const standaloneServiceCache = new Map<string, IStandaloneServiceCacheEntry>();
const moduleExpressionCache = new Map<string, IModuleExpressionCacheEntry>();
const documentSemanticTokenCache = new Map<
  string,
  IDocumentSemanticTokenCacheEntry
>();
let pendingHeaderSuggestTimer: ReturnType<typeof setTimeout> | null = null;
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
const rsxExpressionTreePreviewParser = new JsEspreeExpressionParser(
  new JsExpressionAstParser(),
);

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
      'rsx.expressions.preview',
      async (item?: IRsxExpressionTreeItem) => {
        await openRsxExpressionGraphPreview(expressionsProvider, item);
      },
    ),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rsx.expressions.open',
      async (
        item?:
          | IRsxExpressionTreeExpression
          | IRsxExpressionTreeModel
          | IRsxExpressionTreeModelField
          | IRsxExpressionTreeModelFieldExpressionUse,
      ) => {
        if (
          item?.kind === 'expression' ||
          item?.kind === 'model' ||
          item?.kind === 'modelField' ||
          item?.kind === 'modelFieldExpression'
        ) {
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
      RSX_DOCUMENT_SELECTOR,
      new RsxCompletionItemProvider(),
      '.',
      ...HEADER_COMPLETION_TRIGGER_CHARACTERS,
    ),
  );
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      RSX_DOCUMENT_SELECTOR,
      new RsxHoverProvider(),
    ),
  );
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      RSX_DOCUMENT_SELECTOR,
      new RsxDefinitionProvider(),
    ),
  );
  context.subscriptions.push(
    vscode.languages.registerTypeDefinitionProvider(
      RSX_DOCUMENT_SELECTOR,
      new RsxTypeDefinitionProvider(),
    ),
  );
  context.subscriptions.push(
    vscode.languages.registerReferenceProvider(
      RSX_DOCUMENT_SELECTOR,
      new RsxReferenceProvider(),
    ),
  );
  context.subscriptions.push(
    vscode.languages.registerImplementationProvider(
      RSX_DOCUMENT_SELECTOR,
      new RsxImplementationProvider(),
    ),
  );
  context.subscriptions.push(
    vscode.languages.registerRenameProvider(
      RSX_DOCUMENT_SELECTOR,
      new RsxRenameProvider(),
    ),
  );
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      RSX_DOCUMENT_SELECTOR,
      new RsxDocumentSymbolProvider(),
    ),
  );
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      RSX_DOCUMENT_SELECTOR,
      new RsxCodeActionProvider(),
      {
        providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
      },
    ),
  );
  context.subscriptions.push(
    vscode.languages.registerSignatureHelpProvider(
      RSX_DOCUMENT_SELECTOR,
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
      RSX_DOCUMENT_SELECTOR,
      semanticTokensProvider,
      semanticTokensLegend,
    ),
  );
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(
      RSX_DOCUMENT_SELECTOR,
      new RsxDocumentFormattingEditProvider(),
    ),
  );
  context.subscriptions.push(
    vscode.languages.registerDocumentRangeFormattingEditProvider(
      RSX_DOCUMENT_SELECTOR,
      new RsxDocumentRangeFormattingEditProvider(),
    ),
  );

  const refreshDiagnosticsForDocument = (
    document: vscode.TextDocument,
    mode: IDiagnosticsMode = 'auto',
    debounceMs = 150,
  ) => {
    if (!isRsxDocument(document)) {
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
        if (!isRsxDocument(currentDocument)) {
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
      refreshDiagnosticsForDocument(document, 'focused', 100);
    }),
  );
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      invalidateRsxDocumentAnalysis(event.document, {
        fireSemanticTokensChanged: true,
      });
      triggerRsxHeaderSuggestIfNeeded(event);
      refreshDiagnosticsForDocument(event.document, 'focused', 180);
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
      if (isRsxDocument(document)) {
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
    refreshDiagnosticsForDocument(document, 'focused', 250);
    scheduleModuleExpressionPrewarm(document, 0);
  }
}

export function deactivate(): void {
  if (pendingHeaderSuggestTimer) {
    clearTimeout(pendingHeaderSuggestTimer);
    pendingHeaderSuggestTimer = null;
  }
}

function isRsxDocument(document: vscode.TextDocument): boolean {
  return (
    document.languageId === RSX_LANGUAGE_ID || isRsxDocumentUri(document.uri)
  );
}

function isRsxDocumentUri(uri: vscode.Uri): boolean {
  const pathText = 'path' in uri ? uri.path : uri.fsPath;
  return pathText.toLowerCase().endsWith('.rsx');
}

function triggerRsxHeaderSuggestIfNeeded(
  event: vscode.TextDocumentChangeEvent,
): void {
  if (!isRsxDocument(event.document)) {
    return;
  }

  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor?.document.uri.toString() !== event.document.uri.toString()) {
    return;
  }

  const change = event.contentChanges.at(-1);
  if (!change) {
    return;
  }

  const typedHeaderSegment = getTypedHeaderSegment(change.text);
  if (!typedHeaderSegment) {
    return;
  }
  const position = event.document.positionAt(
    change.rangeOffset + change.text.length,
  );
  const completionPlan = getModuleHeaderCompletionPlan(
    event.document,
    position,
  );
  if (!completionPlan || completionPlan.candidates.length === 0) {
    return;
  }

  if (pendingHeaderSuggestTimer) {
    clearTimeout(pendingHeaderSuggestTimer);
  }

  const documentUri = event.document.uri.toString();
  const triggerSuggest = () => {
    pendingHeaderSuggestTimer = null;
    const currentEditor = vscode.window.activeTextEditor;
    if (currentEditor?.document.uri.toString() !== documentUri) {
      return;
    }

    const currentPosition = currentEditor.selection?.active ?? position;
    const currentPlan = getModuleHeaderCompletionPlan(
      currentEditor.document,
      currentPosition,
    );
    if (!currentPlan || currentPlan.candidates.length === 0) {
      return;
    }

    void vscode.commands.executeCommand('editor.action.triggerSuggest');
  };
  const retryDelays = change.text.includes('\n') ? [180, 420] : [180];
  const triggerSuggestWithRetries = (remainingDelays: number[]) => {
    triggerSuggest();
    const nextDelay = remainingDelays.shift();
    if (nextDelay !== undefined) {
      pendingHeaderSuggestTimer = setTimeout(
        () => triggerSuggestWithRetries(remainingDelays),
        nextDelay,
      );
    }
  };
  pendingHeaderSuggestTimer = setTimeout(
    () => triggerSuggestWithRetries([...retryDelays]),
    60,
  );
}

function getTypedHeaderSegment(text: string): string | null {
  const lineText = text.split(/\r?\n/u).at(-1) ?? '';
  return /^[A-Za-z_]+$/u.test(lineText) ? lineText : null;
}

function invalidateRsxDocumentAnalysis(
  document: vscode.TextDocument,
  options: { fireSemanticTokensChanged?: boolean } = {},
): void {
  if (!isRsxDocument(document)) {
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
  private readonly expressionsByKey = new Map<
    string,
    IRsxExpressionTreeExpression
  >();

  public refresh(): void {
    this.files = null;
    this.expressionsByKey.clear();
    this.onDidChangeTreeDataEmitter.fire();
  }

  public getTreeItem(
    element: IRsxExpressionTreeItem,
  ): vscode.TreeItem | Thenable<vscode.TreeItem> {
    if (element.kind === 'root') {
      const expressionCount =
        element.section === 'expressions'
          ? element.files.reduce(
              (count, file) => count + file.expressions.length,
              0,
            )
          : element.models.reduce(
              (count, model) => count + model.expressions.length,
              0,
            );
      const childCount =
        element.section === 'expressions'
          ? element.files.length
          : element.models.length;
      const item = new vscode.TreeItem(
        element.label,
        childCount > 0
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.None,
      );
      item.description =
        element.section === 'expressions'
          ? formatExpressionCount(expressionCount)
          : formatModelCount(childCount);
      item.contextValue =
        element.section === 'expressions'
          ? 'rsxExpressionsRoot'
          : 'rsxExpressionModelsRoot';
      item.iconPath = new vscode.ThemeIcon(
        element.section === 'expressions' ? 'symbol-namespace' : 'symbol-struct',
      );
      item.tooltip =
        element.section === 'expressions'
          ? `${element.label}\n${formatExpressionCount(expressionCount)}`
          : `${element.label}\n${formatModelCount(childCount)}`;
      return item;
    }

    if (element.kind === 'file') {
      const item = new vscode.TreeItem(
        element.label,
        vscode.TreeItemCollapsibleState.Expanded,
      );
      item.description = formatExpressionCount(element.expressions.length);
      item.resourceUri = element.uri;
      item.contextValue = 'rsxExpressionFile';
      item.iconPath = new vscode.ThemeIcon('file-code');
      item.tooltip = `${element.label}\n${formatExpressionCount(element.expressions.length)}`;
      return item;
    }

    if (element.kind === 'expression') {
      const item = new vscode.TreeItem(
        element.exportName,
        element.dependencies.length > 0
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None,
      );
      item.description = [
        element.expression.returnTypeText,
        element.dependencies.length > 0
          ? formatDependencyCount(element.dependencies.length)
          : undefined,
      ]
        .filter(Boolean)
        .join(' · ');
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
          element.expression.returnTypeText
            ? `return: \`${element.expression.returnTypeText}\``
            : '',
          element.expression.modelTypeText
            ? `model: \`${element.expression.modelTypeText}\``
            : '',
          element.dependencies.length > 0
            ? `dependencies: ${element.dependencies
                .map((dependency) => dependency.targetExportName)
                .join(', ')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n'),
      );
      return item;
    }

    if (element.kind === 'model') {
      const item = new vscode.TreeItem(
        element.label,
        element.fields.length > 0
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None,
      );
      item.description = [
        formatFieldCount(element.fields.length),
        formatExpressionCount(element.expressions.length),
      ].join(' · ');
      item.resourceUri = element.uri;
      item.contextValue = 'rsxExpressionModel';
      item.iconPath = new vscode.ThemeIcon('symbol-struct');
      item.command = {
        command: 'rsx.expressions.open',
        title: 'Open RS-X Model',
        arguments: [element],
      };
      item.tooltip = new vscode.MarkdownString(
        [
          '**Model**',
          '',
          `Used by ${formatExpressionCount(element.expressions.length)}.`,
          '',
          '```ts',
          element.modelTypeText,
          '```',
        ].join('\n'),
      );
      return item;
    }

    if (element.kind === 'modelField') {
      const item = new vscode.TreeItem(
        element.label,
        element.children.length > 0 || element.expressionUses.length > 0
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None,
      );
      item.description = [
        element.typeText,
        element.expressionUses.length > 0
          ? formatExpressionCount(element.expressionUses.length)
          : undefined,
      ]
        .filter(Boolean)
        .join(' · ');
      item.resourceUri = element.uri;
      item.contextValue = 'rsxModelField';
      item.iconPath = new vscode.ThemeIcon('symbol-field');
      item.command = {
        command: 'rsx.expressions.open',
        title: 'Open RS-X Model Field',
        arguments: [element],
      };
      item.tooltip = new vscode.MarkdownString(
        element.typeText
          ? [`**${element.label}**`, '', '```ts', element.typeText, '```'].join(
              '\n',
            )
          : `**${element.label}**`,
      );
      return item;
    }

    if (element.kind === 'modelFieldExpression') {
      const item = new vscode.TreeItem(
        element.expression.exportName,
        vscode.TreeItemCollapsibleState.None,
      );
      item.description = element.fieldPath.join('.');
      item.resourceUri = element.uri;
      item.contextValue = 'rsxModelFieldExpression';
      item.iconPath = new vscode.ThemeIcon('symbol-function');
      item.command = {
        command: 'rsx.expressions.open',
        title: 'Open RS-X Expression Field Usage',
        arguments: [element],
      };
      item.tooltip = new vscode.MarkdownString(
        [
          `**${element.expression.exportName}**`,
          '',
          `field: \`${element.fieldPath.join('.')}\``,
        ].join('\n'),
      );
      return item;
    }

    const target = this.expressionsByKey.get(element.edge.targetKey);
    const isCycle = element.pathKeys.includes(element.edge.targetKey);
    const item = new vscode.TreeItem(
      element.edge.targetExportName,
      target && target.dependencies.length > 0 && !isCycle
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
    );
    item.description = [
      element.edge.matchKind === 'modelFieldExpressionType'
        ? `via ${element.edge.identifier}`
        : undefined,
      isCycle ? 'cycle' : undefined,
    ]
      .filter(Boolean)
      .join(' · ');
    item.resourceUri = element.edge.targetUri;
    item.contextValue = 'rsxExpressionDependency';
    item.iconPath = new vscode.ThemeIcon('references');
    item.command = {
      command: 'rsx.expressions.open',
      title: 'Open RS-X Expression',
      arguments: [
        {
          kind: 'expression',
          key: element.edge.targetKey,
          uri: element.edge.targetUri,
          relativePath: element.edge.targetRelativePath,
          exportName: element.edge.targetExportName,
          expression: target?.expression ?? element.source.expression,
          start: element.edge.targetStart,
          end: element.edge.targetEnd,
          modelStart: target?.modelStart ?? element.source.modelStart,
          modelEnd: target?.modelEnd ?? element.source.modelEnd,
          modelDefinition:
            target?.modelDefinition ?? element.source.modelDefinition,
          modelFields: target?.modelFields ?? element.source.modelFields,
          dependencies: target?.dependencies ?? [],
        } satisfies IRsxExpressionTreeExpression,
      ],
    };
    item.tooltip = new vscode.MarkdownString(
      [
        `**${element.source.exportName} → ${element.edge.targetExportName}**`,
        '',
        `via \`${element.edge.identifier}\``,
      ].join('\n'),
    );
    return item;
  }

  public async getChildren(
    element?: IRsxExpressionTreeItem,
  ): Promise<IRsxExpressionTreeItem[]> {
    if (element?.kind === 'root') {
      return element.section === 'expressions'
        ? [...element.files]
        : [...element.models];
    }

    if (element?.kind === 'file') {
      return [...element.expressions];
    }

    if (element?.kind === 'expression') {
      return element.dependencies.map((edge) => ({
        kind: 'dependency',
        source: element,
        edge,
        pathKeys: [element.key],
      }));
    }

    if (element?.kind === 'model') {
      return [...element.fields];
    }

    if (element?.kind === 'modelField') {
      return [...element.children, ...element.expressionUses];
    }

    if (element?.kind === 'modelFieldExpression') {
      return [];
    }

    if (element?.kind === 'dependency') {
      if (element.pathKeys.includes(element.edge.targetKey)) {
        return [];
      }
      const target = this.expressionsByKey.get(element.edge.targetKey);
      if (!target) {
        return [];
      }
      return target.dependencies.map((edge) => ({
        kind: 'dependency',
        source: target,
        edge,
        pathKeys: [...element.pathKeys, element.edge.targetKey],
      }));
    }

    if (element) {
      return [];
    }

    const files = await this.getFiles();
    const models = getUniqueRsxExpressionModels(files);
    return [
      {
        kind: 'root',
        section: 'expressions',
        label: 'Expressions',
        files,
      },
      {
        kind: 'root',
        section: 'models',
        label: 'Models',
        models,
      },
    ];
  }

  public async getPreviewData(
    item?: IRsxExpressionTreeItem,
  ): Promise<IRsxExpressionGraphPreviewData> {
    const files = await this.getFiles();
    return createRsxExpressionGraphPreviewData(files, item);
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

    this.files = attachRsxExpressionDependencies(
      files.filter((file): file is IRsxExpressionTreeFile => file !== null),
    ).sort((left, right) =>
      left.relativePath.localeCompare(right.relativePath),
    );
    this.expressionsByKey.clear();
    for (const file of this.files) {
      for (const expression of file.expressions) {
        this.expressionsByKey.set(expression.key, expression);
      }
    }

    return this.files;
  }
}

async function openRsxExpressionGraphPreview(
  provider: RsxExpressionsTreeDataProvider,
  item?: IRsxExpressionTreeItem,
): Promise<void> {
  const data = await provider.getPreviewData(item);
  const panel = vscode.window.createWebviewPanel(
    'rsx.expressionGraphPreview',
    data.title,
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    },
  );

  panel.webview.html = getRsxExpressionGraphPreviewHtml(data);
  const panelDisposables: vscode.Disposable[] = [];
  panel.onDidDispose(() => {
    for (const disposable of panelDisposables) {
      disposable.dispose();
    }
  });
  panel.webview.onDidReceiveMessage(
    async (message: {
      type?: string;
      uri?: string;
      start?: number;
      end?: number;
    }) => {
      if (
        message?.type !== 'openExpression' ||
        typeof message.uri !== 'string' ||
        typeof message.start !== 'number' ||
        typeof message.end !== 'number'
      ) {
        return;
      }

      await openRsxExpressionLocation({
        uri: vscode.Uri.parse(message.uri),
        start: message.start,
        end: message.end,
      });
    },
    undefined,
    panelDisposables,
  );
}

function createRsxExpressionGraphPreviewData(
  files: readonly IRsxExpressionTreeFile[],
  item?: IRsxExpressionTreeItem,
): IRsxExpressionGraphPreviewData {
  const expressions = files.flatMap((file) => file.expressions);
  const expressionByKey = new Map(
    expressions.map((expression) => [expression.key, expression]),
  );
  const incomingKeys = new Set<string>();
  for (const expression of expressions) {
    for (const dependency of expression.dependencies) {
      incomingKeys.add(dependency.targetKey);
    }
  }

  const roots = getRsxExpressionGraphPreviewRoots({
    files,
    item,
    expressionByKey,
    incomingKeys,
  });
  const layout = computeRsxExpressionGraphTidyLayout(
    roots.map((root) => createRsxExpressionGraphParsedRoot(root)),
  );

  const nodes = layout.nodes
    .filter((node) => node.expression)
    .map((node): IRsxExpressionGraphPreviewNode => {
      const expression = node.expression!;
      return {
        id: node.id,
        key: `${expression.source.key}#${node.id}`,
        exportName: expression.source.exportName,
        uri: expression.source.uri.toString(),
        expressionText: expression.expressionString,
        modelTypeText: expression.source.expression.modelTypeText,
        returnTypeText: expression.typeText,
        start: expression.start,
        end: expression.end,
        x: node.x,
        y: Math.max(0, node.y - 1),
      };
    });

  return {
    title: getRsxExpressionGraphPreviewTitle(item, roots),
    nodes,
    edges: layout.edges
      .filter((edge) => edge.source.expression && edge.target.expression)
      .map((edge) => ({
        sourceId: edge.source.id,
        targetId: edge.target.id,
      })),
    nodeWidth: 260,
    nodeHeight: 160,
    horizontalGap: 32,
    verticalGap: 56,
    padding: 32,
    maxX: layout.maxX,
    maxDepth: Math.max(0, layout.maxDepth - 1),
  };
}

function createRsxExpressionGraphParsedRoot(
  expression: IRsxExpressionTreeExpression,
): IRsxExpressionGraphParsedNode {
  try {
    const tree = rsxExpressionTreePreviewParser.parse(
      expression.expression.expression,
    );
    const rootSpan = findRsxExpressionGraphNodeSpan({
      expressionText: expression.expression.expression,
      expressionStart: expression.expression.expressionStart,
      searchStart: expression.expression.expressionStart,
      searchEnd: expression.expression.expressionEnd,
      nodeText: tree.expressionString,
    }) ?? {
      start: expression.expression.expressionStart,
      end: expression.expression.expressionEnd,
    };
    return convertRsxParsedExpressionTree(tree, expression, rootSpan);
  } catch {
    return {
      source: expression,
      expressionString: expression.expression.expression,
      typeText: expression.expression.returnTypeText ?? 'expression',
      start: expression.expression.expressionStart,
      end: expression.expression.expressionEnd,
      hidden: false,
      childExpressions: [],
    };
  }
}

function convertRsxParsedExpressionTree(
  tree: {
    readonly expressionString: string;
    readonly type: string;
    readonly hidden?: boolean;
    readonly childExpressions?: readonly unknown[];
  },
  source: IRsxExpressionTreeExpression,
  span: { readonly start: number; readonly end: number },
): IRsxExpressionGraphParsedNode {
  let childSearchStart = span.start;
  const childExpressions = (tree.childExpressions ?? []).map((child) => {
    const childTree = child as {
      readonly expressionString: string;
      readonly type: string;
      readonly hidden?: boolean;
      readonly childExpressions?: readonly unknown[];
    };
    const childSpan =
      findRsxExpressionGraphNodeSpan({
        expressionText: source.expression.expression,
        expressionStart: source.expression.expressionStart,
        searchStart: childSearchStart,
        searchEnd: span.end,
        nodeText: childTree.expressionString,
      }) ??
      findRsxExpressionGraphNodeSpan({
        expressionText: source.expression.expression,
        expressionStart: source.expression.expressionStart,
        searchStart: span.start,
        searchEnd: span.end,
        nodeText: childTree.expressionString,
      }) ??
      span;
    childSearchStart = Math.max(childSearchStart, childSpan.end);
    return convertRsxParsedExpressionTree(childTree, source, childSpan);
  });

  return {
    source,
    expressionString: tree.expressionString,
    typeText: tree.type,
    start: span.start,
    end: span.end,
    hidden: tree.hidden === true,
    childExpressions,
  };
}

function findRsxExpressionGraphNodeSpan(args: {
  readonly expressionText: string;
  readonly expressionStart: number;
  readonly searchStart: number;
  readonly searchEnd: number;
  readonly nodeText: string;
}): { start: number; end: number } | null {
  if (!args.nodeText) {
    return null;
  }
  const relativeSearchStart = Math.max(
    0,
    args.searchStart - args.expressionStart,
  );
  const relativeSearchEnd = Math.max(
    relativeSearchStart,
    args.searchEnd - args.expressionStart,
  );
  const relativeIndex = args.expressionText.indexOf(
    args.nodeText,
    relativeSearchStart,
  );
  if (
    relativeIndex < 0 ||
    relativeIndex + args.nodeText.length > relativeSearchEnd
  ) {
    return null;
  }
  return {
    start: args.expressionStart + relativeIndex,
    end: args.expressionStart + relativeIndex + args.nodeText.length,
  };
}

function computeRsxExpressionGraphTidyLayout(
  roots: readonly IRsxExpressionGraphParsedNode[],
): IRsxExpressionGraphLayoutResult {
  let sequence = 0;
  const nodes: IRsxExpressionGraphLayoutNode[] = [];
  const edges: IRsxExpressionGraphLayoutResult['edges'] = [];

  const makeNode = (nodeArgs: {
    expression: IRsxExpressionGraphParsedNode | null;
    parent?: IRsxExpressionGraphLayoutNode;
    depth: number;
    number: number;
  }): IRsxExpressionGraphLayoutNode => {
    sequence++;
    const node: IRsxExpressionGraphLayoutNode = {
      id: `n${sequence}`,
      expression: nodeArgs.expression,
      parent: nodeArgs.parent,
      children: [],
      depth: nodeArgs.depth,
      number: nodeArgs.number,
      x: 0,
      y: nodeArgs.depth,
      prelim: 0,
      mod: 0,
      change: 0,
      shift: 0,
      ancestor: undefined as unknown as IRsxExpressionGraphLayoutNode,
      thread: undefined,
    };
    node.ancestor = node;
    nodes.push(node);
    return node;
  };

  const root = makeNode({
    expression: null,
    depth: 0,
    number: 1,
  });

  const addVisibleChildren = (
    parent: IRsxExpressionGraphLayoutNode,
    expressions: readonly IRsxExpressionGraphParsedNode[],
    depth: number,
  ): void => {
    const visibleExpressions = expressions.flatMap((expression) =>
      expression.hidden ? expression.childExpressions : [expression],
    );

    parent.children = visibleExpressions.map((expression, index) => {
      const child = makeNode({
        expression,
        parent,
        depth,
        number: index + 1,
      });
      if (parent.expression) {
        edges.push({ source: parent, target: child });
      }
      addVisibleChildren(child, expression.childExpressions, depth + 1);
      return child;
    });
  };

  addVisibleChildren(root, roots, 1);
  return tidyRsxExpressionGraphLayout(root, nodes, edges);
}

function tidyRsxExpressionGraphLayout(
  root: IRsxExpressionGraphLayoutNode,
  nodes: readonly IRsxExpressionGraphLayoutNode[],
  edges: IRsxExpressionGraphLayoutResult['edges'],
): IRsxExpressionGraphLayoutResult {
  const distance = 1;
  firstWalkRsxExpressionGraph(root, distance);

  const minX = { value: Number.POSITIVE_INFINITY };
  secondWalkRsxExpressionGraph(root, 0, minX);

  const shift = -minX.value;
  let maxX = 0;
  let maxDepth = 0;

  const shiftAll = (node: IRsxExpressionGraphLayoutNode): void => {
    node.x += shift;
    maxX = Math.max(maxX, node.x);
    maxDepth = Math.max(maxDepth, node.depth);
    for (const child of node.children) {
      shiftAll(child);
    }
  };
  shiftAll(root);

  return {
    nodes,
    edges,
    maxX,
    maxDepth,
  };
}

function firstWalkRsxExpressionGraph(
  node: IRsxExpressionGraphLayoutNode,
  distance: number,
): void {
  if (node.children.length === 0) {
    const leftSibling = getRsxGraphLeftSibling(node);
    node.prelim = leftSibling ? leftSibling.prelim + distance : 0;
    return;
  }

  let defaultAncestor = node.children[0];
  for (const child of node.children) {
    firstWalkRsxExpressionGraph(child, distance);
    defaultAncestor = apportionRsxExpressionGraph(
      child,
      defaultAncestor,
      distance,
    );
  }

  executeRsxExpressionGraphShifts(node);

  const left = node.children[0];
  const right = node.children[node.children.length - 1];
  const midpoint = (left.prelim + right.prelim) / 2;
  const leftSibling = getRsxGraphLeftSibling(node);

  if (leftSibling) {
    node.prelim = leftSibling.prelim + distance;
    node.mod = node.prelim - midpoint;
  } else {
    node.prelim = midpoint;
  }
}

function secondWalkRsxExpressionGraph(
  node: IRsxExpressionGraphLayoutNode,
  modifier: number,
  minX: { value: number },
): void {
  node.x = node.prelim + modifier;
  node.y = node.depth;
  minX.value = Math.min(minX.value, node.x);

  for (const child of node.children) {
    secondWalkRsxExpressionGraph(child, modifier + node.mod, minX);
  }
}

function apportionRsxExpressionGraph(
  node: IRsxExpressionGraphLayoutNode,
  defaultAncestor: IRsxExpressionGraphLayoutNode,
  distance: number,
): IRsxExpressionGraphLayoutNode {
  const leftSibling = getRsxGraphLeftSibling(node);
  if (!leftSibling) {
    return defaultAncestor;
  }

  let vir = node;
  let vor = node;
  let vil = leftSibling;
  let vol = getRsxGraphLeftMostSibling(node)!;

  let sir = vir.mod;
  let sor = vor.mod;
  let sil = vil.mod;
  let sol = vol.mod;

  while (getRsxGraphNextRight(vil) && getRsxGraphNextLeft(vir)) {
    vil = getRsxGraphNextRight(vil)!;
    vir = getRsxGraphNextLeft(vir)!;
    vol = getRsxGraphNextLeft(vol)!;
    vor = getRsxGraphNextRight(vor)!;

    vor.ancestor = node;

    const shift = vil.prelim + sil - (vir.prelim + sir) + distance;
    if (shift > 0) {
      const ancestor = getRsxGraphAncestor(vil, node, defaultAncestor);
      moveRsxExpressionGraphSubtree(ancestor, node, shift);
      sir += shift;
      sor += shift;
    }

    sil += vil.mod;
    sir += vir.mod;
    sol += vol.mod;
    sor += vor.mod;
  }

  if (getRsxGraphNextRight(vil) && !getRsxGraphNextRight(vor)) {
    vor.thread = getRsxGraphNextRight(vil);
    vor.mod += sil - sor;
  } else if (getRsxGraphNextLeft(vir) && !getRsxGraphNextLeft(vol)) {
    vol.thread = getRsxGraphNextLeft(vir);
    vol.mod += sir - sol;
    defaultAncestor = node;
  }

  return defaultAncestor;
}

function executeRsxExpressionGraphShifts(
  node: IRsxExpressionGraphLayoutNode,
): void {
  let shift = 0;
  let change = 0;

  for (let index = node.children.length - 1; index >= 0; index--) {
    const child = node.children[index];
    child.prelim += shift;
    child.mod += shift;
    change += child.change;
    shift += child.shift + change;
  }
}

function moveRsxExpressionGraphSubtree(
  left: IRsxExpressionGraphLayoutNode,
  right: IRsxExpressionGraphLayoutNode,
  shift: number,
): void {
  const subtrees = right.number - left.number;
  if (subtrees <= 0) {
    return;
  }

  right.change -= shift / subtrees;
  right.shift += shift;
  left.change += shift / subtrees;

  right.prelim += shift;
  right.mod += shift;
}

function getRsxGraphAncestor(
  left: IRsxExpressionGraphLayoutNode,
  node: IRsxExpressionGraphLayoutNode,
  defaultAncestor: IRsxExpressionGraphLayoutNode,
): IRsxExpressionGraphLayoutNode {
  return left.ancestor.parent === node.parent ? left.ancestor : defaultAncestor;
}

function getRsxGraphLeftSibling(
  node: IRsxExpressionGraphLayoutNode,
): IRsxExpressionGraphLayoutNode | undefined {
  if (!node.parent || node.number <= 1) {
    return undefined;
  }
  return node.parent.children[node.number - 2];
}

function getRsxGraphLeftMostSibling(
  node: IRsxExpressionGraphLayoutNode,
): IRsxExpressionGraphLayoutNode | undefined {
  return node.parent?.children[0];
}

function getRsxGraphNextLeft(
  node: IRsxExpressionGraphLayoutNode,
): IRsxExpressionGraphLayoutNode | undefined {
  return node.children[0] ?? node.thread;
}

function getRsxGraphNextRight(
  node: IRsxExpressionGraphLayoutNode,
): IRsxExpressionGraphLayoutNode | undefined {
  return node.children[node.children.length - 1] ?? node.thread;
}

function getRsxExpressionGraphPreviewRoots(args: {
  files: readonly IRsxExpressionTreeFile[];
  item?: IRsxExpressionTreeItem;
  expressionByKey: ReadonlyMap<string, IRsxExpressionTreeExpression>;
  incomingKeys: ReadonlySet<string>;
}): IRsxExpressionTreeExpression[] {
  const { files, item, expressionByKey, incomingKeys } = args;

  if (item?.kind === 'expression') {
    return [expressionByKey.get(item.key) ?? item];
  }

  if (item?.kind === 'dependency') {
    const target = expressionByKey.get(item.edge.targetKey);
    return target ? [target] : [];
  }

  if (item?.kind === 'file') {
    return item.expressions
      .map((expression) => expressionByKey.get(expression.key) ?? expression)
      .sort(compareRsxExpressionTreeExpression);
  }

  if (item?.kind === 'model') {
    return item.expressions
      .map((expression) => expressionByKey.get(expression.key) ?? expression)
      .sort(compareRsxExpressionTreeExpression);
  }

  const allExpressions = files
    .flatMap((file) => file.expressions)
    .sort(compareRsxExpressionTreeExpression);
  const sourceExpressions = allExpressions.filter(
    (expression) => !incomingKeys.has(expression.key),
  );

  return sourceExpressions.length > 0 ? sourceExpressions : allExpressions;
}

function getRsxExpressionGraphPreviewTitle(
  item: IRsxExpressionTreeItem | undefined,
  roots: readonly IRsxExpressionTreeExpression[],
): string {
  if (item?.kind === 'expression') {
    return `RS-X Tree: ${item.exportName}`;
  }
  if (item?.kind === 'dependency') {
    return `RS-X Tree: ${item.edge.targetExportName}`;
  }
  if (item?.kind === 'file') {
    return `RS-X Tree: ${item.label}`;
  }
  if (item?.kind === 'model') {
    return `RS-X Tree: ${item.label}`;
  }
  if (roots.length === 1) {
    return `RS-X Tree: ${roots[0].exportName}`;
  }
  return 'RS-X Expression Tree';
}

function compareRsxExpressionTreeExpression(
  left: IRsxExpressionTreeExpression,
  right: IRsxExpressionTreeExpression,
): number {
  return (
    left.relativePath.localeCompare(right.relativePath) ||
    left.exportName.localeCompare(right.exportName)
  );
}

function getRsxExpressionGraphPreviewHtml(
  data: IRsxExpressionGraphPreviewData,
): string {
  const nonce = createWebviewNonce();
  const encodedData = escapeJsonForHtml(JSON.stringify(data));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(data.title)}</title>
  <style>
    :root {
      color-scheme: light dark;
      --rsx-bg: var(--vscode-editor-background);
      --rsx-fg: var(--vscode-editor-foreground);
      --rsx-muted: var(--vscode-descriptionForeground);
      --rsx-border: var(--vscode-panel-border);
      --rsx-node-bg: var(--vscode-sideBar-background);
      --rsx-node-hover: var(--vscode-list-hoverBackground);
      --rsx-focus: var(--vscode-focusBorder);
      --rsx-accent: var(--vscode-charts-blue);
      --rsx-accent-2: var(--vscode-charts-purple);
      --rsx-badge-bg: var(--vscode-badge-background);
      --rsx-badge-fg: var(--vscode-badge-foreground);
      --rsx-code-bg: var(--vscode-textCodeBlock-background);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: var(--rsx-bg);
      color: var(--rsx-fg);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    .toolbar {
      position: sticky;
      top: 0;
      z-index: 3;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      min-height: 44px;
      padding: 8px 12px;
      background: var(--vscode-editorGroupHeader-tabsBackground, var(--rsx-bg));
      border-bottom: 1px solid var(--rsx-border);
    }

    .title {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
    }

    .summary {
      flex: 0 0 auto;
      color: var(--rsx-muted);
      font-size: 12px;
    }

    .viewport {
      position: relative;
      overflow: auto;
      width: 100vw;
      height: calc(100vh - 45px);
    }

    .canvas {
      position: relative;
      min-width: 100%;
      min-height: 100%;
    }

    svg.edges {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: visible;
    }

    .edge {
      fill: none;
      stroke: color-mix(in srgb, var(--rsx-accent) 74%, var(--rsx-muted));
      stroke-width: 2;
      opacity: 0.75;
    }

    .node {
      position: absolute;
      display: grid;
      grid-template-rows: auto 1fr;
      gap: 8px;
      padding: 0;
      overflow: hidden;
      background: color-mix(in srgb, var(--rsx-node-bg) 92%, var(--rsx-bg));
      border: 1px solid color-mix(in srgb, var(--rsx-border) 78%, var(--rsx-accent));
      border-radius: 8px;
      color: var(--rsx-fg);
      cursor: pointer;
      outline: none;
      box-shadow: 0 10px 28px rgb(0 0 0 / 0.18);
    }

    .node:hover {
      background: var(--rsx-node-hover);
      border-color: var(--rsx-focus);
    }

    .node:focus-visible {
      border-color: var(--rsx-focus);
      box-shadow: 0 0 0 1px var(--rsx-focus);
    }

    .nodeHeader {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      min-width: 0;
      padding: 10px 11px 0;
    }

    .nodeType {
      flex: 0 0 auto;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--rsx-accent-2);
      font-size: 11px;
    }

    .nodeExpression {
      overflow: hidden;
      margin: 0 10px 10px;
      border-radius: 6px;
      padding: 8px;
      background: var(--rsx-code-bg);
      color: var(--rsx-fg);
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: var(--vscode-editor-font-size, 12px);
      line-height: 1.35;
      white-space: pre-wrap;
    }

    .empty {
      padding: 24px;
      color: var(--rsx-muted);
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div class="title">${escapeHtml(data.title)}</div>
    <div class="summary">${data.nodes.length} nodes · ${data.edges.length} edges</div>
  </div>
  <div class="viewport">
    <div class="canvas" id="canvas">
      <svg class="edges" id="edges" aria-hidden="true"></svg>
      <div id="nodes"></div>
    </div>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const graph = ${encodedData};
    const canvas = document.getElementById('canvas');
    const edgesSvg = document.getElementById('edges');
    const nodesHost = document.getElementById('nodes');
    const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
    const unitX = graph.nodeWidth + graph.horizontalGap;
    const unitY = graph.nodeHeight + graph.verticalGap;
    const treeWidth = (graph.maxX + 1) * unitX + graph.horizontalGap;
    const treeHeight = (graph.maxDepth + 1) * unitY + graph.verticalGap;
    const width = graph.padding * 2 + treeWidth;
    const height = graph.padding * 2 + treeHeight;

    canvas.style.width = Math.max(width, window.innerWidth) + 'px';
    canvas.style.height = Math.max(height, window.innerHeight - 45) + 'px';
    edgesSvg.setAttribute('width', String(Math.max(width, window.innerWidth)));
    edgesSvg.setAttribute('height', String(Math.max(height, window.innerHeight - 45)));
    edgesSvg.setAttribute('viewBox', '0 0 ' + Math.max(width, window.innerWidth) + ' ' + Math.max(height, window.innerHeight - 45));

    function positionFor(node) {
      return {
        x: graph.padding + node.x * unitX + graph.horizontalGap,
        y: graph.padding + node.y * unitY + graph.verticalGap,
      };
    }

    function esc(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    if (graph.nodes.length === 0) {
      nodesHost.innerHTML = '<div class="empty">No RS-X expressions found.</div>';
    }

    for (const edge of graph.edges) {
      const source = nodeById.get(edge.sourceId);
      const target = nodeById.get(edge.targetId);
      if (!source || !target) {
        continue;
      }
      const sourcePos = positionFor(source);
      const targetPos = positionFor(target);
      const x1 = sourcePos.x + graph.nodeWidth / 2;
      const y1 = sourcePos.y + graph.nodeHeight;
      const x2 = targetPos.x + graph.nodeWidth / 2;
      const y2 = targetPos.y;
      const midY = (y1 + y2) / 2;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'edge');
      path.setAttribute('d', 'M ' + x1 + ' ' + y1 + ' C ' + x1 + ' ' + midY + ', ' + x2 + ' ' + midY + ', ' + x2 + ' ' + y2);
      edgesSvg.appendChild(path);

    }

    for (const node of graph.nodes) {
      const pos = positionFor(node);
      const element = document.createElement('button');
      element.type = 'button';
      element.className = 'node';
      element.style.width = graph.nodeWidth + 'px';
      element.style.height = graph.nodeHeight + 'px';
      element.style.left = pos.x + 'px';
      element.style.top = pos.y + 'px';
      element.title = node.expressionText;
      element.innerHTML = [
        '<div class="nodeHeader"><div class="nodeType" title="' + esc(node.returnTypeText || 'RS-X') + '">' + esc(node.returnTypeText || 'RS-X') + '</div></div>',
        '<pre class="nodeExpression">' + esc(node.expressionText) + '</pre>',
      ].join('');
      element.addEventListener('click', () => {
        vscode.postMessage({
          type: 'openExpression',
          uri: node.uri,
          start: node.start,
          end: node.end,
        });
      });
      nodesHost.appendChild(element);
    }
  </script>
</body>
</html>`;
}

function createWebviewNonce(): string {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i++) {
    text += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return text;
}

function escapeJsonForHtml(json: string): string {
  return json
    .replace(/</gu, '\\u003c')
    .replace(/>/gu, '\\u003e')
    .replace(/&/gu, '\\u0026')
    .replace(/\u2028/gu, '\\u2028')
    .replace(/\u2029/gu, '\\u2029');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;');
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
    const relativePath = vscode.workspace.asRelativePath(uri, false);
    const expressions = expressionExports.map(
      (entry): IRsxExpressionTreeExpression => {
        const modelSpan = findRsxExpressionModelSourceSpan({
          text,
          expressions: parsed.expressions,
          expression: entry.expression,
        });
        const modelDefinition = modelSpan
          ? getRsxExpressionModelDefinitionLocation({
              uri,
              text,
              start: modelSpan.start,
              end: modelSpan.end,
            })
          : null;
        const modelFields = modelSpan
          ? getRsxExpressionModelFields({
              uri,
              text,
              start: modelSpan.start,
              end: modelSpan.end,
            })
          : [];
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
          key: createRsxExpressionTreeKey(uri, entry.exportName),
          uri,
          relativePath,
          exportName: entry.exportName,
          expression: entry.expression,
          start,
          end,
          modelStart: modelSpan?.start ?? start,
          modelEnd: modelSpan?.end ?? end,
          modelDefinition: modelDefinition ?? undefined,
          modelFields,
          dependencies: [],
        };
      },
    );

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

function findRsxExpressionModelSourceSpan(args: {
  readonly text: string;
  readonly expressions: readonly IRsxExpressionExport['expression'][];
  readonly expression: IRsxExpressionExport['expression'];
}): { readonly start: number; readonly end: number } | null {
  const normalized = args.text.replace(/\r\n/gu, '\n');
  const expressionRegionStart =
    typeof args.expression.nameEnd === 'number'
      ? getLineEndOffset(normalized, args.expression.nameEnd)
      : 0;
  const localSpan = findLastRsxModelHeaderSpanInRange(
    normalized,
    expressionRegionStart,
    args.expression.expressionStart,
  );
  if (localSpan) {
    return localSpan;
  }

  const firstNamedExpression = args.expressions.find(
    (expression) => typeof expression.nameStart === 'number',
  );
  const globalEnd =
    typeof firstNamedExpression?.nameStart === 'number'
      ? getLineStartOffset(normalized, firstNamedExpression.nameStart)
      : args.expression.expressionStart;
  return findLastRsxModelHeaderSpanInRange(normalized, 0, globalEnd);
}

function findLastRsxModelHeaderSpanInRange(
  text: string,
  startOffset: number,
  endOffset: number,
): { readonly start: number; readonly end: number } | null {
  let cursor = Math.max(0, startOffset);
  let latest: { readonly start: number; readonly end: number } | null = null;
  while (cursor < endOffset && cursor < text.length) {
    const lineEnd = getLineEndOffset(text, cursor);
    const line = text.slice(cursor, Math.min(lineEnd, endOffset));
    const parsed = parseHeaderLine(line);
    if (parsed?.key === 'model') {
      const valueStart = cursor + getHeaderValueStartCharacter(line);
      let valueEnd = lineEnd;
      const valueLines = [line.slice(getHeaderValueStartCharacter(line)).trim()];
      let nextLineStart = getNextLineStartOffset(text, lineEnd);
      while (
        nextLineStart < endOffset &&
        !isTypeHeaderValueSyntacticallyComplete(valueLines.join('\n'))
      ) {
        const nextLineEnd = getLineEndOffset(text, nextLineStart);
        const nextLine = text.slice(
          nextLineStart,
          Math.min(nextLineEnd, endOffset),
        );
        if (!isIndentedLine(nextLine)) {
          break;
        }
        valueLines.push(nextLine.trim());
        valueEnd = nextLineEnd;
        nextLineStart = getNextLineStartOffset(text, nextLineEnd);
      }
      latest = {
        start: valueStart,
        end: trimEndOffset(text, valueEnd),
      };
    }

    const nextCursor = getNextLineStartOffset(text, lineEnd);
    if (nextCursor <= cursor) {
      break;
    }
    cursor = nextCursor;
  }
  return latest;
}

function getLineStartOffset(text: string, offset: number): number {
  const lineBreak = text.lastIndexOf('\n', Math.max(0, offset - 1));
  return lineBreak < 0 ? 0 : lineBreak + 1;
}

function getLineEndOffset(text: string, offset: number): number {
  const lineBreak = text.indexOf('\n', offset);
  return lineBreak < 0 ? text.length : lineBreak;
}

function getNextLineStartOffset(text: string, lineEndOffset: number): number {
  return lineEndOffset < text.length ? lineEndOffset + 1 : text.length;
}

function trimEndOffset(text: string, offset: number): number {
  let cursor = Math.min(offset, text.length);
  while (cursor > 0 && isLineWhitespaceCharacter(text[cursor - 1])) {
    cursor -= 1;
  }
  return cursor;
}

function getRsxExpressionModelDefinitionLocation(args: {
  readonly uri: vscode.Uri;
  readonly text: string;
  readonly start: number;
  readonly end: number;
}): IRsxExpressionTreeLocation | null {
  const headerText = args.text.slice(args.start, args.end);
  for (const relativePosition of getImportedTypeLookupOffsets(headerText)) {
    const definitions = getRsxHeaderImportTypeDefinitionsAtTextPosition({
      fileName: args.uri.fsPath,
      text: args.text,
      position: args.start + relativePosition,
    });
    const definition = definitions[0];
    if (definition) {
      return {
        uri: vscode.Uri.file(definition.fileName),
        start: definition.start,
        end: Math.max(definition.end, definition.start),
      };
    }
  }

  return null;
}

function getRsxExpressionModelFields(args: {
  readonly uri: vscode.Uri;
  readonly text: string;
  readonly start: number;
  readonly end: number;
}): IRsxExpressionTreeModelField[] {
  const headerText = args.text.slice(args.start, args.end);
  const prefix = 'type __RSX_MODEL = ';
  const sourceFile = ts.createSourceFile(
    '/__rsx_tree_model_fields__.ts',
    `${prefix}${headerText};`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const modelAlias = sourceFile.statements.find(
    (statement): statement is ts.TypeAliasDeclaration =>
      ts.isTypeAliasDeclaration(statement) &&
      statement.name.text === '__RSX_MODEL',
  );
  if (!modelAlias) {
    return [];
  }

  return dedupeRsxExpressionTreeModelFields(
    getRsxExpressionModelFieldsFromTypeNode({
      containingFile: args.uri.fsPath,
      sourceFile,
      uri: args.uri,
      typeNode: modelAlias.type,
      offsetMapper: (offset) => args.start + offset - prefix.length,
      seenTypes: new Set<string>(),
      keyPrefix: normalizeRsxExpressionModelTreeKey(headerText),
      pathPrefix: [],
    }),
  );
}

function getRsxExpressionModelFieldsFromTypeNode(args: {
  readonly containingFile: string;
  readonly sourceFile: ts.SourceFile;
  readonly uri: vscode.Uri;
  readonly typeNode: ts.TypeNode;
  readonly offsetMapper: (offset: number) => number;
  readonly seenTypes: Set<string>;
  readonly keyPrefix: string;
  readonly pathPrefix: readonly string[];
}): IRsxExpressionTreeModelField[] {
  if (ts.isParenthesizedTypeNode(args.typeNode)) {
    return getRsxExpressionModelFieldsFromTypeNode({
      ...args,
      typeNode: args.typeNode.type,
    });
  }

  if (ts.isIntersectionTypeNode(args.typeNode)) {
    return dedupeRsxExpressionTreeModelFields(
      args.typeNode.types.flatMap((typeNode) =>
        getRsxExpressionModelFieldsFromTypeNode({
          ...args,
          typeNode,
        }),
      ),
    );
  }

  if (ts.isTypeLiteralNode(args.typeNode)) {
    return getRsxExpressionModelFieldsFromMembers({
      ...args,
      members: args.typeNode.members,
    });
  }

  if (ts.isArrayTypeNode(args.typeNode)) {
    return getRsxExpressionModelFieldsFromTypeNode({
      ...args,
      typeNode: args.typeNode.elementType,
    });
  }

  if (ts.isTypeReferenceNode(args.typeNode)) {
    const typeName = getRightmostEntityNameText(args.typeNode.typeName);
    if (
      typeName === 'Array' &&
      args.typeNode.typeArguments &&
      args.typeNode.typeArguments.length > 0
    ) {
      return getRsxExpressionModelFieldsFromTypeNode({
        ...args,
        typeNode: args.typeNode.typeArguments[0],
      });
    }

    const localDeclaration = getLocalRsxExpressionModelTypeDeclaration(
      args.sourceFile,
      typeName,
    );
    if (!localDeclaration) {
      return [];
    }

    const seenKey = `${args.containingFile}:${typeName}`;
    if (args.seenTypes.has(seenKey)) {
      return [];
    }
    args.seenTypes.add(seenKey);
    const fields = getRsxExpressionModelFieldsFromDeclaration({
      ...args,
      declaration: localDeclaration,
    });
    args.seenTypes.delete(seenKey);
    return fields;
  }

  const importedType = getImportedModelTypeReference(args.typeNode, args.sourceFile);
  if (!importedType) {
    return [];
  }

  const resolvedFileName = resolveRsxDependencyModuleFileName({
    containingFile: args.containingFile,
    moduleName: importedType.moduleName,
  });
  if (!resolvedFileName) {
    return [];
  }

  return getExportedRsxExpressionModelFields({
    fileName: resolvedFileName,
    typeName: importedType.typeName,
    seenTypes: args.seenTypes,
    keyPrefix: `${args.keyPrefix}.${importedType.typeName}`,
    pathPrefix: args.pathPrefix,
  });
}

function getRsxExpressionModelFieldsFromDeclaration(args: {
  readonly containingFile: string;
  readonly sourceFile: ts.SourceFile;
  readonly uri: vscode.Uri;
  readonly declaration: ts.Declaration;
  readonly offsetMapper: (offset: number) => number;
  readonly seenTypes: Set<string>;
  readonly keyPrefix: string;
  readonly pathPrefix: readonly string[];
}): IRsxExpressionTreeModelField[] {
  if (ts.isInterfaceDeclaration(args.declaration)) {
    return getRsxExpressionModelFieldsFromMembers({
      ...args,
      members: args.declaration.members,
    });
  }

  if (ts.isTypeAliasDeclaration(args.declaration)) {
    return getRsxExpressionModelFieldsFromTypeNode({
      ...args,
      typeNode: args.declaration.type,
    });
  }

  if (ts.isClassDeclaration(args.declaration)) {
    return getRsxExpressionModelFieldsFromClassMembers({
      ...args,
      members: args.declaration.members,
    });
  }

  return [];
}

function getRsxExpressionModelFieldsFromMembers(args: {
  readonly containingFile: string;
  readonly sourceFile: ts.SourceFile;
  readonly uri: vscode.Uri;
  readonly members: ts.NodeArray<ts.TypeElement>;
  readonly offsetMapper: (offset: number) => number;
  readonly seenTypes: Set<string>;
  readonly keyPrefix: string;
  readonly pathPrefix: readonly string[];
}): IRsxExpressionTreeModelField[] {
  return args.members.flatMap((member) => {
    if (
      (!ts.isPropertySignature(member) && !ts.isMethodSignature(member)) ||
      !member.type
    ) {
      return [];
    }

    return createRsxExpressionTreeModelField({
      containingFile: args.containingFile,
      sourceFile: args.sourceFile,
      uri: args.uri,
      name: member.name,
      typeNode: member.type,
      offsetMapper: args.offsetMapper,
      seenTypes: args.seenTypes,
      keyPrefix: args.keyPrefix,
      pathPrefix: args.pathPrefix,
    });
  });
}

function getRsxExpressionModelFieldsFromClassMembers(args: {
  readonly containingFile: string;
  readonly sourceFile: ts.SourceFile;
  readonly uri: vscode.Uri;
  readonly members: ts.NodeArray<ts.ClassElement>;
  readonly offsetMapper: (offset: number) => number;
  readonly seenTypes: Set<string>;
  readonly keyPrefix: string;
  readonly pathPrefix: readonly string[];
}): IRsxExpressionTreeModelField[] {
  return args.members.flatMap((member) => {
    if (!ts.isPropertyDeclaration(member) || !member.type) {
      return [];
    }

    return createRsxExpressionTreeModelField({
      containingFile: args.containingFile,
      sourceFile: args.sourceFile,
      uri: args.uri,
      name: member.name,
      typeNode: member.type,
      offsetMapper: args.offsetMapper,
      seenTypes: args.seenTypes,
      keyPrefix: args.keyPrefix,
      pathPrefix: args.pathPrefix,
    });
  });
}

function createRsxExpressionTreeModelField(args: {
  readonly containingFile: string;
  readonly sourceFile: ts.SourceFile;
  readonly uri: vscode.Uri;
  readonly name: ts.PropertyName;
  readonly typeNode: ts.TypeNode;
  readonly offsetMapper: (offset: number) => number;
  readonly seenTypes: Set<string>;
  readonly keyPrefix: string;
  readonly pathPrefix: readonly string[];
}): IRsxExpressionTreeModelField[] {
  const fieldName = getPropertyNameText(args.name);
  if (!fieldName) {
    return [];
  }

  return [
    {
      kind: 'modelField',
      key: `${args.keyPrefix}.${fieldName}`,
      label: fieldName,
      path: [...args.pathPrefix, fieldName],
      typeText: args.typeNode.getText(args.sourceFile),
      uri: args.uri,
      start: args.offsetMapper(args.name.getStart(args.sourceFile)),
      end: args.offsetMapper(args.name.getEnd()),
      children: getRsxExpressionModelFieldsFromTypeNode({
        containingFile: args.containingFile,
        sourceFile: args.sourceFile,
        uri: args.uri,
        typeNode: args.typeNode,
        offsetMapper: args.offsetMapper,
        seenTypes: args.seenTypes,
        keyPrefix: `${args.keyPrefix}.${fieldName}`,
        pathPrefix: [...args.pathPrefix, fieldName],
      }),
      expressionUses: [],
    },
  ];
}

function getExportedRsxExpressionModelFields(args: {
  readonly fileName: string;
  readonly typeName: string;
  readonly seenTypes: Set<string>;
  readonly keyPrefix: string;
  readonly pathPrefix: readonly string[];
}): IRsxExpressionTreeModelField[] {
  const seenKey = `${args.fileName}:${args.typeName}`;
  if (args.seenTypes.has(seenKey)) {
    return [];
  }
  args.seenTypes.add(seenKey);

  const text = ts.sys.readFile(args.fileName);
  if (typeof text !== 'string') {
    args.seenTypes.delete(seenKey);
    return [];
  }

  const sourceFile = ts.createSourceFile(
    args.fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const declaration = getLocalRsxExpressionModelTypeDeclaration(
    sourceFile,
    args.typeName,
  );
  if (!declaration) {
    args.seenTypes.delete(seenKey);
    return [];
  }

  const fields = getRsxExpressionModelFieldsFromDeclaration({
    containingFile: args.fileName,
    sourceFile,
    uri: vscode.Uri.file(args.fileName),
    declaration,
    offsetMapper: (offset) => offset,
    seenTypes: args.seenTypes,
    keyPrefix: args.keyPrefix,
    pathPrefix: args.pathPrefix,
  });
  args.seenTypes.delete(seenKey);
  return fields;
}

function getLocalRsxExpressionModelTypeDeclaration(
  sourceFile: ts.SourceFile,
  typeName: string,
): ts.Declaration | null {
  return (
    sourceFile.statements.find(
      (
        statement,
      ): statement is
        | ts.InterfaceDeclaration
        | ts.TypeAliasDeclaration
        | ts.ClassDeclaration =>
        (ts.isInterfaceDeclaration(statement) ||
          ts.isTypeAliasDeclaration(statement) ||
          ts.isClassDeclaration(statement)) &&
        statement.name?.text === typeName,
    ) ?? null
  );
}

function dedupeRsxExpressionTreeModelFields(
  fields: readonly IRsxExpressionTreeModelField[],
): IRsxExpressionTreeModelField[] {
  const seen = new Set<string>();
  const uniqueFields: IRsxExpressionTreeModelField[] = [];
  for (const field of fields) {
    if (seen.has(field.label)) {
      continue;
    }
    seen.add(field.label);
    uniqueFields.push(field);
  }
  return uniqueFields;
}

function getImportedTypeLookupOffsets(headerText: string): number[] {
  const importTypePattern =
    /import\s*\(\s*(['"])([^'"]+)\1\s*\)\s*\.\s*([A-Za-z_$][A-Za-z0-9_$]*)/gu;
  const offsets: number[] = [];
  for (const match of headerText.matchAll(importTypePattern)) {
    if (typeof match.index !== 'number') {
      continue;
    }

    const fullText = match[0];
    const typeName = match[3];
    offsets.push(match.index + fullText.lastIndexOf(typeName));
  }
  return offsets;
}

function attachRsxExpressionDependencies(
  files: readonly IRsxExpressionTreeFile[],
): IRsxExpressionTreeFile[] {
  const exactExportIndex = new Map<string, IRsxExpressionTreeExpression[]>();
  for (const expression of files.flatMap((file) => file.expressions)) {
    addRsxExpressionIndexEntry(
      exactExportIndex,
      expression.exportName,
      expression,
    );
  }

  return files.map((file) => ({
    ...file,
    expressions: file.expressions.map((expression) => ({
      ...expression,
      dependencies: getRsxExpressionDependencies({
        expression,
        exactExportIndex,
      }),
    })),
  }));
}

function getUniqueRsxExpressionModels(
  files: readonly IRsxExpressionTreeFile[],
): IRsxExpressionTreeModel[] {
  const modelsByKey = new Map<
    string,
    {
      modelTypeText: string;
      expression: IRsxExpressionTreeExpression;
      expressions: IRsxExpressionTreeExpression[];
    }
  >();

  for (const expression of files.flatMap((file) => file.expressions)) {
    const key = normalizeRsxExpressionModelTreeKey(
      expression.expression.modelTypeText,
    );
    const existing = modelsByKey.get(key);
    if (existing) {
      existing.expressions.push(expression);
      continue;
    }
    modelsByKey.set(key, {
      modelTypeText: expression.expression.modelTypeText,
      expression,
      expressions: [expression],
    });
  }

  return [...modelsByKey.entries()]
    .map(([key, model]): IRsxExpressionTreeModel => ({
      kind: 'model',
      key,
      label: formatRsxExpressionModelTreeLabel(model.modelTypeText),
      modelTypeText: model.modelTypeText,
      uri: model.expression.modelDefinition?.uri ?? model.expression.uri,
      relativePath: model.expression.relativePath,
      start: model.expression.modelDefinition?.start ?? model.expression.modelStart,
      end: model.expression.modelDefinition?.end ?? model.expression.modelEnd,
      fields: attachRsxExpressionModelFieldUses(
        model.expression.modelFields,
        model.expressions,
      ),
      expressions: model.expressions.sort(compareRsxExpressionTreeExpression),
    }))
    .sort(
      (left, right) =>
        left.label.localeCompare(right.label) ||
        left.relativePath.localeCompare(right.relativePath),
    );
}

function normalizeRsxExpressionModelTreeKey(modelTypeText: string): string {
  return modelTypeText.replace(/\s+/gu, ' ').trim();
}

function formatRsxExpressionModelTreeLabel(modelTypeText: string): string {
  const label = normalizeRsxExpressionModelTreeKey(modelTypeText);
  return label.length > 96 ? `${label.slice(0, 93)}...` : label;
}

function attachRsxExpressionModelFieldUses(
  fields: readonly IRsxExpressionTreeModelField[],
  expressions: readonly IRsxExpressionTreeExpression[],
): IRsxExpressionTreeModelField[] {
  return fields.map((field) => ({
    ...field,
    children: attachRsxExpressionModelFieldUses(field.children, expressions),
    expressionUses: getRsxExpressionModelFieldExpressionUses(
      field,
      expressions,
    ),
  }));
}

function getRsxExpressionModelFieldExpressionUses(
  field: IRsxExpressionTreeModelField,
  expressions: readonly IRsxExpressionTreeExpression[],
): IRsxExpressionTreeModelFieldExpressionUse[] {
  return expressions
    .map((expression): IRsxExpressionTreeModelFieldExpressionUse | null => {
      const span = findRsxExpressionModelFieldUsageSpan({
        expressionText: expression.expression.expression,
        fieldPath: field.path,
      });
      if (!span) {
        return null;
      }
      const start = expression.expression.expressionStart + span.start;
      const end = expression.expression.expressionStart + span.end;
      return {
        kind: 'modelFieldExpression',
        key: `${field.key}#${expression.key}#${String(start)}`,
        fieldPath: field.path,
        expression,
        uri: expression.uri,
        start,
        end,
      };
    })
    .filter((use): use is IRsxExpressionTreeModelFieldExpressionUse => !!use)
    .sort((left, right) =>
      compareRsxExpressionTreeExpression(left.expression, right.expression),
    );
}

function findRsxExpressionModelFieldUsageSpan(args: {
  readonly expressionText: string;
  readonly fieldPath: readonly string[];
}): { readonly start: number; readonly end: number } | null {
  if (args.fieldPath.length === 0) {
    return null;
  }

  const sourceFile = ts.createSourceFile(
    '__rsx_model_field_usage.ts',
    `${WRAPPED_EXPRESSION_PREFIX}${args.expressionText}${WRAPPED_EXPRESSION_SUFFIX}`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const rootScope = new Set<string>();
  let match: { start: number; end: number } | null = null;

  const visit = (
    node: ts.Node,
    scopes: readonly ReadonlySet<string>[],
    aliases: ReadonlyMap<string, readonly string[]>,
  ): void => {
    if (match || ts.isTypeNode(node)) {
      return;
    }

    const callbackAlias = getRsxModelFieldCallbackAlias(node, aliases);
    if (callbackAlias) {
      const functionScope = new Set<string>();
      for (const parameter of callbackAlias.callback.parameters) {
        addBindingName(functionScope, parameter.name);
      }
      collectLocalDeclarationNames(callbackAlias.callback.body, functionScope);
      const callbackAliases = new Map(aliases);
      callbackAliases.set(callbackAlias.parameterName, callbackAlias.basePath);
      ts.forEachChild(callbackAlias.callback.body, (child) =>
        visit(child, [...scopes, functionScope], callbackAliases),
      );
      return;
    }

    if (isFunctionLikeWithBody(node)) {
      const functionScope = new Set<string>();
      for (const parameter of node.parameters) {
        addBindingName(functionScope, parameter.name);
      }
      collectLocalDeclarationNames(node.body, functionScope);
      ts.forEachChild(node.body, (child) =>
        visit(child, [...scopes, functionScope], aliases),
      );
      return;
    }

    if (ts.isVariableDeclaration(node)) {
      addBindingName(rootScope, node.name);
      if (node.initializer) {
        visit(node.initializer, scopes, aliases);
      }
      return;
    }

    const fieldAccess = getRsxModelFieldAccessPath(node, aliases);
    if (
      fieldAccess &&
      areRsxModelFieldPathsEqual(fieldAccess.path, args.fieldPath) &&
      !isIdentifierDeclaredInScopes(fieldAccess.path[0], scopes)
    ) {
      match = {
        start: fieldAccess.start - WRAPPED_EXPRESSION_PREFIX.length,
        end: fieldAccess.end - WRAPPED_EXPRESSION_PREFIX.length,
      };
      return;
    }

    ts.forEachChild(node, (child) => visit(child, scopes, aliases));
  };

  ts.forEachChild(sourceFile, (child) => visit(child, [rootScope], new Map()));
  return match &&
    match.start >= 0 &&
    match.end >= match.start &&
    match.start <= args.expressionText.length
    ? {
        start: Math.max(0, match.start),
        end: Math.min(args.expressionText.length, match.end),
      }
    : null;
}

function getRsxModelFieldCallbackAlias(
  node: ts.Node,
  aliases: ReadonlyMap<string, readonly string[]>,
):
  | {
      readonly callback: ts.ArrowFunction | ts.FunctionExpression;
      readonly parameterName: string;
      readonly basePath: readonly string[];
    }
  | null {
  if (
    !ts.isCallExpression(node) ||
    !ts.isPropertyAccessExpression(node.expression) ||
    !['map', 'flatMap', 'filter', 'find', 'some', 'every'].includes(
      node.expression.name.text,
    )
  ) {
    return null;
  }

  const basePath = getRsxModelFieldAccessPath(
    node.expression.expression,
    aliases,
  )?.path;
  const callback = node.arguments[0];
  const parameter = callback?.parameters[0]?.name;
  if (
    !basePath ||
    !callback ||
    (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback)) ||
    !parameter ||
    !ts.isIdentifier(parameter)
  ) {
    return null;
  }

  return {
    callback,
    parameterName: parameter.text,
    basePath,
  };
}

function getRsxModelFieldAccessPath(
  node: ts.Node,
  aliases: ReadonlyMap<string, readonly string[]>,
): { readonly path: readonly string[]; readonly start: number; readonly end: number } | null {
  if (ts.isIdentifier(node)) {
    const alias = aliases.get(node.text);
    if (!alias && !isRsxExpressionIdentifierReference(node)) {
      return null;
    }
    return {
      path: alias ?? [node.text],
      start: node.getStart(),
      end: node.getEnd(),
    };
  }

  if (ts.isPropertyAccessExpression(node)) {
    const base = getRsxModelFieldAccessPath(node.expression, aliases);
    if (!base) {
      return null;
    }
    return {
      path: [...base.path, node.name.text],
      start: node.name.getStart(),
      end: node.name.getEnd(),
    };
  }

  if (
    ts.isElementAccessExpression(node) &&
    ts.isStringLiteralLike(node.argumentExpression)
  ) {
    const base = getRsxModelFieldAccessPath(node.expression, aliases);
    if (!base) {
      return null;
    }
    return {
      path: [...base.path, node.argumentExpression.text],
      start: node.argumentExpression.getStart() + 1,
      end: node.argumentExpression.getEnd() - 1,
    };
  }

  return null;
}

function areRsxModelFieldPathsEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((segment, index) => segment === right[index])
  );
}

function getRsxExpressionDependencies(args: {
  expression: IRsxExpressionTreeExpression;
  exactExportIndex: ReadonlyMap<
    string,
    readonly IRsxExpressionTreeExpression[]
  >;
}): IRsxExpressionDependencyEdge[] {
  const dependencies: IRsxExpressionDependencyEdge[] = [];
  const seenTargets = new Set<string>();
  const identifiers = getFreeIdentifiersInRsxExpression(
    args.expression.expression.expression,
  );
  const expressionReferenceModelFieldTargets =
    getExpressionReferenceModelFieldTargets(
      args.expression.expression.modelTypeText,
      args.expression.uri.fsPath,
    );

  for (const identifier of identifiers) {
    const exactTargets = getNonSelfExpressionTargets(
      args.exactExportIndex.get(identifier),
      args.expression,
    );
    const targets =
      exactTargets.length > 0
        ? exactTargets.map((target) => ({
            target,
            matchKind: 'exportName' as const,
          }))
        : getNonSelfExpressionTargets(
            expressionReferenceModelFieldTargets
              .get(identifier)
              ?.flatMap(
                (targetExportName) =>
                  args.exactExportIndex.get(targetExportName) ?? [],
              ),
            args.expression,
          ).map((target) => ({
            target,
            matchKind: 'modelFieldExpressionType' as const,
          }));

    for (const { target, matchKind } of targets) {
      if (seenTargets.has(target.key)) {
        continue;
      }
      seenTargets.add(target.key);
      dependencies.push({
        targetKey: target.key,
        targetUri: target.uri,
        targetRelativePath: target.relativePath,
        targetExportName: target.exportName,
        targetStart: target.start,
        targetEnd: target.end,
        identifier,
        matchKind,
      });
    }
  }

  return dependencies;
}

function getExpressionReferenceModelFieldTargets(
  modelTypeText: string | undefined,
  containingFile: string,
): ReadonlyMap<string, readonly string[]> {
  const fieldTargets = new Map<string, string[]>();
  if (!modelTypeText) {
    return fieldTargets;
  }

  const sourceFile = ts.createSourceFile(
    '__rsx_dependency_model.ts',
    `type __RsxDependencyModel = ${modelTypeText};`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const modelAlias = sourceFile.statements.find(
    (statement): statement is ts.TypeAliasDeclaration =>
      ts.isTypeAliasDeclaration(statement) &&
      statement.name.text === '__RsxDependencyModel',
  );
  if (!modelAlias) {
    return fieldTargets;
  }

  collectExpressionReferenceModelFieldTargets(
    modelAlias.type,
    sourceFile,
    containingFile,
    fieldTargets,
    new Set<string>(),
    getImportedIdentifierExportNameMap(sourceFile),
  );
  return fieldTargets;
}

function collectExpressionReferenceModelFieldTargets(
  type: ts.TypeNode,
  sourceFile: ts.SourceFile,
  containingFile: string,
  fieldTargets: Map<string, string[]>,
  seenTypeReferences: Set<string>,
  importedIdentifierExportNames: ReadonlyMap<string, string>,
): void {
  if (ts.isParenthesizedTypeNode(type)) {
    collectExpressionReferenceModelFieldTargets(
      type.type,
      sourceFile,
      containingFile,
      fieldTargets,
      seenTypeReferences,
      importedIdentifierExportNames,
    );
    return;
  }

  if (ts.isIntersectionTypeNode(type)) {
    for (const memberType of type.types) {
      collectExpressionReferenceModelFieldTargets(
        memberType,
        sourceFile,
        containingFile,
        fieldTargets,
        seenTypeReferences,
        importedIdentifierExportNames,
      );
    }
    return;
  }

  const importedModelType = getImportedModelTypeReference(type, sourceFile);
  if (importedModelType) {
    const resolvedFileName = resolveRsxDependencyModuleFileName({
      containingFile,
      moduleName: importedModelType.moduleName,
    });
    if (!resolvedFileName) {
      return;
    }

    const importedTargets = resolveExportedModelFieldTargets({
      fileName: resolvedFileName,
      typeName: importedModelType.typeName,
      seenTypeReferences,
    });
    mergeModelFieldTargets(fieldTargets, importedTargets);
    return;
  }

  if (!ts.isTypeLiteralNode(type)) {
    return;
  }

  for (const member of type.members) {
    if (!ts.isPropertySignature(member) || !member.type) {
      continue;
    }
    const fieldName = getPropertyNameText(member.name);
    if (!fieldName) {
      continue;
    }

    const targetExportNames = getExpressionReferenceTargetExportNames(
      member.type,
      sourceFile,
      importedIdentifierExportNames,
    );
    if (targetExportNames.length > 0) {
      fieldTargets.set(fieldName, targetExportNames);
    }
  }
}

function getPropertyNameText(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
    return name.text;
  }
  return null;
}

function mergeModelFieldTargets(
  target: Map<string, string[]>,
  source: ReadonlyMap<string, readonly string[]>,
): void {
  for (const [fieldName, sourceTargets] of source) {
    const existingTargets = target.get(fieldName) ?? [];
    target.set(fieldName, [...new Set([...existingTargets, ...sourceTargets])]);
  }
}

function getImportedModelTypeReference(
  type: ts.TypeNode,
  sourceFile: ts.SourceFile,
): { moduleName: string; typeName: string } | null {
  const moduleName = getFirstStringLiteralText(type);
  const typeName = getLastIdentifierText(type);
  const text = type.getText(sourceFile).trim();
  if (!moduleName || !typeName || !text.startsWith('import(')) {
    return null;
  }

  return {
    moduleName,
    typeName,
  };
}

function getFirstStringLiteralText(node: ts.Node): string | null {
  let text: string | null = null;
  const visit = (candidate: ts.Node): void => {
    if (text !== null) {
      return;
    }
    if (ts.isStringLiteralLike(candidate)) {
      text = candidate.text;
      return;
    }
    ts.forEachChild(candidate, visit);
  };
  visit(node);
  return text;
}

function resolveRsxDependencyModuleFileName(args: {
  containingFile: string;
  moduleName: string;
}): string | null {
  const options: ts.CompilerOptions = {
    module: ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2022,
    strict: true,
  };
  const compilerHost = ts.createCompilerHost(options, true);
  return (
    ts.resolveModuleName(
      args.moduleName,
      args.containingFile,
      options,
      compilerHost,
    ).resolvedModule?.resolvedFileName ?? null
  );
}

function resolveExportedModelFieldTargets(args: {
  fileName: string;
  typeName: string;
  seenTypeReferences: Set<string>;
}): ReadonlyMap<string, readonly string[]> {
  const fieldTargets = new Map<string, string[]>();
  const seenKey = `${args.fileName}:${args.typeName}`;
  if (args.seenTypeReferences.has(seenKey)) {
    return fieldTargets;
  }
  args.seenTypeReferences.add(seenKey);

  const text = ts.sys.readFile(args.fileName);
  if (typeof text !== 'string') {
    return fieldTargets;
  }

  const sourceFile = ts.createSourceFile(
    args.fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const importedIdentifierExportNames =
    getImportedIdentifierExportNameMap(sourceFile);

  for (const statement of sourceFile.statements) {
    const directName = getDirectExportedModelTypeName(statement);
    if (directName?.text === args.typeName) {
      collectExpressionReferenceModelFieldTargetsFromDeclaration({
        statement,
        sourceFile,
        containingFile: args.fileName,
        fieldTargets,
        seenTypeReferences: args.seenTypeReferences,
        importedIdentifierExportNames,
      });
      return fieldTargets;
    }
  }

  return fieldTargets;
}

function collectExpressionReferenceModelFieldTargetsFromDeclaration(args: {
  statement: ts.Statement;
  sourceFile: ts.SourceFile;
  containingFile: string;
  fieldTargets: Map<string, string[]>;
  seenTypeReferences: Set<string>;
  importedIdentifierExportNames: ReadonlyMap<string, string>;
}): void {
  if (ts.isInterfaceDeclaration(args.statement)) {
    collectExpressionReferenceModelFieldTargetsFromMembers({
      members: args.statement.members,
      sourceFile: args.sourceFile,
      fieldTargets: args.fieldTargets,
      importedIdentifierExportNames: args.importedIdentifierExportNames,
    });
    return;
  }

  if (ts.isTypeAliasDeclaration(args.statement)) {
    collectExpressionReferenceModelFieldTargets(
      args.statement.type,
      args.sourceFile,
      args.containingFile,
      args.fieldTargets,
      args.seenTypeReferences,
      args.importedIdentifierExportNames,
    );
  }
}

function collectExpressionReferenceModelFieldTargetsFromMembers(args: {
  members: ts.NodeArray<ts.TypeElement>;
  sourceFile: ts.SourceFile;
  fieldTargets: Map<string, string[]>;
  importedIdentifierExportNames: ReadonlyMap<string, string>;
}): void {
  for (const member of args.members) {
    if (!ts.isPropertySignature(member) || !member.type) {
      continue;
    }

    const fieldName = getPropertyNameText(member.name);
    if (!fieldName) {
      continue;
    }

    const targetExportNames = getExpressionReferenceTargetExportNames(
      member.type,
      args.sourceFile,
      args.importedIdentifierExportNames,
    );
    if (targetExportNames.length > 0) {
      args.fieldTargets.set(fieldName, targetExportNames);
    }
  }
}

function getDirectExportedModelTypeName(
  statement: ts.Statement,
): ts.Identifier | null {
  if (
    (ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement)) &&
    statement.name &&
    statement.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    )
  ) {
    return statement.name;
  }

  return null;
}

function getImportedIdentifierExportNameMap(
  sourceFile: ts.SourceFile,
): ReadonlyMap<string, string> {
  const importedNames = new Map<string, string>();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) {
      continue;
    }

    const namedBindings = statement.importClause?.namedBindings;
    if (!namedBindings || !ts.isNamedImports(namedBindings)) {
      continue;
    }

    for (const element of namedBindings.elements) {
      importedNames.set(
        element.name.text,
        element.propertyName?.text ?? element.name.text,
      );
    }
  }

  return importedNames;
}

function getExpressionReferenceTargetExportNames(
  type: ts.TypeNode,
  sourceFile: ts.SourceFile,
  importedIdentifierExportNames: ReadonlyMap<string, string> = new Map(),
): string[] {
  if (ts.isParenthesizedTypeNode(type)) {
    return getExpressionReferenceTargetExportNames(
      type.type,
      sourceFile,
      importedIdentifierExportNames,
    );
  }

  if (ts.isUnionTypeNode(type) || ts.isIntersectionTypeNode(type)) {
    return [
      ...new Set(
        type.types.flatMap((memberType) =>
          getExpressionReferenceTargetExportNames(
            memberType,
            sourceFile,
            importedIdentifierExportNames,
          ),
        ),
      ),
    ];
  }

  if (!ts.isTypeReferenceNode(type)) {
    return [];
  }

  if (getRightmostEntityNameText(type.typeName) !== 'ReturnType') {
    return [];
  }

  const targetType = type.typeArguments?.[0];
  return targetType
    ? getExpressionExportNameFromTypeQuery(
        targetType,
        sourceFile,
        importedIdentifierExportNames,
      )
    : [];
}

function getRightmostEntityNameText(name: ts.EntityName): string {
  return ts.isIdentifier(name)
    ? name.text
    : getRightmostEntityNameText(name.right);
}

function getExpressionExportNameFromTypeQuery(
  type: ts.TypeNode,
  sourceFile: ts.SourceFile,
  importedIdentifierExportNames: ReadonlyMap<string, string>,
): string[] {
  if (ts.isParenthesizedTypeNode(type)) {
    return getExpressionExportNameFromTypeQuery(
      type.type,
      sourceFile,
      importedIdentifierExportNames,
    );
  }

  if (!type.getText(sourceFile).trimStart().startsWith('typeof ')) {
    return [];
  }

  if (!ts.isTypeQueryNode(type)) {
    const identifier = getLastIdentifierText(type);
    return identifier
      ? [importedIdentifierExportNames.get(identifier) ?? identifier]
      : [];
  }

  const expressionName = type.exprName;
  if (ts.isIdentifier(expressionName) || ts.isQualifiedName(expressionName)) {
    const identifier = getRightmostEntityNameText(expressionName);
    return [importedIdentifierExportNames.get(identifier) ?? identifier];
  }

  const qualifier = (expressionName as ts.ImportTypeNode).qualifier;
  if (qualifier) {
    const identifier = getRightmostEntityNameText(qualifier);
    return [importedIdentifierExportNames.get(identifier) ?? identifier];
  }

  const identifier = getLastIdentifierText(expressionName);
  return identifier
    ? [importedIdentifierExportNames.get(identifier) ?? identifier]
    : [];
}

function getLastIdentifierText(node: ts.Node): string | null {
  let identifier: string | null = null;
  const visit = (candidate: ts.Node): void => {
    if (ts.isIdentifier(candidate)) {
      identifier = candidate.text;
    }
    ts.forEachChild(candidate, visit);
  };
  visit(node);
  return identifier;
}

function getFreeIdentifiersInRsxExpression(expressionText: string): string[] {
  const sourceFile = ts.createSourceFile(
    '__rsx_dependency_graph.ts',
    `${WRAPPED_EXPRESSION_PREFIX}${expressionText}${WRAPPED_EXPRESSION_SUFFIX}`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const identifiers = new Set<string>();
  const rootScope = new Set<string>();

  const visit = (
    node: ts.Node,
    scopes: readonly ReadonlySet<string>[],
  ): void => {
    if (ts.isTypeNode(node)) {
      return;
    }

    if (isFunctionLikeWithBody(node)) {
      const functionScope = new Set<string>();
      for (const parameter of node.parameters) {
        addBindingName(functionScope, parameter.name);
      }
      collectLocalDeclarationNames(node.body, functionScope);
      ts.forEachChild(node.body, (child) =>
        visit(child, [...scopes, functionScope]),
      );
      return;
    }

    if (ts.isVariableDeclaration(node)) {
      addBindingName(rootScope, node.name);
      if (node.initializer) {
        visit(node.initializer, scopes);
      }
      return;
    }

    if (ts.isIdentifier(node)) {
      if (
        isRsxExpressionIdentifierReference(node) &&
        !isIdentifierDeclaredInScopes(node.text, scopes)
      ) {
        identifiers.add(node.text);
      }
      return;
    }

    ts.forEachChild(node, (child) => visit(child, scopes));
  };

  ts.forEachChild(sourceFile, (child) => visit(child, [rootScope]));
  return [...identifiers];
}

function collectLocalDeclarationNames(node: ts.Node, names: Set<string>): void {
  const visit = (candidate: ts.Node): void => {
    if (candidate !== node && isFunctionLikeWithBody(candidate)) {
      return;
    }
    if (
      ts.isVariableDeclaration(candidate) ||
      ts.isParameter(candidate) ||
      ts.isBindingElement(candidate)
    ) {
      addBindingName(names, candidate.name);
    }
    if (
      (ts.isFunctionDeclaration(candidate) ||
        ts.isClassDeclaration(candidate)) &&
      candidate.name
    ) {
      names.add(candidate.name.text);
    }
    ts.forEachChild(candidate, visit);
  };
  ts.forEachChild(node, visit);
}

function addBindingName(names: Set<string>, name: ts.BindingName): void {
  if (ts.isIdentifier(name)) {
    names.add(name.text);
    return;
  }
  for (const element of name.elements) {
    if (ts.isOmittedExpression(element)) {
      continue;
    }
    addBindingName(names, element.name);
  }
}

function isFunctionLikeWithBody(
  node: ts.Node,
): node is ts.FunctionLikeDeclaration & { body: ts.ConciseBody } {
  return (
    (ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isMethodDeclaration(node)) &&
    !!node.body
  );
}

function isRsxExpressionIdentifierReference(
  identifier: ts.Identifier,
): boolean {
  const parent = identifier.parent;
  if (!parent) {
    return true;
  }
  if (ts.isPropertyAccessExpression(parent) && parent.name === identifier) {
    return false;
  }
  if (ts.isPropertyAssignment(parent) && parent.name === identifier) {
    return false;
  }
  if (
    (ts.isVariableDeclaration(parent) ||
      ts.isParameter(parent) ||
      ts.isBindingElement(parent) ||
      ts.isFunctionDeclaration(parent) ||
      ts.isFunctionExpression(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isClassDeclaration(parent) ||
      ts.isPropertyDeclaration(parent) ||
      ts.isPropertySignature(parent) ||
      ts.isMethodSignature(parent)) &&
    parent.name === identifier
  ) {
    return false;
  }
  if (
    ts.isLabeledStatement(parent) ||
    ts.isBreakStatement(parent) ||
    ts.isContinueStatement(parent)
  ) {
    return false;
  }
  return true;
}

function isIdentifierDeclaredInScopes(
  identifier: string,
  scopes: readonly ReadonlySet<string>[],
): boolean {
  return scopes.some((scope) => scope.has(identifier));
}

function getNonSelfExpressionTargets(
  targets: readonly IRsxExpressionTreeExpression[] | undefined,
  expression: IRsxExpressionTreeExpression,
): IRsxExpressionTreeExpression[] {
  return (targets ?? []).filter((target) => target.key !== expression.key);
}

function addRsxExpressionIndexEntry(
  index: Map<string, IRsxExpressionTreeExpression[]>,
  key: string,
  expression: IRsxExpressionTreeExpression,
): void {
  const existing = index.get(key);
  if (existing) {
    existing.push(expression);
  } else {
    index.set(key, [expression]);
  }
}

function getModelFieldNameForExpressionExport(
  exportName: string,
): string | null {
  return exportName.endsWith('Rsx') && exportName.length > 'Rsx'.length
    ? exportName.slice(0, -'Rsx'.length)
    : null;
}

function createRsxExpressionTreeKey(
  uri: vscode.Uri,
  exportName: string,
): string {
  return `${uri.toString()}#${exportName}`;
}

function formatExpressionCount(count: number): string {
  return `${count} expression${count === 1 ? '' : 's'}`;
}

function formatModelCount(count: number): string {
  return `${count} model${count === 1 ? '' : 's'}`;
}

function formatFieldCount(count: number): string {
  return `${count} field${count === 1 ? '' : 's'}`;
}

function formatDependencyCount(count: number): string {
  return `${count} dep${count === 1 ? '' : 's'}`;
}

async function openRsxExpressionTreeItem(
  item:
    | IRsxExpressionTreeExpression
    | IRsxExpressionTreeModel
    | IRsxExpressionTreeModelField
    | IRsxExpressionTreeModelFieldExpressionUse,
): Promise<void> {
  await openRsxExpressionLocation(item);
}

async function openRsxExpressionLocation(args: {
  uri: vscode.Uri;
  start: number;
  end: number;
}): Promise<void> {
  const existingEditor = vscode.window.visibleTextEditors.find(
    (editor) => editor.document.uri.toString() === args.uri.toString(),
  );
  const document =
    existingEditor?.document ??
    (await vscode.workspace.openTextDocument(args.uri));
  const editor =
    existingEditor ??
    (await vscode.window.showTextDocument(document, {
      viewColumn: vscode.ViewColumn.Beside,
      preserveFocus: false,
      preview: true,
    }));
  const start = document.positionAt(args.start);
  const end = document.positionAt(args.end);
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
    const headerCompletionPlan = getModuleHeaderCompletionPlan(
      document,
      position,
    );
    if (headerCompletionPlan) {
      return getModuleHeaderCompletionsFromPlan(headerCompletionPlan);
    }
    const headerCompletions: vscode.CompletionItem[] = [];
    if (isNonTypeHeaderValuePosition(document, position)) {
      return [];
    }
    if (isIncompleteTypeHeaderValuePosition(document, position)) {
      return [];
    }

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
    if (isNonTypeHeaderValuePosition(document, position)) {
      return null;
    }
    if (isIncompleteTypeHeaderValuePosition(document, position)) {
      return null;
    }

    const directExpressionReferenceHover =
      getDirectModuleExpressionReferenceHover(document, position);
    if (directExpressionReferenceHover) {
      return directExpressionReferenceHover;
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

function getDirectModuleExpressionReferenceHover(
  document: vscode.TextDocument,
  position: vscode.Position,
): vscode.Hover | null {
  if (!isRsxDocument(document) || document.uri.scheme !== 'file') {
    return null;
  }

  const offset = document.offsetAt(position);
  const cacheEntry = getModuleExpressionCacheEntry(document);
  const parsed = cacheEntry?.parsed;
  if (!parsed || parsed.expressions.length === 0) {
    return null;
  }

  const expressionIndex = getExpressionIndexAtOffset(parsed, offset);
  if (expressionIndex < 0) {
    return null;
  }

  const expression = parsed.expressions[expressionIndex];
  const identifier = getIdentifierAtTextOffset(document.getText(), offset);
  if (
    !identifier ||
    identifier.start < expression.expressionStart ||
    identifier.end > expression.expressionEnd
  ) {
    return null;
  }

  const expressionExports = getRsxExpressionExports({
    fileName: document.uri.fsPath,
    expressions: parsed.expressions,
  });
  const currentExport = expressionExports.find(
    (entry) => entry.expression === expression,
  );
  const referencedExport = expressionExports.find((entry) => {
    if (entry === currentExport) {
      return false;
    }
    return (
      getModelFieldNameForExpressionExport(entry.exportName) === identifier.text
    );
  });
  if (!referencedExport) {
    return null;
  }

  return new vscode.Hover(
    new vscode.MarkdownString().appendCodeblock(
      `(model property) ${identifier.text}: ReturnType<typeof ${referencedExport.exportName}>`,
      'typescript',
    ),
    new vscode.Range(
      document.positionAt(identifier.start),
      document.positionAt(identifier.end),
    ),
  );
}

function getIdentifierAtTextOffset(
  text: string,
  offset: number,
): { text: string; start: number; end: number } | null {
  const clampedOffset = Math.max(0, Math.min(text.length, offset));
  const cursor =
    clampedOffset < text.length && isIdentifierCharacter(text[clampedOffset])
      ? clampedOffset
      : clampedOffset > 0 && isIdentifierCharacter(text[clampedOffset - 1])
        ? clampedOffset - 1
        : -1;
  if (cursor < 0) {
    return null;
  }

  let start = cursor;
  while (start > 0 && isIdentifierCharacter(text[start - 1])) {
    start -= 1;
  }

  let end = cursor + 1;
  while (end < text.length && isIdentifierCharacter(text[end])) {
    end += 1;
  }

  const identifier = text.slice(start, end);
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(identifier)
    ? { text: identifier, start, end }
    : null;
}

function isIdentifierCharacter(character: string | undefined): boolean {
  return character !== undefined && /[A-Za-z0-9_$]/u.test(character);
}

function getDirectModuleHeaderHover(
  document: vscode.TextDocument,
  position: vscode.Position,
): vscode.Hover | null {
  if (!isRsxDocument(document)) {
    return null;
  }

  const line = document.lineAt(position.line);
  const parsed = parseHeaderLine(line.text);
  const authoringKey = getHeaderAuthoringKeyAtPosition(document, position);
  if (!parsed && authoringKey) {
    const matchingHeaderKeys = [...RSX_HEADER_DIRECTIVE_KEYS].filter((key) =>
      key.startsWith(authoringKey.key),
    );
    if (
      RSX_HEADER_DIRECTIVE_KEYS.has(authoringKey.key) ||
      matchingHeaderKeys.length === 1
    ) {
      return createHeaderDirectiveHover(
        RSX_HEADER_DIRECTIVE_KEYS.has(authoringKey.key)
          ? authoringKey.key
          : matchingHeaderKeys[0],
        position.line,
        authoringKey.keyStartCharacter,
      );
    }
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

  if (
    RSX_HEADER_DIRECTIVE_KEYS.has(parsed.key) &&
    parsed.key !== 'model' &&
    parsed.key !== 'return' &&
    position.character >= parsed.keyStartCharacter
  ) {
    return createHeaderDirectiveHover(
      parsed.key,
      position.line,
      parsed.keyStartCharacter,
    );
  }

  if (document.uri.scheme === 'file') {
    const sameFileExpressionHover =
      getRsxHeaderSameFileExpressionReferenceHover(document, position);
    if (sameFileExpressionHover) {
      return sameFileExpressionHover;
    }

    const directImportHover = getRsxHeaderImportHoverAtTextPosition({
      fileName: document.uri.fsPath,
      text: document.getText(),
      position: document.offsetAt(position),
    });
    if (directImportHover) {
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
  }

  if (parsed.key !== 'model' && parsed.key !== 'return') {
    return null;
  }

  return null;
}

function getRsxHeaderSameFileExpressionReferenceHover(
  document: vscode.TextDocument,
  position: vscode.Position,
): vscode.Hover | null {
  const cacheEntry = getModuleExpressionCacheEntry(document);
  const parsed = cacheEntry?.parsed;
  if (!parsed) {
    return null;
  }

  const expressionExports = getRsxExpressionExports({
    fileName: document.uri.fsPath,
    expressions: parsed.expressions,
  });
  const exportByName = new Map(
    expressionExports.map((expressionExport) => [
      expressionExport.exportName,
      expressionExport,
    ]),
  );

  const resolveHover = (args: {
    sourceText: string;
    targetPosition: number;
    sourceOffset: number;
  }): {
    exportName: string;
    start: number;
    end: number;
    returnTypeText?: string;
  } | null => {
    const sourceFile = ts.createSourceFile(
      '/__rsx_same_file_header_reference.ts',
      args.sourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    if (sourceFile.parseDiagnostics.length > 0) {
      return null;
    }

    let resolved: {
      exportName: string;
      start: number;
      end: number;
      returnTypeText?: string;
    } | null = null;
    const visit = (node: ts.Node): void => {
      if (resolved) {
        return;
      }
      if (ts.isTypeQueryNode(node) && ts.isIdentifier(node.exprName)) {
        const start = node.exprName.getStart(sourceFile);
        const end = node.exprName.getEnd();
        if (args.targetPosition >= start && args.targetPosition <= end) {
          const expressionExport = exportByName.get(node.exprName.text);
          if (expressionExport) {
            resolved = {
              exportName: expressionExport.exportName,
              start: args.sourceOffset + start,
              end: args.sourceOffset + end,
              returnTypeText: expressionExport.expression.returnTypeText,
            };
            return;
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return resolved;
  };

  const line = document.lineAt(position.line);
  const trimmedLine = line.text.trim();
  const trimmedStartCharacter = line.text.indexOf(trimmedLine);
  const linePrefix = 'type __RSX_HEADER = { ';
  const lineSourceText = `${linePrefix}${trimmedLine} };`;
  const lineResolved = resolveHover({
    sourceText: lineSourceText,
    targetPosition:
      linePrefix.length +
      Math.max(0, position.character - trimmedStartCharacter),
    sourceOffset:
      document.offsetAt(
        new vscode.Position(position.line, trimmedStartCharacter),
      ) - linePrefix.length,
  });
  if (lineResolved) {
    return createSameFileExpressionReferenceHover(document, lineResolved);
  }

  const region = getTypeHeaderValueRegionAtPosition(document, position);
  if (!region || region.key !== 'model') {
    return null;
  }

  const prefix = 'type __RSX_HEADER = ';
  const regionResolved = resolveHover({
    sourceText: `${prefix}${region.value};`,
    targetPosition:
      prefix.length +
      Math.max(0, document.offsetAt(position) - region.valueStartOffset),
    sourceOffset: region.valueStartOffset - prefix.length,
  });
  if (!regionResolved) {
    return null;
  }

  return createSameFileExpressionReferenceHover(document, regionResolved);
}

function createSameFileExpressionReferenceHover(
  document: vscode.TextDocument,
  resolved: {
    exportName: string;
    start: number;
    end: number;
    returnTypeText?: string;
  },
): vscode.Hover {
  const hoverText = `(same-file expression) ${resolved.exportName}: ReturnType<typeof ${resolved.exportName}>${
    resolved.returnTypeText ? `\n// resolves to ${resolved.returnTypeText}` : ''
  }`;
  return new vscode.Hover(
    new vscode.MarkdownString().appendCodeblock(hoverText, 'typescript'),
    new vscode.Range(
      document.positionAt(resolved.start),
      document.positionAt(resolved.end),
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

  if (!authoringKey.hasColon) {
    const plan = getModuleHeaderCompletionPlan(document, position);
    return (
      (plan !== null && plan.candidates.length > 0) ||
      isFreshHeaderAuthoringPosition(document, position)
    );
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

function isFreshHeaderAuthoringPosition(
  document: vscode.TextDocument,
  position: vscode.Position,
): boolean {
  const authoringKey = getHeaderAuthoringKeyAtPosition(document, position);
  return (
    authoringKey !== null &&
    isFirstNonEmptyLine(document, position.line) &&
    !hasAnyRsxHeader(document)
  );
}

function isNonTypeHeaderValuePosition(
  document: vscode.TextDocument,
  position: vscode.Position,
): boolean {
  if (!isRsxDocument(document)) {
    return false;
  }

  const line = document.lineAt(position.line).text;
  const parsed = parseHeaderLine(line);
  if (!parsed || !RSX_HEADER_DIRECTIVE_KEYS.has(parsed.key)) {
    return false;
  }

  const valueStart = getHeaderValueStartCharacter(line);
  if (position.character < valueStart) {
    return false;
  }

  return parsed.key !== 'model' && parsed.key !== 'return';
}

function isIncompleteTypeHeaderValuePosition(
  document: vscode.TextDocument,
  position: vscode.Position,
): boolean {
  if (!isRsxDocument(document)) {
    return false;
  }

  const region = getTypeHeaderValueRegionAtPosition(document, position);
  if (!region) {
    return false;
  }

  return !isTypeHeaderValueSyntacticallyComplete(region.value);
}

function hasIncompleteTypeHeaderValue(document: vscode.TextDocument): boolean {
  if (!isRsxDocument(document)) {
    return false;
  }

  for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex += 1) {
    const region = collectTypeHeaderValueRegion(document, lineIndex);
    if (!region) {
      continue;
    }
    if (!isTypeHeaderValueSyntacticallyComplete(region.value)) {
      return true;
    }
    lineIndex = region.endLine;
  }

  return false;
}

function isTypeHeaderValueSyntacticallyComplete(value: string): boolean {
  if (value.trim().length === 0) {
    return false;
  }

  return getTypeHeaderValueParseDiagnostics(value).length === 0;
}

function shouldSkipStandaloneAnalysisForFreshHeaderAuthoring(
  document: vscode.TextDocument,
): boolean {
  if (!isRsxDocument(document) || hasAnyRsxHeader(document)) {
    return false;
  }

  let nonEmptyLineIndex: number | null = null;
  for (let index = 0; index < document.lineCount; index += 1) {
    if (document.lineAt(index).text.trim().length === 0) {
      continue;
    }
    if (nonEmptyLineIndex !== null) {
      return false;
    }
    nonEmptyLineIndex = index;
  }
  if (nonEmptyLineIndex === null) {
    return false;
  }

  const line = document.lineAt(nonEmptyLineIndex).text;
  const authoringKey = scanHeaderAuthoringKey(line);
  if (!authoringKey) {
    return false;
  }

  const trailingText = line
    .slice(authoringKey.keyStartCharacter + authoringKey.key.length)
    .trim();
  if (authoringKey.hasColon) {
    return !RSX_HEADER_DIRECTIVE_KEYS.has(authoringKey.key);
  }

  return trailingText.length === 0;
}

function shouldSkipStandaloneAnalysisForHeaderAuthoring(
  document: vscode.TextDocument,
): boolean {
  if (shouldSkipStandaloneAnalysisForFreshHeaderAuthoring(document)) {
    return true;
  }

  if (!isRsxDocument(document)) {
    return false;
  }

  if (!hasExpressionBodyContent(document)) {
    return true;
  }

  for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex += 1) {
    const line = document.lineAt(lineIndex);
    if (line.text.trim().length === 0 || parseHeaderLine(line.text)) {
      continue;
    }

    const authoringKey = scanHeaderAuthoringKey(line.text);
    if (!authoringKey || authoringKey.hasColon) {
      continue;
    }

    const position = new vscode.Position(lineIndex, line.text.length);
    const plan = getModuleHeaderCompletionPlan(document, position);
    if (plan && plan.candidates.length > 0) {
      return true;
    }
  }

  return false;
}

function hasExpressionBodyContent(document: vscode.TextDocument): boolean {
  for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex += 1) {
    const lineText = document.lineAt(lineIndex).text;
    const trimmed = lineText.trim();
    if (trimmed.length === 0) {
      continue;
    }

    const indented = isIndentedLine(lineText);
    const parsed = parseHeaderLine(lineText);
    if (parsed) {
      if (!indented && parsed.key === 'defaults') {
        continue;
      }
      if (!indented && parsed.key === 'expression') {
        continue;
      }
      continue;
    }

    const authoringKey = scanHeaderAuthoringKey(lineText);
    if (authoringKey && !authoringKey.hasColon) {
      const position = new vscode.Position(lineIndex, lineText.length);
      const plan = getModuleHeaderCompletionPlan(document, position);
      if (plan && plan.candidates.length > 0) {
        continue;
      }
    }

    return true;
  }

  return false;
}

function isRsxHeaderDiagnosticMessage(message: string): boolean {
  return (
    message.startsWith('Unknown RS-X header key ') ||
    /^Header ".+" /u.test(message) ||
    /^Expression ".+" must declare a model header/u.test(message) ||
    /^Duplicate ".+" header/u.test(message)
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
  if (!isRsxDocument(document)) {
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
    if (shouldSkipStandaloneAnalysisForHeaderAuthoring(document)) {
      return [];
    }

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
    if (
      shouldSkipStandaloneAnalysisForHeaderAuthoring(document) ||
      context.diagnostics.length === 0
    ) {
      return [];
    }

    const actionableDiagnostics = context.diagnostics.filter(
      (diagnostic) => !isRsxHeaderDiagnosticMessage(String(diagnostic.message)),
    );
    if (actionableDiagnostics.length === 0) {
      return [];
    }

    const standalone = createStandaloneLanguageServiceForDocument(document);
    if (!standalone) {
      return [];
    }

    const seen = new Set<string>();
    const diagnosticContexts = actionableDiagnostics.map((diagnostic) => ({
      diagnostic,
      range: diagnostic.range,
    }));

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

  const standalone = shouldSkipStandaloneAnalysisForHeaderAuthoring(document)
    ? null
    : createStandaloneLanguageServiceForDocument(document);
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
  if (!isRsxDocument(document)) {
    return [];
  }

  const headerDiagnostics = [
    ...getModuleHeaderDiagnostics(document),
    ...getModuleHeaderTypeDiagnostics(document),
  ];
  if (shouldSkipStandaloneAnalysisForHeaderAuthoring(document)) {
    return headerDiagnostics;
  }

  const standalone = createStandaloneLanguageServiceForDocument(document);
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
  if (shouldSkipStandaloneAnalysisForHeaderAuthoring(document)) {
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
  if (!isRsxDocument(document) || document.uri.scheme !== 'file') {
    return null;
  }

  const key = document.uri.toString();
  const cached = standaloneServiceCache.get(key);
  if (cached && cached.version === document.version) {
    return cached.service;
  }

  if (
    shouldSkipStandaloneAnalysisForHeaderAuthoring(document) ||
    hasIncompleteTypeHeaderValue(document)
  ) {
    standaloneServiceCache.set(key, {
      version: document.version,
      service: null,
    });
    return null;
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
  if (!isRsxDocument(document) || document.uri.scheme !== 'file') {
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
  if (!isRsxDocument(document) || document.uri.scheme !== 'file') {
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
  if (!isRsxDocument(document) || document.uri.scheme !== 'file') {
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
  if (!isRsxDocument(document) || document.uri.scheme !== 'file') {
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
    cacheEntry.parsed,
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
  if (!isRsxDocument(document) || document.uri.scheme !== 'file') {
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
  if (!isRsxDocument(document) || document.uri.scheme !== 'file') {
    return null;
  }

  const position = document.positionAt(offset);
  const region = getTypeHeaderValueRegionAtPosition(document, position);
  if (!region) {
    return null;
  }

  const valueOffset = offset - region.valueStartOffset;
  const modelTypeText =
    region.key === 'model'
      ? getModuleHeaderModelTypeText(document, region.value)
      : 'unknown';
  const returnTypeText = region.key === 'return' ? region.value : 'unknown';
  if (!isTypeHeaderValueSyntacticallyComplete(region.value)) {
    return null;
  }

  const standaloneText = [
    formatStandaloneTypeHeader('model', modelTypeText),
    formatStandaloneTypeHeader('return', returnTypeText),
    '',
    '0',
  ].join('\n');

  const standalone = safeCreateRsxStandaloneLanguageService({
    fileName: document.uri.fsPath,
    text: standaloneText,
    virtualFileNameSuffix: `header_${region.key}`,
  });
  if (!standalone) {
    return null;
  }

  const targetPrefix =
    region.key === 'model' ? 'model: ' : `model: ${modelTypeText}\nreturn: `;
  const targetPosition = targetPrefix.length + Math.max(0, valueOffset);
  return {
    document: standalone,
    position: targetPosition,
    key: region.key,
    originalValueStart: region.valueStartOffset,
    originalValueEnd: region.valueEndOffset,
  };
}

function getModuleHeaderModelTypeText(
  document: vscode.TextDocument,
  modelTypeText: string,
): string {
  const normalized =
    normalizeRsxModelExpressionReferenceTypeText(modelTypeText);
  const cacheEntry = getModuleExpressionCacheEntry(document);
  const parsed = cacheEntry?.parsed;
  if (!parsed || document.uri.scheme !== 'file') {
    return normalized;
  }

  return qualifySameFileExpressionReferenceTypeText(
    normalized,
    document.uri.fsPath,
    parsed,
  );
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
      /is not assignable to (?:declared return )?type/iu.test(
        diagnostic.message,
      );
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
  if (!isRsxDocument(document) || document.uri.scheme !== 'file') {
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
  if (!isRsxDocument(document) || document.uri.scheme !== 'file') {
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
  parsed: NonNullable<IModuleExpressionCacheEntry['parsed']>,
  expression: IParsedRsxExpression,
  expressionIndex: number,
): IModuleExpressionStandaloneService | null {
  const modelTypeText = getModuleExpressionModelTypeWithSameFileReferences(
    document,
    parsed,
    expression,
  );
  if (!isTypeHeaderValueSyntacticallyComplete(modelTypeText)) {
    return null;
  }

  const standaloneTextLines = [
    formatStandaloneTypeHeader('model', modelTypeText),
  ];
  if (
    expression.returnTypeText &&
    expression.returnTypeText.trim().length > 0
  ) {
    if (!isTypeHeaderValueSyntacticallyComplete(expression.returnTypeText)) {
      return null;
    }
    standaloneTextLines.push(
      formatStandaloneTypeHeader('return', expression.returnTypeText),
    );
  }
  standaloneTextLines.push('', expression.expression);
  const standaloneText = standaloneTextLines.join('\n');
  const standalone = safeCreateRsxStandaloneLanguageService({
    fileName: document.uri.fsPath,
    text: standaloneText,
    modelPropertyNamesHint:
      getTopLevelModelPropertyNamesFromTypeText(modelTypeText),
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

function formatStandaloneTypeHeader(
  key: 'model' | 'return',
  value: string,
): string {
  const [firstLine = '', ...continuationLines] = value
    .replace(/\r\n/gu, '\n')
    .trim()
    .split('\n');
  if (continuationLines.length === 0) {
    return `${key}: ${firstLine.trim()}`;
  }

  return [
    `${key}: ${firstLine.trim()}`,
    ...continuationLines.map((line) => `  ${line.trim()}`),
  ].join('\n');
}

function getTopLevelModelPropertyNamesFromTypeText(
  modelTypeText: string,
): string[] {
  const sourceFile = ts.createSourceFile(
    '/__rsx_model_properties__.ts',
    `type __RSX_MODEL = ${modelTypeText};`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const modelAlias = sourceFile.statements.find(
    (statement): statement is ts.TypeAliasDeclaration =>
      ts.isTypeAliasDeclaration(statement) &&
      statement.name.text === '__RSX_MODEL',
  );
  if (!modelAlias) {
    return [];
  }

  const propertyNames = new Set<string>();
  const visit = (node: ts.TypeNode): void => {
    if (ts.isParenthesizedTypeNode(node)) {
      visit(node.type);
      return;
    }
    if (ts.isIntersectionTypeNode(node)) {
      for (const memberType of node.types) {
        visit(memberType);
      }
      return;
    }
    if (!ts.isTypeLiteralNode(node)) {
      return;
    }
    for (const member of node.members) {
      if (!ts.isPropertySignature(member)) {
        continue;
      }
      const propertyName = getPropertyNameText(member.name);
      if (propertyName) {
        propertyNames.add(propertyName);
      }
    }
  };
  visit(modelAlias.type);
  return [...propertyNames];
}

function getModuleExpressionModelTypeWithSameFileReferences(
  document: vscode.TextDocument,
  parsed: NonNullable<IModuleExpressionCacheEntry['parsed']>,
  expression: IParsedRsxExpression,
): string {
  const baseModelTypeText = qualifySameFileExpressionReferenceTypeText(
    normalizeRsxModelExpressionReferenceTypeText(expression.modelTypeText),
    document.uri.fsPath,
    parsed,
  );
  const expressionExports = getRsxExpressionExports({
    fileName: document.uri.fsPath,
    expressions: parsed.expressions,
  });
  const referencedIdentifiers = new Set(
    getFreeIdentifiersInRsxExpression(expression.expression),
  );
  const currentExport = expressionExports.find(
    (entry) => entry.expression === expression,
  );
  const localFields = expressionExports
    .map((entry) => ({
      exportName: entry.exportName,
      fieldName: getModelFieldNameForExpressionExport(entry.exportName),
      returnTypeText: entry.expression.returnTypeText,
    }))
    .filter(
      (
        entry,
      ): entry is {
        exportName: string;
        fieldName: string;
        returnTypeText?: string;
      } =>
        Boolean(entry.fieldName) &&
        referencedIdentifiers.has(entry.fieldName) &&
        entry.fieldName !==
          (currentExport
            ? getModelFieldNameForExpressionExport(currentExport.exportName)
            : undefined),
    );
  if (localFields.length === 0) {
    return baseModelTypeText;
  }
  return `${baseModelTypeText} & { ${localFields
    .map(
      ({ fieldName, returnTypeText }) =>
        `readonly ${JSON.stringify(fieldName)}: ${returnTypeText ?? 'never'}`,
    )
    .join('; ')} }`;
}

function qualifySameFileExpressionReferenceTypeText(
  modelTypeText: string,
  fileName: string,
  parsed: NonNullable<IModuleExpressionCacheEntry['parsed']>,
): string {
  const expressionExports = getRsxExpressionExports({
    fileName,
    expressions: parsed.expressions,
  });
  if (expressionExports.length === 0) {
    return modelTypeText;
  }

  const expressionReturnTypes = new Map(
    expressionExports.map((expressionExport) => [
      expressionExport.exportName,
      expressionExport.expression.returnTypeText ?? 'unknown',
    ]),
  );
  const prefix = 'type __RSX_MODEL = ';
  const sourceFile = ts.createSourceFile(
    '/__rsx_same_file_model_type.ts',
    `${prefix}${modelTypeText};`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  if (sourceFile.parseDiagnostics.length > 0) {
    return modelTypeText;
  }
  const modelAlias = sourceFile.statements.find(
    (statement): statement is ts.TypeAliasDeclaration =>
      ts.isTypeAliasDeclaration(statement) &&
      statement.name.text === '__RSX_MODEL',
  );
  if (!modelAlias) {
    return modelTypeText;
  }

  const replacements: Array<{ start: number; end: number; text: string }> = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isTypeReferenceNode(node) &&
      getRightmostEntityNameText(node.typeName) === 'ReturnType' &&
      node.typeArguments?.length === 1
    ) {
      const targetType = node.typeArguments[0];
      if (
        ts.isTypeQueryNode(targetType) &&
        ts.isIdentifier(targetType.exprName) &&
        expressionReturnTypes.has(targetType.exprName.text)
      ) {
        replacements.push({
          start: node.getStart(sourceFile) - prefix.length,
          end: node.getEnd() - prefix.length,
          text:
            expressionReturnTypes.get(targetType.exprName.text) ?? 'unknown',
        });
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(modelAlias.type);
  if (replacements.length === 0) {
    return modelTypeText;
  }

  let qualified = modelTypeText;
  for (const replacement of replacements.sort(
    (left, right) => right.start - left.start,
  )) {
    qualified = `${qualified.slice(0, replacement.start)}${replacement.text}${qualified.slice(replacement.end)}`;
  }
  return qualified;
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
          const typeHeaderRegion = collectTypeHeaderValueRegion(
            document,
            lineIndex,
          );
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
          if (typeHeaderRegion) {
            lineIndex = typeHeaderRegion.endLine;
          }
        }
        continue;
      }
    }

    if (state === 'expressionPrelude') {
      if (!indented) {
        finalizeExpressionHeaderBlock();
        state = 'topLevel';
      } else {
        const typeHeaderRegion = collectTypeHeaderValueRegion(
          document,
          lineIndex,
        );
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
        if (typeHeaderRegion) {
          lineIndex = typeHeaderRegion.endLine;
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
    const typeHeaderRegion = collectTypeHeaderValueRegion(document, lineIndex);
    if (typeHeaderRegion) {
      lineIndex = typeHeaderRegion.endLine;
    }
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
        lineIndex = addModuleHeaderTypeDiagnosticsForLine({
          diagnostics,
          document,
          lineIndex,
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

        lineIndex = addModuleHeaderTypeDiagnosticsForLine({
          diagnostics,
          document,
          lineIndex,
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

    lineIndex = addModuleHeaderTypeDiagnosticsForLine({
      diagnostics,
      document,
      lineIndex,
      seen,
    });
  }

  return diagnostics;
}

function addModuleHeaderTypeDiagnosticsForLine(args: {
  diagnostics: vscode.Diagnostic[];
  document: vscode.TextDocument;
  lineIndex: number;
  seen: Set<string>;
}): number {
  const region = collectTypeHeaderValueRegion(args.document, args.lineIndex);
  if (!region) {
    return args.lineIndex;
  }
  if (region.value.trim().length === 0) {
    return region.endLine;
  }
  const headerDiagnostics = getFastModuleHeaderTypeDiagnostics({
    document: args.document,
    value: region.value,
    valueStartOffset: region.valueStartOffset,
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
  return region.endLine;
}

function getFastModuleHeaderTypeDiagnostics(args: {
  document: vscode.TextDocument;
  value: string;
  valueStartOffset: number;
}): Array<{ message: string; start: number; end: number }> {
  const diagnostics: Array<{ message: string; start: number; end: number }> =
    [];

  for (const diagnostic of getTypeHeaderValueParseDiagnostics(args.value)) {
    const start = Math.max(
      0,
      (diagnostic.start ?? TYPE_HEADER_VALUE_PARSE_PREFIX.length) -
        TYPE_HEADER_VALUE_PARSE_PREFIX.length,
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

const TYPE_HEADER_VALUE_PARSE_PREFIX = 'type __RSX_HEADER = ';

function getTypeHeaderValueParseDiagnostics(
  value: string,
): readonly ts.DiagnosticWithLocation[] {
  const sourceFile = ts.createSourceFile(
    '/__rsx_header_type_check__.ts',
    `${TYPE_HEADER_VALUE_PARSE_PREFIX}${value};`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  return sourceFile.parseDiagnostics;
}

function getTypeHeaderValueRegionAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position,
): ITypeHeaderValueRegion | null {
  for (let lineIndex = position.line; lineIndex >= 0; lineIndex -= 1) {
    const region = collectTypeHeaderValueRegion(document, lineIndex);
    if (!region) {
      continue;
    }
    if (position.line > region.endLine) {
      return null;
    }
    if (position.line < region.startLine) {
      continue;
    }
    const positionOffset = document.offsetAt(position);
    if (
      positionOffset >= region.valueStartOffset &&
      positionOffset <= region.valueEndOffset
    ) {
      return region;
    }
    return null;
  }
  return null;
}

function collectTypeHeaderValueRegion(
  document: vscode.TextDocument,
  lineIndex: number,
): ITypeHeaderValueRegion | null {
  const line = document.lineAt(lineIndex);
  const parsed = parseHeaderLine(line.text);
  if (!parsed || (parsed.key !== 'model' && parsed.key !== 'return')) {
    return null;
  }

  const valueStartCharacter = getHeaderValueStartCharacter(line.text);
  const valueLines = [line.text.slice(valueStartCharacter).trim()];
  let endLine = lineIndex;

  while (
    endLine + 1 < document.lineCount &&
    !isTypeHeaderValueSyntacticallyComplete(valueLines.join('\n'))
  ) {
    const nextLine = document.lineAt(endLine + 1).text;
    if (!isIndentedLine(nextLine)) {
      break;
    }
    valueLines.push(nextLine.trim());
    endLine += 1;
  }

  const endLineText = document.lineAt(endLine).text;
  return {
    key: parsed.key,
    keyStartCharacter: parsed.keyStartCharacter,
    value: valueLines.join('\n').trim(),
    valueStartOffset: document.offsetAt(
      new vscode.Position(lineIndex, valueStartCharacter),
    ),
    valueEndOffset: document.offsetAt(
      new vscode.Position(endLine, endLineText.length),
    ),
    startLine: lineIndex,
    endLine,
  };
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

function getModuleHeaderCompletionsFromPlan(plan: {
  candidates: readonly string[];
  insertIndent: string;
  range: vscode.Range;
}): vscode.CompletionItem[] {
  return plan.candidates.map((candidate) => {
    const completion = new vscode.CompletionItem(
      candidate,
      vscode.CompletionItemKind.Property,
    );
    completion.range = plan.range;
    completion.insertText = `${plan.insertIndent}${candidate}: `;
    completion.sortText = `0_${candidate}`;
    return completion;
  });
}

function getModuleHeaderCompletionPlan(
  document: vscode.TextDocument,
  position: vscode.Position,
): {
  candidates: readonly string[];
  insertIndent: string;
  range: vscode.Range;
} | null {
  const linePrefix = document
    .lineAt(position.line)
    .text.slice(0, position.character);
  if (linePrefix.includes(':')) {
    return null;
  }

  const prefix = scanHeaderCompletionPrefix(linePrefix);
  if (!prefix) {
    return null;
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
  let insertIndent = '';
  let rangeStartCharacter = prefix.keyStartCharacter;

  if (prefix.leadingWhitespace.length > 0) {
    if (
      isTopLevelDefaultsHeaderLine(previousTrimmed) ||
      isTopLevelExpressionHeaderLine(previousTrimmed) ||
      isExpressionHeaderLineThatCanBeFollowedByMoreHeaders(previousTrimmed)
    ) {
      candidates = MODULE_EXPRESSION_HEADER_KEYS;
    }
  } else if (
    !previousIsIndented &&
    isTopLevelDefaultsHeaderLine(previousTrimmed)
  ) {
    candidates = MODULE_EXPRESSION_HEADER_KEYS;
    insertIndent = '  ';
  } else if (
    !previousIsIndented &&
    (isTopLevelExpressionHeaderLine(previousTrimmed) ||
      isExpressionHeaderLineThatCanBeFollowedByMoreHeaders(previousTrimmed))
  ) {
    candidates = MODULE_EXPRESSION_HEADER_KEYS;
    insertIndent = '  ';
  } else if (isModuleDocument) {
    candidates =
      hasDefaultsHeader || hasExpressionHeader
        ? ['expression']
        : MODULE_TOP_LEVEL_HEADER_KEYS;
  } else {
    candidates = FRESH_FILE_TOP_LEVEL_HEADER_KEYS;
  }

  const hasHeaderCompletionContext = candidates.length > 0;
  let matchingCandidates = candidates.filter((candidate) =>
    candidate.startsWith(prefix.typedPrefix),
  );
  if (
    matchingCandidates.length === 0 &&
    prefix.leadingWhitespace.length > 0 &&
    isModuleDocument &&
    prefix.typedPrefix.length > 0 &&
    'expression'.startsWith(prefix.typedPrefix)
  ) {
    matchingCandidates = ['expression'];
    insertIndent = '';
    rangeStartCharacter = 0;
  }

  if (!hasHeaderCompletionContext && matchingCandidates.length === 0) {
    return null;
  }

  return {
    candidates: matchingCandidates,
    insertIndent,
    range: new vscode.Range(
      new vscode.Position(position.line, rangeStartCharacter),
      position,
    ),
  };
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
  keyStartCharacter: number;
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
    keyStartCharacter: keyStart,
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

function isExpressionHeaderLineThatCanBeFollowedByMoreHeaders(
  line: string,
): boolean {
  const parsed = parseHeaderLine(line);
  if (!parsed || parsed.value.trim().length === 0) {
    return false;
  }

  if (parsed.key === 'return') {
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
