import { createRequire } from 'node:module';
import * as path from 'node:path';

import ts from 'typescript';
import * as vscode from 'vscode';

import {
  createRsxImportAwareCompilerHost,
  createRsxSemanticClassificationContext,
  getRsxExpressionExports,
  getRsxExpressionValueName,
  getRsxModuleStructureDiagnostics,
  normalizeRsxModelExpressionReferenceTypeText,
  parseRsxFileExpressions,
  resolveRsxSemanticTokenType,
  shouldEmitRsxSemanticToken,
  tokenizeRsxExpression,
} from '@rs-x/compiler';
import {
  AbstractExpression,
  CompiledExpression,
  type IExpression,
  JsEspreeExpressionParser,
  JsExpressionAstParser,
  rsx,
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

interface IRsxExpressionTreeExpressionInstanceGroup {
  readonly kind: 'expressionInstanceGroup';
  readonly key: string;
  readonly expression: IRsxExpressionTreeExpression;
  readonly instances: readonly IRsxExpressionTreeExpressionInstance[];
}

interface IRsxExpressionTreeExpressionInstance {
  readonly kind: 'expressionInstance';
  readonly key: string;
  readonly expression: IRsxExpressionTreeExpression;
  readonly uri: vscode.Uri;
  readonly relativePath: string;
  readonly start: number;
  readonly end: number;
  readonly line: number;
  readonly column: number;
  readonly debugHook?: IRsxExpressionTreeDebugHook;
}

interface IRsxExpressionTreeDebugHook {
  readonly moduleSpecifier: string;
  readonly exportName?: string;
  readonly label: string;
  readonly enabled: boolean;
  readonly scope: 'group' | 'instance';
}

interface IRsxDebugHookPanelTarget {
  readonly expressionName: string;
  readonly instanceId?: string;
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
  readonly valueTemplate?: string;
  readonly valueTemplateImports?: readonly string[];
  readonly collectionKind?: 'array' | 'map';
  readonly collectionValueTemplate?: string;
  readonly collectionValueTemplateImports?: readonly string[];
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
  readonly matchKind:
    | 'exportName'
    | 'exportValueName'
    | 'modelFieldExpressionType';
}

interface IRsxExpressionDependencyTreeItem {
  readonly kind: 'dependency';
  readonly source: IRsxExpressionTreeExpression;
  readonly edge: IRsxExpressionDependencyEdge;
  readonly pathKeys: readonly string[];
}

interface IRsxExpressionTreeSearchResult {
  readonly kind: 'searchResult';
  readonly query: string;
  readonly matchUri: vscode.Uri;
  readonly matchStart: number;
  readonly matchEnd: number;
  readonly target:
    | IRsxExpressionTreeExpression
    | IRsxExpressionTreeModel
    | IRsxExpressionTreeModelField
    | IRsxExpressionTreeExpressionInstance;
}

interface IRsxExpressionPanelTreeNode {
  readonly key: string;
  readonly label: string;
  readonly kind: string;
  readonly description?: string;
  readonly badge?: string;
  readonly badgeTitle?: string;
  readonly hookState?: 'enabled' | 'disabled';
  readonly uri?: string;
  readonly start?: number;
  readonly end?: number;
  readonly children?: readonly IRsxExpressionPanelTreeNode[];
}

type IRsxExpressionTreeItem =
  | IRsxExpressionTreeExpressionsRoot
  | IRsxExpressionTreeModelsRoot
  | IRsxExpressionTreeFile
  | IRsxExpressionTreeExpression
  | IRsxExpressionTreeModel
  | IRsxExpressionTreeModelField
  | IRsxExpressionTreeModelFieldExpressionUse
  | IRsxExpressionDependencyTreeItem
  | IRsxExpressionTreeExpressionInstanceGroup
  | IRsxExpressionTreeExpressionInstance
  | IRsxExpressionTreeSearchResult;

interface IRsxExpressionGraphPreviewNode {
  readonly id: string;
  readonly key: string;
  readonly exportName: string;
  readonly uri: string;
  readonly expressionText: string;
  readonly valueText?: string;
  readonly valueError?: string;
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

interface IRsxExpressionTesterTarget {
  readonly key: string;
  readonly exportName: string;
  readonly expressionText: string;
  readonly uri: string;
  readonly start: number;
  readonly end: number;
  readonly returnTypeText?: string;
  readonly dependencies: readonly IRsxExpressionTesterLink[];
  readonly modelFieldDependencies: readonly IRsxExpressionTesterModelFieldLink[];
  readonly dependents: readonly IRsxExpressionTesterLink[];
}

interface IRsxExpressionTesterLink {
  readonly key: string;
  readonly exportName: string;
  readonly label?: string;
  readonly matchKind?: IRsxExpressionDependencyEdge['matchKind'];
  readonly uri: string;
  readonly start: number;
  readonly end: number;
}

interface IRsxExpressionTesterData {
  readonly title: string;
  readonly scopeLabel: string;
  readonly containingFileName: string;
  readonly modelTypeText: string;
  readonly modelTemplate: string;
  readonly targets: readonly IRsxExpressionTesterTarget[];
  readonly dependencyTargets: readonly IRsxExpressionTesterTarget[];
  readonly fieldPath?: readonly string[];
}

interface IRsxExpressionTesterRunResult {
  readonly ok: boolean;
  readonly diagnostics: readonly string[];
  readonly values: readonly IRsxExpressionTesterValue[];
  readonly model?: object;
  readonly liveRun?: IRsxExpressionTesterLiveRun;
}

interface IRsxExpressionTesterValue {
  readonly key: string;
  readonly exportName: string;
  readonly value?: string;
  readonly error?: string;
  readonly dependencies?: readonly IRsxExpressionTesterDependencyStatus[];
}

interface IRsxExpressionTesterReportEntry {
  readonly key: string;
  readonly exportName: string;
  readonly expressionText: string;
  readonly uri: string;
  readonly start: number;
  readonly end: number;
  readonly current: string;
  readonly previous: string;
  readonly changed: boolean;
  readonly returnTypeText?: string;
  readonly dependencies: readonly IRsxExpressionTesterLink[];
  readonly dependencyStatuses: readonly IRsxExpressionTesterDependencyStatus[];
  readonly dependents: readonly IRsxExpressionTesterLink[];
}

interface IRsxExpressionTesterDependencyStatus {
  readonly key: string;
  readonly label: string;
  readonly exportName: string;
  readonly source: 'expression' | 'model' | 'unknown';
  readonly state: 'ready' | 'pending' | 'missing';
  readonly value: string;
  readonly uri: string;
  readonly start: number;
  readonly end: number;
  readonly children?: readonly IRsxExpressionTesterDependencyStatus[];
}

interface IRsxExpressionTesterModelFieldLink {
  readonly key: string;
  readonly label: string;
  readonly path: readonly string[];
  readonly uri: string;
  readonly start: number;
  readonly end: number;
  readonly argumentDependencies: readonly IRsxExpressionTesterDependencyReference[];
}

interface IRsxExpressionTesterDependencyReference {
  readonly key: string;
  readonly label: string;
  readonly exportName: string;
  readonly source: 'expression' | 'model';
  readonly path?: readonly string[];
  readonly uri: string;
  readonly start: number;
  readonly end: number;
}

interface IRsxExpressionTesterLiveRun {
  onValue(callback: (value: IRsxExpressionTesterValue) => void): void;
  dispose(): void;
}

interface IRsxExpressionTesterTemplateRequirements {
  readonly arrayLengths: ReadonlyMap<string, number>;
  readonly mapKeys: ReadonlyMap<string, ReadonlySet<string>>;
}

interface IRsxExpressionTesterExpressionReferenceRuntime {
  readonly factoryName: string;
  readonly expressionText: string;
  readonly returnTypeText?: string;
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
const RSX_EXPRESSION_TESTER_DOCUMENT_SUFFIX = '.rsx-model.ts';
const RSX_EXPRESSION_TESTER_RESULTS_MARKER = '/* RS-X Expression Values';
const RSX_EXPRESSION_TESTER_RESULTS_END = '*/';
const RSX_EXPRESSION_TESTER_PENDING_VALUE = 'Waiting for value...';
const rsxExpressionTreePreviewParser = new JsEspreeExpressionParser(
  new JsExpressionAstParser(),
);

const expressionTesterSessions = new Map<
  string,
  {
    readonly data: IRsxExpressionTesterData;
    readonly previousValues: Map<string, string>;
    readonly liveValues: Map<string, string>;
    latestModel?: object;
    liveRun?: IRsxExpressionTesterLiveRun;
    reportPanel?: vscode.WebviewPanel;
    treePanels?: Map<string, vscode.WebviewPanel>;
  }
>();
const rsxManagedEditorGroupColumns = new Set<number>();
let rsxEditorOpenInProgressUntil = 0;
let rsxRevealDecorationType: vscode.TextEditorDecorationType | null = null;

type IDiagnosticsMode = 'auto' | 'focused' | 'full';

function createRsxTreeIcon(id: string, colorId: string): vscode.ThemeIcon {
  return new vscode.ThemeIcon(id, new vscode.ThemeColor(colorId));
}

function registerRsxEditorGroupCleanup(context: vscode.ExtensionContext): void {
  const tabGroups = (
    vscode.window as typeof vscode.window & {
      readonly tabGroups?: vscode.TabGroups;
    }
  ).tabGroups;
  if (!tabGroups) {
    return;
  }

  context.subscriptions.push(
    tabGroups.onDidChangeTabs((event) => {
      if (Date.now() < rsxEditorOpenInProgressUntil) {
        return;
      }
      const candidateGroups = event.closed
        .filter(shouldCheckRsxManagedGroupAfterTabClose)
        .map((tab) => tab.group);
      if (candidateGroups.length === 0) {
        return;
      }
      scheduleCloseRsxEmptyEditorGroups(candidateGroups);
    }),
  );
}

function shouldCheckRsxManagedGroupAfterTabClose(tab: vscode.Tab): boolean {
  if (rsxManagedEditorGroupColumns.has(tab.group.viewColumn)) {
    return true;
  }
  return isRsxManagedTab(tab);
}

function rememberRsxEditorGroupColumn(
  column: vscode.ViewColumn | undefined,
): void {
  if (typeof column === 'number' && column > 0) {
    rsxManagedEditorGroupColumns.add(column);
  }
}

function scheduleCloseRsxEmptyEditorGroups(
  candidateGroups: readonly vscode.TabGroup[] = [],
  options: { readonly includeUnmanagedEmptyGroups?: boolean } = {},
): void {
  for (const delay of [0, 50, 250]) {
    setTimeout(() => {
      void closeRsxEmptyEditorGroups(candidateGroups, options);
    }, delay);
  }
}

async function closeRsxEmptyEditorGroups(
  candidateGroups: readonly vscode.TabGroup[] = [],
  options: { readonly includeUnmanagedEmptyGroups?: boolean } = {},
): Promise<void> {
  const tabGroups = (
    vscode.window as typeof vscode.window & {
      readonly tabGroups?: vscode.TabGroups;
    }
  ).tabGroups;
  if (
    !tabGroups ||
    (!options.includeUnmanagedEmptyGroups &&
      rsxManagedEditorGroupColumns.size === 0)
  ) {
    return;
  }

  const emptyGroups = dedupeRsxTabGroups([
    ...candidateGroups,
    ...tabGroups.all,
  ]).filter(
    (group) =>
      group.tabs.length === 0 &&
      (options.includeUnmanagedEmptyGroups ||
        rsxManagedEditorGroupColumns.has(group.viewColumn)),
  );
  if (emptyGroups.length === 0) {
    return;
  }
  const closed = await tabGroups.close(emptyGroups, true);
  if (!closed) {
    return;
  }
  for (const group of emptyGroups) {
    rsxManagedEditorGroupColumns.delete(group.viewColumn);
  }
}

function dedupeRsxTabGroups(
  groups: readonly vscode.TabGroup[],
): vscode.TabGroup[] {
  const seen = new Set<string>();
  const unique: vscode.TabGroup[] = [];
  for (const group of groups) {
    const key = String(group.viewColumn);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(group);
  }
  return unique;
}

function isRsxManagedTab(tab: vscode.Tab): boolean {
  if (
    tab.input instanceof vscode.TabInputWebview &&
    (tab.input.viewType === 'rsx.expressionGraphPreview' ||
      tab.input.viewType === 'rsx.expressionTesterReport')
  ) {
    rememberRsxEditorGroupColumn(tab.group.viewColumn);
    return true;
  }

  if (
    tab.input instanceof vscode.TabInputText &&
    (tab.input.uri.fsPath.endsWith('.rsx') ||
      tab.input.uri.fsPath.endsWith(RSX_EXPRESSION_TESTER_DOCUMENT_SUFFIX))
  ) {
    rememberRsxEditorGroupColumn(tab.group.viewColumn);
    return true;
  }

  return false;
}

export function activate(context: vscode.ExtensionContext): void {
  const diagnostics = vscode.languages.createDiagnosticCollection('rsx');
  context.subscriptions.push(diagnostics);
  registerRsxEditorGroupCleanup(context);
  const expressionsProvider = new RsxExpressionsTreeDataProvider();
  const expressionsSearchViewProvider = new RsxExpressionSearchViewProvider(
    expressionsProvider,
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'rsx.expressions',
      expressionsSearchViewProvider,
      { webviewOptions: { retainContextWhenHidden: false } },
    ),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('rsx.expressions.add', async () => {
      await addRsxExpressionFromPanel(expressionsProvider);
    }),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('rsx.expressions.refresh', () => {
      expressionsProvider.refresh();
    }),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('rsx.expressions.search', async () => {
      await vscode.commands.executeCommand('workbench.view.extension.rsx');
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
      'rsx.expressions.panel.preview',
      async () => {
        await expressionsSearchViewProvider.previewSelected();
      },
    ),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rsx.expressions.test',
      async (
        item?:
          | IRsxExpressionTreeExpression
          | IRsxExpressionTreeModel
          | IRsxExpressionTreeModelField
          | IRsxExpressionTreeModelFieldExpressionUse,
      ) => {
        await openRsxExpressionTester(expressionsProvider, item);
      },
    ),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('rsx.expressions.panel.test', async () => {
      await expressionsSearchViewProvider.testSelected();
    }),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rsx.expressions.panel.enableDebugHooks',
      async () => {
        await expressionsSearchViewProvider.enableDebugHooksSelected();
      },
    ),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rsx.expressions.test.run',
      async (...args: unknown[]) => {
        const uri = getRsxExpressionTesterCommandUri(args);
        await runRsxExpressionTesterDocument(expressionsProvider, uri);
      },
    ),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rsx.expressions.test.load',
      async (...args: unknown[]) => {
        const uri = getRsxExpressionTesterCommandUri(args);
        await loadRsxExpressionTesterModelDocument(uri);
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
          | IRsxExpressionTreeModelFieldExpressionUse
          | IRsxExpressionTreeSearchResult,
      ) => {
        if (
          item?.kind === 'expression' ||
          item?.kind === 'model' ||
          item?.kind === 'modelField' ||
          item?.kind === 'modelFieldExpression' ||
          item?.kind === 'searchResult'
        ) {
          await openRsxExpressionTreeItem(item);
        }
      },
    ),
  );
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      [
        { language: 'typescript', scheme: 'file' },
        { language: 'typescript', scheme: 'untitled' },
      ],
      new RsxExpressionTesterCodeLensProvider(),
    ),
  );
  const expressionsWatcher =
    vscode.workspace.createFileSystemWatcher('**/*.rsx');
  const expressionInstancesWatcher = vscode.workspace.createFileSystemWatcher(
    '**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}',
  );
  const rsxConfigWatcher =
    vscode.workspace.createFileSystemWatcher('**/rsx.config.json');
  context.subscriptions.push(expressionsWatcher);
  context.subscriptions.push(expressionInstancesWatcher, rsxConfigWatcher);
  context.subscriptions.push(
    expressionsWatcher.onDidCreate(() => expressionsProvider.refresh()),
    expressionsWatcher.onDidChange(() => expressionsProvider.refresh()),
    expressionsWatcher.onDidDelete(() => expressionsProvider.refresh()),
    expressionInstancesWatcher.onDidCreate(() => expressionsProvider.refresh()),
    expressionInstancesWatcher.onDidChange(() => expressionsProvider.refresh()),
    expressionInstancesWatcher.onDidDelete(() => expressionsProvider.refresh()),
    rsxConfigWatcher.onDidCreate(() => expressionsProvider.refresh()),
    rsxConfigWatcher.onDidChange(() => expressionsProvider.refresh()),
    rsxConfigWatcher.onDidDelete(() => expressionsProvider.refresh()),
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
  private expressionInstanceGroups:
    | IRsxExpressionTreeExpressionInstanceGroup[]
    | null = null;
  private lastNonEmptyFiles: readonly IRsxExpressionTreeFile[] = [];
  private allowEmptyRsxScanFallback = true;
  private emptyRsxScanRetryTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly expressionsByKey = new Map<
    string,
    IRsxExpressionTreeExpression
  >();
  private searchQuery = '';

  public refresh(): void {
    this.files = null;
    this.expressionInstanceGroups = null;
    this.expressionsByKey.clear();
    this.onDidChangeTreeDataEmitter.fire();
  }

  public setSearchQuery(query: string): void {
    this.searchQuery = query.trim();
    this.onDidChangeTreeDataEmitter.fire();
  }

  public getSearchQuery(): string {
    return this.searchQuery;
  }

  public getTreeItem(
    element: IRsxExpressionTreeItem,
  ): vscode.TreeItem | Thenable<vscode.TreeItem> {
    if (element.kind === 'searchResult') {
      return this.getSearchResultTreeItem(element);
    }

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
      item.iconPath = createRsxTreeIcon(
        element.section === 'expressions' ? 'symbol-namespace' : 'database',
        element.section === 'expressions' ? 'charts.blue' : 'charts.purple',
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
      item.iconPath = createRsxTreeIcon('file-code', 'descriptionForeground');
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
      item.iconPath = createRsxTreeIcon('symbol-function', 'charts.green');
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
      item.iconPath = createRsxTreeIcon(
        'symbol-interface',
        'descriptionForeground',
      );
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
      item.iconPath = createRsxTreeIcon(
        element.children.length > 0 ? 'symbol-property' : 'symbol-field',
        element.expressionUses.length > 0 ? 'charts.orange' : 'charts.yellow',
      );
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
      item.iconPath = createRsxTreeIcon('symbol-function', 'charts.green');
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
      element.edge.matchKind === 'modelFieldExpressionType' ||
      element.edge.matchKind === 'exportValueName'
        ? `via ${element.edge.identifier}`
        : undefined,
      isCycle ? 'cycle' : undefined,
    ]
      .filter(Boolean)
      .join(' · ');
    item.resourceUri = element.edge.targetUri;
    item.contextValue = 'rsxExpressionDependency';
    item.iconPath = createRsxTreeIcon(
      isCycle ? 'debug-restart' : 'references',
      isCycle ? 'charts.red' : 'charts.blue',
    );
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

  private getSearchResultTreeItem(
    element: IRsxExpressionTreeSearchResult,
  ): vscode.TreeItem {
    const target = element.target;
    if (target.kind === 'expression') {
      const item = new vscode.TreeItem(
        target.exportName,
        vscode.TreeItemCollapsibleState.None,
      );
      item.description = [
        'expression',
        target.expression.returnTypeText,
        target.relativePath,
      ]
        .filter(Boolean)
        .join(' · ');
      item.resourceUri = target.uri;
      item.contextValue = 'rsxExpression';
      item.iconPath = createRsxTreeIcon('symbol-function', 'charts.green');
      item.command = {
        command: 'rsx.expressions.open',
        title: 'Open RS-X Expression',
        arguments: [element],
      };
      item.tooltip = new vscode.MarkdownString(
        [
          `**${target.exportName}**`,
          '',
          target.expression.returnTypeText
            ? `return: \`${target.expression.returnTypeText}\``
            : '',
          `file: \`${target.relativePath}\``,
        ]
          .filter(Boolean)
          .join('\n'),
      );
      return item;
    }

    if (target.kind === 'model') {
      const item = new vscode.TreeItem(
        target.label,
        vscode.TreeItemCollapsibleState.None,
      );
      item.description = [
        'model',
        formatFieldCount(target.fields.length),
        formatExpressionCount(target.expressions.length),
        target.relativePath,
      ].join(' · ');
      item.resourceUri = target.uri;
      item.contextValue = 'rsxExpressionModel';
      item.iconPath = createRsxTreeIcon(
        'symbol-interface',
        'descriptionForeground',
      );
      item.command = {
        command: 'rsx.expressions.open',
        title: 'Open RS-X Model',
        arguments: [element],
      };
      item.tooltip = new vscode.MarkdownString(
        ['**Model**', '', '```ts', target.modelTypeText, '```'].join('\n'),
      );
      return item;
    }

    if (target.kind === 'expressionInstance') {
      const item = new vscode.TreeItem(
        `${target.expression.exportName} instance`,
        vscode.TreeItemCollapsibleState.None,
      );
      item.description = [
        'instance',
        target.debugHook ? `hook: ${target.debugHook.label}` : undefined,
        `${target.relativePath}:${target.line + 1}`,
      ]
        .filter(Boolean)
        .join(' · ');
      item.resourceUri = target.uri;
      item.contextValue = 'rsxExpressionInstance';
      item.iconPath = createRsxTreeIcon(
        target.debugHook ? 'debug-alt' : 'circle-outline',
        target.debugHook ? 'charts.orange' : 'charts.blue',
      );
      item.command = {
        command: 'rsx.expressions.open',
        title: 'Open RS-X Expression Instance',
        arguments: [element],
      };
      item.tooltip = new vscode.MarkdownString(
        [
          `**${target.expression.exportName} instance**`,
          '',
          target.debugHook ? `hook: \`${target.debugHook.label}\`` : '',
          `file: \`${target.relativePath}:${target.line + 1}:${target.column + 1}\``,
        ]
          .filter(Boolean)
          .join('\n'),
      );
      return item;
    }

    const item = new vscode.TreeItem(
      target.path.join('.'),
      vscode.TreeItemCollapsibleState.None,
    );
    item.description = ['field', target.typeText].filter(Boolean).join(' · ');
    item.resourceUri = target.uri;
    item.contextValue = 'rsxModelField';
    item.iconPath = createRsxTreeIcon(
      target.children.length > 0 ? 'symbol-property' : 'symbol-field',
      target.expressionUses.length > 0 ? 'charts.orange' : 'charts.yellow',
    );
    item.command = {
      command: 'rsx.expressions.open',
      title: 'Open RS-X Model Field',
      arguments: [element],
    };
    item.tooltip = new vscode.MarkdownString(
      target.typeText
        ? [
            `**${target.path.join('.')}**`,
            '',
            '```ts',
            target.typeText,
            '```',
          ].join('\n')
        : `**${target.path.join('.')}**`,
    );
    return item;
  }

  public async getChildren(
    element?: IRsxExpressionTreeItem,
  ): Promise<IRsxExpressionTreeItem[]> {
    if (element?.kind === 'searchResult') {
      return [];
    }

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
    if (this.searchQuery) {
      return getRsxExpressionTreeSearchResults(
        files,
        models,
        await this.getExpressionInstanceGroups(files),
        this.searchQuery,
      );
    }
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

  public async getTesterData(
    item?:
      | IRsxExpressionTreeExpression
      | IRsxExpressionTreeModel
      | IRsxExpressionTreeModelField
      | IRsxExpressionTreeModelFieldExpressionUse,
  ): Promise<IRsxExpressionTesterData | null> {
    const files = await this.getFiles();
    return createRsxExpressionTesterData(files, item);
  }

  public async getExpressionByKey(
    key: string,
  ): Promise<IRsxExpressionTreeExpression | undefined> {
    await this.getFiles();
    return this.expressionsByKey.get(key);
  }

  public async getPanelActionTarget(
    key: string,
  ): Promise<
    | IRsxExpressionTreeExpression
    | IRsxExpressionTreeModel
    | IRsxExpressionTreeModelField
    | IRsxExpressionTreeModelFieldExpressionUse
    | undefined
  > {
    const files = await this.getFiles();
    return findRsxExpressionPanelActionTarget(
      files,
      getUniqueRsxExpressionModels(files),
      key,
    );
  }

  public async getPanelActionUri(key: string): Promise<vscode.Uri | undefined> {
    const files = await this.getFiles();
    return findRsxExpressionPanelActionUri(
      files,
      getUniqueRsxExpressionModels(files),
      await this.getExpressionInstanceGroups(files),
      key,
    );
  }

  public async getPanelActionExpressionName(
    key: string,
  ): Promise<string | undefined> {
    const files = await this.getFiles();
    return findRsxExpressionPanelActionExpressionName(
      files,
      getUniqueRsxExpressionModels(files),
      await this.getExpressionInstanceGroups(files),
      key,
    );
  }

  public async getPanelActionDebugHookTarget(
    key: string,
  ): Promise<IRsxDebugHookPanelTarget | undefined> {
    const files = await this.getFiles();
    return findRsxExpressionPanelActionDebugHookTarget(
      files,
      getUniqueRsxExpressionModels(files),
      await this.getExpressionInstanceGroups(files),
      key,
    );
  }

  public async search(
    query: string,
  ): Promise<IRsxExpressionTreeSearchResult[]> {
    const files = await this.getFiles();
    return getRsxExpressionTreeSearchResults(
      files,
      getUniqueRsxExpressionModels(files),
      await this.getExpressionInstanceGroups(files),
      query,
    );
  }

  public async getPanelTree(): Promise<IRsxExpressionPanelTreeNode[]> {
    const files = await this.getFiles();
    return createRsxExpressionPanelTreeNodes(
      files,
      getUniqueRsxExpressionModels(files),
      await this.getExpressionInstanceGroups(files),
    );
  }

  private async getExpressionInstanceGroups(
    files: readonly IRsxExpressionTreeFile[],
  ): Promise<IRsxExpressionTreeExpressionInstanceGroup[]> {
    if (this.expressionInstanceGroups) {
      return this.expressionInstanceGroups;
    }
    this.expressionInstanceGroups =
      await readRsxExpressionInstanceGroups(files);
    return this.expressionInstanceGroups;
  }

  private async getFiles(): Promise<IRsxExpressionTreeFile[]> {
    if (this.files) {
      return this.files;
    }

    let uris: readonly vscode.Uri[];
    try {
      uris = await vscode.workspace.findFiles(
        '**/*.rsx',
        '**/{node_modules,dist,out-tsc,coverage,.git}/**',
      );
    } catch {
      uris = [];
    }
    if (
      uris.length === 0 &&
      this.lastNonEmptyFiles.length > 0 &&
      this.allowEmptyRsxScanFallback
    ) {
      this.allowEmptyRsxScanFallback = false;
      this.scheduleEmptyRsxScanRetry();
      this.files = [...this.lastNonEmptyFiles];
      this.rebuildExpressionIndex(this.files);
      return this.files;
    }

    const files = await Promise.all(
      uris.map((uri) => readRsxExpressionTreeFile(uri)),
    );

    this.files = attachRsxExpressionDependencies(
      files.filter((file): file is IRsxExpressionTreeFile => file !== null),
    ).sort((left, right) =>
      left.relativePath.localeCompare(right.relativePath),
    );
    if (this.files.length > 0) {
      this.lastNonEmptyFiles = this.files;
      this.allowEmptyRsxScanFallback = true;
    }
    this.rebuildExpressionIndex(this.files);

    return this.files;
  }

  private rebuildExpressionIndex(
    files: readonly IRsxExpressionTreeFile[],
  ): void {
    this.expressionsByKey.clear();
    for (const file of files) {
      for (const expression of file.expressions) {
        this.expressionsByKey.set(expression.key, expression);
      }
    }
  }

  private scheduleEmptyRsxScanRetry(): void {
    if (this.emptyRsxScanRetryTimer) {
      return;
    }
    this.emptyRsxScanRetryTimer = setTimeout(() => {
      this.emptyRsxScanRetryTimer = undefined;
      this.files = null;
      this.expressionInstanceGroups = null;
      this.onDidChangeTreeDataEmitter.fire();
    }, 350);
    this.emptyRsxScanRetryTimer.unref?.();
  }
}

async function openRsxExpressionGraphPreview(
  provider: RsxExpressionsTreeDataProvider,
  item?: IRsxExpressionTreeItem,
  options?: {
    readonly model?: object;
  },
): Promise<vscode.WebviewPanel> {
  const data = await getRsxExpressionGraphPreviewDataWithValues(
    await provider.getPreviewData(item),
    options?.model,
  );
  const panel = vscode.window.createWebviewPanel(
    'rsx.expressionGraphPreview',
    data.title,
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    },
  );
  rememberRsxEditorGroupColumn(panel.viewColumn);

  panel.webview.html = getRsxExpressionGraphPreviewHtml(data);
  const panelDisposables: vscode.Disposable[] = [];
  panel.onDidChangeViewState(
    (event) => {
      rememberRsxEditorGroupColumn(event.webviewPanel.viewColumn);
    },
    undefined,
    panelDisposables,
  );
  panel.onDidDispose(() => {
    for (const disposable of panelDisposables) {
      disposable.dispose();
    }
    scheduleCloseRsxEmptyEditorGroups();
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
  return panel;
}

class RsxExpressionSearchViewProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | null = null;
  private searchRequestId = 0;
  private selectedActionKey: string | null = null;
  private currentQuery = '';

  public constructor(
    private readonly provider: RsxExpressionsTreeDataProvider,
  ) {}

  public resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = {
      enableScripts: true,
    };
    view.webview.html = getRsxExpressionSearchViewHtml();
    const disposables: vscode.Disposable[] = [];
    view.onDidDispose(
      () => {
        for (const disposable of disposables) {
          disposable.dispose();
        }
        if (this.view === view) {
          this.view = null;
        }
      },
      undefined,
      disposables,
    );
    this.provider.onDidChangeTreeData(
      () => {
        void this.updateSearchResults(this.currentQuery);
      },
      undefined,
      disposables,
    );
    view.webview.onDidReceiveMessage(
      async (message: {
        type?: string;
        query?: string;
        key?: string;
        uri?: string;
        start?: number;
        end?: number;
      }) => {
        if (message?.type === 'select' && typeof message.key === 'string') {
          this.selectedActionKey = message.key;
          return;
        }
        if (message?.type === 'search' && typeof message.query === 'string') {
          await this.updateSearchResults(message.query);
          return;
        }
        if (message?.type === 'enableDebugHooks') {
          await this.enableDebugHooksSelected(
            typeof message.key === 'string' ? message.key : undefined,
            typeof message.uri === 'string'
              ? vscode.Uri.parse(message.uri)
              : undefined,
          );
          return;
        }
        if (message?.type === 'enableConfiguredDebugHooks') {
          await this.setDebugHooksEnabledSelected(
            true,
            typeof message.key === 'string' ? message.key : undefined,
            typeof message.uri === 'string'
              ? vscode.Uri.parse(message.uri)
              : undefined,
          );
          return;
        }
        if (message?.type === 'disableDebugHooks') {
          await this.setDebugHooksEnabledSelected(
            false,
            typeof message.key === 'string' ? message.key : undefined,
            typeof message.uri === 'string'
              ? vscode.Uri.parse(message.uri)
              : undefined,
          );
          return;
        }
        if (message?.type === 'deleteDebugHooks') {
          await this.deleteDebugHooksSelected(
            typeof message.key === 'string' ? message.key : undefined,
            typeof message.uri === 'string'
              ? vscode.Uri.parse(message.uri)
              : undefined,
          );
          return;
        }
        if (
          (message?.type === 'preview' || message?.type === 'test') &&
          typeof message.key === 'string'
        ) {
          const target = await this.provider.getPanelActionTarget(message.key);
          if (!target) {
            return;
          }
          if (message.type === 'preview') {
            await openRsxExpressionGraphPreview(this.provider, target);
            return;
          }
          await openRsxExpressionTester(this.provider, target);
          return;
        }
        if (
          message?.type === 'open' &&
          typeof message.uri === 'string' &&
          typeof message.start === 'number' &&
          typeof message.end === 'number'
        ) {
          await openRsxExpressionLocation(
            {
              uri: vscode.Uri.parse(message.uri),
              start: message.start,
              end: message.end,
            },
            { viewColumn: vscode.ViewColumn.One },
          );
          scheduleCloseRsxEmptyEditorGroups([], {
            includeUnmanagedEmptyGroups: true,
          });
        }
      },
      undefined,
      disposables,
    );
    void this.updateSearchResults('');
  }

  public async previewSelected(): Promise<void> {
    const target = await this.getSelectedActionTarget();
    if (target) {
      await openRsxExpressionGraphPreview(this.provider, target);
    }
  }

  public async testSelected(): Promise<void> {
    const target = await this.getSelectedActionTarget();
    if (target) {
      await openRsxExpressionTester(this.provider, target);
    }
  }

  public async enableDebugHooksSelected(
    key?: string,
    anchorUri?: vscode.Uri,
  ): Promise<void> {
    const targetKey = key ?? this.selectedActionKey ?? undefined;
    await enableRsxDebugChangeHooksForWorkspace(
      anchorUri ?? (await this.getSelectedActionUri()),
      targetKey
        ? await this.provider.getPanelActionDebugHookTarget(targetKey)
        : undefined,
    );
    this.provider.refresh();
  }

  public async setDebugHooksEnabledSelected(
    enabled: boolean,
    key?: string,
    anchorUri?: vscode.Uri,
  ): Promise<void> {
    const targetKey = key ?? this.selectedActionKey ?? undefined;
    await setRsxDebugChangeHooksEnabledForWorkspace(
      anchorUri ?? (await this.getSelectedActionUri()),
      targetKey
        ? await this.provider.getPanelActionDebugHookTarget(targetKey)
        : undefined,
      enabled,
    );
    this.provider.refresh();
  }

  public async deleteDebugHooksSelected(
    key?: string,
    anchorUri?: vscode.Uri,
  ): Promise<void> {
    const targetKey = key ?? this.selectedActionKey ?? undefined;
    await deleteRsxDebugChangeHooksForWorkspace(
      anchorUri ?? (await this.getSelectedActionUri()),
      targetKey
        ? await this.provider.getPanelActionDebugHookTarget(targetKey)
        : undefined,
    );
    this.provider.refresh();
  }

  private async getSelectedActionTarget(): Promise<
    | IRsxExpressionTreeExpression
    | IRsxExpressionTreeModel
    | IRsxExpressionTreeModelField
    | IRsxExpressionTreeModelFieldExpressionUse
    | undefined
  > {
    return this.selectedActionKey
      ? this.provider.getPanelActionTarget(this.selectedActionKey)
      : undefined;
  }

  private async getSelectedActionUri(): Promise<vscode.Uri | undefined> {
    return this.selectedActionKey
      ? this.provider.getPanelActionUri(this.selectedActionKey)
      : undefined;
  }

  private async updateSearchResults(query: string): Promise<void> {
    const requestId = ++this.searchRequestId;
    const trimmedQuery = query.trim();
    this.currentQuery = query;
    const results = trimmedQuery ? await this.provider.search(query) : [];
    const tree = trimmedQuery ? [] : await this.provider.getPanelTree();
    if (requestId !== this.searchRequestId) {
      return;
    }
    await this.view?.webview.postMessage({
      type: 'results',
      query,
      mode: trimmedQuery ? 'search' : 'tree',
      tree,
      results: results.map(createRsxExpressionSearchViewResult),
    });
  }
}

function createRsxExpressionSearchViewResult(
  result: IRsxExpressionTreeSearchResult,
): {
  readonly key: string;
  readonly label: string;
  readonly kind: string;
  readonly description: string;
  readonly badge?: string;
  readonly badgeTitle?: string;
  readonly hookState?: 'enabled' | 'disabled';
  readonly uri: string;
  readonly start: number;
  readonly end: number;
} {
  const target = result.target;
  if (target.kind === 'expression') {
    return {
      key: getRsxExpressionTreeSearchResultKey(result),
      label: target.exportName,
      kind: 'expression',
      description: [target.expression.returnTypeText, target.relativePath]
        .filter(Boolean)
        .join(' · '),
      uri: result.matchUri.toString(),
      start: result.matchStart,
      end: result.matchEnd,
    };
  }
  if (target.kind === 'model') {
    return {
      key: getRsxExpressionTreeSearchResultKey(result),
      label: target.label,
      kind: 'model',
      description: [
        formatFieldCount(target.fields.length),
        formatExpressionCount(target.expressions.length),
        target.relativePath,
      ].join(' · '),
      uri: result.matchUri.toString(),
      start: result.matchStart,
      end: result.matchEnd,
    };
  }
  if (target.kind === 'expressionInstance') {
    return {
      key: getRsxExpressionTreeSearchResultKey(result),
      label: `${target.expression.exportName} instance`,
      kind: 'instance',
      description: [
        target.debugHook
          ? `${target.debugHook.enabled ? 'hook' : 'hook disabled'}: ${target.debugHook.label}`
          : undefined,
        `${target.relativePath}:${target.line + 1}`,
      ]
        .filter(Boolean)
        .join(' · '),
      badge: target.debugHook
        ? target.debugHook.enabled
          ? 'HOOK'
          : 'OFF'
        : undefined,
      badgeTitle: target.debugHook
        ? `RS-X debug hook${target.debugHook.enabled ? '' : ' disabled'}: ${target.debugHook.label}`
        : undefined,
      hookState: target.debugHook
        ? target.debugHook.enabled
          ? 'enabled'
          : 'disabled'
        : undefined,
      uri: result.matchUri.toString(),
      start: result.matchStart,
      end: result.matchEnd,
    };
  }
  return {
    key: getRsxExpressionTreeSearchResultKey(result),
    label: target.path.join('.'),
    kind: 'field',
    description: target.typeText ?? '',
    uri: result.matchUri.toString(),
    start: result.matchStart,
    end: result.matchEnd,
  };
}

function getRsxExpressionTreeSearchResultKey(
  result: IRsxExpressionTreeSearchResult,
): string {
  return `${result.target.kind}:${result.target.key}`;
}

function createRsxExpressionPanelTreeNodes(
  files: readonly IRsxExpressionTreeFile[],
  models: readonly IRsxExpressionTreeModel[],
  instanceGroups: readonly IRsxExpressionTreeExpressionInstanceGroup[] = [],
): IRsxExpressionPanelTreeNode[] {
  return [
    {
      key: 'root:expressions',
      label: 'Expressions',
      kind: 'section',
      description: formatExpressionCount(
        files.reduce((count, file) => count + file.expressions.length, 0),
      ),
      children: files.map(createRsxExpressionPanelFileNode),
    },
    {
      key: 'root:models',
      label: 'Models',
      kind: 'section',
      description: formatModelCount(models.length),
      children: models.map(createRsxExpressionPanelModelNode),
    },
    {
      key: 'root:instances',
      label: 'Expression instances',
      kind: 'section',
      description: formatInstanceCount(
        instanceGroups.reduce(
          (count, group) => count + group.instances.length,
          0,
        ),
      ),
      children: instanceGroups.map(createRsxExpressionPanelInstanceGroupNode),
    },
  ];
}

function createRsxExpressionPanelInstanceGroupNode(
  group: IRsxExpressionTreeExpressionInstanceGroup,
): IRsxExpressionPanelTreeNode {
  const hookedCount = group.instances.filter(
    (instance) => instance.debugHook?.enabled,
  ).length;
  const firstDebugHook = group.instances.find(
    (instance) => instance.debugHook,
  )?.debugHook;
  return {
    key: `instanceGroup:${group.expression.key}`,
    label: group.expression.exportName,
    kind: 'instanceGroup',
    description: formatInstanceCount(group.instances.length),
    badge: firstDebugHook
      ? firstDebugHook.enabled
        ? 'HOOK'
        : 'OFF'
      : undefined,
    badgeTitle: firstDebugHook
      ? `${firstDebugHook.enabled ? hookedCount : 0} hooked: ${firstDebugHook.label}${firstDebugHook.enabled ? '' : ' (disabled)'}`
      : undefined,
    hookState: firstDebugHook
      ? firstDebugHook.enabled
        ? 'enabled'
        : 'disabled'
      : undefined,
    uri: group.expression.uri.toString(),
    start: group.expression.start,
    end: group.expression.end,
    children: group.instances.map(createRsxExpressionPanelInstanceNode),
  };
}

function createRsxExpressionPanelInstanceNode(
  instance: IRsxExpressionTreeExpressionInstance,
): IRsxExpressionPanelTreeNode {
  return {
    key: `instance:${instance.key}`,
    label: `${path.basename(instance.relativePath)}:${instance.line + 1}`,
    kind: 'instance',
    description: [
      instance.debugHook
        ? `${instance.debugHook.enabled ? 'hook' : 'hook disabled'}: ${instance.debugHook.label}`
        : undefined,
      instance.relativePath,
    ]
      .filter(Boolean)
      .join(' · '),
    badge: instance.debugHook
      ? instance.debugHook.enabled
        ? 'HOOK'
        : 'OFF'
      : undefined,
    badgeTitle: instance.debugHook
      ? `RS-X debug hook${instance.debugHook.enabled ? '' : ' disabled'}: ${instance.debugHook.label}`
      : undefined,
    hookState: instance.debugHook
      ? instance.debugHook.enabled
        ? 'enabled'
        : 'disabled'
      : undefined,
    uri: instance.uri.toString(),
    start: instance.start,
    end: instance.end,
  };
}

function createRsxExpressionPanelFileNode(
  file: IRsxExpressionTreeFile,
): IRsxExpressionPanelTreeNode {
  return {
    key: `file:${file.uri.toString()}`,
    label: file.label,
    kind: 'file',
    description: formatExpressionCount(file.expressions.length),
    children: file.expressions.map(createRsxExpressionPanelExpressionNode),
  };
}

function createRsxExpressionPanelExpressionNode(
  expression: IRsxExpressionTreeExpression,
): IRsxExpressionPanelTreeNode {
  return {
    key: `expression:${expression.key}`,
    label: expression.exportName,
    kind: 'expression',
    description: [
      expression.expression.returnTypeText,
      expression.dependencies.length > 0
        ? formatDependencyCount(expression.dependencies.length)
        : undefined,
    ]
      .filter(Boolean)
      .join(' · '),
    uri: expression.uri.toString(),
    start: expression.start,
    end: expression.end,
    children: expression.dependencies.map((dependency) => ({
      key: `dependency:${expression.key}:${dependency.targetKey}`,
      label: dependency.targetExportName,
      kind: 'dependency',
      description:
        dependency.matchKind === 'modelFieldExpressionType' ||
        dependency.matchKind === 'exportValueName'
          ? `via ${dependency.identifier}`
          : undefined,
      uri: dependency.targetUri.toString(),
      start: dependency.targetStart,
      end: dependency.targetEnd,
    })),
  };
}

function createRsxExpressionPanelModelNode(
  model: IRsxExpressionTreeModel,
): IRsxExpressionPanelTreeNode {
  return {
    key: `model:${model.key}`,
    label: model.label,
    kind: 'model',
    description: [
      formatFieldCount(model.fields.length),
      formatExpressionCount(model.expressions.length),
    ].join(' · '),
    uri: model.uri.toString(),
    start: model.start,
    end: model.end,
    children: model.fields.map(createRsxExpressionPanelFieldNode),
  };
}

function createRsxExpressionPanelFieldNode(
  field: IRsxExpressionTreeModelField,
): IRsxExpressionPanelTreeNode {
  return {
    key: `field:${field.key}`,
    label: field.label,
    kind: 'field',
    description: [
      field.typeText,
      field.expressionUses.length > 0
        ? formatExpressionCount(field.expressionUses.length)
        : undefined,
    ]
      .filter(Boolean)
      .join(' · '),
    uri: field.uri.toString(),
    start: field.start,
    end: field.end,
    children: [
      ...field.children.map(createRsxExpressionPanelFieldNode),
      ...field.expressionUses.map((use) => ({
        key: `fieldUse:${use.key}`,
        label: use.expression.exportName,
        kind: 'expression',
        description: use.fieldPath.join('.'),
        uri: use.uri.toString(),
        start: use.start,
        end: use.end,
      })),
    ],
  };
}

function flattenRsxExpressionModelFields(
  fields: readonly IRsxExpressionTreeModelField[],
): IRsxExpressionTreeModelField[] {
  return fields.flatMap((field) => [
    field,
    ...flattenRsxExpressionModelFields(field.children),
  ]);
}

function findRsxExpressionPanelActionTarget(
  files: readonly IRsxExpressionTreeFile[],
  models: readonly IRsxExpressionTreeModel[],
  key: string,
):
  | IRsxExpressionTreeExpression
  | IRsxExpressionTreeModel
  | IRsxExpressionTreeModelField
  | IRsxExpressionTreeModelFieldExpressionUse
  | undefined {
  if (key.startsWith('expression:')) {
    const expressionKey = key.slice('expression:'.length);
    return files
      .flatMap((file) => file.expressions)
      .find((expression) => expression.key === expressionKey);
  }
  if (key.startsWith('model:')) {
    const modelKey = key.slice('model:'.length);
    return models.find((model) => model.key === modelKey);
  }
  if (key.startsWith('field:')) {
    const fieldKey = key.slice('field:'.length);
    return models
      .flatMap((model) => flattenRsxExpressionModelFields(model.fields))
      .find((field) => field.key === fieldKey);
  }
  if (key.startsWith('fieldUse:')) {
    const useKey = key.slice('fieldUse:'.length);
    return models
      .flatMap((model) => flattenRsxExpressionModelFields(model.fields))
      .flatMap((field) => field.expressionUses)
      .find((use) => use.key === useKey);
  }
  if (key.startsWith('instanceGroup:')) {
    const expressionKey = key.slice('instanceGroup:'.length);
    return files
      .flatMap((file) => file.expressions)
      .find((candidate) => candidate.key === expressionKey);
  }
  return undefined;
}

function findRsxExpressionPanelActionUri(
  files: readonly IRsxExpressionTreeFile[],
  models: readonly IRsxExpressionTreeModel[],
  instanceGroups: readonly IRsxExpressionTreeExpressionInstanceGroup[],
  key: string,
): vscode.Uri | undefined {
  const target = findRsxExpressionPanelActionTarget(files, models, key);
  if (target) {
    return target.uri;
  }
  if (key.startsWith('instanceGroup:')) {
    const expressionKey = key.slice('instanceGroup:'.length);
    return files
      .flatMap((file) => file.expressions)
      .find((expression) => expression.key === expressionKey)?.uri;
  }
  if (key.startsWith('instance:')) {
    const instanceKey = key.slice('instance:'.length);
    return instanceGroups
      .flatMap((group) => group.instances)
      .find((instance) => instance.key === instanceKey)?.uri;
  }
  return undefined;
}

function findRsxExpressionPanelActionExpressionName(
  files: readonly IRsxExpressionTreeFile[],
  models: readonly IRsxExpressionTreeModel[],
  instanceGroups: readonly IRsxExpressionTreeExpressionInstanceGroup[],
  key: string,
): string | undefined {
  const target = findRsxExpressionPanelActionTarget(files, models, key);
  if (target?.kind === 'expression') {
    return target.exportName;
  }
  if (target?.kind === 'modelFieldExpression') {
    return target.expression.exportName;
  }
  if (key.startsWith('instanceGroup:')) {
    const expressionKey = key.slice('instanceGroup:'.length);
    return files
      .flatMap((file) => file.expressions)
      .find((expression) => expression.key === expressionKey)?.exportName;
  }
  if (key.startsWith('instance:')) {
    const instanceKey = key.slice('instance:'.length);
    return instanceGroups
      .flatMap((group) => group.instances)
      .find((instance) => instance.key === instanceKey)?.expression.exportName;
  }
  return undefined;
}

function findRsxExpressionPanelActionDebugHookTarget(
  files: readonly IRsxExpressionTreeFile[],
  models: readonly IRsxExpressionTreeModel[],
  instanceGroups: readonly IRsxExpressionTreeExpressionInstanceGroup[],
  key: string,
): IRsxDebugHookPanelTarget | undefined {
  const expressionName = findRsxExpressionPanelActionExpressionName(
    files,
    models,
    instanceGroups,
    key,
  );
  if (!expressionName) {
    return undefined;
  }
  if (key.startsWith('instance:')) {
    const instanceKey = key.slice('instance:'.length);
    const instance = instanceGroups
      .flatMap((group) => group.instances)
      .find((candidate) => candidate.key === instanceKey);
    return instance
      ? {
          expressionName,
          instanceId: createRsxDebugHookInstanceId({
            relativePath: instance.relativePath,
            start: instance.start,
            expressionName,
          }),
        }
      : { expressionName };
  }
  return { expressionName };
}

function getRsxExpressionSearchViewHtml(): string {
  const nonce = createWebviewNonce();
  return /* html */ `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      color-scheme: light dark;
    }

    body {
      margin: 0;
      padding: 8px;
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    input {
      box-sizing: border-box;
      width: 100%;
      height: 28px;
      border: 1px solid var(--vscode-input-border, transparent);
      padding: 4px 7px;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      outline: none;
    }

    input:focus {
      border-color: var(--vscode-focusBorder);
    }

    .summary {
      margin: 8px 0 6px;
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
    }

    .results {
      display: grid;
      gap: 2px;
    }

    .searchRow {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 22px;
      align-items: stretch;
    }

    button {
      display: grid;
      grid-template-columns: 78px minmax(0, 1fr);
      gap: 7px;
      width: 100%;
      border: 0;
      padding: 5px 4px;
      color: inherit;
      background: transparent;
      text-align: left;
      font: inherit;
      cursor: pointer;
    }

    button:hover,
    button:focus {
      background: var(--vscode-list-hoverBackground);
      outline: none;
    }

    .tree {
      display: grid;
    }

    .treeRoot {
      min-width: 0;
    }

    .treeRoot + .treeRoot {
      margin-top: 4px;
    }

    .treeRoot > .treeNode > .treeRow {
      padding-left: 0;
    }

    .treeNode {
      min-width: 0;
    }

    .treeRow {
      display: grid;
      grid-template-columns: 18px 18px minmax(0, 1fr);
      align-items: center;
      min-height: 22px;
      padding-left: calc(var(--depth, 0) * 14px);
      position: relative;
      color: inherit;
    }

    .treeRow:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .treeNode[data-selected="true"] > .treeRow {
      color: var(--vscode-list-activeSelectionForeground, var(--vscode-foreground));
      background: var(--vscode-list-activeSelectionBackground);
    }

    .treeNode[data-selected="true"] > .treeRow .treeDescription,
    .treeNode[data-selected="true"] > .treeRow .treeToggle,
    .treeNode[data-selected="true"] > .treeRow .treeIcon,
    .treeNode[data-selected="true"] > .treeRow .treeAction {
      color: var(--vscode-list-activeSelectionForeground, var(--vscode-foreground));
    }

    .treeNode[data-selected="true"] > .treeRow .treeActions {
      opacity: 1;
    }

    button[data-selected="true"] {
      color: var(--vscode-list-activeSelectionForeground, var(--vscode-foreground));
      background: var(--vscode-list-activeSelectionBackground);
    }

    button[data-selected="true"] .kind,
    button[data-selected="true"] .description {
      color: var(--vscode-list-activeSelectionForeground, var(--vscode-foreground));
    }

    .treeToggle,
    .treeOpen {
      display: block;
      min-width: 0;
      border: 0;
      padding: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }

    .treeToggle {
      width: 18px;
      height: 22px;
      color: var(--vscode-descriptionForeground);
      text-align: center;
    }

    .treeToggle:hover,
    .treeToggle:focus {
      background: transparent;
      color: var(--vscode-foreground);
    }

    .treeOpen {
      display: flex;
      gap: 6px;
      align-items: center;
      height: 22px;
      min-width: 0;
      text-align: left;
    }

    .treeActions {
      display: flex;
      gap: 1px;
      opacity: 0;
      position: absolute;
      right: 0;
      top: 0;
      background: var(--vscode-sideBar-background, var(--vscode-editor-background));
    }

    .treeRow:hover .treeActions,
    .treeRow:focus-within .treeActions,
    .treeNode[data-selected="true"] > .treeRow .treeActions {
      opacity: 1;
    }

    .treeAction {
      width: 22px;
      height: 22px;
      border: 0;
      padding: 0;
      color: var(--vscode-icon-foreground, var(--vscode-descriptionForeground));
      background: transparent;
      font: inherit;
      line-height: 22px;
      text-align: center;
      cursor: pointer;
    }

    .searchAction {
      display: inline-grid;
      grid-template-columns: 1fr;
      place-items: center;
      width: 22px;
      height: auto;
      min-height: 22px;
      border: 0;
      padding: 0;
      color: var(--vscode-icon-foreground, var(--vscode-descriptionForeground));
      background: transparent;
      cursor: pointer;
    }

    .treeAction svg,
    .searchAction svg {
      width: 16px;
      height: 16px;
      vertical-align: text-bottom;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.35;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .treeAction .fill,
    .searchAction .fill {
      fill: currentColor;
      stroke: none;
    }

    .treeAction:hover,
    .treeAction:focus,
    .searchAction:hover,
    .searchAction:focus {
      background: var(--vscode-toolbar-hoverBackground, var(--vscode-list-hoverBackground));
      outline: none;
    }

    .treeOpen:hover,
    .treeOpen:focus {
      background: transparent;
    }

    .treeIcon {
      color: var(--vscode-descriptionForeground);
      font-size: 13px;
      text-align: center;
    }

    .treeIcon.root-expressions,
    .treeIcon.dependency,
    .treeIcon.root-instances {
      color: var(--vscode-charts-blue, #3794ff);
    }

    .treeIcon.root-models {
      color: var(--vscode-charts-purple, #b180d7);
    }

    .treeIcon.expression,
    .treeIcon.instanceGroup,
    .treeIcon.field-expression {
      color: var(--vscode-charts-green, #89d185);
    }

    .treeIcon.instance {
      color: var(--vscode-charts-blue, #3794ff);
    }

    .treeIcon.field {
      color: var(--vscode-charts-yellow, #cca700);
    }

    .treeIcon.field.with-expression {
      color: var(--vscode-charts-orange, #d18616);
    }

    .treeIcon.file,
    .treeIcon.model {
      color: var(--vscode-descriptionForeground);
    }

    .treeChildren[hidden] {
      display: none;
    }

    .treeNode[data-expanded="false"] > .treeRow .treeToggle {
      transform: rotate(-90deg);
    }

    .treeNode[data-expanded="false"] > .treeChildren {
      display: none;
    }

    .sectionLabel {
      font-weight: 600;
    }

    .kind {
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
      text-transform: uppercase;
    }

    .main {
      display: flex;
      gap: 6px;
      align-items: baseline;
      min-width: 0;
    }

    .treeDescription {
      margin-left: 6px;
    }

    .treeLabel,
    .treeDescription,
    .label,
    .description {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .treeDescription,
    .description {
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
    }

    .hookBadge {
      border: 1px solid var(--vscode-charts-orange, #d18616);
      border-radius: 3px;
      color: var(--vscode-charts-orange, #d18616);
      flex: 0 0 auto;
      font-size: 10px;
      font-weight: 700;
      line-height: 1;
      padding: 2px 4px;
    }
  </style>
</head>
<body>
  <input id="query" type="search" placeholder="Search expressions, models, fields" aria-label="Search RS-X">
  <div id="summary" class="summary">Type to search.</div>
  <div id="results" class="results"></div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const query = document.getElementById('query');
    const summary = document.getElementById('summary');
    const results = document.getElementById('results');
    let currentTree = [];
    let selectedKey = '';
    const expandedKeys = new Set(['root:expressions', 'root:models', 'root:instances']);

    function esc(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    function requestSearch() {
      vscode.postMessage({ type: 'search', query: query.value });
    }

    function selectNode(key) {
      selectedKey = String(key ?? '');
      results.querySelectorAll('[data-selected="true"]').forEach((node) => {
        node.removeAttribute('data-selected');
      });
      if (!selectedKey) {
        return;
      }
      const treeNode = results.querySelector('[data-node-key="' + CSS.escape(selectedKey) + '"]');
      if (treeNode) {
        treeNode.dataset.selected = 'true';
        return;
      }
      const resultButton = results.querySelector('button[data-key="' + CSS.escape(selectedKey) + '"]');
      if (resultButton) {
        resultButton.dataset.selected = 'true';
      }
    }

    function renderResultButton(result) {
      const key = String(result.key ?? '');
      const selected = selectedKey === key ? ' data-selected="true"' : '';
      const button = '<button type="button" data-key="' + esc(key) + '" data-uri="' + esc(result.uri) + '" data-start="' + esc(result.start) + '" data-end="' + esc(result.end) + '" data-vscode-context="' + esc(renderWebviewContext(result.kind)) + '"' + selected + '>' +
          '<span class="kind">' + esc(result.kind) + '</span>' +
          '<span class="main">' +
            '<span class="label">' + esc(result.label) + '</span>' +
            (result.badge ? '<span class="hookBadge" title="' + esc(result.badgeTitle || result.badge) + '">' + esc(result.badge) + '</span>' : '') +
            (result.description ? '<span class="description">' + esc(result.description) + '</span>' : '') +
          '</span>' +
        '</button>';
      if (result.kind !== 'instance') {
        return button;
      }
      return '<div class="searchRow">' + button +
        '<button type="button" class="searchAction" data-action="enableDebugHooks" data-action-key="' + esc(key) + '" data-action-uri="' + esc(result.uri) + '" title="Set RS-X Debug Hook" aria-label="Set RS-X Debug Hook">' + renderDebugActionIcon() + '</button>' +
        (result.hookState === 'enabled' ? '<button type="button" class="searchAction" data-action="disableDebugHooks" data-action-key="' + esc(key) + '" data-action-uri="' + esc(result.uri) + '" title="Disable RS-X Debug Hook" aria-label="Disable RS-X Debug Hook">OFF</button>' : '') +
        (result.hookState === 'disabled' ? '<button type="button" class="searchAction" data-action="enableConfiguredDebugHooks" data-action-key="' + esc(key) + '" data-action-uri="' + esc(result.uri) + '" title="Enable RS-X Debug Hook" aria-label="Enable RS-X Debug Hook">ON</button>' : '') +
        (result.hookState ? '<button type="button" class="searchAction" data-action="deleteDebugHooks" data-action-key="' + esc(key) + '" data-action-uri="' + esc(result.uri) + '" title="Delete RS-X Debug Hook Config" aria-label="Delete RS-X Debug Hook Config">×</button>' : '') +
      '</div>';
    }

    function treeIcon(kind) {
      if (kind === 'section') {
        return '◫';
      }
      if (kind === 'file') {
        return '▤';
      }
      if (kind === 'expression') {
        return 'ƒ';
      }
      if (kind === 'dependency') {
        return '↳';
      }
      if (kind === 'instanceGroup') {
        return 'ƒ';
      }
      if (kind === 'instance') {
        return '○';
      }
      if (kind === 'model') {
        return '{}';
      }
      if (kind === 'field') {
        return '•';
      }
      return '·';
    }

    function treeIconClass(node) {
      const key = String(node.key ?? '');
      if (key === 'root:expressions') {
        return 'root-expressions';
      }
      if (key === 'root:models') {
        return 'root-models';
      }
      if (key === 'root:instances') {
        return 'root-instances';
      }
      if (key.startsWith('fieldUse:')) {
        return 'field-expression';
      }
      if (node.kind === 'field' && Array.isArray(node.children) && node.children.some((child) => child.kind === 'expression')) {
        return 'field with-expression';
      }
      return String(node.kind ?? '');
    }

    function webviewSectionForKind(kind, key = '') {
      if (kind === 'expression' && String(key).startsWith('fieldUse:')) {
        return 'rsxModelFieldExpression';
      }
      if (kind === 'expression') {
        return 'rsxExpression';
      }
      if (kind === 'model') {
        return 'rsxExpressionModel';
      }
      if (kind === 'field') {
        return 'rsxModelField';
      }
      if (kind === 'instance' || kind === 'instanceGroup') {
        return 'rsxExpressionInstance';
      }
      return '';
    }

    function renderWebviewContext(kind, key = '') {
      const webviewSection = webviewSectionForKind(kind, key);
      return webviewSection ? JSON.stringify({
        webviewSection,
        preventDefaultContextMenuItems: true
      }) : '';
    }

    function renderPreviewActionIcon() {
      return '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
        '<path d="M5 2.5h6v4H5z"></path>' +
        '<path d="M8 6.5v2"></path>' +
        '<path d="M3 8.5h10"></path>' +
        '<path d="M3 8.5v2"></path>' +
        '<path d="M13 8.5v2"></path>' +
        '<path d="M1.5 10.5h3v3h-3z"></path>' +
        '<path d="M11.5 10.5h3v3h-3z"></path>' +
      '</svg>';
    }

    function renderTestActionIcon() {
      return '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
        '<path d="M6 2.5h4"></path>' +
        '<path d="M7 2.5v4.2l-3.2 5.6A1.8 1.8 0 0 0 5.4 15h5.2a1.8 1.8 0 0 0 1.6-2.7L9 6.7V2.5"></path>' +
        '<path d="M5.2 10.5h5.6"></path>' +
        '<circle class="fill" cx="7" cy="12.25" r=".55"></circle>' +
        '<circle class="fill" cx="9.4" cy="11.7" r=".45"></circle>' +
      '</svg>';
    }

    function renderDebugActionIcon() {
      return '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
        '<path d="M8 1.8v2"></path>' +
        '<path d="M8 12.2v2"></path>' +
        '<path d="M3.6 3.6l1.4 1.4"></path>' +
        '<path d="M11 11l1.4 1.4"></path>' +
        '<path d="M1.8 8h2"></path>' +
        '<path d="M12.2 8h2"></path>' +
        '<circle cx="8" cy="8" r="3.2"></circle>' +
        '<path d="M6.7 8.1l.8.8 1.9-2"></path>' +
      '</svg>';
    }

    function renderTreeNode(node, depth = 0) {
      const key = String(node.key ?? '');
      const children = Array.isArray(node.children) ? node.children : [];
      const hasLocation = typeof node.uri === 'string' &&
        typeof node.start === 'number' &&
        typeof node.end === 'number';
      const hasChildren = children.length > 0;
      const isExpanded = expandedKeys.has(key);
      const canPreview = node.kind === 'expression' || node.kind === 'instanceGroup';
      const canTest = node.kind === 'expression' || node.kind === 'model' || node.kind === 'field' || node.kind === 'instanceGroup';
      const canDebug = node.kind === 'instance' || node.kind === 'instanceGroup';
      const openAttrs = hasLocation
        ? ' data-key="' + esc(key) + '" data-uri="' + esc(node.uri) + '" data-start="' + esc(node.start) + '" data-end="' + esc(node.end) + '"'
        : ' data-toggle-key="' + esc(key) + '"';
      const context = renderWebviewContext(node.kind, key);
      return '<div class="treeNode" data-node-key="' + esc(key) + '" data-expanded="' + (isExpanded ? 'true' : 'false') + '"' + (context ? ' data-vscode-context="' + esc(context) + '"' : '') + (selectedKey === key ? ' data-selected="true"' : '') + '>' +
        '<div class="treeRow" style="--depth:' + esc(depth) + '">' +
          (hasChildren
            ? '<button type="button" class="treeToggle" aria-label="Toggle ' + esc(node.label) + '" data-toggle-key="' + esc(key) + '">⌄</button>'
            : '<span class="treeToggle" aria-hidden="true"></span>') +
          '<span class="treeIcon ' + esc(treeIconClass(node)) + '" aria-hidden="true">' + esc(treeIcon(node.kind)) + '</span>' +
          '<button type="button" class="treeOpen"' + openAttrs + '>' +
            '<span class="treeLabel ' + (node.kind === 'section' ? 'sectionLabel' : '') + '">' + esc(node.label) + '</span>' +
            (node.badge ? '<span class="hookBadge" title="' + esc(node.badgeTitle || node.badge) + '">' + esc(node.badge) + '</span>' : '') +
            (node.description ? '<span class="treeDescription">' + esc(node.description) + '</span>' : '') +
          '</button>' +
          '<span class="treeActions">' +
            (canPreview ? '<button type="button" class="treeAction" data-action="preview" data-action-key="' + esc(key) + '" title="Open RS-X Expression Tree" aria-label="Open RS-X Expression Tree">' + renderPreviewActionIcon() + '</button>' : '') +
            (canTest ? '<button type="button" class="treeAction" data-action="test" data-action-key="' + esc(key) + '" title="Test RS-X Expression" aria-label="Test RS-X Expression">' + renderTestActionIcon() + '</button>' : '') +
            (canDebug ? '<button type="button" class="treeAction" data-action="enableDebugHooks" data-action-key="' + esc(key) + '"' + (hasLocation ? ' data-action-uri="' + esc(node.uri) + '"' : '') + ' title="Set RS-X Debug Hook" aria-label="Set RS-X Debug Hook">' + renderDebugActionIcon() + '</button>' : '') +
            (canDebug && node.hookState === 'enabled' ? '<button type="button" class="treeAction" data-action="disableDebugHooks" data-action-key="' + esc(key) + '"' + (hasLocation ? ' data-action-uri="' + esc(node.uri) + '"' : '') + ' title="Disable RS-X Debug Hook" aria-label="Disable RS-X Debug Hook">OFF</button>' : '') +
            (canDebug && node.hookState === 'disabled' ? '<button type="button" class="treeAction" data-action="enableConfiguredDebugHooks" data-action-key="' + esc(key) + '"' + (hasLocation ? ' data-action-uri="' + esc(node.uri) + '"' : '') + ' title="Enable RS-X Debug Hook" aria-label="Enable RS-X Debug Hook">ON</button>' : '') +
            (canDebug && node.hookState ? '<button type="button" class="treeAction" data-action="deleteDebugHooks" data-action-key="' + esc(key) + '"' + (hasLocation ? ' data-action-uri="' + esc(node.uri) + '"' : '') + ' title="Delete RS-X Debug Hook Config" aria-label="Delete RS-X Debug Hook Config">×</button>' : '') +
          '</span>' +
        '</div>' +
        (hasChildren && isExpanded
          ? '<div class="treeChildren">' + children.map((child) => renderTreeNode(child, depth + 1)).join('') + '</div>'
          : '') +
      '</div>';
    }

    function renderTree(nodes) {
      return '<div class="tree">' + nodes.map((node) =>
        '<div class="treeRoot" data-root-key="' + esc(node.key) + '">' + renderTreeNode(node, 0) + '</div>'
      ).join('') + '</div>';
    }

    query.addEventListener('input', requestSearch);
    function toggleTreeNode(key) {
      const normalizedKey = String(key ?? '');
      if (!normalizedKey) {
        return;
      }
      if (expandedKeys.has(normalizedKey)) {
        expandedKeys.delete(normalizedKey);
      } else {
        expandedKeys.add(normalizedKey);
      }
      results.innerHTML = renderTree(currentTree);
      selectNode(normalizedKey);
    }

    results.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const action = target?.closest('[data-action-key]');
      if (action) {
        selectNode(action.dataset.actionKey);
        vscode.postMessage({
          type: action.dataset.action,
          key: action.dataset.actionKey,
          uri: action.dataset.actionUri
        });
        return;
      }
      const toggle = target?.closest('[data-toggle-key]');
      const open = target?.closest('button[data-key]');
      if (toggle && (!open || toggle.classList.contains('treeToggle'))) {
        toggleTreeNode(toggle.dataset.toggleKey);
        return;
      }
      const button = open;
      if (!button) {
        return;
      }
      selectNode(button.dataset.key);
      vscode.postMessage({
        type: 'open',
        uri: button.dataset.uri,
        start: Number(button.dataset.start),
        end: Number(button.dataset.end)
      });
    });

    results.addEventListener('contextmenu', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const action = target?.closest('[data-action-key]');
      const resultButton = target?.closest('button[data-key]');
      const treeNode = target?.closest('[data-node-key]');
      const key = action?.dataset.actionKey ?? resultButton?.dataset.key ?? treeNode?.dataset.nodeKey;
      if (!key) {
        return;
      }
      selectNode(key);
      vscode.postMessage({ type: 'select', key });
    });

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message?.type !== 'results') {
        return;
      }
      const text = String(message.query ?? '').trim();
      if (message.mode === 'tree') {
        const tree = Array.isArray(message.tree) ? message.tree : [];
        currentTree = tree;
        summary.textContent = 'Expressions, models, and instances';
        results.innerHTML = renderTree(currentTree);
        selectNode(selectedKey);
        return;
      }
      const resultItems = Array.isArray(message.results) ? message.results : [];
      currentTree = [];
      summary.textContent = text
        ? resultItems.length + ' result' + (resultItems.length === 1 ? '' : 's')
        : resultItems.length + ' expression/model' + (resultItems.length === 1 ? '' : 's');
      results.innerHTML = resultItems.map(renderResultButton).join('');
    });

    query.focus();
  </script>
</body>
</html>`;
}

async function openRsxExpressionTester(
  provider: RsxExpressionsTreeDataProvider,
  item?:
    | IRsxExpressionTreeExpression
    | IRsxExpressionTreeModel
    | IRsxExpressionTreeModelField
    | IRsxExpressionTreeModelFieldExpressionUse,
): Promise<void> {
  const data = await provider.getTesterData(item);
  if (!data || data.targets.length === 0) {
    await vscode.window.showWarningMessage(
      'No RS-X expressions are available to test for this selection.',
    );
    return;
  }

  await openRsxExpressionTesterModelDocument(data);
}

async function openRsxExpressionTesterModelDocument(
  data: IRsxExpressionTesterData,
): Promise<vscode.TextDocument> {
  const documentName = createRsxExpressionTesterDocumentName(data.scopeLabel);
  const documentDirectory = vscode.Uri.file(
    getRsxExpressionTesterDocumentDirectory(data.containingFileName),
  );
  const documentUri = vscode.Uri.file(
    path.join(documentDirectory.fsPath, documentName),
  );
  const modelText = `${createRsxExpressionTesterEditorModelDocument({
    containingFileName: data.containingFileName,
    documentFileName: documentUri.fsPath,
    modelTypeText: data.modelTypeText,
    modelTemplate: data.modelTemplate,
  }).trimEnd()}\n\n${formatRsxExpressionTesterInitialResultsBlock()}\n`;
  await vscode.workspace.fs.createDirectory(documentDirectory);
  ensureRsxExpressionTesterGitExclude(documentDirectory.fsPath);
  await vscode.workspace.fs.writeFile(
    documentUri,
    new TextEncoder().encode(modelText),
  );
  const document = await vscode.workspace.openTextDocument(documentUri);
  await replaceRsxExpressionTesterDocumentText(document, modelText);
  const editor = await vscode.window.showTextDocument(document, {
    viewColumn: vscode.ViewColumn.One,
    preview: false,
  });
  rememberRsxEditorGroupColumn(editor.viewColumn);
  scheduleCloseRsxEmptyEditorGroups([], {
    includeUnmanagedEmptyGroups: true,
  });
  editor.revealRange(
    new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)),
  );

  expressionTesterSessions.set(document.uri.toString(), {
    data,
    previousValues: new Map(),
    liveValues: new Map(),
  });
  return document;
}

function createRsxExpressionTesterDocumentName(scopeLabel: string): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T.Z]/gu, '')
    .slice(0, 14);
  const unique = Math.random().toString(36).slice(2, 8);
  return `${sanitizeRsxExpressionTesterDocumentName(
    scopeLabel,
  )}-${timestamp}-${unique}${RSX_EXPRESSION_TESTER_DOCUMENT_SUFFIX}`;
}

async function replaceRsxExpressionTesterDocumentText(
  document: vscode.TextDocument,
  text: string,
  editor?: vscode.TextEditor,
): Promise<void> {
  if (document.getText() === text) {
    return;
  }
  const fullRange = new vscode.Range(
    document.positionAt(0),
    document.positionAt(document.getText().length),
  );
  if (editor?.document.uri.toString() === document.uri.toString()) {
    const edited = await editor.edit((builder) => {
      builder.replace(fullRange, text);
    });
    if (edited) {
      await document.save?.();
      return;
    }
  }
  const workspaceEdit = new vscode.WorkspaceEdit();
  workspaceEdit.replace(document.uri, fullRange, text);
  const applied = await vscode.workspace.applyEdit(workspaceEdit);
  if (!applied) {
    await vscode.window.showWarningMessage(
      'Could not replace the RS-X model tester document.',
    );
    return;
  }
  await document.save?.();
}

function getRsxExpressionTesterDocumentDirectory(
  containingFileName: string,
): string {
  const projectRoot =
    getRsxExpressionTesterWorkspaceRoot(containingFileName) ??
    findNearestGitWorkspaceRoot(path.dirname(containingFileName)) ??
    path.dirname(containingFileName);
  return path.join(projectRoot, '.rsx');
}

function getRsxExpressionTesterWorkspaceRoot(
  containingFileName: string,
): string | null {
  const direct = vscode.workspace.getWorkspaceFolder?.(
    vscode.Uri.file(containingFileName),
  )?.uri.fsPath;
  if (direct) {
    return direct;
  }
  const folders = vscode.workspace.workspaceFolders ?? [];
  const containingPath = path.resolve(containingFileName);
  const matchingFolders = folders
    .map((folder) => folder.uri.fsPath)
    .filter((folderPath) => {
      const resolved = path.resolve(folderPath);
      return (
        containingPath === resolved ||
        containingPath.startsWith(`${resolved}${path.sep}`)
      );
    })
    .sort((left, right) => right.length - left.length);
  return matchingFolders[0] ?? null;
}

function findNearestGitWorkspaceRoot(startDirectory: string): string | null {
  const gitDirectory = findNearestGitDirectory(startDirectory);
  return gitDirectory ? path.dirname(gitDirectory) : null;
}

function findNearestGitDirectory(startDirectory: string): string | null {
  let current = path.resolve(startDirectory);
  while (true) {
    const gitPath = path.join(current, '.git');
    if (ts.sys.directoryExists(gitPath)) {
      return gitPath;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function ensureRsxExpressionTesterGitExclude(documentDirectory: string): void {
  const gitDirectory = findNearestGitDirectory(documentDirectory);
  if (!gitDirectory) {
    return;
  }
  const projectRoot = path.dirname(gitDirectory);
  const relativeDirectory = path
    .relative(projectRoot, documentDirectory)
    .split(path.sep)
    .join('/');
  const excludeEntry = `/${relativeDirectory}/`;
  const excludeFile = path.join(gitDirectory, 'info', 'exclude');
  const existing = ts.sys.readFile(excludeFile) ?? '';
  const entries = existing
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  if (entries.includes(excludeEntry)) {
    return;
  }
  const next = `${existing.trimEnd()}\n${excludeEntry}\n`;
  ts.sys.writeFile(excludeFile, next);
}

async function loadRsxExpressionTesterModelDocument(
  uri?: vscode.Uri,
): Promise<void> {
  const document = getCurrentRsxExpressionTesterDocument(uri);
  if (!document || !isRsxExpressionTesterDocument(document)) {
    await vscode.window.showWarningMessage(
      'Open an RS-X model tester document before loading a model.',
    );
    return;
  }

  const selected = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    filters: {
      'RS-X model templates': ['ts', 'js', 'json'],
      'All files': ['*'],
    },
    title: 'Load RS-X Model',
  });
  const sourceUri = selected?.[0];
  if (!sourceUri) {
    return;
  }

  const bytes = await vscode.workspace.fs.readFile(sourceUri);
  const text = getRsxExpressionTesterDocumentModelCode(
    new TextDecoder('utf8').decode(bytes),
  ).trimEnd();
  const editor = await vscode.window.showTextDocument(document, {
    viewColumn: vscode.ViewColumn.One,
    preview: false,
  });
  await replaceRsxExpressionTesterDocumentText(document, text, editor);
  const session = expressionTesterSessions.get(document.uri.toString());
  if (session) {
    session.previousValues.clear();
    session.liveValues.clear();
    session.liveRun?.dispose();
    session.liveRun = undefined;
  }
  await vscode.window.showInformationMessage(
    `Loaded RS-X model from ${path.basename(sourceUri.fsPath)}.`,
  );
}

function sanitizeRsxExpressionTesterDocumentName(name: string): string {
  return (
    name
      .trim()
      .replace(/[^A-Za-z0-9._-]+/gu, '-')
      .replace(/^-+|-+$/gu, '')
      .slice(0, 80) || 'model'
  );
}

async function runRsxExpressionTesterDocument(
  provider: RsxExpressionsTreeDataProvider,
  uri?: vscode.Uri,
): Promise<void> {
  const document = getCurrentRsxExpressionTesterDocument(uri);
  if (!document || !isRsxExpressionTesterDocument(document)) {
    await vscode.window.showWarningMessage(
      'Open an RS-X model tester document before running.',
    );
    return;
  }

  const session = expressionTesterSessions.get(document.uri.toString());
  if (!session) {
    await vscode.window.showWarningMessage(
      'This RS-X model tester document is no longer connected to an expression.',
    );
    return;
  }

  const modelCode = getRsxExpressionTesterDocumentModelCode(document.getText());
  for (const [key, value] of parseRsxExpressionTesterResultsBlock(
    document.getText(),
  )) {
    if (!session.previousValues.has(key)) {
      session.previousValues.set(key, value);
    }
  }
  const result = await runRsxExpressionTester(
    session.data,
    modelCode,
    document.uri.fsPath,
  );
  await openOrUpdateRsxExpressionTesterReport({
    document,
    provider,
    session,
    result,
  });
}

async function openOrUpdateRsxExpressionTesterReport(args: {
  readonly document: vscode.TextDocument;
  readonly provider: RsxExpressionsTreeDataProvider;
  readonly session: {
    readonly data: IRsxExpressionTesterData;
    readonly previousValues: Map<string, string>;
    readonly liveValues: Map<string, string>;
    latestModel?: object;
    liveRun?: IRsxExpressionTesterLiveRun;
    reportPanel?: vscode.WebviewPanel;
    treePanels?: Map<string, vscode.WebviewPanel>;
  };
  readonly result: IRsxExpressionTesterRunResult;
}): Promise<void> {
  args.session.liveRun?.dispose();
  args.session.liveValues.clear();
  args.session.liveRun = args.result.liveRun;
  const report = createRsxExpressionTesterReport({
    data: args.session.data,
    result: args.result,
    previousValues: args.session.previousValues,
  });
  if (args.result.model) {
    args.session.latestModel = args.result.model;
  }
  args.session.treePanels ??= new Map();
  const title = `RS-X Results: ${args.session.data.scopeLabel}`;
  if (args.session.reportPanel) {
    args.session.reportPanel.title = title;
    args.session.reportPanel.webview.html = getRsxExpressionTesterReportHtml(
      args.session.data,
      args.result,
      report,
    );
    attachRsxExpressionTesterLiveReportUpdates(args.document, args.session);
    rememberRsxEditorGroupColumn(args.session.reportPanel.viewColumn);
    args.session.reportPanel.reveal?.(vscode.ViewColumn.Beside);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    'rsx.expressionTesterReport',
    title,
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    },
  );
  rememberRsxEditorGroupColumn(panel.viewColumn);
  args.session.reportPanel = panel;
  panel.webview.html = getRsxExpressionTesterReportHtml(
    args.session.data,
    args.result,
    report,
  );
  const panelDisposables: vscode.Disposable[] = [];
  panel.onDidChangeViewState(
    (event) => {
      rememberRsxEditorGroupColumn(event.webviewPanel.viewColumn);
    },
    undefined,
    panelDisposables,
  );
  panel.onDidDispose(() => {
    args.session.reportPanel = undefined;
    args.session.liveRun?.dispose();
    args.session.liveRun = undefined;
    for (const treePanel of args.session.treePanels?.values() ?? []) {
      treePanel.dispose();
    }
    args.session.treePanels?.clear();
    for (const disposable of panelDisposables) {
      disposable.dispose();
    }
    scheduleCloseRsxEmptyEditorGroups();
  });
  panel.webview.onDidReceiveMessage(
    async (message: {
      type?: string;
      key?: string;
      uri?: string;
      start?: number;
      end?: number;
    }) => {
      if (
        message?.type === 'openExpression' &&
        typeof message.uri === 'string' &&
        typeof message.start === 'number' &&
        typeof message.end === 'number'
      ) {
        await openRsxExpressionLocation({
          uri: vscode.Uri.parse(message.uri),
          start: message.start,
          end: message.end,
        });
        return;
      }

      if (message?.type === 'openTree' && typeof message.key === 'string') {
        const existingPanel = args.session.treePanels?.get(message.key);
        if (existingPanel) {
          args.session.treePanels?.delete(message.key);
          existingPanel.dispose();
          await args.session.reportPanel?.webview.postMessage({
            type: 'treeVisibility',
            key: message.key,
            visible: false,
          });
          return;
        }

        const expression = await args.provider.getExpressionByKey(message.key);
        if (expression) {
          const treePanel = await openRsxExpressionGraphPreview(
            args.provider,
            expression,
            {
              model: args.session.latestModel,
            },
          );
          args.session.treePanels?.set(message.key, treePanel);
          await args.session.reportPanel?.webview.postMessage({
            type: 'treeVisibility',
            key: message.key,
            visible: true,
          });
          treePanel.onDidDispose(() => {
            args.session.treePanels?.delete(message.key);
            void args.session.reportPanel?.webview.postMessage({
              type: 'treeVisibility',
              key: message.key,
              visible: false,
            });
          });
        }
      }
    },
    undefined,
    panelDisposables,
  );
  attachRsxExpressionTesterLiveReportUpdates(args.document, args.session);
}

function attachRsxExpressionTesterLiveReportUpdates(
  document: vscode.TextDocument,
  session: {
    readonly data: IRsxExpressionTesterData;
    readonly previousValues: Map<string, string>;
    readonly liveValues: Map<string, string>;
    readonly reportPanel?: vscode.WebviewPanel;
    readonly liveRun?: IRsxExpressionTesterLiveRun;
  },
): void {
  const panel = session.reportPanel;
  if (!panel || !session.liveRun) {
    return;
  }

  const baselineValues = new Map(session.previousValues);
  session.liveRun.onValue((value) => {
    const current = value.error ? value.error : (value.value ?? '');
    const previous = baselineValues.has(value.key)
      ? baselineValues.get(value.key)!
      : 'No previous run';
    const changed =
      baselineValues.has(value.key) &&
      baselineValues.get(value.key) !== current;
    session.liveValues.set(value.key, current);
    persistRsxExpressionTesterLiveValues(document, session);
    void panel.webview.postMessage({
      type: 'valueUpdate',
      key: value.key,
      current,
      previous,
      changed,
      dependencies: value.dependencies ?? [],
    });
  });
}

function persistRsxExpressionTesterLiveValues(
  document: vscode.TextDocument,
  session: {
    readonly data: IRsxExpressionTesterData;
    readonly previousValues: Map<string, string>;
    readonly liveValues: Map<string, string>;
  },
): void {
  if (
    !session.data.targets.every((target) => session.liveValues.has(target.key))
  ) {
    return;
  }

  const entries = session.data.targets.map(
    (target): IRsxExpressionTesterReportEntry => {
      const current = session.liveValues.get(target.key) ?? '';
      const previous = session.previousValues.has(target.key)
        ? session.previousValues.get(target.key)!
        : 'No previous run';
      const changed =
        session.previousValues.has(target.key) &&
        session.previousValues.get(target.key) !== current;
      return {
        key: target.key,
        exportName: target.exportName,
        expressionText: target.expressionText,
        uri: target.uri,
        start: target.start,
        end: target.end,
        current,
        previous,
        changed,
        returnTypeText: target.returnTypeText,
        dependencies: target.dependencies,
        dependencyStatuses: [],
        dependents: target.dependents,
      };
    },
  );
  for (const entry of entries) {
    session.previousValues.set(entry.key, entry.current);
  }
  void updateRsxExpressionTesterResultsBlock(document, entries);
}

function createRsxExpressionTesterReport(args: {
  readonly data: IRsxExpressionTesterData;
  readonly result: IRsxExpressionTesterRunResult;
  readonly previousValues: Map<string, string>;
}): readonly IRsxExpressionTesterReportEntry[] {
  if (!args.result.ok && args.result.diagnostics.length > 0) {
    return [];
  }

  return args.result.values.map((entry): IRsxExpressionTesterReportEntry => {
    const target = args.data.targets.find(
      (candidate) => candidate.key === entry.key,
    );
    const current = entry.error ? entry.error : (entry.value ?? '');
    const previous = args.previousValues.has(entry.key)
      ? args.previousValues.get(entry.key)!
      : 'No previous run';
    const changed =
      args.previousValues.has(entry.key) &&
      args.previousValues.get(entry.key) !== current;

    return {
      key: entry.key,
      exportName: entry.exportName,
      expressionText: target?.expressionText ?? '',
      uri: target?.uri ?? '',
      start: target?.start ?? 0,
      end: target?.end ?? 0,
      current,
      previous,
      changed,
      returnTypeText: target?.returnTypeText,
      dependencies: target?.dependencies ?? [],
      dependencyStatuses: entry.dependencies ?? [],
      dependents: target?.dependents ?? [],
    };
  });
}

function getRsxExpressionTesterDocument(
  uri: vscode.Uri | undefined,
): vscode.TextDocument | undefined {
  if (!uri) {
    return undefined;
  }
  return vscode.workspace.textDocuments.find(
    (document) => document.uri.toString() === uri.toString(),
  );
}

function getRsxExpressionTesterCommandUri(
  args: readonly unknown[],
): vscode.Uri | undefined {
  for (const arg of args) {
    const uri = getRsxExpressionTesterUriLike(arg);
    if (uri) {
      return uri;
    }
    if (Array.isArray(arg)) {
      const nested = getRsxExpressionTesterCommandUri(arg);
      if (nested) {
        return nested;
      }
    }
  }
  return undefined;
}

function getRsxExpressionTesterUriLike(value: unknown): vscode.Uri | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  if (isRsxExpressionTesterUriLike(value)) {
    return value as vscode.Uri;
  }
  const candidate = value as {
    readonly uri?: unknown;
    readonly resourceUri?: unknown;
  };
  if (isRsxExpressionTesterUriLike(candidate.uri)) {
    return candidate.uri as vscode.Uri;
  }
  if (isRsxExpressionTesterUriLike(candidate.resourceUri)) {
    return candidate.resourceUri as vscode.Uri;
  }
  return undefined;
}

function isRsxExpressionTesterUriLike(value: unknown): boolean {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { readonly fsPath?: unknown }).fsPath === 'string' &&
    typeof (value as { readonly toString?: unknown }).toString === 'function'
  );
}

function getCurrentRsxExpressionTesterDocument(
  uri: vscode.Uri | undefined,
): vscode.TextDocument | undefined {
  const direct = getRsxExpressionTesterDocument(uri);
  if (direct && isRsxExpressionTesterDocument(direct)) {
    return direct;
  }

  const active = vscode.window.activeTextEditor?.document;
  if (active && isRsxExpressionTesterDocument(active)) {
    return active;
  }

  const activeTab = getActiveRsxExpressionTesterTabDocument();
  if (activeTab) {
    return activeTab;
  }

  const visible = vscode.window.visibleTextEditors
    .map((editor) => editor.document)
    .find(
      (document) =>
        isRsxExpressionTesterDocument(document) &&
        expressionTesterSessions.has(document.uri.toString()),
    );
  if (visible) {
    return visible;
  }

  return [...vscode.workspace.textDocuments]
    .reverse()
    .find(
      (document) =>
        isRsxExpressionTesterDocument(document) &&
        expressionTesterSessions.has(document.uri.toString()),
    );
}

function getActiveRsxExpressionTesterTabDocument():
  | vscode.TextDocument
  | undefined {
  const tabGroups = (
    vscode.window as typeof vscode.window & {
      readonly tabGroups?: vscode.TabGroups & {
        readonly activeTabGroup?: {
          readonly activeTab?: vscode.Tab;
        };
      };
    }
  ).tabGroups;
  const input = tabGroups?.activeTabGroup?.activeTab?.input;
  if (!(input instanceof vscode.TabInputText)) {
    return undefined;
  }
  return getRsxExpressionTesterDocument(input.uri);
}

function isRsxExpressionTesterDocument(document: vscode.TextDocument): boolean {
  return document.uri.fsPath.endsWith(RSX_EXPRESSION_TESTER_DOCUMENT_SUFFIX);
}

function getRsxExpressionTesterDocumentModelCode(text: string): string {
  const markerIndex = text.indexOf(`\n${RSX_EXPRESSION_TESTER_RESULTS_MARKER}`);
  if (markerIndex >= 0) {
    return text.slice(0, markerIndex);
  }
  return text;
}

function formatRsxExpressionTesterInitialResultsBlock(): string {
  return [
    RSX_EXPRESSION_TESTER_RESULTS_MARKER,
    'Use the editor title Run button or the CodeLens above to open the results report for the current model.',
    RSX_EXPRESSION_TESTER_RESULTS_END,
  ].join('\n');
}

function parseRsxExpressionTesterResultsBlock(
  text: string,
): Map<string, string> {
  const values = new Map<string, string>();
  const markerIndex = text.indexOf(RSX_EXPRESSION_TESTER_RESULTS_MARKER);
  if (markerIndex < 0) {
    return values;
  }
  const endIndex = text.indexOf(
    RSX_EXPRESSION_TESTER_RESULTS_END,
    markerIndex + RSX_EXPRESSION_TESTER_RESULTS_MARKER.length,
  );
  if (endIndex < 0) {
    return values;
  }
  const blockText = text.slice(
    markerIndex + RSX_EXPRESSION_TESTER_RESULTS_MARKER.length,
    endIndex,
  );
  const jsonStart = blockText.indexOf('[');
  if (jsonStart < 0) {
    return values;
  }

  try {
    const parsed = JSON.parse(blockText.slice(jsonStart)) as unknown;
    if (!Array.isArray(parsed)) {
      return values;
    }
    for (const entry of parsed) {
      if (
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as { key?: unknown }).key === 'string' &&
        typeof (entry as { value?: unknown }).value === 'string'
      ) {
        values.set(
          (entry as { key: string }).key,
          (entry as { value: string }).value,
        );
      }
    }
  } catch {
    return values;
  }

  return values;
}

function formatRsxExpressionTesterResultsBlock(
  entries: readonly IRsxExpressionTesterReportEntry[],
): string {
  const values = entries.map((entry) => ({
    key: entry.key,
    exportName: entry.exportName,
    value: entry.current,
  }));
  return [
    RSX_EXPRESSION_TESTER_RESULTS_MARKER,
    'Last run values. RS-X uses these to show Old value on the next run.',
    JSON.stringify(values, null, 2),
    RSX_EXPRESSION_TESTER_RESULTS_END,
  ].join('\n');
}

async function updateRsxExpressionTesterResultsBlock(
  document: vscode.TextDocument,
  entries: readonly IRsxExpressionTesterReportEntry[],
): Promise<void> {
  if (entries.length === 0) {
    return;
  }

  const text = document.getText();
  const replacement = formatRsxExpressionTesterResultsBlock(entries);
  const markerIndex = text.indexOf(`\n${RSX_EXPRESSION_TESTER_RESULTS_MARKER}`);
  const startIndex = markerIndex >= 0 ? markerIndex + 1 : text.length;
  const endMarkerIndex = text.indexOf(
    RSX_EXPRESSION_TESTER_RESULTS_END,
    startIndex,
  );
  const endIndex =
    endMarkerIndex >= 0
      ? endMarkerIndex + RSX_EXPRESSION_TESTER_RESULTS_END.length
      : text.length;
  const workspaceEdit = new vscode.WorkspaceEdit();
  workspaceEdit.replace(
    document.uri,
    new vscode.Range(
      document.positionAt(startIndex),
      document.positionAt(endIndex),
    ),
    replacement,
  );
  await vscode.workspace.applyEdit(workspaceEdit);
}

function getRsxExpressionTesterReportHtml(
  data: IRsxExpressionTesterData,
  result: IRsxExpressionTesterRunResult,
  entries: readonly IRsxExpressionTesterReportEntry[],
): string {
  const nonce = createWebviewNonce();
  const encodedEntries = escapeJsonForHtml(JSON.stringify(entries));
  const encodedDiagnostics = escapeJsonForHtml(
    JSON.stringify(result.diagnostics),
  );
  const status = result.diagnostics.length
    ? 'Model template has validation errors.'
    : result.ok
      ? `Evaluated ${entries.length} affected expression${
          entries.length === 1 ? '' : 's'
        }.`
      : 'One or more affected expressions failed during evaluation.';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RS-X Results</title>
  <style>
    :root {
      color-scheme: light dark;
      --rsx-bg: var(--vscode-editor-background);
      --rsx-fg: var(--vscode-editor-foreground);
      --rsx-muted: var(--vscode-descriptionForeground);
      --rsx-border: var(--vscode-panel-border);
      --rsx-row: var(--vscode-sideBar-background);
      --rsx-row-hover: var(--vscode-list-hoverBackground);
      --rsx-code: var(--vscode-textCodeBlock-background);
      --rsx-code-border: color-mix(in srgb, var(--rsx-border) 70%, transparent);
      --rsx-focus: var(--vscode-focusBorder);
      --rsx-button-bg: var(--vscode-button-background);
      --rsx-button-fg: var(--vscode-button-foreground);
      --rsx-secondary-bg: var(--vscode-button-secondaryBackground);
      --rsx-secondary-fg: var(--vscode-button-secondaryForeground);
      --rsx-error: var(--vscode-errorForeground);
      --rsx-changed: var(--vscode-charts-green);
      --rsx-accent: var(--vscode-focusBorder);
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
      z-index: 2;
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

    .content {
      display: grid;
      gap: 10px;
      padding: 12px;
    }

    #entries {
      display: grid;
      gap: 12px;
    }

    .diagnostics {
      margin: 0;
      padding: 10px 12px;
      border: 1px solid color-mix(in srgb, var(--rsx-error) 55%, var(--rsx-border));
      color: var(--rsx-error);
      background: color-mix(in srgb, var(--rsx-error) 10%, var(--rsx-bg));
      white-space: pre-wrap;
    }

    .row {
      display: grid;
      grid-template-columns: minmax(180px, 0.8fr) minmax(220px, 1fr) minmax(220px, 1fr);
      gap: 10px;
      align-items: stretch;
      padding: 10px;
      border: 1px solid var(--rsx-border);
      border-left: 2px solid color-mix(in srgb, var(--rsx-accent) 42%, var(--rsx-border));
      background: color-mix(in srgb, var(--rsx-row) 92%, var(--rsx-bg));
    }

    .row:hover {
      background: var(--rsx-row-hover);
    }

    .meta {
      min-width: 0;
      display: grid;
      align-content: start;
      gap: 8px;
    }

    .name {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      font-weight: 600;
    }

    .treeIconButton {
      flex: 0 0 auto;
      display: inline-grid;
      place-items: center;
      width: 22px;
      height: 22px;
      border: 1px solid transparent;
      padding: 0;
      background: transparent;
      color: color-mix(in srgb, var(--rsx-accent) 72%, var(--rsx-muted));
    }

    .treeIconButton svg {
      width: 14px;
      height: 14px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.45;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .treeIconButton:hover {
      border-color: color-mix(in srgb, var(--rsx-focus) 28%, transparent);
      background: color-mix(in srgb, var(--rsx-focus) 6%, transparent);
      color: var(--rsx-accent);
    }

    .treeIconButton[aria-pressed="true"] {
      border-color: color-mix(in srgb, var(--rsx-focus) 42%, transparent);
      background: color-mix(in srgb, var(--rsx-focus) 10%, transparent);
      color: var(--rsx-accent);
    }

    .nameText {
      display: inline;
      min-width: 0;
      border: 0;
      border-bottom: 1px solid color-mix(in srgb, var(--rsx-focus) 70%, transparent);
      padding: 0;
      background: transparent;
      color: var(--rsx-accent);
      font: inherit;
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .nameText:hover {
      background: color-mix(in srgb, var(--rsx-focus) 14%, transparent);
    }

    .changed {
      flex: 0 0 auto;
      color: var(--rsx-changed);
      font-size: 11px;
    }

    .changed.hidden {
      display: none;
    }

    .type {
      color: var(--rsx-muted);
      font-size: 12px;
    }

    .links {
      display: grid;
      gap: 4px;
      padding: 6px;
      border: 1px solid color-mix(in srgb, var(--rsx-border) 60%, transparent);
      background: color-mix(in srgb, var(--rsx-bg) 48%, transparent);
    }

    .linkItems {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      min-width: 0;
    }

    .linkLabel {
      color: var(--rsx-muted);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0;
    }

    .expressionLink {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      border: 1px solid color-mix(in srgb, var(--rsx-focus) 45%, var(--rsx-border));
      padding: 2px 6px;
      background: color-mix(in srgb, var(--rsx-focus) 10%, transparent);
      color: var(--rsx-button-fg);
      font-size: 11px;
      white-space: nowrap;
    }

    .expressionCodeLink {
      display: inline;
      border: 0;
      border-bottom: 1px solid color-mix(in srgb, var(--rsx-focus) 70%, transparent);
      padding: 0;
      background: transparent;
      color: var(--rsx-button-fg);
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      text-decoration: none;
    }

    .expressionCodeLink:hover {
      background: color-mix(in srgb, var(--rsx-focus) 14%, transparent);
    }

    .dependencyInspector {
      display: grid;
      gap: 4px;
      padding: 6px;
      border: 1px solid color-mix(in srgb, var(--rsx-border) 60%, transparent);
      background: color-mix(in srgb, var(--rsx-bg) 48%, transparent);
    }

    .dependencyInspectorTitle {
      color: var(--rsx-muted);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0;
    }

    .dependencyStatus {
      display: grid;
      grid-template-columns: minmax(112px, 32%) 72px minmax(42px, 1fr);
      gap: 6px;
      align-items: baseline;
      min-width: 0;
      color: var(--rsx-muted);
      font-size: 11px;
    }

    .dependencyChildren {
      display: grid;
      gap: 3px;
      padding-left: 14px;
      border-left: 1px solid color-mix(in srgb, var(--rsx-border) 70%, transparent);
    }

    .dependencyStatusName {
      display: inline;
      min-width: 0;
      border: 0;
      padding: 0;
      background: transparent;
      color: var(--rsx-button-fg);
      font: inherit;
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .dependencyStatusName:hover {
      background: color-mix(in srgb, var(--rsx-focus) 14%, transparent);
    }

    .dependencyStatusState {
      color: var(--rsx-muted);
    }

    .dependencyStatus[data-source="expression"] .dependencyStatusState {
      color: var(--rsx-changed);
    }

    .dependencyStatus[data-source="model"] .dependencyStatusState {
      color: var(--rsx-accent);
    }

    .dependencyStatus[data-state="missing"] .dependencyStatusState {
      color: var(--rsx-error);
    }

    .dependencyStatusValue {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--rsx-fg);
      font-family: var(--vscode-editor-font-family, monospace);
    }

    button {
      border: 1px solid var(--rsx-border);
      padding: 4px 8px;
      background: transparent;
      color: var(--rsx-fg);
      font: inherit;
      cursor: pointer;
    }

    button:hover {
      background: var(--rsx-row-hover);
    }

    button[aria-pressed="true"] {
      border-color: var(--rsx-focus);
      color: var(--rsx-button-fg);
      background: var(--rsx-button-bg);
    }

    button:focus-visible {
      outline: 1px solid var(--rsx-focus);
      outline-offset: 2px;
    }

    .value {
      min-width: 0;
      display: grid;
      grid-template-rows: auto 1fr;
      gap: 6px;
      padding: 8px;
      border: 1px solid var(--rsx-code-border);
      background: color-mix(in srgb, var(--rsx-bg) 70%, transparent);
    }

    .label {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--rsx-muted);
      font-size: 12px;
    }

    .label::before {
      content: '';
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: var(--rsx-muted);
    }

    pre {
      min-height: 36px;
      margin: 0;
      overflow: auto;
      padding: 8px;
      background: var(--rsx-code);
      color: var(--rsx-fg);
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: var(--vscode-editor-font-size, 12px);
      line-height: 1.35;
      white-space: pre-wrap;
    }

    .empty {
      color: var(--rsx-muted);
      padding: 12px 0;
    }

    @media (max-width: 760px) {
      .row {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div class="title">${escapeHtml(data.title)}</div>
    <div class="summary">${escapeHtml(status)}</div>
  </div>
  <main class="content">
    <div id="diagnostics"></div>
    <div id="entries"></div>
  </main>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const entries = ${encodedEntries};
    const diagnostics = ${encodedDiagnostics};
    const diagnosticsHost = document.getElementById('diagnostics');
    const entriesHost = document.getElementById('entries');
    const visibleTreeKeys = new Set();

    function esc(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    if (diagnostics.length > 0) {
      diagnosticsHost.innerHTML = '<pre class="diagnostics">' + esc(diagnostics.join('\\n')) + '</pre>';
    }

    if (entries.length === 0 && diagnostics.length === 0) {
      entriesHost.innerHTML = '<div class="empty">No affected expressions were evaluated.</div>';
    }

    function renderExpressionLinks(label, links) {
      if (!Array.isArray(links) || links.length === 0) {
        return '';
      }
      return '<div class="linkLabel">' + esc(label) + '</div><div class="linkItems">' +
        links.map((link) =>
          '<button type="button" class="expressionLink" data-action="openLinkedExpression" data-key="' + esc(link.key) + '" title="' + esc(link.exportName) + '">' + esc(link.label ?? link.exportName) + '</button>'
        ).join('') +
        '</div>';
    }

    function renderRelationLinks(entry) {
      const html = renderExpressionLinks('Used by', entry.dependents);
      return html ? '<div class="links">' + html + '</div>' : '';
    }

    function formatDependencySource(source) {
      if (source === 'expression') {
        return 'expression';
      }
      if (source === 'model') {
        return 'field';
      }
      return 'unknown';
    }

    function renderDependencyInspector(entry) {
      const dependencies = Array.isArray(entry.dependencyStatuses)
        ? entry.dependencyStatuses
        : [];
      if (dependencies.length === 0) {
        return '';
      }
      return '<div class="dependencyInspector" data-role="dependencyInspector">' +
        '<div class="dependencyInspectorTitle">Dependencies</div>' +
        dependencies.map((dependency) => renderDependencyStatus(dependency)).join('') +
      '</div>';
    }

    function renderDependencyStatus(dependency) {
      const children = Array.isArray(dependency.children)
        ? dependency.children
        : [];
      return '<div class="dependencyStatus" data-state="' + esc(dependency.state) + '" data-source="' + esc(dependency.source) + '">' +
            '<button type="button" class="dependencyStatusName" data-action="openDependency" data-key="' + esc(dependency.key) + '" title="' + esc(dependency.exportName) + '">' + esc(dependency.label) + '</button>' +
            '<span class="dependencyStatusState">' + esc(formatDependencySource(dependency.source)) + '</span>' +
            '<span class="dependencyStatusValue" title="' + esc(dependency.value) + '">' + esc(dependency.value) + '</span>' +
          '</div>' +
        (children.length > 0
          ? '<div class="dependencyChildren">' + children.map((child) => renderDependencyStatus(child)).join('') + '</div>'
          : '');
    }

    function findDependencyStatus(dependencies, key) {
      for (const dependency of dependencies ?? []) {
        if (dependency.key === key) {
          return dependency;
        }
        const child = findDependencyStatus(dependency.children, key);
        if (child) {
          return child;
        }
      }
      return null;
    }

    function renderExpressionText(entry) {
      const dependencies = Array.isArray(entry.dependencies) ? entry.dependencies : [];
      const labels = dependencies
        .map((link) => String(link.label ?? link.exportName ?? ''))
        .filter((label, index, all) => label && all.indexOf(label) === index)
        .sort((left, right) => right.length - left.length);
      if (labels.length === 0) {
        return esc(entry.expressionText);
      }

      let html = '';
      const text = String(entry.expressionText ?? '');
      for (let index = 0; index < text.length;) {
        const match = labels.find((label) =>
          text.startsWith(label, index) &&
          !/[A-Za-z0-9_$]/u.test(text[index - 1] ?? '') &&
          !/[A-Za-z0-9_$]/u.test(text[index + label.length] ?? '')
        );
        if (!match) {
          html += esc(text[index]);
          index += 1;
          continue;
        }

        const link = dependencies.find((candidate) => (candidate.label ?? candidate.exportName) === match);
        html += '<button type="button" class="expressionCodeLink" data-action="openLinkedExpression" data-key="' + esc(link.key) + '" title="' + esc(link.exportName) + '">' + esc(match) + '</button>';
        index += match.length;
      }
      return html;
    }

    function renderTreeIcon() {
      return '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
        '<path d="M5 3h6v4H5z"></path>' +
        '<path d="M8 7v2"></path>' +
        '<path d="M3 9h10"></path>' +
        '<path d="M3 9v2"></path>' +
        '<path d="M13 9v2"></path>' +
        '<path d="M1.5 11h3v2.5h-3z"></path>' +
        '<path d="M11.5 11h3v2.5h-3z"></path>' +
      '</svg>';
    }

    for (const entry of entries) {
      const row = document.createElement('section');
      row.className = 'row';
      row.dataset.key = entry.key;
      row.innerHTML = [
        '<div class="meta">',
          '<div class="name">' +
            '<button type="button" class="treeIconButton" data-action="openTree" data-key="' + esc(entry.key) + '" aria-pressed="false" aria-label="Open expression tree" title="Open expression tree">' + renderTreeIcon() + '</button>' +
            '<button type="button" class="nameText" data-action="openExpression" data-key="' + esc(entry.key) + '" title="' + esc(entry.exportName) + '">' + esc(entry.exportName) + '</button>' +
            '<span class="changed' + (entry.changed ? '' : ' hidden') + '">changed</span>' +
          '</div>',
          entry.returnTypeText ? '<div class="type">' + esc(entry.returnTypeText) + '</div>' : '',
          '<pre title="' + esc(entry.expressionText) + '">' + renderExpressionText(entry) + '</pre>',
          renderDependencyInspector(entry),
          renderRelationLinks(entry),
        '</div>',
        '<div class="value"><div class="label">New value</div><pre data-role="current">' + esc(entry.current) + '</pre></div>',
        '<div class="value"><div class="label">Old value</div><pre data-role="previous">' + esc(entry.previous) + '</pre></div>',
      ].join('');
      entriesHost.appendChild(row);
    }

    function setTreeVisible(key, visible) {
      if (visible) {
        visibleTreeKeys.add(key);
      } else {
        visibleTreeKeys.delete(key);
      }
      const button = entriesHost.querySelector('button[data-action="openTree"][data-key="' + CSS.escape(key) + '"]');
      if (button) {
        button.setAttribute('title', visible ? 'Hide expression tree' : 'Open expression tree');
        button.setAttribute('aria-label', visible ? 'Hide expression tree' : 'Open expression tree');
        button.setAttribute('aria-pressed', visible ? 'true' : 'false');
      }
    }

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message?.type === 'treeVisibility' && typeof message.key === 'string') {
        setTreeVisible(message.key, message.visible === true);
      }
      if (message?.type === 'valueUpdate' && typeof message.key === 'string') {
        const row = entriesHost.querySelector('.row[data-key="' + CSS.escape(message.key) + '"]');
        if (!row) {
          return;
        }
        const entry = entries.find((candidate) => candidate.key === message.key);
        if (!entry) {
          return;
        }
        const current = row.querySelector('[data-role="current"]');
        const previous = row.querySelector('[data-role="previous"]');
        const changed = row.querySelector('.changed');
        if (current) {
          current.textContent = message.current ?? '';
        }
        if (previous) {
          previous.textContent = message.previous ?? '';
        }
        if (changed) {
          changed.classList.toggle('hidden', message.changed !== true);
        }
        if (Array.isArray(message.dependencies)) {
          entry.dependencyStatuses = message.dependencies;
          const inspector = row.querySelector('[data-role="dependencyInspector"]');
          const nextInspector = renderDependencyInspector(entry);
          if (inspector) {
            inspector.outerHTML = nextInspector;
          } else if (nextInspector) {
            const links = row.querySelector('.links');
            if (links) {
              links.insertAdjacentHTML('beforebegin', nextInspector);
            } else {
              row.querySelector('.meta')?.insertAdjacentHTML('beforeend', nextInspector);
            }
          }
        }
      }
    });

    entriesHost.addEventListener('click', (event) => {
      const button = event.target instanceof Element
        ? event.target.closest('button[data-action]')
        : null;
      if (!button) {
        return;
      }

      const row = button.closest('.row');
      const entryKey = row instanceof HTMLElement ? row.dataset.key : button.dataset.key;
      const entry = entries.find((candidate) => candidate.key === entryKey);
      if (!entry) {
        return;
      }

          if (button.dataset.action === 'openExpression') {
            vscode.postMessage({
              type: 'openExpression',
              uri: entry.uri,
              start: entry.start,
          end: entry.end,
            });
            return;
          }

          if (button.dataset.action === 'openLinkedExpression') {
            const links = [...(entry.dependencies ?? []), ...(entry.dependents ?? [])];
            const link = links.find((candidate) => candidate.key === button.dataset.key);
            if (!link) {
              return;
            }
            vscode.postMessage({
              type: 'openExpression',
              uri: link.uri,
              start: link.start,
              end: link.end,
            });
            return;
          }

          if (button.dataset.action === 'openDependency') {
            const dependency = findDependencyStatus(entry.dependencyStatuses, button.dataset.key);
            if (!dependency) {
              return;
            }
            vscode.postMessage({
              type: 'openExpression',
              uri: dependency.uri,
              start: dependency.start,
              end: dependency.end,
            });
            return;
          }

          if (button.dataset.action === 'openTree') {
        setTreeVisible(entry.key, !visibleTreeKeys.has(entry.key));
        vscode.postMessage({
          type: 'openTree',
          key: entry.key,
        });
      }
    });
  </script>
</body>
</html>`;
}

function createRsxExpressionTesterData(
  files: readonly IRsxExpressionTreeFile[],
  item?:
    | IRsxExpressionTreeExpression
    | IRsxExpressionTreeModel
    | IRsxExpressionTreeModelField
    | IRsxExpressionTreeModelFieldExpressionUse,
): IRsxExpressionTesterData | null {
  const expressions = files.flatMap((file) => file.expressions);
  const expressionByKey = new Map(
    expressions.map((expression) => [expression.key, expression]),
  );
  const resolveExpression = (
    expression: IRsxExpressionTreeExpression,
  ): IRsxExpressionTreeExpression =>
    expressionByKey.get(expression.key) ?? expression;

  let title = 'Test RS-X Expressions';
  let scopeLabel = 'Workspace expressions';
  let modelTypeText: string | undefined;
  let modelFields: readonly IRsxExpressionTreeModelField[] = [];
  let targets: readonly IRsxExpressionTreeExpression[] = [];
  let fieldPath: readonly string[] | undefined;

  if (item?.kind === 'expression') {
    const expression = resolveExpression(item);
    title = `Test RS-X: ${expression.exportName}`;
    scopeLabel = expression.exportName;
    modelTypeText = expression.expression.modelTypeText;
    modelFields = expression.modelFields;
    targets = [expression];
  } else if (item?.kind === 'model') {
    title = `Test RS-X Model: ${item.label}`;
    scopeLabel = item.label;
    modelTypeText = item.modelTypeText;
    modelFields = item.fields;
    targets = dedupeRsxExpressionTesterTargets([
      ...item.expressions,
      ...getRsxExpressionTesterModelFieldExpressionUsesForFields(
        item.fields,
      ).map((use) => use.expression),
    ]).map(resolveExpression);
  } else if (item?.kind === 'modelField') {
    fieldPath = item.path;
    targets = getRsxExpressionTesterModelFieldExpressionUses(item).map((use) =>
      resolveExpression(use.expression),
    );
    const firstExpression = targets[0];
    title = `Test RS-X Field: ${item.path.join('.')}`;
    scopeLabel = item.path.join('.');
    modelTypeText = firstExpression
      ? createRsxExpressionTesterFieldModelTypeText(
          firstExpression.expression.modelTypeText,
          item.path,
        )
      : undefined;
    modelFields = [
      findRsxExpressionTesterRootField(
        firstExpression?.modelFields ?? [],
        item.path,
      ) ?? item,
    ];
  } else if (item?.kind === 'modelFieldExpression') {
    const expression = resolveExpression(item.expression);
    fieldPath = item.fieldPath;
    title = `Test RS-X: ${expression.exportName}`;
    scopeLabel = `${expression.exportName} via ${item.fieldPath.join('.')}`;
    modelTypeText = createRsxExpressionTesterFieldModelTypeText(
      expression.expression.modelTypeText,
      item.fieldPath,
    );
    modelFields = [
      findRsxExpressionTesterRootField(expression.modelFields, item.fieldPath),
    ].filter((field): field is IRsxExpressionTreeModelField => !!field);
    targets = [expression];
  } else {
    targets = expressions;
    const firstExpression = targets[0];
    modelTypeText = firstExpression?.expression.modelTypeText;
    modelFields = firstExpression?.modelFields ?? [];
  }

  if (!modelTypeText || targets.length === 0) {
    return null;
  }

  const uniqueTargets = dedupeRsxExpressionTesterTargets(targets);
  const dependentsByKey = createRsxExpressionDependentsByKey(expressions);
  const toTesterTarget = (
    expression: IRsxExpressionTreeExpression,
  ): IRsxExpressionTesterTarget => ({
    key: expression.key,
    exportName: expression.exportName,
    expressionText: expression.expression.expression,
    uri: expression.uri.toString(),
    start: expression.start,
    end: expression.end,
    returnTypeText: expression.expression.returnTypeText,
    dependencies: expression.dependencies.map((dependency) => ({
      key: dependency.targetKey,
      exportName: dependency.targetExportName,
      label:
        dependency.matchKind === 'exportName'
          ? dependency.targetExportName
          : dependency.identifier,
      matchKind: dependency.matchKind,
      uri: dependency.targetUri.toString(),
      start: dependency.targetStart,
      end: dependency.targetEnd,
    })),
    modelFieldDependencies:
      getRsxExpressionTesterModelFieldDependencies(expression),
    dependents: dependentsByKey.get(expression.key) ?? [],
  });
  const testerTargets = uniqueTargets.map(toTesterTarget);
  const dependencyTargets = expandRsxExpressionTesterTargetsWithDependencies(
    uniqueTargets,
    expressionByKey,
  );
  return {
    title,
    scopeLabel,
    containingFileName: uniqueTargets[0].uri.fsPath,
    modelTypeText,
    modelTemplate: createRsxExpressionTesterModelTemplate(
      modelFields,
      collectRsxExpressionTesterTemplateRequirements(testerTargets),
    ),
    targets: testerTargets,
    dependencyTargets: dependencyTargets
      .filter(
        (expression) =>
          !uniqueTargets.some((target) => target.key === expression.key),
      )
      .map(toTesterTarget),
    fieldPath,
  };
}

function expandRsxExpressionTesterTargetsWithDependencies(
  targets: readonly IRsxExpressionTreeExpression[],
  expressionByKey: ReadonlyMap<string, IRsxExpressionTreeExpression>,
): IRsxExpressionTreeExpression[] {
  const expanded = new Map<string, IRsxExpressionTreeExpression>();
  const visit = (expression: IRsxExpressionTreeExpression): void => {
    if (expanded.has(expression.key)) {
      return;
    }
    expanded.set(expression.key, expression);
    for (const dependency of expression.dependencies) {
      const dependencyExpression = expressionByKey.get(dependency.targetKey);
      if (dependencyExpression) {
        visit(dependencyExpression);
      }
    }
  };

  for (const target of targets) {
    visit(target);
  }

  return [...expanded.values()].sort(compareRsxExpressionTreeExpression);
}

function getRsxExpressionTesterModelFieldDependencies(
  expression: IRsxExpressionTreeExpression,
): IRsxExpressionTesterModelFieldLink[] {
  const expressionDependenciesByLabel = new Map(
    expression.dependencies.map((dependency) => [
      dependency.identifier,
      dependency,
    ]),
  );
  const fieldsByTopLevelName = new Map<string, IRsxExpressionTreeModelField>();
  for (const field of expression.modelFields) {
    const name = field.path[0] ?? field.label;
    if (!fieldsByTopLevelName.has(name)) {
      fieldsByTopLevelName.set(name, field);
    }
  }

  const fieldDependencies: IRsxExpressionTesterModelFieldLink[] = [];
  for (const identifier of getFreeIdentifiersInRsxExpression(
    expression.expression.expression,
  )) {
    if (expressionDependenciesByLabel.has(identifier)) {
      continue;
    }
    const field = fieldsByTopLevelName.get(identifier);
    if (!field) {
      continue;
    }
    fieldDependencies.push({
      key: `${expression.key}::modelField::${field.path.join('.')}`,
      label: identifier,
      path: field.path,
      uri: field.uri.toString(),
      start: field.start,
      end: field.end,
      argumentDependencies:
        getRsxExpressionTesterModelFieldCallArgumentDependencies({
          expression,
          methodName: identifier,
          expressionDependenciesByLabel,
          fieldsByTopLevelName,
        }),
    });
  }
  return fieldDependencies;
}

function getRsxExpressionTesterModelFieldCallArgumentDependencies(args: {
  readonly expression: IRsxExpressionTreeExpression;
  readonly methodName: string;
  readonly expressionDependenciesByLabel: ReadonlyMap<
    string,
    IRsxExpressionDependencyEdge
  >;
  readonly fieldsByTopLevelName: ReadonlyMap<
    string,
    IRsxExpressionTreeModelField
  >;
}): IRsxExpressionTesterDependencyReference[] {
  const sourceFile = ts.createSourceFile(
    '__rsx_method_argument_dependencies.ts',
    `${WRAPPED_EXPRESSION_PREFIX}${args.expression.expression.expression}${WRAPPED_EXPRESSION_SUFFIX}`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const dependencies: IRsxExpressionTesterDependencyReference[] = [];
  const seen = new Set<string>();

  const addIdentifierDependency = (identifier: string): void => {
    const expressionDependency =
      args.expressionDependenciesByLabel.get(identifier);
    if (expressionDependency) {
      const key = `expression:${expressionDependency.targetKey}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      dependencies.push({
        key: expressionDependency.targetKey,
        label: identifier,
        exportName: expressionDependency.targetExportName,
        source: 'expression',
        uri: expressionDependency.targetUri.toString(),
        start: expressionDependency.targetStart,
        end: expressionDependency.targetEnd,
      });
      return;
    }

    const field = args.fieldsByTopLevelName.get(identifier);
    if (!field) {
      return;
    }
    const key = `field:${field.path.join('.')}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    dependencies.push({
      key: `${args.expression.key}::modelFieldArgument::${field.path.join('.')}`,
      label: identifier,
      exportName: identifier,
      source: 'model',
      path: field.path,
      uri: field.uri.toString(),
      start: field.start,
      end: field.end,
    });
  };

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === args.methodName
    ) {
      for (const argument of node.arguments) {
        for (const identifier of getFreeIdentifiersInRsxExpression(
          argument.getText(sourceFile),
        )) {
          if (identifier !== args.methodName) {
            addIdentifierDependency(identifier);
          }
        }
      }
      return;
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(sourceFile, visit);
  return dependencies;
}

function createRsxExpressionDependentsByKey(
  expressions: readonly IRsxExpressionTreeExpression[],
): Map<string, IRsxExpressionTesterLink[]> {
  const dependentsByKey = new Map<string, IRsxExpressionTesterLink[]>();
  for (const expression of expressions) {
    for (const dependency of expression.dependencies) {
      const dependents = dependentsByKey.get(dependency.targetKey) ?? [];
      dependents.push({
        key: expression.key,
        exportName: expression.exportName,
        uri: expression.uri.toString(),
        start: expression.start,
        end: expression.end,
      });
      dependentsByKey.set(dependency.targetKey, dependents);
    }
  }

  for (const [key, dependents] of dependentsByKey) {
    dependentsByKey.set(
      key,
      dedupeRsxExpressionTesterLinks(dependents).sort((left, right) =>
        left.exportName.localeCompare(right.exportName),
      ),
    );
  }
  return dependentsByKey;
}

function dedupeRsxExpressionTesterLinks(
  links: readonly IRsxExpressionTesterLink[],
): IRsxExpressionTesterLink[] {
  const seen = new Set<string>();
  const unique: IRsxExpressionTesterLink[] = [];
  for (const link of links) {
    if (seen.has(link.key)) {
      continue;
    }
    seen.add(link.key);
    unique.push(link);
  }
  return unique;
}

function createRsxExpressionTesterFieldModelTypeText(
  modelTypeText: string,
  fieldPath: readonly string[],
): string {
  const rootField = fieldPath[0];
  return rootField
    ? `Pick<${modelTypeText}, ${JSON.stringify(rootField)}>`
    : modelTypeText;
}

function findRsxExpressionTesterRootField(
  fields: readonly IRsxExpressionTreeModelField[],
  fieldPath: readonly string[],
): IRsxExpressionTreeModelField | null {
  const rootField = fieldPath[0];
  return fields.find((field) => field.label === rootField) ?? null;
}

function dedupeRsxExpressionTesterTargets(
  expressions: readonly IRsxExpressionTreeExpression[],
): IRsxExpressionTreeExpression[] {
  const seen = new Set<string>();
  const unique: IRsxExpressionTreeExpression[] = [];
  for (const expression of expressions) {
    if (seen.has(expression.key)) {
      continue;
    }
    seen.add(expression.key);
    unique.push(expression);
  }
  return unique.sort(compareRsxExpressionTreeExpression);
}

function getRsxExpressionTesterModelFieldExpressionUses(
  field: IRsxExpressionTreeModelField,
): IRsxExpressionTreeModelFieldExpressionUse[] {
  return dedupeRsxExpressionTesterModelFieldExpressionUses([
    ...field.expressionUses,
    ...field.children.flatMap(getRsxExpressionTesterModelFieldExpressionUses),
  ]);
}

function getRsxExpressionTesterModelFieldExpressionUsesForFields(
  fields: readonly IRsxExpressionTreeModelField[],
): IRsxExpressionTreeModelFieldExpressionUse[] {
  return dedupeRsxExpressionTesterModelFieldExpressionUses(
    fields.flatMap(getRsxExpressionTesterModelFieldExpressionUses),
  );
}

function dedupeRsxExpressionTesterModelFieldExpressionUses(
  uses: readonly IRsxExpressionTreeModelFieldExpressionUse[],
): IRsxExpressionTreeModelFieldExpressionUse[] {
  const seen = new Set<string>();
  const unique: IRsxExpressionTreeModelFieldExpressionUse[] = [];
  for (const use of uses) {
    if (seen.has(use.expression.key)) {
      continue;
    }
    seen.add(use.expression.key);
    unique.push(use);
  }
  return unique.sort((left, right) =>
    compareRsxExpressionTreeExpression(left.expression, right.expression),
  );
}

function collectRsxExpressionTesterTemplateRequirements(
  targets: readonly IRsxExpressionTesterTarget[],
): IRsxExpressionTesterTemplateRequirements {
  const arrayLengths = new Map<string, number>();
  const mapKeys = new Map<string, Set<string>>();
  for (const target of targets) {
    const sourceFile = ts.createSourceFile(
      '__rsx_expression_tester_requirements.ts',
      `${WRAPPED_EXPRESSION_PREFIX}${target.expressionText}${WRAPPED_EXPRESSION_SUFFIX}`,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const visit = (node: ts.Node): void => {
      if (ts.isElementAccessExpression(node)) {
        const path = getRsxModelFieldAccessPath(
          node.expression,
          new Map(),
        )?.path;
        if (path) {
          const pathKey = getRsxExpressionTesterModelPathKey(path);
          const argument = node.argumentExpression;
          if (ts.isNumericLiteral(argument)) {
            const index = Number(argument.text);
            if (Number.isInteger(index) && index >= 0) {
              arrayLengths.set(
                pathKey,
                Math.max(arrayLengths.get(pathKey) ?? 0, index + 1),
              );
            }
          } else if (ts.isStringLiteralLike(argument)) {
            const keys = mapKeys.get(pathKey) ?? new Set<string>();
            keys.add(argument.text);
            mapKeys.set(pathKey, keys);
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(sourceFile, visit);
  }
  return {
    arrayLengths,
    mapKeys,
  };
}

function getRsxExpressionTesterModelPathKey(
  pathSegments: readonly string[],
): string {
  return pathSegments.join('\u0000');
}

function createRsxExpressionTesterModelTemplate(
  fields: readonly IRsxExpressionTreeModelField[],
  requirements: IRsxExpressionTesterTemplateRequirements,
): string {
  if (fields.length === 0) {
    return '{\n}';
  }

  return `{\n${fields
    .map(
      (field) =>
        `  ${formatObjectLiteralPropertyName(field.label)}: ${createRsxExpressionTesterValueTemplate(field, 1, requirements)}`,
    )
    .join(',\n')}\n}`;
}

function createRsxExpressionTesterValueTemplate(
  field: IRsxExpressionTreeModelField,
  depth: number,
  requirements: IRsxExpressionTesterTemplateRequirements,
): string {
  const typeText = field.typeText?.trim() ?? 'unknown';
  const pathKey = getRsxExpressionTesterModelPathKey(field.path);
  const requiredArrayLength = requirements.arrayLengths.get(pathKey) ?? 0;
  const requiredMapKeys = requirements.mapKeys.get(pathKey);
  if (field.children.length > 0) {
    const valueTemplate = createRsxExpressionTesterObjectTemplate(
      field.children,
      depth,
      requirements,
    );
    if (field.collectionKind === 'array') {
      return createRsxExpressionTesterArrayTemplate(
        valueTemplate,
        depth,
        Math.max(1, requiredArrayLength),
      );
    }
    if (field.collectionKind === 'map' && requiredMapKeys?.size) {
      return createRsxExpressionTesterMapTemplate(
        [...requiredMapKeys],
        valueTemplate,
        depth,
      );
    }
    return valueTemplate;
  }

  const valueTemplate =
    withRsxExpressionTesterValueTemplateImportMarkers(
      field.collectionValueTemplate,
      field.collectionValueTemplateImports,
    ) ??
    withRsxExpressionTesterValueTemplateImportMarkers(
      field.valueTemplate,
      field.valueTemplateImports,
    ) ??
    createRsxExpressionTesterPrimitiveTemplate(typeText);
  if (field.collectionKind === 'array' && requiredArrayLength > 0) {
    return createRsxExpressionTesterArrayTemplate(
      valueTemplate,
      depth,
      requiredArrayLength,
    );
  }
  if (field.collectionKind === 'map' && requiredMapKeys?.size) {
    return createRsxExpressionTesterMapTemplate(
      [...requiredMapKeys],
      valueTemplate,
      depth,
    );
  }
  return (
    withRsxExpressionTesterValueTemplateImportMarkers(
      field.valueTemplate,
      field.valueTemplateImports,
    ) ?? createRsxExpressionTesterPrimitiveTemplate(typeText)
  );
}

function withRsxExpressionTesterValueTemplateImportMarkers(
  valueTemplate: string | undefined,
  imports: readonly string[] | undefined,
): string | undefined {
  if (valueTemplate === undefined || !imports || imports.length === 0) {
    return valueTemplate;
  }
  return `${valueTemplate} ${imports.join(' ')}`;
}

function createRsxExpressionTesterObjectTemplate(
  fields: readonly IRsxExpressionTreeModelField[],
  depth: number,
  requirements: IRsxExpressionTesterTemplateRequirements,
): string {
  if (fields.length === 0) {
    return '{}';
  }

  const inner = fields
    .map(
      (field) =>
        `${indentRsxTester(depth + 1)}${formatObjectLiteralPropertyName(field.label)}: ${createRsxExpressionTesterValueTemplate(field, depth + 1, requirements)}`,
    )
    .join(',\n');
  return `{\n${inner}\n${indentRsxTester(depth)}}`;
}

function createRsxExpressionTesterArrayTemplate(
  valueTemplate: string,
  depth: number,
  length: number,
): string {
  const values = Array.from({ length }, () =>
    indentRsxTesterLine(valueTemplate, depth + 1),
  ).join(',\n');
  return `[\n${values}\n${indentRsxTester(depth)}]`;
}

function createRsxExpressionTesterMapTemplate(
  keys: readonly string[],
  valueTemplate: string,
  depth: number,
): string {
  const inner = keys
    .map(
      (key) =>
        `${indentRsxTester(depth + 1)}${formatObjectLiteralPropertyName(key)}: ${indentRsxTesterLine(valueTemplate, depth + 1).trimStart()}`,
    )
    .join(',\n');
  return `{\n${inner}\n${indentRsxTester(depth)}}`;
}

function createRsxExpressionTesterPrimitiveTemplate(typeText: string): string {
  const normalized = typeText.replace(/\s+/gu, ' ');
  if (/\bnumber\b/u.test(normalized)) {
    return '0';
  }
  if (/\bstring\b/u.test(normalized)) {
    return "''";
  }
  if (/\bboolean\b/u.test(normalized)) {
    return 'false';
  }
  if (/\bDate\b/u.test(normalized)) {
    return "new Date('2026-01-01T00:00:00.000Z')";
  }
  if (/\bArray\s*</u.test(normalized) || /\[\]$/u.test(normalized)) {
    return '[]';
  }
  if (/\bnull\b/u.test(normalized)) {
    return 'null';
  }
  return 'undefined';
}

function createRsxExpressionTesterEditorModelDocument(args: {
  readonly containingFileName: string;
  readonly documentFileName: string;
  readonly modelTypeText: string;
  readonly modelTemplate: string;
}): string {
  const modelTypeText = rewriteRsxExpressionTesterImportTypeSpecifiers({
    containingFileName: args.containingFileName,
    documentFileName: args.documentFileName,
    typeText: rewriteRsxExpressionTesterExpressionReferenceTypeText(
      args.modelTypeText,
      getRsxExpressionTesterModelTemplateRuntimeExpressions(args.modelTemplate),
    ),
  });
  return [
    ...getRsxExpressionTesterModelTemplateImports(args.modelTemplate),
    ...getRsxExpressionTesterValidationPreamble(modelTypeText),
    ...getRsxExpressionTesterModelTemplateSetup(args.modelTemplate),
    '',
    `const model: __RsxTesterModel = ${args.modelTemplate.trimEnd()};`,
    '',
    'export default model;',
  ].join('\n');
}

function getRsxExpressionTesterModelTemplateImports(
  modelTemplate: string,
): readonly string[] {
  if (!modelTemplate.includes('__RSX_TESTER_EXPRESSION__')) {
    return [];
  }
  return ["import { rsx } from '@rs-x/expression-parser';"];
}

function getRsxExpressionTesterModelTemplateSetup(
  modelTemplate: string,
): readonly string[] {
  const runtimes =
    getRsxExpressionTesterModelTemplateRuntimeExpressions(modelTemplate);
  return [...runtimes.values()].map(
    (entry) =>
      `const ${entry.factoryName} = rsx<${entry.returnTypeText ?? 'unknown'}>(${JSON.stringify(entry.expressionText)});`,
  );
}

function getRsxExpressionTesterModelTemplateRuntimeExpressions(
  modelTemplate: string,
): ReadonlyMap<string, IRsxExpressionTesterExpressionReferenceRuntime> {
  const runtimes = new Map<
    string,
    IRsxExpressionTesterExpressionReferenceRuntime
  >();
  const pattern = /__RSX_TESTER_EXPRESSION__(?<json>[A-Za-z0-9+/=]+)__/gu;
  for (const match of modelTemplate.matchAll(pattern)) {
    const encoded = match.groups?.json;
    if (!encoded) {
      continue;
    }
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64').toString('utf8'),
    ) as IRsxExpressionTesterExpressionReferenceRuntime;
    runtimes.set(parsed.factoryName, parsed);
  }
  return runtimes;
}

function rewriteRsxExpressionTesterExpressionReferenceTypeText(
  typeText: string,
  runtimes: ReadonlyMap<string, IRsxExpressionTesterExpressionReferenceRuntime>,
): string {
  let rewritten = typeText;
  for (const runtime of runtimes.values()) {
    const exportName = runtime.factoryName.replace(/^__rsxTester_/u, '');
    rewritten = rewritten
      .replace(
        new RegExp(
          `ReturnType<\\s*typeof\\s+import\\([^)]*\\)\\.${escapeRegExp(exportName)}\\s*>`,
          'gu',
        ),
        `ReturnType<typeof ${runtime.factoryName}>`,
      )
      .replace(
        new RegExp(
          `typeof\\s+import\\([^)]*\\)\\.${escapeRegExp(exportName)}`,
          'gu',
        ),
        `ReturnType<typeof ${runtime.factoryName}>`,
      );
  }
  return rewritten;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function rewriteRsxExpressionTesterImportTypeSpecifiers(args: {
  readonly containingFileName: string;
  readonly documentFileName: string;
  readonly typeText: string;
}): string {
  return args.typeText.replace(
    /import\s*\(\s*(['"])([^'"]+)\1\s*\)/gu,
    (fullText, quote: string, moduleName: string) => {
      const resolvedFileName = resolveRsxExpressionTesterModuleFileName({
        containingFile: args.containingFileName,
        moduleName,
      });
      if (!resolvedFileName) {
        return fullText;
      }

      const rewrittenModuleName = formatRelativeModuleSpecifier(
        path.dirname(args.documentFileName),
        resolvedFileName,
      );
      return `import(${quote}${rewrittenModuleName}${quote})`;
    },
  );
}

function formatRelativeModuleSpecifier(
  fromDirectory: string,
  toFileName: string,
): string {
  const parsed = path.parse(toFileName);
  const withoutExtension =
    parsed.ext && ['.ts', '.tsx', '.mts', '.cts', '.rsx'].includes(parsed.ext)
      ? path.join(parsed.dir, parsed.name)
      : toFileName;
  const relative = path
    .relative(fromDirectory, withoutExtension)
    .split(path.sep)
    .join('/');
  return relative.startsWith('.') ? relative : `./${relative}`;
}

function resolveRsxExpressionTesterModuleFileName(args: {
  readonly containingFile: string;
  readonly moduleName: string;
}): string | null {
  const resolved = resolveRsxDependencyModuleFileName(args);
  if (resolved) {
    return resolved;
  }
  if (!args.moduleName.startsWith('.')) {
    return null;
  }

  const base = path.resolve(path.dirname(args.containingFile), args.moduleName);
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mts`,
    `${base}.cts`,
    `${base}.rsx`,
  ]) {
    if (ts.sys.fileExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

function indentRsxTester(depth: number): string {
  return '  '.repeat(depth);
}

function indentRsxTesterLine(text: string, depth: number): string {
  const indent = indentRsxTester(depth);
  return text
    .split('\n')
    .map((line) => `${indent}${line}`)
    .join('\n');
}

function formatObjectLiteralPropertyName(name: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(name) ? name : JSON.stringify(name);
}

async function runRsxExpressionTester(
  data: IRsxExpressionTesterData,
  modelCode: string,
  modelFileName: string = path.join(
    path.dirname(data.containingFileName),
    '__rsx_expression_tester__.ts',
  ),
): Promise<IRsxExpressionTesterRunResult> {
  const validationDiagnostics = validateRsxExpressionTesterModelCode({
    fileName: modelFileName,
    modelTypeText: rewriteRsxExpressionTesterImportTypeSpecifiers({
      containingFileName: data.containingFileName,
      documentFileName: modelFileName,
      typeText: rewriteRsxExpressionTesterExpressionReferenceTypeText(
        data.modelTypeText,
        getRsxExpressionTesterModelTemplateRuntimeExpressions(
          data.modelTemplate,
        ),
      ),
    }),
    setupLines: [
      ...getRsxExpressionTesterModelTemplateImports(data.modelTemplate),
      ...getRsxExpressionTesterModelTemplateSetup(data.modelTemplate),
    ],
    modelCode,
  });
  if (validationDiagnostics.length > 0) {
    return {
      ok: false,
      diagnostics: validationDiagnostics,
      values: [],
    };
  }

  const parsedModel = parseRsxExpressionTesterModelValue({
    fileName: modelFileName,
    modelCode,
  });
  if (!parsedModel.ok) {
    return {
      ok: false,
      diagnostics: [parsedModel.message],
      values: [],
    };
  }

  const liveRun = createRsxExpressionTesterLiveRun(
    data.targets,
    data.dependencyTargets,
    parsedModel.value,
  );
  const values = liveRun.values;

  return {
    ok: values.every((value) => !value.error),
    diagnostics: [],
    values,
    model: parsedModel.value,
    liveRun,
  };
}

function validateRsxExpressionTesterModelCode(args: {
  readonly fileName: string;
  readonly modelTypeText: string;
  readonly setupLines?: readonly string[];
  readonly modelCode: string;
}): string[] {
  const moduleTemplate = getRsxExpressionTesterModuleTemplate(args.modelCode);
  if (moduleTemplate?.ok === false) {
    return moduleTemplate.diagnostics;
  }

  const preambleLines = getRsxExpressionTesterValidationPreamble(
    args.modelTypeText,
  );
  const validationPreambleLines = moduleTemplate?.declaresTesterModel
    ? []
    : preambleLines;
  const setupLines = (args.setupLines ?? []).filter(
    (line) =>
      !args.modelCode.includes(getRsxExpressionTesterSetupFactoryName(line)),
  );
  const sourceText = moduleTemplate
    ? [
        ...validationPreambleLines,
        ...setupLines,
        moduleTemplate.validationCode,
        '__rsxModel;',
      ].join('\n')
    : [
        ...preambleLines,
        `const model: __RsxTesterModel = ${args.modelCode};`,
        'model;',
      ].join('\n');
  const sourceFile = ts.createSourceFile(
    args.fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  if (sourceFile.parseDiagnostics.length > 0) {
    return sourceFile.parseDiagnostics.map((diagnostic) =>
      formatRsxExpressionTesterDiagnostic(sourceFile, diagnostic),
    );
  }

  const compilerOptions: ts.CompilerOptions = {
    noEmit: true,
    strict: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
  };
  const defaultHost = createRsxImportAwareCompilerHost({
    options: compilerOptions,
    rootNames: [args.fileName],
  });
  const host: ts.CompilerHost = {
    ...defaultHost,
    getSourceFile: (
      fileName,
      languageVersion,
      onError,
      shouldCreateNewSourceFile,
    ) =>
      path.normalize(fileName) === path.normalize(args.fileName)
        ? sourceFile
        : defaultHost.getSourceFile(
            fileName,
            languageVersion,
            onError,
            shouldCreateNewSourceFile,
          ),
    fileExists: (fileName) =>
      path.normalize(fileName) === path.normalize(args.fileName) ||
      defaultHost.fileExists(fileName),
    readFile: (fileName) =>
      path.normalize(fileName) === path.normalize(args.fileName)
        ? sourceText
        : defaultHost.readFile(fileName),
    resolveModuleNames: (moduleNames, containingFile) =>
      moduleNames.map(
        (moduleName) =>
          resolveRsxExpressionTesterTypeModule(moduleName) ??
          ts.resolveModuleName(
            moduleName,
            containingFile,
            compilerOptions,
            defaultHost,
          ).resolvedModule,
      ),
    writeFile: () => {},
  };
  const program = ts.createProgram([args.fileName], compilerOptions, host);
  return ts
    .getPreEmitDiagnostics(program)
    .filter((diagnostic) => diagnostic.file?.fileName === args.fileName)
    .map((diagnostic) =>
      formatRsxExpressionTesterDiagnostic(sourceFile, diagnostic, {
        lineOffset: -validationPreambleLines.length - setupLines.length,
      }),
    );
}

function getRsxExpressionTesterSetupFactoryName(setupLine: string): string {
  const match = setupLine.match(/const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=/u);
  return match?.[1] ?? setupLine;
}

function getRsxExpressionTesterValidationPreamble(
  modelTypeText: string,
): readonly string[] {
  return [
    `type __RsxTesterDeclaredModel = ${modelTypeText};`,
    'type __RsxTesterModel = __RsxTesterDeclaredModel;',
  ];
}

function resolveRsxExpressionTesterTypeModule(
  moduleName: string,
): ts.ResolvedModuleFull | undefined {
  if (moduleName !== '@rs-x/expression-parser') {
    return undefined;
  }
  try {
    const packageJson = createRequire(__filename).resolve(
      '@rs-x/expression-parser/package.json',
    );
    return {
      resolvedFileName: path.join(path.dirname(packageJson), 'dist/index.d.ts'),
      extension: ts.Extension.Dts,
      isExternalLibraryImport: true,
    };
  } catch {
    return undefined;
  }
}

function getRsxExpressionTesterModuleTemplate(modelCode: string):
  | {
      readonly ok: true;
      readonly validationCode: string;
      readonly declaresTesterModel: boolean;
    }
  | { readonly ok: false; readonly diagnostics: readonly string[] }
  | null {
  const sourceFile = ts.createSourceFile(
    '__rsx_expression_tester_model__.ts',
    modelCode,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const hasModuleSyntax =
    /\b(?:import|export)\b/u.test(modelCode) ||
    sourceFile.statements.some((statement) =>
      ts.canHaveModifiers(statement)
        ? (ts.getModifiers(statement) ?? []).some(
            (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
          )
        : false,
    );

  if (!hasModuleSyntax) {
    return null;
  }

  if (sourceFile.parseDiagnostics.length > 0) {
    return {
      ok: false,
      diagnostics: sourceFile.parseDiagnostics.map((diagnostic) =>
        formatRsxExpressionTesterDiagnostic(sourceFile, diagnostic),
      ),
    };
  }

  const defaultExport = sourceFile.statements.find(
    (statement): statement is ts.ExportAssignment =>
      ts.isExportAssignment(statement) && !statement.isExportEquals,
  );
  if (!defaultExport) {
    return {
      ok: false,
      diagnostics: ['Model template modules must export default model values.'],
    };
  }

  const exportStart = defaultExport.getStart(sourceFile);
  const expressionStart = defaultExport.expression.getStart(sourceFile);
  return {
    ok: true,
    declaresTesterModel: /\b__RsxTesterModel\b/u.test(modelCode),
    validationCode: [
      modelCode.slice(0, exportStart),
      'const __rsxModel: __RsxTesterModel = ',
      modelCode.slice(expressionStart),
    ].join(''),
  };
}

function formatRsxExpressionTesterDiagnostic(
  sourceFile: ts.SourceFile,
  diagnostic: ts.Diagnostic,
  options: { readonly lineOffset?: number } = {},
): string {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
  if (typeof diagnostic.start !== 'number') {
    return message;
  }
  const position = sourceFile.getLineAndCharacterOfPosition(diagnostic.start);
  const line = Math.max(1, position.line + 1 + (options.lineOffset ?? 0));
  return `${line}:${position.character + 1} ${message}`;
}

function parseRsxExpressionTesterModelValue(args: {
  readonly fileName: string;
  readonly modelCode: string;
}):
  | { readonly ok: true; readonly value: object }
  | { readonly ok: false; readonly message: string } {
  const moduleTemplate = getRsxExpressionTesterModuleTemplate(args.modelCode);
  if (moduleTemplate) {
    return moduleTemplate.ok
      ? evaluateRsxExpressionTesterModelModule(args)
      : {
          ok: false,
          message: moduleTemplate.diagnostics.join('\n'),
        };
  }

  return parseRsxExpressionTesterObjectLiteralValue(args.modelCode);
}

function parseRsxExpressionTesterObjectLiteralValue(
  modelCode: string,
):
  | { readonly ok: true; readonly value: object }
  | { readonly ok: false; readonly message: string } {
  const sourceFile = ts.createSourceFile(
    '__rsx_expression_tester_model__.ts',
    `const model = (${modelCode});`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  if (sourceFile.parseDiagnostics.length > 0) {
    return {
      ok: false,
      message: ts.flattenDiagnosticMessageText(
        sourceFile.parseDiagnostics[0].messageText,
        '\n',
      ),
    };
  }

  const statement = sourceFile.statements[0];
  const initializer =
    ts.isVariableStatement(statement) &&
    statement.declarationList.declarations[0]?.initializer;
  if (!initializer) {
    return {
      ok: false,
      message: 'Model template must be an object literal.',
    };
  }

  const value = convertRsxExpressionTesterLiteral(initializer, sourceFile);
  if (!value.ok || !isPlainObject(value.value)) {
    return {
      ok: false,
      message: value.ok
        ? 'Model template must evaluate to an object literal.'
        : value.message,
    };
  }
  return {
    ok: true,
    value: value.value,
  };
}

function evaluateRsxExpressionTesterModelModule(args: {
  readonly fileName: string;
  readonly modelCode: string;
}):
  | { readonly ok: true; readonly value: object }
  | { readonly ok: false; readonly message: string } {
  try {
    const output = ts.transpileModule(args.modelCode, {
      fileName: args.fileName,
      reportDiagnostics: true,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    });
    const diagnostic = output.diagnostics?.[0];
    if (diagnostic) {
      return {
        ok: false,
        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      };
    }

    const localRequire = createRequire(args.fileName);
    const extensionRequire = createRequire(__filename);
    const requireFromTester = (specifier: string): unknown => {
      try {
        return localRequire(specifier);
      } catch {
        if (specifier === '@rs-x/expression-parser') {
          return extensionRequire(specifier);
        }
        return extensionRequire(specifier);
      }
    };
    const module = {
      exports: {} as Record<string, unknown>,
    };
    const execute = new Function(
      'exports',
      'require',
      'module',
      '__filename',
      '__dirname',
      `${output.outputText}\n//# sourceURL=${args.fileName.replace(/\s/gu, '%20')}`,
    );
    execute(
      module.exports,
      requireFromTester,
      module,
      args.fileName,
      path.dirname(args.fileName),
    );

    const value = module.exports.default;
    if (!isPlainObject(value)) {
      return {
        ok: false,
        message: 'Model template default export must evaluate to an object.',
      };
    }
    return {
      ok: true,
      value,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function convertRsxExpressionTesterLiteral(
  node: ts.Expression,
  sourceFile: ts.SourceFile,
):
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly message: string } {
  if (ts.isParenthesizedExpression(node)) {
    return convertRsxExpressionTesterLiteral(node.expression, sourceFile);
  }
  if (
    ts.isStringLiteralLike(node) ||
    ts.isNoSubstitutionTemplateLiteral(node)
  ) {
    return { ok: true, value: node.text };
  }
  if (ts.isNumericLiteral(node)) {
    return { ok: true, value: Number(node.text) };
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return { ok: true, value: true };
  }
  if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return { ok: true, value: false };
  }
  if (node.kind === ts.SyntaxKind.NullKeyword) {
    return { ok: true, value: null };
  }
  if (node.kind === ts.SyntaxKind.UndefinedKeyword) {
    return { ok: true, value: undefined };
  }
  if (
    ts.isPrefixUnaryExpression(node) &&
    (node.operator === ts.SyntaxKind.MinusToken ||
      node.operator === ts.SyntaxKind.PlusToken) &&
    ts.isNumericLiteral(node.operand)
  ) {
    const value = Number(node.operand.text);
    return {
      ok: true,
      value: node.operator === ts.SyntaxKind.MinusToken ? -value : value,
    };
  }
  if (ts.isArrayLiteralExpression(node)) {
    const values: unknown[] = [];
    for (const element of node.elements) {
      if (ts.isSpreadElement(element)) {
        return {
          ok: false,
          message: 'Spread elements are not supported in model templates.',
        };
      }
      const value = convertRsxExpressionTesterLiteral(element, sourceFile);
      if (!value.ok) {
        return value;
      }
      values.push(value.value);
    }
    return { ok: true, value: values };
  }
  if (ts.isObjectLiteralExpression(node)) {
    const value: Record<string, unknown> = {};
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property)) {
        return {
          ok: false,
          message: 'Model templates support property assignments only.',
        };
      }
      const propertyName = getRsxExpressionTesterPropertyName(property.name);
      if (propertyName === null) {
        return {
          ok: false,
          message:
            'Model template property names must be identifiers or string literals.',
        };
      }
      const propertyValue = convertRsxExpressionTesterLiteral(
        property.initializer,
        sourceFile,
      );
      if (!propertyValue.ok) {
        return propertyValue;
      }
      value[propertyName] = propertyValue.value;
    }
    return { ok: true, value };
  }
  if (
    ts.isNewExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'Date'
  ) {
    const args = node.arguments ?? [];
    if (args.length > 1) {
      return {
        ok: false,
        message: 'Date values support zero or one literal argument.',
      };
    }
    if (args.length === 0) {
      return { ok: true, value: new Date() };
    }
    const arg = convertRsxExpressionTesterLiteral(args[0], sourceFile);
    if (!arg.ok) {
      return arg;
    }
    if (typeof arg.value !== 'string' && typeof arg.value !== 'number') {
      return {
        ok: false,
        message: 'Date values require a string or number literal argument.',
      };
    }
    return { ok: true, value: new Date(arg.value) };
  }

  return {
    ok: false,
    message: `Unsupported model template expression: ${node.getText(sourceFile)}`,
  };
}

function getRsxExpressionTesterPropertyName(
  name: ts.PropertyName,
): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) {
    return name.text;
  }
  if (ts.isNumericLiteral(name)) {
    return name.text;
  }
  return null;
}

function isPlainObject(value: unknown): value is object {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function createRsxExpressionTesterLiveRun(
  targets: readonly IRsxExpressionTesterTarget[],
  dependencyTargets: readonly IRsxExpressionTesterTarget[],
  model: object,
): IRsxExpressionTesterLiveRun & {
  readonly values: readonly IRsxExpressionTesterValue[];
} {
  let onValue: ((value: IRsxExpressionTesterValue) => void) | undefined;
  let disposed = false;
  const expressions: IExpression[] =
    collectRsxExpressionTesterModelExpressions(model);
  expressions.push(
    ...createRsxExpressionTesterDependencyExpressions(
      [...targets, ...dependencyTargets],
      model,
    ),
  );
  const subscriptions: Array<{ unsubscribe(): void }> = [];
  const values: IRsxExpressionTesterValue[] = [];
  const latestValues = new Map<string, IRsxExpressionTesterValue>();
  const latestDependencyValues = new Map<string, unknown>();

  for (const target of targets) {
    try {
      const expression = rsx(target.expressionText, { compiled: false })(model);
      expressions.push(expression);
      const emit = (): void => {
        if (disposed) {
          return;
        }
        const value: IRsxExpressionTesterValue = {
          key: target.key,
          exportName: target.exportName,
          value: formatRsxExpressionTesterValue(expression.value),
          dependencies: createRsxExpressionTesterDependencyStatuses(
            target,
            model,
            latestDependencyValues,
          ),
        };
        latestValues.set(value.key, value);
        onValue?.(value);
      };
      for (const dependency of target.dependencies) {
        const dependencyExpression = getRsxExpressionTesterDependencyExpression(
          dependency,
          model,
        );
        if (!dependencyExpression) {
          continue;
        }
        subscriptions.push(
          dependencyExpression.changed.subscribe((changedExpression) => {
            updateRsxExpressionTesterLatestDependencyValue(
              latestDependencyValues,
              dependency,
              changedExpression.value,
            );
            queueMicrotask(emit);
          }),
        );
      }
      subscriptions.push(expression.changed.subscribe(emit));
      values.push({
        key: target.key,
        exportName: target.exportName,
        value: RSX_EXPRESSION_TESTER_PENDING_VALUE,
        dependencies: createRsxExpressionTesterDependencyStatuses(
          target,
          model,
          latestDependencyValues,
        ),
      });
      if (typeof expression.value !== 'undefined') {
        queueMicrotask(emit);
      }
    } catch (error) {
      values.push({
        key: target.key,
        exportName: target.exportName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    values,
    onValue(callback) {
      onValue = callback;
      for (const value of latestValues.values()) {
        callback(value);
      }
    },
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      for (const subscription of subscriptions.splice(0)) {
        subscription.unsubscribe();
      }
      for (const expression of expressions.splice(0)) {
        expression.dispose();
      }
      onValue = undefined;
    },
  };
}

function createRsxExpressionTesterDependencyExpressions(
  targets: readonly IRsxExpressionTesterTarget[],
  model: object,
): IExpression[] {
  const targetByKey = new Map(targets.map((target) => [target.key, target]));
  const createdExpressions: IExpression[] = [];
  const creatingKeys = new Set<string>();
  const createdKeys = new Set<string>();
  const modelRecord = model as Record<string, unknown>;

  const ensureDependencyExpression = (
    dependency: IRsxExpressionTesterLink,
  ): void => {
    if (
      dependency.matchKind !== 'exportValueName' ||
      !dependency.label ||
      Object.prototype.hasOwnProperty.call(modelRecord, dependency.label)
    ) {
      return;
    }

    const target = targetByKey.get(dependency.key);
    if (
      !target ||
      creatingKeys.has(target.key) ||
      createdKeys.has(target.key)
    ) {
      return;
    }

    creatingKeys.add(target.key);
    for (const targetDependency of target.dependencies) {
      ensureDependencyExpression(targetDependency);
    }
    const expression = rsx(target.expressionText, { compiled: false })(model);
    modelRecord[dependency.label] = expression;
    createdExpressions.push(expression);
    createdKeys.add(target.key);
    creatingKeys.delete(target.key);
  };

  for (const target of targets) {
    for (const dependency of target.dependencies) {
      ensureDependencyExpression(dependency);
    }
  }

  return createdExpressions;
}

function updateRsxExpressionTesterLatestDependencyValue(
  latestDependencyValues: Map<string, unknown>,
  dependency: IRsxExpressionTesterLink,
  value: unknown,
): void {
  if (typeof value !== 'undefined') {
    latestDependencyValues.set(dependency.key, value);
  }
}

function createRsxExpressionTesterDependencyStatuses(
  target: IRsxExpressionTesterTarget,
  model: object,
  latestDependencyValues: ReadonlyMap<string, unknown> = new Map(),
): IRsxExpressionTesterDependencyStatus[] {
  const modelRecord = model as Record<string, unknown>;
  const expressionDependencies = target.dependencies.map((dependency) => {
    const label = dependency.label ?? dependency.exportName;
    if (latestDependencyValues.has(dependency.key)) {
      return {
        key: dependency.key,
        label,
        exportName: dependency.exportName,
        source: 'expression',
        state: 'ready',
        value: formatRsxExpressionTesterValue(
          latestDependencyValues.get(dependency.key),
        ),
        uri: dependency.uri,
        start: dependency.start,
        end: dependency.end,
      };
    }
    const hasValue = Object.prototype.hasOwnProperty.call(modelRecord, label);
    if (!hasValue) {
      return {
        key: dependency.key,
        label,
        exportName: dependency.exportName,
        source: 'unknown',
        state: 'missing',
        value: 'missing',
        uri: dependency.uri,
        start: dependency.start,
        end: dependency.end,
      };
    }

    const rawValue = modelRecord[label];
    if (isRsxExpressionTesterExpressionInstance(rawValue)) {
      const current = rawValue.value;
      return {
        key: dependency.key,
        label,
        exportName: dependency.exportName,
        source: 'expression',
        state: typeof current === 'undefined' ? 'pending' : 'ready',
        value:
          typeof current === 'undefined'
            ? RSX_EXPRESSION_TESTER_PENDING_VALUE
            : formatRsxExpressionTesterValue(current),
        uri: dependency.uri,
        start: dependency.start,
        end: dependency.end,
      };
    }

    return {
      key: dependency.key,
      label,
      exportName: dependency.exportName,
      source: 'model',
      state: typeof rawValue === 'undefined' ? 'missing' : 'ready',
      value:
        typeof rawValue === 'undefined'
          ? 'undefined'
          : formatRsxExpressionTesterValue(rawValue),
      uri: dependency.uri,
      start: dependency.start,
      end: dependency.end,
    };
  });
  const modelDependencies = target.modelFieldDependencies.map((field) => {
    const rawValue = getRsxExpressionTesterModelPathValue(model, field.path);
    return {
      key: field.key,
      label: field.label,
      exportName: field.label,
      source: 'model' as const,
      state:
        typeof rawValue === 'undefined'
          ? ('missing' as const)
          : ('ready' as const),
      value:
        typeof rawValue === 'undefined'
          ? 'undefined'
          : formatRsxExpressionTesterValue(rawValue),
      uri: field.uri,
      start: field.start,
      end: field.end,
      children: field.argumentDependencies.map((dependency) =>
        createRsxExpressionTesterDependencyReferenceStatus(
          dependency,
          model,
          latestDependencyValues,
        ),
      ),
    };
  });
  return [...expressionDependencies, ...modelDependencies];
}

function createRsxExpressionTesterDependencyReferenceStatus(
  dependency: IRsxExpressionTesterDependencyReference,
  model: object,
  latestDependencyValues: ReadonlyMap<string, unknown>,
): IRsxExpressionTesterDependencyStatus {
  if (dependency.source === 'expression') {
    const value = latestDependencyValues.get(dependency.key);
    return {
      key: dependency.key,
      label: dependency.label,
      exportName: dependency.exportName,
      source: 'expression',
      state: typeof value === 'undefined' ? 'pending' : 'ready',
      value:
        typeof value === 'undefined'
          ? RSX_EXPRESSION_TESTER_PENDING_VALUE
          : formatRsxExpressionTesterValue(value),
      uri: dependency.uri,
      start: dependency.start,
      end: dependency.end,
    };
  }

  const rawValue = getRsxExpressionTesterModelPathValue(
    model,
    dependency.path ?? [dependency.label],
  );
  return {
    key: dependency.key,
    label: dependency.label,
    exportName: dependency.exportName,
    source: 'model',
    state: typeof rawValue === 'undefined' ? 'missing' : 'ready',
    value:
      typeof rawValue === 'undefined'
        ? 'undefined'
        : formatRsxExpressionTesterValue(rawValue),
    uri: dependency.uri,
    start: dependency.start,
    end: dependency.end,
  };
}

function getRsxExpressionTesterModelPathValue(
  model: object,
  pathSegments: readonly string[],
): unknown {
  let value: unknown = model;
  for (const segment of pathSegments) {
    if (value === null || typeof value !== 'object') {
      return undefined;
    }
    value = (value as Record<string, unknown>)[segment];
  }
  return value;
}

function getRsxExpressionTesterDependencyExpression(
  dependency: IRsxExpressionTesterLink,
  model: object,
): IExpression | null {
  const label = dependency.label ?? dependency.exportName;
  const value = (model as Record<string, unknown>)[label];
  return isRsxExpressionTesterExpressionInstance(value) ? value : null;
}

function isRsxExpressionTesterExpressionInstance(
  value: unknown,
): value is IExpression {
  return (
    value instanceof AbstractExpression || value instanceof CompiledExpression
  );
}

function collectRsxExpressionTesterModelExpressions(
  model: object,
): IExpression[] {
  const expressions: IExpression[] = [];
  const seen = new Set<unknown>();
  const visit = (value: unknown): void => {
    if (value === null || typeof value !== 'object' || seen.has(value)) {
      return;
    }
    seen.add(value);
    if (isRsxExpressionTesterExpressionInstance(value)) {
      expressions.push(value);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }
      return;
    }
    for (const nested of Object.values(value)) {
      visit(nested);
    }
  };
  visit(model);
  return expressions;
}

function waitForRsxExpressionTesterValue(
  expression: IExpression,
): Promise<unknown> {
  return new Promise((resolve) => {
    let settled = false;
    let subscription: { unsubscribe(): void } | undefined;
    const finish = (value: unknown): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      subscription?.unsubscribe();
      resolve(value);
    };
    const timeout = setTimeout(() => finish(expression.value), 1200);
    subscription = expression.changed.subscribe(() => finish(expression.value));
  });
}

function formatRsxExpressionTesterValue(value: unknown): string {
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'undefined') {
    return 'undefined';
  }
  if (typeof value === 'function') {
    return '[function]';
  }
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
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

async function getRsxExpressionGraphPreviewDataWithValues(
  data: IRsxExpressionGraphPreviewData,
  model: object | undefined,
): Promise<IRsxExpressionGraphPreviewData> {
  if (!model || data.nodes.length === 0) {
    return data;
  }

  const nodes = await Promise.all(
    data.nodes.map(async (node): Promise<IRsxExpressionGraphPreviewNode> => {
      const value = await evaluateRsxExpressionGraphPreviewNode(
        node.expressionText,
        model,
      );
      return value.ok
        ? { ...node, valueText: value.value }
        : { ...node, valueError: value.error };
    }),
  );

  return {
    ...data,
    nodes,
    nodeHeight: 196,
  };
}

async function evaluateRsxExpressionGraphPreviewNode(
  expressionText: string,
  model: object,
): Promise<
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly error: string }
> {
  let expression: IExpression | undefined;
  try {
    expression = rsx(expressionText, { compiled: false })(model);
    const value = await waitForRsxExpressionTesterValue(expression);
    return {
      ok: true,
      value: formatRsxExpressionTesterValue(value),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    expression?.dispose();
  }
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
      margin: 0 10px;
      border-radius: 6px;
      padding: 8px;
      background: var(--rsx-code-bg);
      color: var(--rsx-fg);
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: var(--vscode-editor-font-size, 12px);
      line-height: 1.35;
      white-space: pre-wrap;
    }

    .nodeValue {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 6px;
      overflow: hidden;
      margin: 0 10px 10px;
      color: var(--rsx-muted);
      font-size: 11px;
      line-height: 1.35;
    }

    .nodeValueLabel {
      color: var(--rsx-accent);
      font-weight: 600;
    }

    .nodeValueText {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: pre;
      font-family: var(--vscode-editor-font-family, monospace);
    }

    .nodeValueText.error {
      color: var(--vscode-errorForeground);
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
      const valueText = node.valueError || node.valueText;
      const valueClass = node.valueError ? 'nodeValueText error' : 'nodeValueText';
      const valueMarkup = typeof valueText === 'string'
        ? '<div class="nodeValue"><span class="nodeValueLabel">Value</span><span class="' + valueClass + '" title="' + esc(valueText) + '">' + esc(valueText) + '</span></div>'
        : '';
      element.innerHTML = [
        '<div class="nodeHeader"><div class="nodeType" title="' + esc(node.returnTypeText || 'RS-X') + '">' + esc(node.returnTypeText || 'RS-X') + '</div></div>',
        '<pre class="nodeExpression">' + esc(node.expressionText) + '</pre>',
        valueMarkup,
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

async function readRsxExpressionInstanceGroups(
  files: readonly IRsxExpressionTreeFile[],
): Promise<IRsxExpressionTreeExpressionInstanceGroup[]> {
  const expressions = files.flatMap((file) => file.expressions);
  if (expressions.length === 0) {
    return [];
  }

  const expressionsByExportName = new Map(
    expressions.map((expression) => [expression.exportName, expression]),
  );
  let uris: readonly vscode.Uri[];
  try {
    const found = await vscode.workspace.findFiles(
      '**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}',
      '**/{node_modules,dist,out-tsc,coverage,.git,.rsx}/**',
    );
    uris = Array.isArray(found) ? found : [];
  } catch {
    uris = [];
  }

  const instancesByExpressionKey = new Map<
    string,
    IRsxExpressionTreeExpressionInstance[]
  >();
  await Promise.all(
    uris.map(async (uri) => {
      const instances = await readRsxExpressionInstancesInFile(
        uri,
        expressionsByExportName,
      );
      for (const instance of instances) {
        const existing = instancesByExpressionKey.get(instance.expression.key);
        if (existing) {
          existing.push(instance);
        } else {
          instancesByExpressionKey.set(instance.expression.key, [instance]);
        }
      }
    }),
  );

  return expressions
    .map((expression): IRsxExpressionTreeExpressionInstanceGroup | null => {
      const instances = instancesByExpressionKey.get(expression.key) ?? [];
      if (instances.length === 0) {
        return null;
      }
      return {
        kind: 'expressionInstanceGroup',
        key: expression.key,
        expression,
        instances: instances.sort(compareRsxExpressionInstances),
      };
    })
    .filter(
      (group): group is IRsxExpressionTreeExpressionInstanceGroup =>
        group !== null,
    )
    .sort((left, right) =>
      left.expression.exportName.localeCompare(right.expression.exportName),
    );
}

async function readRsxExpressionInstancesInFile(
  uri: vscode.Uri,
  expressionsByExportName: ReadonlyMap<string, IRsxExpressionTreeExpression>,
): Promise<IRsxExpressionTreeExpressionInstance[]> {
  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    const text = new TextDecoder('utf8').decode(bytes);
    const debugHooksByExpression =
      await getRsxDebugHooksByExpressionForUri(uri);
    const sourceFile = ts.createSourceFile(
      uri.fsPath,
      text,
      ts.ScriptTarget.Latest,
      true,
      getScriptKindForRsxInstanceScan(uri.fsPath),
    );
    const relativePath = vscode.workspace.asRelativePath(uri, false);
    const instances: IRsxExpressionTreeExpressionInstance[] = [];
    const expressionByLocalName = new Map(
      getRsxExpressionImportsByLocalName(sourceFile, expressionsByExportName),
    );
    const expressionNamespaceNames =
      getRsxExpressionNamespaceImportNames(sourceFile);

    const addInstance = (
      expression: IRsxExpressionTreeExpression,
      target: ts.Node,
    ): void => {
      const start = target.getStart(sourceFile);
      const end = target.getEnd();
      const position = sourceFile.getLineAndCharacterOfPosition(start);
      const instanceId = createRsxDebugHookInstanceId({
        relativePath,
        start,
        expressionName: expression.exportName,
      });
      const debugHookConfig = debugHooksByExpression.get(expression.exportName);
      const debugHook =
        debugHookConfig?.instances.get(instanceId) ?? debugHookConfig?.group;
      instances.push({
        kind: 'expressionInstance',
        key: `${expression.key}:${uri.toString()}:${start}`,
        expression,
        uri,
        relativePath,
        start,
        end,
        line: position.line,
        column: position.character,
        debugHook,
      });
    };

    const visit = (node: ts.Node): void => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer
      ) {
        const expression = getRsxExpressionInstanceReference(
          node.initializer,
          expressionByLocalName,
          expressionNamespaceNames,
          expressionsByExportName,
        );
        if (expression) {
          expressionByLocalName.set(node.name.text, expression);
        }
      } else if (ts.isCallExpression(node)) {
        const expression = getRsxExpressionInstanceReference(
          node.expression,
          expressionByLocalName,
          expressionNamespaceNames,
          expressionsByExportName,
        );
        if (expression) {
          addInstance(expression, node.expression);
        }
      } else if (ts.isPropertyAssignment(node)) {
        const expression = getRsxExpressionInstanceReference(
          node.initializer,
          expressionByLocalName,
          expressionNamespaceNames,
          expressionsByExportName,
        );
        if (expression) {
          addInstance(expression, node.initializer);
        }
      } else if (ts.isShorthandPropertyAssignment(node)) {
        const expression = getRsxExpressionInstanceReference(
          node.name,
          expressionByLocalName,
          expressionNamespaceNames,
          expressionsByExportName,
        );
        if (expression) {
          addInstance(expression, node.name);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return instances;
  } catch {
    return [];
  }
}

function getScriptKindForRsxInstanceScan(fileName: string): ts.ScriptKind {
  const extension = path.extname(fileName).toLocaleLowerCase();
  if (extension === '.tsx') {
    return ts.ScriptKind.TSX;
  }
  if (extension === '.jsx') {
    return ts.ScriptKind.JSX;
  }
  if (extension === '.js' || extension === '.mjs' || extension === '.cjs') {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TS;
}

function getRsxExpressionInstanceReference(
  expression: ts.Expression,
  expressionsByLocalName: ReadonlyMap<string, IRsxExpressionTreeExpression>,
  expressionNamespaceNames: ReadonlySet<string>,
  expressionsByExportName: ReadonlyMap<string, IRsxExpressionTreeExpression>,
): IRsxExpressionTreeExpression | undefined {
  if (ts.isIdentifier(expression)) {
    return (
      expressionsByLocalName.get(expression.text) ??
      expressionsByExportName.get(expression.text)
    );
  }
  if (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expressionNamespaceNames.has(expression.expression.text)
  ) {
    return expressionsByExportName.get(expression.name.text);
  }
  return undefined;
}

function getRsxExpressionImportsByLocalName(
  sourceFile: ts.SourceFile,
  expressionsByExportName: ReadonlyMap<string, IRsxExpressionTreeExpression>,
): ReadonlyMap<string, IRsxExpressionTreeExpression> {
  const expressionsByLocalName = new Map<
    string,
    IRsxExpressionTreeExpression
  >();
  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !statement.importClause?.namedBindings ||
      !ts.isNamedImports(statement.importClause.namedBindings)
    ) {
      continue;
    }
    for (const element of statement.importClause.namedBindings.elements) {
      const exportName = element.propertyName?.text ?? element.name.text;
      const expression = expressionsByExportName.get(exportName);
      if (expression) {
        expressionsByLocalName.set(element.name.text, expression);
      }
    }
  }
  return expressionsByLocalName;
}

function getRsxExpressionNamespaceImportNames(
  sourceFile: ts.SourceFile,
): ReadonlySet<string> {
  const namespaceNames = new Set<string>();
  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      statement.importClause?.namedBindings &&
      ts.isNamespaceImport(statement.importClause.namedBindings)
    ) {
      namespaceNames.add(statement.importClause.namedBindings.name.text);
    }
  }
  return namespaceNames;
}

function compareRsxExpressionInstances(
  left: IRsxExpressionTreeExpressionInstance,
  right: IRsxExpressionTreeExpressionInstance,
): number {
  return (
    left.relativePath.localeCompare(right.relativePath) ||
    left.start - right.start
  );
}

async function getRsxDebugHooksByExpressionForUri(uri: vscode.Uri): Promise<
  ReadonlyMap<
    string,
    {
      readonly group?: IRsxExpressionTreeDebugHook;
      readonly instances: ReadonlyMap<string, IRsxExpressionTreeDebugHook>;
    }
  >
> {
  const configUris = resolveRsxDebugHookConfigUrisForRead(uri);
  if (configUris.length === 0) {
    return new Map();
  }
  const merged = new Map<
    string,
    {
      group?: IRsxExpressionTreeDebugHook;
      instances: Map<string, IRsxExpressionTreeDebugHook>;
    }
  >();
  for (const configUri of configUris) {
    const configText = await readWorkspaceTextFile(configUri);
    const hooks = parseRsxDebugHooksByExpression(configText);
    mergeRsxDebugHooksByExpression(merged, hooks);
  }
  return merged;
}

function parseRsxDebugHooksByExpression(configText: string | null): ReadonlyMap<
  string,
  {
    readonly group?: IRsxExpressionTreeDebugHook;
    readonly instances: ReadonlyMap<string, IRsxExpressionTreeDebugHook>;
  }
> {
  if (!configText) {
    return new Map();
  }
  try {
    const config = JSON.parse(configText) as {
      build?: {
        debugChangeHooks?: unknown;
      };
    };
    if (
      !config.build?.debugChangeHooks ||
      typeof config.build.debugChangeHooks !== 'object' ||
      Array.isArray(config.build.debugChangeHooks)
    ) {
      return new Map();
    }
    return parseRsxDebugHookEntries(config.build.debugChangeHooks);
  } catch {
    return new Map();
  }
}

function parseRsxDebugHookEntries(value: object): ReadonlyMap<
  string,
  {
    readonly group?: IRsxExpressionTreeDebugHook;
    readonly instances: ReadonlyMap<string, IRsxExpressionTreeDebugHook>;
  }
> {
  return new Map(
    Object.entries(value)
      .map(([expressionName, expressionValue]) => {
        if (
          !expressionValue ||
          typeof expressionValue !== 'object' ||
          Array.isArray(expressionValue)
        ) {
          return null;
        }
        const expressionConfig = expressionValue as {
          group?: unknown;
          instances?: unknown;
        };
        const group = parseRsxDebugHookConfig(expressionConfig.group, 'group');
        const instances =
          expressionConfig.instances &&
          typeof expressionConfig.instances === 'object' &&
          !Array.isArray(expressionConfig.instances)
            ? new Map(
                Object.entries(expressionConfig.instances)
                  .map(([instanceId, hookConfig]) => {
                    const hook = parseRsxDebugHookConfig(
                      hookConfig,
                      'instance',
                    );
                    return hook ? ([instanceId, hook] as const) : null;
                  })
                  .filter(
                    (
                      entry,
                    ): entry is readonly [
                      string,
                      IRsxExpressionTreeDebugHook,
                    ] => entry !== null,
                  ),
              )
            : new Map<string, IRsxExpressionTreeDebugHook>();
        return group || instances.size > 0
          ? ([expressionName, { group, instances }] as const)
          : null;
      })
      .filter(
        (
          entry,
        ): entry is readonly [
          string,
          {
            readonly group?: IRsxExpressionTreeDebugHook;
            readonly instances: ReadonlyMap<
              string,
              IRsxExpressionTreeDebugHook
            >;
          },
        ] => entry !== null,
      ),
  );
}

function mergeRsxDebugHooksByExpression(
  target: Map<
    string,
    {
      group?: IRsxExpressionTreeDebugHook;
      instances: Map<string, IRsxExpressionTreeDebugHook>;
    }
  >,
  source: ReadonlyMap<
    string,
    {
      readonly group?: IRsxExpressionTreeDebugHook;
      readonly instances: ReadonlyMap<string, IRsxExpressionTreeDebugHook>;
    }
  >,
): void {
  for (const [expressionName, sourceConfig] of source) {
    const targetConfig = target.get(expressionName) ?? {
      instances: new Map<string, IRsxExpressionTreeDebugHook>(),
    };
    if (sourceConfig.group) {
      targetConfig.group = sourceConfig.group;
    }
    for (const [instanceId, hook] of sourceConfig.instances) {
      targetConfig.instances.set(instanceId, hook);
    }
    target.set(expressionName, targetConfig);
  }
}

function parseRsxDebugHookConfig(
  value: unknown,
  scope: 'group' | 'instance',
): IRsxExpressionTreeDebugHook | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const config = value as {
    moduleSpecifier?: unknown;
    exportName?: unknown;
    enabled?: unknown;
  };
  const moduleSpecifier =
    typeof config.moduleSpecifier === 'string'
      ? config.moduleSpecifier.trim()
      : '';
  if (!moduleSpecifier) {
    return null;
  }
  const exportName =
    typeof config.exportName === 'string' && config.exportName.trim()
      ? config.exportName.trim()
      : undefined;
  return {
    moduleSpecifier,
    exportName,
    label: exportName
      ? `${exportName} from ${moduleSpecifier}`
      : moduleSpecifier,
    enabled: config.enabled !== false,
    scope,
  };
}

function createRsxDebugHookInstanceId(args: {
  readonly relativePath: string;
  readonly start: number;
  readonly expressionName: string;
}): string {
  return `${args.relativePath}:${args.start}:${args.expressionName}`;
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
      const valueLines = [
        line.slice(getHeaderValueStartCharacter(line)).trim(),
      ];
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
    if (
      (typeName === 'Record' || typeName === 'ReadonlyRecord') &&
      args.typeNode.typeArguments &&
      args.typeNode.typeArguments.length > 1
    ) {
      return getRsxExpressionModelFieldsFromTypeNode({
        ...args,
        typeNode: args.typeNode.typeArguments[1],
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

  const importedType = getImportedModelTypeReference(
    args.typeNode,
    args.sourceFile,
  );
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
      valueTemplate: getRsxExpressionTesterValueTemplateFromTypeNode({
        containingFile: args.containingFile,
        sourceFile: args.sourceFile,
        typeNode: args.typeNode,
        seenTypes: args.seenTypes,
      }),
      valueTemplateImports:
        getRsxExpressionTesterValueTemplateImportsFromTypeNode({
          containingFile: args.containingFile,
          sourceFile: args.sourceFile,
          typeNode: args.typeNode,
          seenTypes: args.seenTypes,
        }),
      collectionKind: getRsxExpressionTesterCollectionKind(args.typeNode),
      collectionValueTemplate:
        getRsxExpressionTesterCollectionValueTemplateFromTypeNode({
          containingFile: args.containingFile,
          sourceFile: args.sourceFile,
          typeNode: args.typeNode,
          seenTypes: args.seenTypes,
        }),
      collectionValueTemplateImports:
        getRsxExpressionTesterCollectionValueTemplateImportsFromTypeNode({
          containingFile: args.containingFile,
          sourceFile: args.sourceFile,
          typeNode: args.typeNode,
          seenTypes: args.seenTypes,
        }),
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

function getRsxExpressionTesterValueTemplateFromTypeNode(args: {
  readonly containingFile: string;
  readonly sourceFile: ts.SourceFile;
  readonly typeNode: ts.TypeNode;
  readonly seenTypes: Set<string>;
}): string | undefined {
  if (ts.isParenthesizedTypeNode(args.typeNode)) {
    return getRsxExpressionTesterValueTemplateFromTypeNode({
      ...args,
      typeNode: args.typeNode.type,
    });
  }

  if (ts.isLiteralTypeNode(args.typeNode)) {
    return getRsxExpressionTesterValueTemplateFromLiteral(
      args.typeNode.literal,
    );
  }

  if (ts.isUnionTypeNode(args.typeNode)) {
    for (const type of args.typeNode.types) {
      if (
        type.kind === ts.SyntaxKind.UndefinedKeyword ||
        type.kind === ts.SyntaxKind.NullKeyword ||
        type.kind === ts.SyntaxKind.VoidKeyword
      ) {
        continue;
      }
      const template = getRsxExpressionTesterValueTemplateFromTypeNode({
        ...args,
        typeNode: type,
      });
      if (template !== undefined) {
        return template;
      }
    }
    return undefined;
  }

  if (ts.isArrayTypeNode(args.typeNode)) {
    return '[]';
  }

  const expressionReferenceTemplate =
    getRsxExpressionTesterExpressionReferenceTemplateFromTypeNode(args);
  if (expressionReferenceTemplate) {
    return expressionReferenceTemplate.valueTemplate;
  }

  if (ts.isTypeReferenceNode(args.typeNode)) {
    const typeName = getRightmostEntityNameText(args.typeNode.typeName);
    if (typeName === 'Array') {
      return '[]';
    }
    if (typeName === 'Date') {
      return "new Date('2026-01-01T00:00:00.000Z')";
    }

    const localDeclaration = getLocalRsxExpressionModelTypeDeclaration(
      args.sourceFile,
      typeName,
    );
    if (localDeclaration) {
      return getRsxExpressionTesterValueTemplateFromDeclaration({
        ...args,
        declaration: localDeclaration,
        typeName,
      });
    }

    const importedType = getImportedIdentifierTypeReference(
      args.sourceFile,
      typeName,
    );
    if (importedType) {
      const resolvedFileName = resolveRsxDependencyModuleFileName({
        containingFile: args.containingFile,
        moduleName: importedType.moduleName,
      });
      if (!resolvedFileName) {
        return undefined;
      }
      return getExportedRsxExpressionTesterValueTemplate({
        fileName: resolvedFileName,
        typeName: importedType.typeName,
        seenTypes: args.seenTypes,
      });
    }
  }

  return createRsxExpressionTesterPrimitiveTemplate(
    args.typeNode.getText(args.sourceFile),
  );
}

function getRsxExpressionTesterValueTemplateImportsFromTypeNode(args: {
  readonly containingFile: string;
  readonly sourceFile: ts.SourceFile;
  readonly typeNode: ts.TypeNode;
  readonly seenTypes: Set<string>;
}): readonly string[] | undefined {
  const template =
    getRsxExpressionTesterExpressionReferenceTemplateFromTypeNode(args);
  return template?.imports;
}

function getRsxExpressionTesterExpressionReferenceTemplateFromTypeNode(args: {
  readonly containingFile: string;
  readonly sourceFile: ts.SourceFile;
  readonly typeNode: ts.TypeNode;
  readonly seenTypes: Set<string>;
}): {
  readonly valueTemplate: string;
  readonly imports: readonly string[];
} | null {
  const expressionReference = getRsxExpressionReferenceFromTypeNode(
    args.typeNode,
    args.sourceFile,
  );
  if (!expressionReference) {
    return null;
  }

  const resolvedFileName = resolveRsxExpressionTesterModuleFileName({
    containingFile: args.containingFile,
    moduleName: expressionReference.moduleName,
  });
  if (!resolvedFileName) {
    return null;
  }

  const referencedExpression = getRsxExpressionExportByName({
    fileName: resolvedFileName,
    exportName: expressionReference.exportName,
  });
  if (!referencedExpression) {
    return null;
  }

  const modelTemplate = createRsxExpressionTesterModelTemplate(
    referencedExpression.modelFields,
    collectRsxExpressionTesterTemplateRequirements([
      {
        key: expressionReference.exportName,
        exportName: expressionReference.exportName,
        expressionText: referencedExpression.expression.expression,
        uri: vscode.Uri.file(resolvedFileName).toString(),
        start: referencedExpression.expression.expressionStart,
        end: referencedExpression.expression.expressionEnd,
        returnTypeText: referencedExpression.expression.returnTypeText,
      },
    ]),
  );
  return {
    valueTemplate: `${getRsxExpressionTesterExpressionFactoryName(
      expressionReference.exportName,
    )}(${modelTemplate})`,
    imports: [
      `/* __RSX_TESTER_EXPRESSION__${Buffer.from(
        JSON.stringify({
          factoryName: getRsxExpressionTesterExpressionFactoryName(
            expressionReference.exportName,
          ),
          expressionText: referencedExpression.expression.expression,
          returnTypeText: referencedExpression.expression.returnTypeText,
        } satisfies IRsxExpressionTesterExpressionReferenceRuntime),
        'utf8',
      ).toString('base64')}__ */`,
    ],
  };
}

function getRsxExpressionTesterExpressionFactoryName(
  exportName: string,
): string {
  return `__rsxTester_${exportName.replace(/[^A-Za-z0-9_$]/gu, '_')}`;
}

function getRsxExpressionReferenceFromTypeNode(
  typeNode: ts.TypeNode,
  sourceFile: ts.SourceFile,
): { readonly moduleName: string; readonly exportName: string } | null {
  if (ts.isParenthesizedTypeNode(typeNode)) {
    return getRsxExpressionReferenceFromTypeNode(typeNode.type, sourceFile);
  }
  if (
    ts.isTypeReferenceNode(typeNode) &&
    getRightmostEntityNameText(typeNode.typeName) === 'ReturnType' &&
    typeNode.typeArguments?.[0]
  ) {
    const returnTypeArgument = typeNode.typeArguments[0];
    const importedExpression = getImportedExpressionReferenceFromNode(
      returnTypeArgument,
      sourceFile,
    );
    if (importedExpression) {
      return importedExpression;
    }
    return getRsxExpressionReferenceFromTypeNode(
      returnTypeArgument,
      sourceFile,
    );
  }
  if (ts.isTypeQueryNode(typeNode)) {
    const expressionName = getTypeQueryExpressionName(typeNode.exprName);
    if (expressionName) {
      return expressionName;
    }
  }
  if (ts.isImportTypeNode(typeNode) && typeNode.isTypeOf) {
    const qualifier = typeNode.qualifier;
    const argument = typeNode.argument;
    if (
      qualifier &&
      ts.isIdentifier(qualifier) &&
      ts.isLiteralTypeNode(argument) &&
      ts.isStringLiteralLike(argument.literal)
    ) {
      return {
        moduleName: argument.literal.text,
        exportName: qualifier.text,
      };
    }
  }
  return null;
}

function getImportedExpressionReferenceFromNode(
  node: ts.Node,
  sourceFile: ts.SourceFile,
): { readonly moduleName: string; readonly exportName: string } | null {
  const moduleName = getFirstStringLiteralText(node);
  const exportName = getLastIdentifierText(node);
  const text = node.getText(sourceFile);
  if (!moduleName || !exportName || !text.includes('import')) {
    return null;
  }
  return {
    moduleName,
    exportName,
  };
}

function getTypeQueryExpressionName(
  exprName: ts.TypeQueryNode['exprName'],
): { readonly moduleName: string; readonly exportName: string } | null {
  if (
    ts.isImportTypeNode(exprName) &&
    exprName.isTypeOf &&
    exprName.qualifier &&
    ts.isIdentifier(exprName.qualifier) &&
    ts.isLiteralTypeNode(exprName.argument) &&
    ts.isStringLiteralLike(exprName.argument.literal)
  ) {
    return {
      moduleName: exprName.argument.literal.text,
      exportName: exprName.qualifier.text,
    };
  }
  return null;
}

function getRsxExpressionExportByName(args: {
  readonly fileName: string;
  readonly exportName: string;
}): {
  readonly expression: IRsxExpressionExport['expression'];
  readonly modelFields: readonly IRsxExpressionTreeModelField[];
} | null {
  const text = ts.sys.readFile(args.fileName);
  if (typeof text !== 'string') {
    return null;
  }
  const parsed = parseRsxFileExpressions({
    fileName: args.fileName,
    text,
  });
  if (!parsed) {
    return null;
  }
  const expressionExport = getRsxExpressionExports({
    fileName: args.fileName,
    expressions: parsed.expressions,
  }).find((entry) => entry.exportName === args.exportName);
  if (!expressionExport) {
    return null;
  }
  const modelSpan = findRsxExpressionModelSourceSpan({
    text,
    expressions: parsed.expressions,
    expression: expressionExport.expression,
  });
  return {
    expression: expressionExport.expression,
    modelFields: modelSpan
      ? getRsxExpressionModelFields({
          uri: vscode.Uri.file(args.fileName),
          text,
          start: modelSpan.start,
          end: modelSpan.end,
        })
      : [],
  };
}

function getRsxExpressionTesterCollectionKind(
  typeNode: ts.TypeNode,
): 'array' | 'map' | undefined {
  if (ts.isParenthesizedTypeNode(typeNode)) {
    return getRsxExpressionTesterCollectionKind(typeNode.type);
  }
  if (ts.isArrayTypeNode(typeNode)) {
    return 'array';
  }
  if (!ts.isTypeReferenceNode(typeNode)) {
    return undefined;
  }
  const typeName = getRightmostEntityNameText(typeNode.typeName);
  if (typeName === 'Array' || typeName === 'ReadonlyArray') {
    return 'array';
  }
  if (typeName === 'Record' || typeName === 'ReadonlyRecord') {
    return 'map';
  }
  return undefined;
}

function getRsxExpressionTesterCollectionValueTemplateFromTypeNode(args: {
  readonly containingFile: string;
  readonly sourceFile: ts.SourceFile;
  readonly typeNode: ts.TypeNode;
  readonly seenTypes: Set<string>;
}): string | undefined {
  if (ts.isParenthesizedTypeNode(args.typeNode)) {
    return getRsxExpressionTesterCollectionValueTemplateFromTypeNode({
      ...args,
      typeNode: args.typeNode.type,
    });
  }
  if (ts.isArrayTypeNode(args.typeNode)) {
    return getRsxExpressionTesterValueTemplateFromTypeNode({
      ...args,
      typeNode: args.typeNode.elementType,
    });
  }
  if (!ts.isTypeReferenceNode(args.typeNode)) {
    return undefined;
  }
  const typeName = getRightmostEntityNameText(args.typeNode.typeName);
  if (
    (typeName === 'Array' || typeName === 'ReadonlyArray') &&
    args.typeNode.typeArguments?.[0]
  ) {
    return getRsxExpressionTesterValueTemplateFromTypeNode({
      ...args,
      typeNode: args.typeNode.typeArguments[0],
    });
  }
  if (
    (typeName === 'Record' || typeName === 'ReadonlyRecord') &&
    args.typeNode.typeArguments?.[1]
  ) {
    return getRsxExpressionTesterValueTemplateFromTypeNode({
      ...args,
      typeNode: args.typeNode.typeArguments[1],
    });
  }
  return undefined;
}

function getRsxExpressionTesterCollectionValueTemplateImportsFromTypeNode(args: {
  readonly containingFile: string;
  readonly sourceFile: ts.SourceFile;
  readonly typeNode: ts.TypeNode;
  readonly seenTypes: Set<string>;
}): readonly string[] | undefined {
  if (ts.isParenthesizedTypeNode(args.typeNode)) {
    return getRsxExpressionTesterCollectionValueTemplateImportsFromTypeNode({
      ...args,
      typeNode: args.typeNode.type,
    });
  }
  if (ts.isArrayTypeNode(args.typeNode)) {
    return getRsxExpressionTesterValueTemplateImportsFromTypeNode({
      ...args,
      typeNode: args.typeNode.elementType,
    });
  }
  if (!ts.isTypeReferenceNode(args.typeNode)) {
    return undefined;
  }
  const typeName = getRightmostEntityNameText(args.typeNode.typeName);
  if (
    (typeName === 'Array' || typeName === 'ReadonlyArray') &&
    args.typeNode.typeArguments?.[0]
  ) {
    return getRsxExpressionTesterValueTemplateImportsFromTypeNode({
      ...args,
      typeNode: args.typeNode.typeArguments[0],
    });
  }
  if (
    (typeName === 'Record' || typeName === 'ReadonlyRecord') &&
    args.typeNode.typeArguments?.[1]
  ) {
    return getRsxExpressionTesterValueTemplateImportsFromTypeNode({
      ...args,
      typeNode: args.typeNode.typeArguments[1],
    });
  }
  return undefined;
}

function getRsxExpressionTesterValueTemplateFromDeclaration(args: {
  readonly containingFile: string;
  readonly sourceFile: ts.SourceFile;
  readonly declaration: ts.Declaration;
  readonly typeName: string;
  readonly seenTypes: Set<string>;
}): string | undefined {
  const seenKey = `${args.containingFile}:${args.typeName}`;
  if (args.seenTypes.has(seenKey)) {
    return undefined;
  }
  args.seenTypes.add(seenKey);
  try {
    if (ts.isTypeAliasDeclaration(args.declaration)) {
      return getRsxExpressionTesterValueTemplateFromTypeNode({
        containingFile: args.containingFile,
        sourceFile: args.sourceFile,
        typeNode: args.declaration.type,
        seenTypes: args.seenTypes,
      });
    }
    if (ts.isEnumDeclaration(args.declaration)) {
      const member = args.declaration.members[0];
      if (!member) {
        return undefined;
      }
      if (member.initializer) {
        return getRsxExpressionTesterValueTemplateFromExpression(
          member.initializer,
        );
      }
      return JSON.stringify(member.name.getText(args.sourceFile));
    }
    return undefined;
  } finally {
    args.seenTypes.delete(seenKey);
  }
}

function getExportedRsxExpressionTesterValueTemplate(args: {
  readonly fileName: string;
  readonly typeName: string;
  readonly seenTypes: Set<string>;
}): string | undefined {
  const seenKey = `${args.fileName}:${args.typeName}`;
  if (args.seenTypes.has(seenKey)) {
    return undefined;
  }
  const text = ts.sys.readFile(args.fileName);
  if (typeof text !== 'string') {
    return undefined;
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
    return undefined;
  }
  return getRsxExpressionTesterValueTemplateFromDeclaration({
    containingFile: args.fileName,
    sourceFile,
    declaration,
    typeName: args.typeName,
    seenTypes: args.seenTypes,
  });
}

function getImportedIdentifierTypeReference(
  sourceFile: ts.SourceFile,
  localName: string,
): { readonly moduleName: string; readonly typeName: string } | null {
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) {
      continue;
    }
    const moduleName = ts.isStringLiteralLike(statement.moduleSpecifier)
      ? statement.moduleSpecifier.text
      : null;
    const namedBindings = statement.importClause?.namedBindings;
    if (!moduleName || !namedBindings || !ts.isNamedImports(namedBindings)) {
      continue;
    }
    for (const element of namedBindings.elements) {
      if (element.name.text !== localName) {
        continue;
      }
      return {
        moduleName,
        typeName: element.propertyName?.text ?? element.name.text,
      };
    }
  }
  return null;
}

function getRsxExpressionTesterValueTemplateFromLiteral(
  literal: ts.LiteralTypeNode['literal'],
): string | undefined {
  if (ts.isStringLiteralLike(literal)) {
    return JSON.stringify(literal.text);
  }
  if (ts.isNumericLiteral(literal)) {
    return literal.text;
  }
  if (
    ts.isPrefixUnaryExpression(literal) &&
    ts.isNumericLiteral(literal.operand)
  ) {
    return `${literal.operator === ts.SyntaxKind.MinusToken ? '-' : ''}${literal.operand.text}`;
  }
  if (literal.kind === ts.SyntaxKind.TrueKeyword) {
    return 'true';
  }
  if (literal.kind === ts.SyntaxKind.FalseKeyword) {
    return 'false';
  }
  return undefined;
}

function getRsxExpressionTesterValueTemplateFromExpression(
  expression: ts.Expression,
): string | undefined {
  if (ts.isStringLiteralLike(expression)) {
    return JSON.stringify(expression.text);
  }
  if (ts.isNumericLiteral(expression)) {
    return expression.text;
  }
  if (
    ts.isPrefixUnaryExpression(expression) &&
    ts.isNumericLiteral(expression.operand)
  ) {
    return `${expression.operator === ts.SyntaxKind.MinusToken ? '-' : ''}${expression.operand.text}`;
  }
  return undefined;
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
        | ts.ClassDeclaration
        | ts.EnumDeclaration =>
        (ts.isInterfaceDeclaration(statement) ||
          ts.isTypeAliasDeclaration(statement) ||
          ts.isClassDeclaration(statement) ||
          ts.isEnumDeclaration(statement)) &&
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
    .map(
      ([key, model]): IRsxExpressionTreeModel => ({
        kind: 'model',
        key,
        label: formatRsxExpressionModelTreeLabel(model.modelTypeText),
        modelTypeText: model.modelTypeText,
        uri: model.expression.modelDefinition?.uri ?? model.expression.uri,
        relativePath: model.expression.relativePath,
        start:
          model.expression.modelDefinition?.start ??
          model.expression.modelStart,
        end: model.expression.modelDefinition?.end ?? model.expression.modelEnd,
        fields: attachRsxExpressionModelFieldUses(
          model.expression.modelFields,
          model.expressions,
        ),
        expressions: model.expressions.sort(compareRsxExpressionTreeExpression),
      }),
    )
    .sort(
      (left, right) =>
        left.label.localeCompare(right.label) ||
        left.relativePath.localeCompare(right.relativePath),
    );
}

function getRsxExpressionTreeSearchResults(
  files: readonly IRsxExpressionTreeFile[],
  models: readonly IRsxExpressionTreeModel[],
  instanceGroups: readonly IRsxExpressionTreeExpressionInstanceGroup[],
  query: string,
): IRsxExpressionTreeSearchResult[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) {
    return getRsxExpressionTreeDefaultPanelResults(files, models);
  }
  const tokens = normalizedQuery.split(/\s+/u).filter(Boolean);
  const results: IRsxExpressionTreeSearchResult[] = [];
  const seen = new Set<string>();
  const addResult = (
    target:
      | IRsxExpressionTreeExpression
      | IRsxExpressionTreeModel
      | IRsxExpressionTreeModelField
      | IRsxExpressionTreeExpressionInstance,
    match: IRsxExpressionTreeSearchMatch | null,
  ): void => {
    const key = `${target.kind}:${target.key}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    results.push({
      kind: 'searchResult',
      query,
      matchUri: match?.uri ?? target.uri,
      matchStart: match?.start ?? target.start,
      matchEnd: match?.end ?? target.end,
      target,
    });
  };

  for (const file of files) {
    for (const expression of file.expressions) {
      const match = findRsxExpressionTreeSearchMatch(tokens, [
        {
          value: expression.exportName,
          uri: expression.uri,
          start: expression.start,
        },
        {
          value: expression.expression.expression,
          uri: expression.uri,
          start: expression.expression.expressionStart,
        },
        {
          value: expression.expression.returnTypeText,
          uri: expression.uri,
          start: expression.end,
        },
        {
          value: expression.expression.modelTypeText,
          uri: expression.uri,
          start: expression.modelStart,
        },
        {
          value: expression.relativePath,
          uri: expression.uri,
          start: expression.start,
        },
      ]);
      if (match) {
        addResult(expression, match);
      }
    }
  }

  for (const model of models) {
    const modelMatch = isSearchableRsxExpressionTreeModel(model)
      ? findRsxExpressionTreeSearchMatch(tokens, [
          {
            value: model.label,
            uri: model.uri,
            start: model.start,
          },
          {
            value: model.modelTypeText,
            uri: model.uri,
            start: model.start,
          },
          {
            value: model.relativePath,
            uri: model.uri,
            start: model.start,
          },
        ])
      : null;
    if (modelMatch) {
      addResult(model, modelMatch);
    }
    for (const field of flattenRsxExpressionTreeModelFields(model.fields)) {
      const fieldMatch = findRsxExpressionTreeSearchMatch(tokens, [
        {
          value: field.label,
          uri: field.uri,
          start: field.start,
        },
        {
          value: field.path.join('.'),
          uri: field.uri,
          start: field.start,
        },
        {
          value: field.typeText,
          uri: field.uri,
          start: field.start,
        },
      ]);
      if (fieldMatch) {
        addResult(field, fieldMatch);
      }
    }
  }

  for (const instance of instanceGroups.flatMap((group) => group.instances)) {
    const instanceMatch = findRsxExpressionTreeSearchMatch(tokens, [
      {
        value: getRsxExpressionValueName(instance.expression.exportName),
        uri: instance.uri,
        start: instance.start,
      },
      {
        value: instance.expression.exportName,
        uri: instance.uri,
        start: instance.start,
      },
      {
        value: instance.relativePath,
        uri: instance.uri,
        start: instance.start,
      },
      {
        value: `${instance.relativePath}:${instance.line + 1}`,
        uri: instance.uri,
        start: instance.start,
      },
    ]);
    if (instanceMatch) {
      addResult(instance, instanceMatch);
    }
  }

  return results.sort(compareRsxExpressionTreeSearchResults);
}

function isSearchableRsxExpressionTreeModel(
  model: IRsxExpressionTreeModel,
): boolean {
  return !model.label.trim().startsWith('{');
}

interface IRsxExpressionTreeSearchCandidate {
  readonly value: string | undefined;
  readonly uri: vscode.Uri;
  readonly start: number;
}

interface IRsxExpressionTreeSearchMatch {
  readonly uri: vscode.Uri;
  readonly start: number;
  readonly end: number;
}

function findRsxExpressionTreeSearchMatch(
  tokens: readonly string[],
  candidates: readonly IRsxExpressionTreeSearchCandidate[],
): IRsxExpressionTreeSearchMatch | null {
  for (const candidate of candidates) {
    if (typeof candidate.value !== 'string') {
      continue;
    }
    const normalizedValue = candidate.value.toLocaleLowerCase();
    const tokenSpans = tokens.map((token) => {
      const start = normalizedValue.indexOf(token);
      return start < 0 ? null : { start, end: start + token.length };
    });
    if (tokenSpans.some((span) => span === null)) {
      continue;
    }
    const starts = tokenSpans.map((span) => span?.start ?? 0);
    const ends = tokenSpans.map((span) => span?.end ?? 0);
    return {
      uri: candidate.uri,
      start: candidate.start + Math.min(...starts),
      end: candidate.start + Math.max(...ends),
    };
  }
  return null;
}

function getRsxExpressionTreeDefaultPanelResults(
  files: readonly IRsxExpressionTreeFile[],
  models: readonly IRsxExpressionTreeModel[],
): IRsxExpressionTreeSearchResult[] {
  return [
    ...files.flatMap((file) =>
      file.expressions.map(
        (expression): IRsxExpressionTreeSearchResult => ({
          kind: 'searchResult',
          query: '',
          matchUri: expression.uri,
          matchStart: expression.start,
          matchEnd: expression.end,
          target: expression,
        }),
      ),
    ),
    ...models.map(
      (model): IRsxExpressionTreeSearchResult => ({
        kind: 'searchResult',
        query: '',
        matchUri: model.uri,
        matchStart: model.start,
        matchEnd: model.end,
        target: model,
      }),
    ),
  ].sort(compareRsxExpressionTreeSearchResults);
}

function flattenRsxExpressionTreeModelFields(
  fields: readonly IRsxExpressionTreeModelField[],
): IRsxExpressionTreeModelField[] {
  return fields.flatMap((field) => [
    field,
    ...flattenRsxExpressionTreeModelFields(field.children),
  ]);
}

function compareRsxExpressionTreeSearchResults(
  left: IRsxExpressionTreeSearchResult,
  right: IRsxExpressionTreeSearchResult,
): number {
  return (
    getRsxExpressionTreeSearchResultScore(left) -
      getRsxExpressionTreeSearchResultScore(right) ||
    getRsxExpressionTreeSearchResultRank(left.target) -
      getRsxExpressionTreeSearchResultRank(right.target) ||
    getRsxExpressionTreeSearchResultLabel(left.target).localeCompare(
      getRsxExpressionTreeSearchResultLabel(right.target),
    )
  );
}

function getRsxExpressionTreeSearchResultScore(
  result: IRsxExpressionTreeSearchResult,
): number {
  const tokens = result.query
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/u)
    .filter(Boolean);
  if (tokens.length === 0) {
    return 0;
  }
  const primary = getRsxExpressionTreeSearchResultLabel(
    result.target,
  ).toLocaleLowerCase();
  if (tokens.every((token) => primary.startsWith(token))) {
    return 0;
  }
  if (tokens.every((token) => primary.includes(token))) {
    return 1;
  }
  return 2;
}

function getRsxExpressionTreeSearchResultRank(
  target: IRsxExpressionTreeSearchResult['target'],
): number {
  if (target.kind === 'expression') {
    return 0;
  }
  if (target.kind === 'model') {
    return 1;
  }
  if (target.kind === 'expressionInstance') {
    return 2;
  }
  return 3;
}

function getRsxExpressionTreeSearchResultLabel(
  target: IRsxExpressionTreeSearchResult['target'],
): string {
  if (target.kind === 'expression') {
    return target.exportName;
  }
  if (target.kind === 'model') {
    return target.label;
  }
  if (target.kind === 'expressionInstance') {
    return target.expression.exportName;
  }
  return target.path.join('.');
}

function normalizeRsxExpressionModelTreeKey(modelTypeText: string): string {
  return modelTypeText.replace(/\s+/gu, ' ').trim();
}

function formatRsxExpressionModelTreeLabel(modelTypeText: string): string {
  const normalized = normalizeRsxExpressionModelTreeKey(modelTypeText);
  const label = getRsxExpressionModelTreeDisplayName(normalized) ?? normalized;
  return label.length > 96 ? `${label.slice(0, 93)}...` : label;
}

function getRsxExpressionModelTreeDisplayName(
  normalizedModelTypeText: string,
): string | null {
  const importTypeMatch = normalizedModelTypeText.match(
    /import\s*\(\s*['"][^'"]+['"]\s*\)\s*\.\s*([A-Za-z_$][A-Za-z0-9_$]*)$/u,
  );
  if (importTypeMatch?.[1]) {
    return importTypeMatch[1];
  }

  const qualifiedTypeMatch = normalizedModelTypeText.match(
    /(?:^|\.)([A-Za-z_$][A-Za-z0-9_$]*)$/u,
  );
  if (
    qualifiedTypeMatch?.[1] &&
    /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(normalizedModelTypeText)
  ) {
    return qualifiedTypeMatch[1];
  }

  return null;
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
      if (
        areRsxModelFieldPathsEqual(callbackAlias.basePath, args.fieldPath) &&
        !isIdentifierDeclaredInScopes(callbackAlias.basePath[0], scopes)
      ) {
        match = {
          start: callbackAlias.baseStart - WRAPPED_EXPRESSION_PREFIX.length,
          end: callbackAlias.baseEnd - WRAPPED_EXPRESSION_PREFIX.length,
        };
        return;
      }

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
): {
  readonly callback: ts.ArrowFunction | ts.FunctionExpression;
  readonly parameterName: string;
  readonly basePath: readonly string[];
  readonly baseStart: number;
  readonly baseEnd: number;
} | null {
  if (
    !ts.isCallExpression(node) ||
    !ts.isPropertyAccessExpression(node.expression) ||
    !['map', 'flatMap', 'filter', 'find', 'some', 'every', 'reduce'].includes(
      node.expression.name.text,
    )
  ) {
    return null;
  }

  const base = getRsxModelFieldAccessPath(node.expression.expression, aliases);
  const callback = node.arguments[0];
  const parameter =
    node.expression.name.text === 'reduce'
      ? callback?.parameters[1]?.name
      : callback?.parameters[0]?.name;
  if (
    !base ||
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
    basePath: base.path,
    baseStart: base.start,
    baseEnd: base.end,
  };
}

function getRsxModelFieldAccessPath(
  node: ts.Node,
  aliases: ReadonlyMap<string, readonly string[]>,
): {
  readonly path: readonly string[];
  readonly start: number;
  readonly end: number;
} | null {
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
  const topLevelModelFields = new Set(
    args.expression.modelFields.map((field) => field.path[0] ?? field.label),
  );

  for (const identifier of identifiers) {
    const exactTargets = getNonSelfExpressionTargets(
      args.exactExportIndex.get(identifier),
      args.expression,
    );
    const expressionReferenceTargets = getNonSelfExpressionTargets(
      expressionReferenceModelFieldTargets
        .get(identifier)
        ?.flatMap(
          (targetExportName) =>
            args.exactExportIndex.get(targetExportName) ?? [],
        ),
      args.expression,
    );
    const exportValueTargets = getNonSelfExpressionTargets(
      args.exactExportIndex.get(`${identifier}Rsx`),
      args.expression,
    ).filter((target) =>
      areRsxExpressionModelTypesEquivalent(
        target.expression.modelTypeText,
        args.expression.expression.modelTypeText,
      ),
    );
    const targets =
      exactTargets.length > 0
        ? exactTargets.map((target) => ({
            target,
            matchKind: 'exportName' as const,
          }))
        : expressionReferenceTargets.length > 0
          ? expressionReferenceTargets.map((target) => ({
              target,
              matchKind: 'modelFieldExpressionType' as const,
            }))
          : exportValueTargets.length > 0 &&
              !topLevelModelFields.has(identifier)
            ? exportValueTargets.map((target) => ({
                target,
                matchKind: 'exportValueName' as const,
              }))
            : [];

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

function areRsxExpressionModelTypesEquivalent(
  left: string | undefined,
  right: string | undefined,
): boolean {
  return (
    !!left &&
    !!right &&
    normalizeRsxExpressionModelTreeKey(left) ===
      normalizeRsxExpressionModelTreeKey(right)
  );
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

function formatInstanceCount(count: number): string {
  return `${count} instance${count === 1 ? '' : 's'}`;
}

async function openRsxExpressionTreeItem(
  item:
    | IRsxExpressionTreeExpression
    | IRsxExpressionTreeModel
    | IRsxExpressionTreeModelField
    | IRsxExpressionTreeModelFieldExpressionUse
    | IRsxExpressionTreeSearchResult,
): Promise<void> {
  const location =
    item.kind === 'searchResult'
      ? {
          uri: item.matchUri,
          start: item.matchStart,
          end: item.matchEnd,
        }
      : item;
  await openRsxExpressionLocation(location, {
    viewColumn: vscode.ViewColumn.One,
  });
  scheduleCloseRsxEmptyEditorGroups([], {
    includeUnmanagedEmptyGroups: true,
  });
}

async function openRsxExpressionLocation(
  args: {
    uri: vscode.Uri;
    start: number;
    end: number;
  },
  options: {
    readonly viewColumn?: vscode.ViewColumn;
  } = {},
): Promise<void> {
  rsxEditorOpenInProgressUntil = Date.now() + 1_000;
  const existingEditor = vscode.window.visibleTextEditors.find(
    (editor) => editor.document.uri.toString() === args.uri.toString(),
  );
  const document =
    existingEditor?.document ??
    (await vscode.workspace.openTextDocument(args.uri));
  const editor =
    existingEditor ??
    (await vscode.window.showTextDocument(document, {
      viewColumn: options.viewColumn ?? vscode.ViewColumn.Beside,
      preserveFocus: false,
      preview: true,
    }));
  rememberRsxEditorGroupColumn(editor.viewColumn);
  const start = document.positionAt(args.start);
  const end = document.positionAt(args.end);
  const range = new vscode.Range(start, end);
  editor.selection = new vscode.Selection(start, end);
  editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
  highlightRsxRevealedRange(editor, range);
}

function highlightRsxRevealedRange(
  editor: vscode.TextEditor,
  range: vscode.Range,
): void {
  const setDecorations = (
    editor as vscode.TextEditor & {
      setDecorations?: vscode.TextEditor['setDecorations'];
    }
  ).setDecorations;
  if (!setDecorations) {
    return;
  }

  const decorationType = getRsxRevealDecorationType();
  setDecorations.call(editor, decorationType, [range]);
}

function getRsxRevealDecorationType(): vscode.TextEditorDecorationType {
  if (rsxRevealDecorationType) {
    return rsxRevealDecorationType;
  }
  rsxRevealDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(255, 214, 10, 0.45)',
    border: '2px solid',
    borderColor: '#ffd60a',
    overviewRulerColor: '#ffd60a',
    overviewRulerLane: vscode.OverviewRulerLane.Center,
  });
  return rsxRevealDecorationType;
}

async function addRsxExpressionFromPanel(
  provider: RsxExpressionsTreeDataProvider,
): Promise<void> {
  const workspaceFolder = await pickRsxWorkspaceFolder();
  if (!workspaceFolder) {
    return;
  }

  const mode = await vscode.window.showQuickPick(
    [
      {
        label: 'Create New Expression File',
        description: 'Recommended',
        value: 'create' as const,
      },
      {
        label: 'Add To Existing Expression File',
        description: 'Append a new expression block',
        value: 'append' as const,
      },
    ],
    {
      placeHolder: 'Choose how to add the RS-X expression',
    },
  );
  if (!mode) {
    return;
  }

  const expressionName = await vscode.window.showInputBox({
    title: 'Add RS-X Expression',
    prompt: 'Expression export name',
    placeHolder: 'shippingTotal',
    validateInput: (value) =>
      isValidRsxExpressionIdentifier(value.trim())
        ? null
        : 'Enter a valid TypeScript identifier.',
  });
  if (!expressionName) {
    return;
  }

  const expressionSource = await vscode.window.showInputBox({
    title: 'Add RS-X Expression',
    prompt: 'Initial expression body',
    value: 'a',
  });
  if (expressionSource === undefined) {
    return;
  }

  const modelTypeText = createRsxModelTypeTemplate(
    expressionSource.trim() || 'a',
  );
  const expressionBlock = createRsxExpressionBlock({
    expressionName: expressionName.trim(),
    expressionSource: expressionSource.trim() || 'a',
    modelTypeText,
  });

  const targetUri =
    mode.value === 'create'
      ? await pickNewRsxExpressionFileUri(
          workspaceFolder,
          expressionName.trim(),
        )
      : await pickExistingRsxExpressionFileUri(workspaceFolder);
  if (!targetUri) {
    return;
  }

  const existingText = await readWorkspaceTextFile(targetUri);
  if (existingText !== null && mode.value === 'create') {
    const action = await vscode.window.showWarningMessage(
      `${vscode.workspace.asRelativePath(targetUri, false)} already exists.`,
      { modal: true },
      'Append',
      'Overwrite',
    );
    if (!action) {
      return;
    }
    await writeRsxExpressionFile(targetUri, {
      existingText: action === 'Append' ? existingText : null,
      expressionBlock,
    });
  } else {
    await writeRsxExpressionFile(targetUri, {
      existingText,
      expressionBlock,
    });
  }

  const nextText = await readWorkspaceTextFile(targetUri);
  const expressionStart = Math.max(
    0,
    nextText?.lastIndexOf(expressionName.trim()) ?? 0,
  );

  provider.refresh();
  await openRsxExpressionLocation({
    uri: targetUri,
    start: expressionStart,
    end: expressionStart + expressionName.trim().length,
  });
  vscode.window.showInformationMessage(
    `Added RS-X expression ${expressionName.trim()}.`,
  );
}

async function pickRsxWorkspaceFolder(): Promise<vscode.WorkspaceFolder | null> {
  const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
  if (workspaceFolders.length === 0) {
    vscode.window.showWarningMessage(
      'Open a workspace before adding an RS-X expression.',
    );
    return null;
  }
  if (workspaceFolders.length === 1) {
    return workspaceFolders[0];
  }

  const selected = await vscode.window.showQuickPick(
    workspaceFolders.map((folder) => ({
      label: folder.name,
      description: folder.uri.fsPath,
      folder,
    })),
    {
      placeHolder: 'Choose workspace folder',
    },
  );
  return selected?.folder ?? null;
}

async function pickNewRsxExpressionFileUri(
  workspaceFolder: vscode.WorkspaceFolder,
  expressionName: string,
): Promise<vscode.Uri | null> {
  const defaultDirectory = await getRsxAddDefaultDirectory(workspaceFolder);
  const defaultPath = `${defaultDirectory}/${toKebabCase(expressionName)}.expressions.rsx`;
  const relativePath = await vscode.window.showInputBox({
    title: 'Add RS-X Expression',
    prompt: 'Expression file path',
    value: defaultPath,
    validateInput: (value) =>
      normalizeRsxRelativePath(value) !== null
        ? null
        : 'Enter a relative .rsx file path inside the workspace.',
  });
  if (!relativePath) {
    return null;
  }

  const normalizedPath = normalizeRsxRelativePath(relativePath);
  return normalizedPath === null
    ? null
    : vscode.Uri.joinPath(workspaceFolder.uri, ...normalizedPath.split('/'));
}

async function pickExistingRsxExpressionFileUri(
  workspaceFolder: vscode.WorkspaceFolder,
): Promise<vscode.Uri | null> {
  const workspaceRoot = `${workspaceFolder.uri.fsPath.replace(/[/\\]+$/u, '')}${path.sep}`;
  const uris = (
    await vscode.workspace.findFiles(
      RSX_FILE_PATTERN,
      '**/{node_modules,dist,out-tsc,coverage,.git}/**',
    )
  ).filter(
    (uri) =>
      uri.fsPath === workspaceFolder.uri.fsPath ||
      uri.fsPath.startsWith(workspaceRoot),
  );
  if (uris.length === 0) {
    vscode.window.showWarningMessage(
      'No existing .rsx files found in this workspace.',
    );
    return null;
  }

  const selected = await vscode.window.showQuickPick(
    uris
      .sort((left, right) => left.fsPath.localeCompare(right.fsPath))
      .map((uri) => ({
        label: vscode.workspace.asRelativePath(uri, false),
        uri,
      })),
    {
      placeHolder: 'Choose the .rsx file to update',
    },
  );
  return selected?.uri ?? null;
}

async function getRsxAddDefaultDirectory(
  workspaceFolder: vscode.WorkspaceFolder,
): Promise<string> {
  const configUri = vscode.Uri.joinPath(workspaceFolder.uri, 'rsx.config.json');
  try {
    const text = new TextDecoder('utf8').decode(
      await vscode.workspace.fs.readFile(configUri),
    );
    const config = JSON.parse(text) as {
      cli?: { add?: { defaultDirectory?: unknown } };
    };
    const configured = config.cli?.add?.defaultDirectory;
    if (typeof configured === 'string' && configured.trim()) {
      return configured.trim().replace(/\\/gu, '/');
    }
  } catch {
    // Missing or invalid config should not block the UI add flow.
  }
  return 'src/expressions';
}

async function enableRsxDebugChangeHooksForWorkspace(
  anchorUri?: vscode.Uri,
  target?: IRsxDebugHookPanelTarget,
): Promise<void> {
  const configRootUri = await resolveRsxDebugHookConfigRootForWrite(anchorUri);
  if (!configRootUri) {
    vscode.window.showWarningMessage(
      'Open a workspace before enabling RS-X debug hooks.',
    );
    return;
  }
  if (!target?.expressionName) {
    vscode.window.showWarningMessage(
      'Select an RS-X expression or expression instance before setting a debug hook.',
    );
    return;
  }

  const hookSelection = await selectRsxDebugChangeHook(
    configRootUri,
    anchorUri,
    target.expressionName,
  );
  if (!hookSelection) {
    return;
  }

  const configUri = vscode.Uri.joinPath(configRootUri, 'rsx.config.json');
  let config: {
    build?: Record<string, unknown>;
    [key: string]: unknown;
  } = {};
  const existingText = await readWorkspaceTextFile(configUri);
  if (existingText !== null && existingText.trim()) {
    try {
      const parsed = JSON.parse(existingText) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        config = parsed as typeof config;
      } else {
        vscode.window.showWarningMessage(
          'RS-X config must be a JSON object before debug hooks can be enabled.',
        );
        return;
      }
    } catch {
      vscode.window.showWarningMessage(
        'Could not parse rsx.config.json. Fix the JSON before enabling debug hooks.',
      );
      return;
    }
  }

  const build =
    config.build &&
    typeof config.build === 'object' &&
    !Array.isArray(config.build)
      ? config.build
      : {};
  const existingHooks = {
    ...((build.debugChangeHooks &&
    typeof build.debugChangeHooks === 'object' &&
    !Array.isArray(build.debugChangeHooks)
      ? build.debugChangeHooks
      : {}) as Record<string, unknown>),
  };
  const expressionConfig =
    existingHooks[target.expressionName] &&
    typeof existingHooks[target.expressionName] === 'object' &&
    !Array.isArray(existingHooks[target.expressionName])
      ? {
          ...(existingHooks[target.expressionName] as Record<string, unknown>),
        }
      : {};
  const nextHookConfig = {
    moduleSpecifier: hookSelection.moduleSpecifier,
    exportName: hookSelection.exportName,
    enabled: true,
  };
  if (target.instanceId) {
    const instances =
      expressionConfig.instances &&
      typeof expressionConfig.instances === 'object' &&
      !Array.isArray(expressionConfig.instances)
        ? { ...(expressionConfig.instances as Record<string, unknown>) }
        : {};
    instances[target.instanceId] = nextHookConfig;
    expressionConfig.instances = instances;
  } else {
    expressionConfig.group = nextHookConfig;
  }
  existingHooks[target.expressionName] = expressionConfig;
  config.build = {
    ...build,
    debugChangeHooks: existingHooks,
  };
  await vscode.workspace.fs.writeFile(
    configUri,
    new TextEncoder().encode(`${JSON.stringify(config, null, 2)}\n`),
  );
  vscode.window.showInformationMessage(
    `Enabled RS-X debug change hook ${hookSelection.exportName} from ${hookSelection.moduleSpecifier} for ${target.instanceId ? 'instance' : 'group'} ${target.expressionName}.`,
  );
}

async function setRsxDebugChangeHooksEnabledForWorkspace(
  anchorUri: vscode.Uri | undefined,
  target: IRsxDebugHookPanelTarget | undefined,
  enabled: boolean,
): Promise<void> {
  if (!target?.expressionName) {
    return;
  }
  const updated = await updateRsxDebugHookConfig(anchorUri, target, (hook) =>
    hook ? { ...hook, enabled } : hook,
  );
  if (updated) {
    vscode.window.showInformationMessage(
      `${enabled ? 'Enabled' : 'Disabled'} RS-X debug hook for ${target.instanceId ? 'instance' : 'group'} ${target.expressionName}.`,
    );
  }
}

async function deleteRsxDebugChangeHooksForWorkspace(
  anchorUri: vscode.Uri | undefined,
  target: IRsxDebugHookPanelTarget | undefined,
): Promise<void> {
  if (!target?.expressionName) {
    return;
  }
  const updated = await updateRsxDebugHookConfig(anchorUri, target, () => null);
  if (updated) {
    vscode.window.showInformationMessage(
      `Deleted RS-X debug hook config for ${target.instanceId ? 'instance' : 'group'} ${target.expressionName}.`,
    );
  }
}

async function updateRsxDebugHookConfig(
  anchorUri: vscode.Uri | undefined,
  target: IRsxDebugHookPanelTarget,
  update: (
    hook: Record<string, unknown> | undefined,
  ) => Record<string, unknown> | null | undefined,
): Promise<boolean> {
  const configRootUri = await resolveRsxDebugHookConfigRootForWrite(anchorUri);
  if (!configRootUri) {
    return false;
  }
  const configUri = vscode.Uri.joinPath(configRootUri, 'rsx.config.json');
  const existingText = await readWorkspaceTextFile(configUri);
  if (!existingText?.trim()) {
    return false;
  }
  let config: { build?: Record<string, unknown>; [key: string]: unknown };
  try {
    const parsed = JSON.parse(existingText) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return false;
    }
    config = parsed as typeof config;
  } catch {
    return false;
  }
  const build =
    config.build &&
    typeof config.build === 'object' &&
    !Array.isArray(config.build)
      ? config.build
      : {};
  const hooks =
    build.debugChangeHooks &&
    typeof build.debugChangeHooks === 'object' &&
    !Array.isArray(build.debugChangeHooks)
      ? { ...(build.debugChangeHooks as Record<string, unknown>) }
      : {};
  const expressionConfig =
    hooks[target.expressionName] &&
    typeof hooks[target.expressionName] === 'object' &&
    !Array.isArray(hooks[target.expressionName])
      ? { ...(hooks[target.expressionName] as Record<string, unknown>) }
      : {};
  if (target.instanceId) {
    const instances =
      expressionConfig.instances &&
      typeof expressionConfig.instances === 'object' &&
      !Array.isArray(expressionConfig.instances)
        ? { ...(expressionConfig.instances as Record<string, unknown>) }
        : {};
    const next = update(
      instances[target.instanceId] as Record<string, unknown> | undefined,
    );
    if (next === null) {
      delete instances[target.instanceId];
    } else if (next) {
      instances[target.instanceId] = next;
    }
    expressionConfig.instances = instances;
  } else {
    const next = update(
      expressionConfig.group as Record<string, unknown> | undefined,
    );
    if (next === null) {
      delete expressionConfig.group;
    } else if (next) {
      expressionConfig.group = next;
    }
  }
  hooks[target.expressionName] = expressionConfig;
  config.build = { ...build, debugChangeHooks: hooks };
  await vscode.workspace.fs.writeFile(
    configUri,
    new TextEncoder().encode(`${JSON.stringify(config, null, 2)}\n`),
  );
  return true;
}

async function selectRsxDebugChangeHook(
  projectRootUri: vscode.Uri,
  anchorUri?: vscode.Uri,
  expressionName?: string,
): Promise<{
  readonly moduleSpecifier: string;
  readonly exportName: string;
} | null> {
  const hookExportName = getDefaultRsxDebugChangeHookExportName(expressionName);
  const hookUri = getDefaultRsxDebugChangeHookUri(
    projectRootUri,
    expressionName,
  );
  const projectRelativeHookPath = getProjectRelativePath(
    projectRootUri,
    hookUri,
  );
  const candidates = await findRsxDebugChangeHookCandidates(
    projectRootUri,
    anchorUri,
  );
  const createNew = {
    label: 'Create new hook file',
    description: projectRelativeHookPath,
    action: 'create' as const,
  };
  const selected = await vscode.window.showQuickPick(
    [
      createNew,
      ...candidates.map((candidate) => ({
        ...candidate,
        action: 'candidate' as const,
      })),
    ],
    { placeHolder: 'Select or create the RS-X debug change hook' },
  );
  if (!selected) {
    return null;
  }
  if (selected.action === 'candidate') {
    return selected;
  }

  const exportName = await vscode.window.showInputBox({
    prompt: 'Hook export name',
    value: hookExportName,
  });
  if (!exportName?.trim()) {
    return null;
  }
  if (selected.action === 'create') {
    await createRsxDebugChangeHookFile(hookUri, exportName.trim());
  }
  return {
    moduleSpecifier: getRsxDebugHookModuleSpecifier(
      anchorUri ?? projectRootUri,
      hookUri,
    ),
    exportName: exportName.trim(),
  };
}

async function findRsxDebugChangeHookCandidates(
  projectRootUri: vscode.Uri,
  anchorUri?: vscode.Uri,
): Promise<
  Array<{
    readonly label: string;
    readonly description: string;
    readonly moduleSpecifier: string;
    readonly exportName: string;
  }>
> {
  const uris = await vscode.workspace.findFiles(
    '**/*.{ts,tsx,js,jsx,mts,cts}',
    '**/{node_modules,dist,out-tsc,coverage,.git,.rsx}/**',
  );
  const candidates: Array<{
    label: string;
    description: string;
    moduleSpecifier: string;
    exportName: string;
  }> = [];
  for (const uri of uris.filter((uri) =>
    isUriInsideDirectory(uri, projectRootUri),
  )) {
    const text = await readWorkspaceTextFile(uri);
    if (!text) {
      continue;
    }
    const sourceFile = ts.createSourceFile(
      uri.fsPath,
      text,
      ts.ScriptTarget.Latest,
      true,
      getScriptKindForRsxInstanceScan(uri.fsPath),
    );
    const moduleSpecifier = getRsxDebugHookModuleSpecifier(
      anchorUri ?? projectRootUri,
      uri,
    );
    for (const exportName of getExportedHookNames(sourceFile)) {
      candidates.push({
        label: exportName,
        description: moduleSpecifier,
        moduleSpecifier,
        exportName,
      });
    }
  }
  return candidates.sort(
    (left, right) =>
      left.label.localeCompare(right.label) ||
      left.description.localeCompare(right.description),
  );
}

function getExportedHookNames(sourceFile: ts.SourceFile): string[] {
  const names = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (
      hasExportModifier(node) &&
      (ts.isFunctionDeclaration(node) || ts.isVariableStatement(node))
    ) {
      if (ts.isFunctionDeclaration(node) && node.name) {
        names.add(node.name.text);
      }
      if (ts.isVariableStatement(node)) {
        for (const declaration of node.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) {
            names.add(declaration.name.text);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return [...names].filter((name) => /hook/iu.test(name));
}

function hasExportModifier(node: ts.Node): boolean {
  return (
    (ts.getCombinedModifierFlags(node as ts.Declaration) &
      ts.ModifierFlags.Export) !==
    0
  );
}

async function createRsxDebugChangeHookFile(
  hookUri: vscode.Uri,
  exportName: string,
): Promise<void> {
  if (await readWorkspaceTextFile(hookUri)) {
    return;
  }
  await vscode.workspace.fs.createDirectory(getParentUri(hookUri));
  await vscode.workspace.fs.writeFile(
    hookUri,
    new TextEncoder().encode(
      [
        "import type { RsxDebugChangeHook } from '@rs-x/expression-parser';",
        '',
        `export const ${exportName}: RsxDebugChangeHook = (instance, expression, oldValue) => {`,
        '  console.debug("[RS-X]", instance.expressionName, { expression, oldValue });',
        '};',
        '',
      ].join('\n'),
    ),
  );
}

function resolveRsxDebugHookProjectRoot(
  anchorUri: vscode.Uri | undefined,
): vscode.Uri | null {
  const workspaceFolder = anchorUri
    ? vscode.workspace.getWorkspaceFolder?.(anchorUri)
    : undefined;
  const fallbackFolder =
    workspaceFolder ?? vscode.workspace.workspaceFolders?.[0];
  return fallbackFolder?.uri ?? null;
}

function resolveRsxDebugHookConfigUrisForRead(
  anchorUri: vscode.Uri | undefined,
): vscode.Uri[] {
  const projectRootUri = resolveRsxDebugHookProjectRoot(anchorUri);
  if (!projectRootUri) {
    return [];
  }
  return getRsxConfigRootUris(projectRootUri, anchorUri).map((rootUri) =>
    vscode.Uri.joinPath(rootUri, 'rsx.config.json'),
  );
}

async function resolveRsxDebugHookConfigRootForWrite(
  anchorUri: vscode.Uri | undefined,
): Promise<vscode.Uri | null> {
  const projectRootUri = resolveRsxDebugHookProjectRoot(anchorUri);
  if (!projectRootUri) {
    return null;
  }
  const rootUris = getRsxConfigRootUris(projectRootUri, anchorUri);
  for (const rootUri of [...rootUris].reverse()) {
    const configUri = vscode.Uri.joinPath(rootUri, 'rsx.config.json');
    if (await readWorkspaceTextFile(configUri)) {
      return rootUri;
    }
  }
  return projectRootUri;
}

function getRsxConfigRootUris(
  projectRootUri: vscode.Uri,
  anchorUri: vscode.Uri | undefined,
): vscode.Uri[] {
  const projectRootPath = path.resolve(projectRootUri.fsPath);
  const anchorDirectoryPath = getRsxConfigAnchorDirectoryPath(
    anchorUri,
    projectRootPath,
  );
  const dirs: vscode.Uri[] = [];
  let currentPath = path.resolve(anchorDirectoryPath);
  while (isPathInsideDirectoryOrEqual(currentPath, projectRootPath)) {
    dirs.push(vscode.Uri.file(currentPath));
    if (currentPath === projectRootPath) {
      break;
    }
    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      break;
    }
    currentPath = parentPath;
  }
  if (!dirs.some((uri) => path.resolve(uri.fsPath) === projectRootPath)) {
    dirs.push(projectRootUri);
  }
  return dirs.reverse();
}

function getRsxConfigAnchorDirectoryPath(
  anchorUri: vscode.Uri | undefined,
  projectRootPath: string,
): string {
  if (!anchorUri) {
    return projectRootPath;
  }
  const anchorPath = path.resolve(anchorUri.fsPath);
  const anchorDirectoryPath = path.extname(anchorPath)
    ? path.dirname(anchorPath)
    : anchorPath;
  return isPathInsideDirectoryOrEqual(anchorDirectoryPath, projectRootPath)
    ? anchorDirectoryPath
    : projectRootPath;
}

function getDefaultRsxDebugChangeHookUri(
  projectRootUri: vscode.Uri,
  expressionName?: string,
): vscode.Uri {
  const fileName = `${toKebabCase(
    getRsxDebugHookExpressionStem(expressionName),
  )}-debug-change-hook.ts`;
  return vscode.Uri.joinPath(projectRootUri, 'src', fileName);
}

function getDefaultRsxDebugChangeHookExportName(
  expressionName?: string,
): string {
  return `${getRsxDebugHookExpressionStem(expressionName)}DebugChangeHook`;
}

function getRsxDebugHookExpressionStem(expressionName?: string): string {
  const normalized = expressionName?.trim();
  if (!normalized) {
    return 'rsx';
  }
  if (normalized.endsWith('Rsx') && normalized.length > 'Rsx'.length) {
    return normalized.slice(0, -'Rsx'.length);
  }
  return normalized;
}

function getProjectRelativePath(rootUri: vscode.Uri, uri: vscode.Uri): string {
  return path.relative(rootUri.fsPath, uri.fsPath).split(path.sep).join('/');
}

function getRsxDebugHookModuleSpecifier(
  fromUri: vscode.Uri,
  hookUri: vscode.Uri,
): string {
  const fromDirectory = ts.sys.directoryExists(fromUri.fsPath)
    ? fromUri.fsPath
    : path.dirname(fromUri.fsPath);
  const relativePath = path
    .relative(fromDirectory, hookUri.fsPath)
    .replace(/\\/gu, '/')
    .replace(/\.[cm]?[jt]sx?$/u, '');
  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
}

function isUriInsideDirectory(
  uri: vscode.Uri,
  directoryUri: vscode.Uri,
): boolean {
  const directoryPath = path.resolve(directoryUri.fsPath);
  const filePath = path.resolve(uri.fsPath);
  return isPathInsideDirectoryOrEqual(filePath, directoryPath);
}

function isPathInsideDirectoryOrEqual(
  filePath: string,
  directoryPath: string,
): boolean {
  const resolvedFilePath = path.resolve(filePath);
  const resolvedDirectoryPath = path.resolve(directoryPath);
  return (
    resolvedFilePath === resolvedDirectoryPath ||
    resolvedFilePath.startsWith(`${resolvedDirectoryPath}${path.sep}`)
  );
}

async function readWorkspaceTextFile(uri: vscode.Uri): Promise<string | null> {
  try {
    return new TextDecoder('utf8').decode(
      await vscode.workspace.fs.readFile(uri),
    );
  } catch {
    return null;
  }
}

async function writeRsxExpressionFile(
  uri: vscode.Uri,
  args: {
    readonly existingText: string | null;
    readonly expressionBlock: string;
  },
): Promise<void> {
  const nextText =
    args.existingText === null
      ? `${args.expressionBlock}\n`
      : `${args.existingText.replace(/\s*$/u, '')}\n\n${args.expressionBlock}\n`;
  await vscode.workspace.fs.createDirectory(getParentUri(uri));
  await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(nextText));
}

function createRsxExpressionBlock(args: {
  readonly expressionName: string;
  readonly expressionSource: string;
  readonly modelTypeText: string;
}): string {
  return [
    `expression: ${args.expressionName}`,
    `  model: ${args.modelTypeText}`,
    ...args.expressionSource.split(/\r?\n/u).map((line) => `  ${line}`),
  ].join('\n');
}

function createRsxModelTypeTemplate(expressionSource: string): string {
  const identifiers = getFreeIdentifiersInRsxExpression(expressionSource);
  if (identifiers.length === 0) {
    return '{ a: number }';
  }
  return `{ ${identifiers.map((identifier) => `${identifier}: number`).join('; ')} }`;
}

function isValidRsxExpressionIdentifier(value: string): boolean {
  return ts.isIdentifierText(value, ts.ScriptTarget.Latest);
}

function getParentUri(uri: vscode.Uri): vscode.Uri {
  return uri.with({ path: path.posix.dirname(uri.path) });
}

function normalizeRsxRelativePath(value: string): string | null {
  const normalized = value.trim().replace(/\\/gu, '/');
  const segments = normalized.split('/').filter(Boolean);
  if (
    normalized.length === 0 ||
    normalized.startsWith('/') ||
    segments.some((segment) => segment === '.' || segment === '..') ||
    !normalized.endsWith('.rsx')
  ) {
    return null;
  }
  return segments.join('/');
}

function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/gu, '$1-$2')
    .replace(/[_\s]+/gu, '-')
    .replace(/[^A-Za-z0-9-]+/gu, '-')
    .replace(/-+/gu, '-')
    .replace(/^-|-$/gu, '')
    .toLowerCase();
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

class RsxExpressionTesterCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    if (!isRsxExpressionTesterDocument(document)) {
      return [];
    }

    return [
      new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
        title: 'Run RS-X model',
        command: 'rsx.expressions.test.run',
        arguments: [document.uri],
      }),
      new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
        title: 'Load RS-X model',
        command: 'rsx.expressions.test.load',
        arguments: [document.uri],
      }),
    ];
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
  const sharedStructureDiagnosticKeys = new Set<string>();
  for (const diagnostic of getRsxModuleStructureDiagnostics(text)) {
    sharedStructureDiagnosticKeys.add(
      `${diagnostic.line}:${diagnostic.key}:${diagnostic.message}`,
    );
    diagnostics.push(
      new vscode.Diagnostic(
        new vscode.Range(
          new vscode.Position(diagnostic.line, diagnostic.character),
          new vscode.Position(
            diagnostic.line,
            diagnostic.character + Math.max(1, diagnostic.key.length),
          ),
        ),
        diagnostic.message,
        vscode.DiagnosticSeverity.Error,
      ),
    );
  }
  const hasSharedStructureDiagnostic = (
    lineIndex: number,
    key: string,
    message: string,
  ): boolean =>
    sharedStructureDiagnosticKeys.has(`${lineIndex}:${key}:${message}`);
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
        const message = `Header "${topLevelHeader.key}" must be indented under defaults: or an expression block in module-style .rsx files.`;
        if (
          !hasSharedStructureDiagnostic(lineIndex, topLevelHeader.key, message)
        ) {
          addHeaderKeyDiagnostic({
            diagnostics,
            lineIndex,
            keyStartCharacter: topLevelHeader.keyStartCharacter,
            key: topLevelHeader.key,
            message,
          });
        }
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
