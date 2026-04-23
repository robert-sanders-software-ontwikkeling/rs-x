import ts from 'typescript';
import * as vscode from 'vscode';
import { parseRsxFileExpressions } from '@rs-x/compiler';

import {
  canRenameRsxSymbolAtPosition,
  createRsxStandaloneLanguageService,
  getRsxCodeFixes,
  getRsxCompletionsAtPosition,
  getRsxDefinitionsAtPosition,
  getRsxDiagnostics,
  getRsxDocumentSymbols,
  getRsxHoverAtPosition,
  getRsxImplementationsAtPosition,
  getRsxReferencesAtPosition,
  getRsxRenameLocationsAtPosition,
  getRsxSemanticTokens,
  getRsxSyntacticTokensForText,
  getRsxSignatureHelpAtPosition,
  rsxSemanticTokenModifiers,
  rsxSemanticTokenTypes,
} from './rsx-standalone-language-service';

const RSX_LANGUAGE_ID = 'rsx';
const WRAPPED_EXPRESSION_PREFIX = 'const __rsxExpression = (\n';
const WRAPPED_EXPRESSION_SUFFIX = '\n);\n';
const MODULE_TOP_LEVEL_HEADER_KEYS = ['expression', 'defaults'] as const;
const MODULE_EXPRESSION_HEADER_KEYS = [
  'model',
  'return',
  'preparse',
  'lazy',
  'lazyGroup',
  'compiled',
  'compile',
] as const;
const RSX_HEADER_DIRECTIVE_KEYS = new Set<string>([
  ...MODULE_TOP_LEVEL_HEADER_KEYS,
  ...MODULE_EXPRESSION_HEADER_KEYS,
]);
const HEADER_COMPLETION_TRIGGER_CHARACTERS = [
  ...'abcdefghijklmnopqrstuvwxyz',
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  '_',
] as const;

interface IRsxFileParts {
  headers: string[];
  body: string;
}

type IParsedRsxExpression =
  NonNullable<ReturnType<typeof parseRsxFileExpressions>>['expressions'][number];

interface IModuleExpressionStandaloneService {
  document: NonNullable<ReturnType<typeof createRsxStandaloneLanguageService>>;
  position: number;
  expression: IParsedRsxExpression;
  standaloneExpressionStart: number;
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
  servicesByExpressionIndex: Map<number, IModuleExpressionStandaloneService | null>;
  diagnosticsByExpressionIndex: Map<number, vscode.Diagnostic[]>;
  semanticTokensByExpressionIndex: Map<number, IRsxSemanticToken[]>;
}

type IRsxSemanticToken = ReturnType<typeof getRsxSemanticTokens>[number];

const standaloneServiceCache = new Map<string, IStandaloneServiceCacheEntry>();
const moduleExpressionCache = new Map<string, IModuleExpressionCacheEntry>();
const documentSemanticTokenCache = new Map<
  string,
  IDocumentSemanticTokenCacheEntry
>();
const diagnosticsDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const diagnosticsRequestIds = new Map<string, number>();
const modulePrewarmTimers = new Map<string, ReturnType<typeof setTimeout>>();
const moduleBackgroundWarmTimers = new Map<
  string,
  ReturnType<typeof setTimeout>
>();
const moduleBackgroundWarmRequestIds = new Map<string, number>();
const MODULE_FOCUSED_ANALYSIS_EXPRESSION_THRESHOLD = 12;

type IDiagnosticsMode = 'auto' | 'focused' | 'full';

export function activate(context: vscode.ExtensionContext): void {
  const diagnostics = vscode.languages.createDiagnosticCollection('rsx');
  context.subscriptions.push(diagnostics);
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
  context.subscriptions.push(
    vscode.languages.registerDocumentSemanticTokensProvider(
      RSX_LANGUAGE_ID,
      new RsxSemanticTokensProvider(semanticTokensLegend),
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

    const timer = setTimeout(() => {
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
    }, Math.max(0, debounceMs));

    diagnosticsDebounceTimers.set(key, timer);
  };

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      scheduleModuleExpressionPrewarm(document, 0);
      refreshDiagnosticsForDocument(document, 'focused', 100);
    }),
  );
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      documentSemanticTokenCache.delete(event.document.uri.toString());
      refreshDiagnosticsForDocument(event.document, 'focused', 180);
    }),
  );
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) =>
      scheduleModuleExpressionPrewarm(event.document, 60),
    ),
  );
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) =>
      refreshDiagnosticsForDocument(document, 'auto', 100),
    ),
  );
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        scheduleModuleExpressionPrewarm(editor.document, 0);
      }
    }),
  );
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
    refreshDiagnosticsForDocument(document, 'focused', 250);
    scheduleModuleExpressionPrewarm(document, 0);
  }
}

export function deactivate(): void {}

class RsxCompletionItemProvider implements vscode.CompletionItemProvider<vscode.CompletionItem> {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    const offset = document.offsetAt(position);
    const standalone = createStandaloneLanguageServiceForDocument(document);
    if (standalone) {
      return getRsxCompletionsAtPosition(standalone, offset).map((item) => {
        const completion = new vscode.CompletionItem(
          item.name,
          item.kind === 'method'
            ? vscode.CompletionItemKind.Method
            : item.kind === 'constructor'
              ? vscode.CompletionItemKind.Constructor
              : vscode.CompletionItemKind.Property,
        );
        completion.insertText = item.name;
        return completion;
      });
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
    const headerCompletions = getModuleHeaderCompletions(document, position);

    const completionByLabel = new Map<string, vscode.CompletionItem>();
    for (const item of expressionCompletions) {
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
            return null;
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
        : createModuleHeaderStandaloneLanguageServiceForOffset(document, offset);
    const lookupDocument =
      standalone ?? moduleExpressionService?.document ?? moduleHeaderService?.document;
    if (!lookupDocument) {
      return [];
    }
    const lookupPosition =
      standalone
        ? offset
        : moduleExpressionService?.position ?? moduleHeaderService?.position ?? offset;

    return getRsxDefinitionsAtPosition(
      lookupDocument,
      lookupPosition,
    ).map(
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
  constructor(private readonly legend: vscode.SemanticTokensLegend) {}

  provideDocumentSemanticTokens(
    document: vscode.TextDocument,
  ): vscode.ProviderResult<vscode.SemanticTokens> {
    const sourceText = document.getText();
    const builder = new vscode.SemanticTokensBuilder(this.legend);
    const operatorTokenType = rsxSemanticTokenTypes.indexOf('operator');
    const literalLikeTokenTypes = new Set<number>(
      ['string', 'number', 'regexp', 'comment']
        .map((name) => rsxSemanticTokenTypes.indexOf(name))
        .filter((value) => value >= 0),
    );
    const tokens = resolveSemanticTokensForDocument(document, sourceText);
    for (const token of tokens) {
      const tokenText = sourceText.slice(token.start, token.start + token.length);
      const normalizedTokenText = tokenText.trim();
      if (normalizedTokenText.length === 0) {
        continue;
      }
      if (
        token.tokenType !== operatorTokenType &&
        !literalLikeTokenTypes.has(token.tokenType) &&
        hasOperatorLikePunctuation(normalizedTokenText)
      ) {
        // Guard against accidental mixed punctuation spans from mapped semantic ranges.
        continue;
      }
      if (
        token.tokenType === operatorTokenType &&
        !isOperatorLikeTokenText(normalizedTokenText)
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

  const moduleTokens = getModuleExpressionSemanticTokens(document, 'full');
  const syntacticTokens = getRsxSyntacticTokensForText(sourceText);
  const headerDirectiveTokens = getRsxHeaderDirectiveKeywordTokensForText(sourceText);
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

function isOperatorLikeTokenText(text: string): boolean {
  return /^[+\-*/%<>=!&|^~?:.,;()[\]{}]+$/u.test(text);
}

function hasOperatorLikePunctuation(text: string): boolean {
  return /[+\-*/%<>=!&|^~?:.,;()[\]{}]/u.test(text);
}

function getRsxHeaderDirectiveKeywordTokensForText(
  text: string,
): IRsxSemanticToken[] {
  const keywordTokenType = rsxSemanticTokenTypes.indexOf('keyword');
  if (keywordTokenType < 0) {
    return [];
  }

  const tokens: IRsxSemanticToken[] = [];
  const lines = text.split('\n');
  let lineOffset = 0;
  for (const line of lines) {
    const trimmedStart = line.length - line.trimStart().length;
    const trimmed = line.slice(trimmedStart);
    const keyMatch = trimmed.match(/^([A-Za-z_$][A-Za-z0-9_$]*)\s*:/u);
    if (keyMatch && RSX_HEADER_DIRECTIVE_KEYS.has(keyMatch[1] ?? '')) {
      const key = keyMatch[1]!;
      tokens.push({
        start: lineOffset + trimmedStart,
        length: key.length,
        tokenType: keywordTokenType,
        tokenModifiers: 0,
      });
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
  if (!standalone) {
    return getModuleExpressionDiagnostics(document, mode);
  }

  return getRsxDiagnostics(standalone).map(
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
  );
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

  const service = createRsxStandaloneLanguageService({
    fileName: document.uri.fsPath,
    text: document.getText(),
  });
  standaloneServiceCache.set(key, {
    version: document.version,
    service,
  });
  return service;
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

  const timer = setTimeout(() => {
    modulePrewarmTimers.delete(key);
    prewarmModuleExpressionAnalysis(document);
  }, Math.max(0, delayMs));
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

  const timer = setTimeout(() => {
    moduleBackgroundWarmTimers.delete(key);
    warmModuleExpressionsInBackground(document, requestId, 0);
  }, Math.max(0, delayMs));
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
    getOrCreateMappedExpressionSemanticTokens({
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

  const expressionIndexes = resolveExpressionIndexesForMode({
    document,
    parsed,
    mode: 'focused',
  });
  if (expressionIndexes.length === 0) {
    return;
  }

  // Precompute focused diagnostics and semantic tokens so first hover/completion
  // and first semantic-coloring requests avoid cold-start work.
  getModuleExpressionDiagnostics(document, 'focused');
  getModuleExpressionSemanticTokens(document, 'focused');
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
): { document: NonNullable<ReturnType<typeof createRsxStandaloneLanguageService>>; position: number } | null {
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
    while (cursor < line.text.length && /\s/u.test(line.text[cursor])) {
      cursor += 1;
    }
    return cursor;
  })();
  if (position.character < valueStartCharacter) {
    return null;
  }

  const valueOffset = position.character - valueStartCharacter;
  const modelTypeText = parsed.key === 'model' ? parsed.value : 'unknown';
  const returnTypeText = parsed.key === 'return' ? parsed.value : 'unknown';
  const standaloneText = [
    `model: ${modelTypeText}`,
    `return: ${returnTypeText}`,
    '',
    '0',
  ].join('\n');

  const standalone = createRsxStandaloneLanguageService({
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

  const expressionDiagnostics = getRsxDiagnostics(moduleExpressionService.document);
  const mappedDiagnostics: vscode.Diagnostic[] = [];
  const bodyStart = moduleExpressionService.standaloneExpressionStart;
  const bodyEnd = bodyStart + moduleExpressionService.expression.expression.length;
  for (const diagnostic of expressionDiagnostics) {
    const overlapsBody = diagnostic.end > bodyStart && diagnostic.start < bodyEnd;
    const isReturnMismatchDiagnostic =
      diagnostic.category === 'semantic' &&
      !!moduleExpressionService.expression.returnTypeText &&
      /is not assignable to type/iu.test(diagnostic.message);
    if (!overlapsBody && !isReturnMismatchDiagnostic) {
      continue;
    }

    const mappedStart = overlapsBody
      ? mapModuleExpressionOffsetToDocument(moduleExpressionService, diagnostic.start)
      : moduleExpressionService.expression.expressionStart;
    const mappedEnd = overlapsBody
      ? mapModuleExpressionOffsetToDocument(moduleExpressionService, diagnostic.end)
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

  const moduleExpressionService =
    getModuleExpressionStandaloneLanguageServiceForIndex(
      args.document,
      args.cacheEntry,
      args.expressionIndex,
    );
  if (!moduleExpressionService) {
    return [];
  }

  const mappedExpressionTokens: IRsxSemanticToken[] = [];
  const bodyStart = moduleExpressionService.standaloneExpressionStart;
  const bodyEnd = bodyStart + moduleExpressionService.expression.expression.length;
  for (const token of getRsxSemanticTokens(moduleExpressionService.document)) {
    const tokenStart = token.start;
    const tokenEnd = token.start + token.length;
    if (tokenEnd <= bodyStart || tokenStart >= bodyEnd) {
      continue;
    }

    const clampedStart = Math.max(tokenStart, bodyStart);
    const clampedEnd = Math.min(tokenEnd, bodyEnd);
    const mappedStart = mapModuleExpressionOffsetToDocument(
      moduleExpressionService,
      clampedStart,
    );
    const mappedEnd = mapModuleExpressionOffsetToDocument(
      moduleExpressionService,
      clampedEnd,
    );
    const mappedLength = Math.max(mappedEnd - mappedStart, 1);

    mappedExpressionTokens.push({
      start: mappedStart,
      length: mappedLength,
      tokenType: token.tokenType,
      tokenModifiers: token.tokenModifiers,
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
): vscode.Diagnostic[] {
  if (
    document.languageId !== RSX_LANGUAGE_ID ||
    document.uri.scheme !== 'file'
  ) {
    return [];
  }

  const cacheEntry = getModuleExpressionCacheEntry(document);
  const parsed = cacheEntry?.parsed;
  const diagnostics = getModuleHeaderDiagnostics(document);
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
  mode: IDiagnosticsMode = 'auto',
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
  const expressionIndexes = resolveExpressionIndexesForMode({
    document,
    parsed,
    mode,
  });
  if (
    mode === 'auto' &&
    parsed.expressions.length > MODULE_FOCUSED_ANALYSIS_EXPRESSION_THRESHOLD
  ) {
    for (let expressionIndex = 0; expressionIndex < parsed.expressions.length; expressionIndex += 1) {
      const cachedTokens = cacheEntry.semanticTokensByExpressionIndex.get(
        expressionIndex,
      );
      if (cachedTokens) {
        tokens.push(...cachedTokens);
      }
    }
  }
  for (const expressionIndex of expressionIndexes) {
    tokens.push(
      ...getOrCreateMappedExpressionSemanticTokens({
        document,
        cacheEntry,
        expressionIndex,
      }),
    );
  }

  if (
    mode === 'auto' &&
    parsed.expressions.length > MODULE_FOCUSED_ANALYSIS_EXPRESSION_THRESHOLD
  ) {
    scheduleModuleExpressionBackgroundWarm(document, 120);
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
      expressionCount > MODULE_FOCUSED_ANALYSIS_EXPRESSION_THRESHOLD);
  if (!shouldFocus) {
    return args.parsed.expressions.map((_, index) => index);
  }

  const activeIndex = getActiveExpressionIndex(args.document, args.parsed);
  if (activeIndex >= 0) {
    return [activeIndex];
  }

  return expressionCount > 0 ? [0] : [];
}

function getActiveExpressionIndex(
  document: vscode.TextDocument,
  parsed: NonNullable<IModuleExpressionCacheEntry['parsed']>,
): number {
  const activeEditor = vscode.window.activeTextEditor;
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
  if (expression.returnTypeText && expression.returnTypeText.trim().length > 0) {
    standaloneTextLines.push(`return: ${expression.returnTypeText.trim()}`);
  }
  standaloneTextLines.push('', expression.expression);
  const standaloneText = standaloneTextLines.join('\n');
  const modelPropertyNamesHint = extractTopLevelModelPropertyNamesFromTypeText(
    expression.modelTypeText,
  );
  const standalone = createRsxStandaloneLanguageService({
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
  const safeName = normalized.length > 0 ? normalized : `expr_${expressionIndex}`;
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
  let quote: '\'' | '"' | null = null;

  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];
    if (quote) {
      if (character === quote && body[index - 1] !== '\\') {
        quote = null;
      }
      continue;
    }

    if (character === '\'' || character === '"') {
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

    const quotedMatch =
      /^(?:readonly\s+)?['"]([^'"]+)['"](?:\?)?\s*:/u.exec(segment);
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
  if (!/^\s*expression\s*:/mu.test(text)) {
    return [];
  }

  const diagnostics: vscode.Diagnostic[] = [];
  const lines = text.replace(/\r\n/gu, '\n').split('\n');
  const expressionNameFirstLine = new Map<string, number>();
  let inDefaultsBlock = false;
  let inExpressionHeaderBlock = false;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }

    const indented = /^\s/u.test(line);
    const topLevelExpressionMatch = /^expression\s*:\s*.+$/u.exec(trimmed);
    const topLevelDefaultsMatch = /^defaults\s*:\s*$/u.exec(trimmed);

    if (!indented && topLevelExpressionMatch) {
      const expressionHeaderMatch = /^(\s*expression\s*:\s*)(.+)$/u.exec(line);
      const expressionNameRaw = expressionHeaderMatch?.[2] ?? '';
      const expressionName = expressionNameRaw.trim();
      const expressionNameStart =
        (expressionHeaderMatch?.[1]?.length ?? 0) +
        (expressionNameRaw.length - expressionNameRaw.trimStart().length);
      const expressionNameEnd = expressionNameStart + expressionName.length;

      if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(expressionName)) {
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

      inDefaultsBlock = false;
      inExpressionHeaderBlock = true;
      continue;
    }

    if (!indented && topLevelDefaultsMatch) {
      inDefaultsBlock = true;
      inExpressionHeaderBlock = false;
      continue;
    }

    if (inDefaultsBlock) {
      if (!indented) {
        inDefaultsBlock = false;
      } else {
        const parsed = parseHeaderLine(line);
        if (parsed) {
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

    if (inExpressionHeaderBlock) {
      if (!indented) {
        inExpressionHeaderBlock = false;
      } else {
        const parsed = parseHeaderLine(line);
        if (parsed) {
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

    const topLevelHeader = parseHeaderLine(line);
    if (!topLevelHeader || indented) {
      continue;
    }

    addHeaderDiagnosticsForLine({
      diagnostics,
      document,
      lineIndex,
      key: topLevelHeader.key,
      value: topLevelHeader.value,
    });
  }

  return diagnostics;
}

function parseHeaderLine(
  line: string,
): { key: string; value: string; keyStartCharacter: number } | null {
  const match = /^(\s*)([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$/u.exec(line);
  if (!match) {
    return null;
  }

  return {
    key: match[2],
    value: match[3],
    keyStartCharacter: (match[1] ?? '').length,
  };
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

function getModuleHeaderCompletions(
  document: vscode.TextDocument,
  position: vscode.Position,
): vscode.CompletionItem[] {
  const text = document.getText();
  if (!/^\s*expression\s*:/mu.test(text)) {
    return [];
  }

  const linePrefix = document.lineAt(position.line).text.slice(0, position.character);
  if (linePrefix.includes(':')) {
    return [];
  }

  const match = /^(\s*)([A-Za-z_$][A-Za-z0-9_$]*)?$/u.exec(linePrefix);
  if (!match) {
    return [];
  }

  const leadingWhitespace = match[1] ?? '';
  const typedPrefix = match[2] ?? '';
  const previousNonEmptyLine = getPreviousNonEmptyLine(document, position.line);
  const previousTrimmed = previousNonEmptyLine?.trim() ?? '';
  let candidates: readonly string[] = [];

  if (leadingWhitespace.length > 0) {
    if (
      /^defaults\s*:\s*$/u.test(previousTrimmed) ||
      /^expression\s*:\s*.+$/u.test(previousTrimmed) ||
      isExpressionHeaderLine(previousTrimmed)
    ) {
      candidates = MODULE_EXPRESSION_HEADER_KEYS;
    }
  } else if (
    /^expression\s*:\s*.+$/u.test(previousTrimmed) ||
    isExpressionHeaderLine(previousTrimmed)
  ) {
    candidates = MODULE_EXPRESSION_HEADER_KEYS;
  } else {
    candidates = MODULE_TOP_LEVEL_HEADER_KEYS;
  }

  return candidates
    .filter((candidate) => candidate.startsWith(typedPrefix))
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

function isExpressionHeaderLine(line: string): boolean {
  const match = /^([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.+)$/u.exec(line);
  if (!match) {
    return false;
  }

  return MODULE_EXPRESSION_HEADER_KEYS.includes(
    match[1] as (typeof MODULE_EXPRESSION_HEADER_KEYS)[number],
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
