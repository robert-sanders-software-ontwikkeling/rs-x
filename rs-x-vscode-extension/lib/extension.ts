import * as path from 'node:path';

import ts from 'typescript';
import * as vscode from 'vscode';

import {
  createRsxBackedProgramForFile,
  createRsxImportAwareCompilerHost,
  getRsxCompletionsAtPosition,
  getRsxDiagnosticsForFile,
  getRsxHoverAtPosition,
  getRsxSignatureHelpAtPosition,
} from '@rs-x/compiler';

import {
  canRenameRsxSymbolAtPosition,
  createRsxStandaloneLanguageService,
  getRsxCodeFixes,
  getRsxDefinitionsAtPosition,
  getRsxDocumentSymbols,
  getRsxImplementationsAtPosition,
  getRsxReferencesAtPosition,
  getRsxRenameLocationsAtPosition,
  getRsxSemanticTokens,
  rsxSemanticTokenModifiers,
  rsxSemanticTokenTypes,
} from './rsx-standalone-language-service';

const RSX_LANGUAGE_ID = 'rsx';
const WRAPPED_EXPRESSION_PREFIX = 'const __rsxExpression = (\n';
const WRAPPED_EXPRESSION_SUFFIX = '\n);\n';

interface IRsxFileParts {
  headers: string[];
  body: string;
}

interface IResolvedProjectContext {
  options: ts.CompilerOptions;
  rootNames: string[];
}

interface IResolvedRsxProgram {
  program: ts.Program;
  fileName: string;
}

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

  const refreshDiagnosticsForDocument = (document: vscode.TextDocument) => {
    void updateDiagnosticsForDocument(document, diagnostics);
  };

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(refreshDiagnosticsForDocument),
  );
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) =>
      refreshDiagnosticsForDocument(event.document),
    ),
  );
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(refreshDiagnosticsForDocument),
  );
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      if (document.languageId === RSX_LANGUAGE_ID) {
        diagnostics.delete(document.uri);
      }
    }),
  );

  for (const document of vscode.workspace.textDocuments) {
    refreshDiagnosticsForDocument(document);
  }
}

export function deactivate(): void {}

class RsxCompletionItemProvider implements vscode.CompletionItemProvider<vscode.CompletionItem> {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    const resolved = resolveRsxProgramForDocument(document);
    if (!resolved) {
      return [];
    }

    return getRsxCompletionsAtPosition(
      resolved.program,
      resolved.fileName,
      document.offsetAt(position),
    ).map((item) => {
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
}

class RsxHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.Hover> {
    const resolved = resolveRsxProgramForDocument(document);
    if (!resolved) {
      return null;
    }

    const hover = getRsxHoverAtPosition(
      resolved.program,
      resolved.fileName,
      document.offsetAt(position),
    );
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
    const standalone = createStandaloneLanguageServiceForDocument(document);
    if (!standalone) {
      return [];
    }

    return getRsxDefinitionsAtPosition(
      standalone,
      document.offsetAt(position),
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

    const relevantDiagnostics =
      context.diagnostics.length > 0
        ? context.diagnostics
        : [new vscode.Diagnostic(range, '')];

    const seen = new Set<string>();
    return relevantDiagnostics.flatMap((diagnostic) =>
      getRsxCodeFixes({
        document: standalone,
        start: document.offsetAt(diagnostic.range.start),
        end: document.offsetAt(diagnostic.range.end),
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
        action.diagnostics = [diagnostic];
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
    const resolved = resolveRsxProgramForDocument(document);
    if (!resolved) {
      return null;
    }

    const help = getRsxSignatureHelpAtPosition(
      resolved.program,
      resolved.fileName,
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
    const standalone = createStandaloneLanguageServiceForDocument(document);
    if (!standalone) {
      return new vscode.SemanticTokens(new Uint32Array());
    }

    const builder = new vscode.SemanticTokensBuilder(this.legend);
    for (const token of getRsxSemanticTokens(standalone)) {
      const start = document.positionAt(token.start);
      const end = document.positionAt(token.start + token.length);
      builder.push(
        new vscode.Range(start, end),
        token.tokenType,
        token.tokenModifiers,
      );
    }

    return builder.build();
  }
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

async function updateDiagnosticsForDocument(
  document: vscode.TextDocument,
  collection: vscode.DiagnosticCollection,
): Promise<void> {
  if (document.languageId !== RSX_LANGUAGE_ID) {
    return;
  }

  const resolved = resolveRsxProgramForDocument(document);
  if (!resolved) {
    collection.set(document.uri, []);
    return;
  }

  const diagnostics = getRsxDiagnosticsForFile(
    resolved.program,
    resolved.fileName,
  ).map(
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

  collection.set(document.uri, diagnostics);
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

function resolveRsxProgramForDocument(
  document: vscode.TextDocument,
): IResolvedRsxProgram | null {
  if (
    document.languageId !== RSX_LANGUAGE_ID ||
    document.uri.scheme !== 'file'
  ) {
    return null;
  }

  const fileName = document.uri.fsPath;
  const projectContext = resolveProjectContext(fileName);
  const rootNames = Array.from(
    new Set([...projectContext.rootNames, fileName]),
  );
  const baseHost = createRsxImportAwareCompilerHost({
    options: projectContext.options,
    rootNames,
  });
  const sourceText = document.getText();
  const scriptTarget = projectContext.options.target ?? ts.ScriptTarget.Latest;

  const host: ts.CompilerHost = {
    ...baseHost,
    fileExists(candidateFileName) {
      if (candidateFileName === fileName) {
        return true;
      }
      return baseHost.fileExists(candidateFileName);
    },
    readFile(candidateFileName) {
      if (candidateFileName === fileName) {
        return sourceText;
      }
      return baseHost.readFile(candidateFileName);
    },
    getSourceFile(
      candidateFileName,
      languageVersion,
      onError,
      shouldCreateNewSourceFile,
    ) {
      if (candidateFileName === fileName) {
        return ts.createSourceFile(
          fileName,
          sourceText,
          languageVersion ?? scriptTarget,
          true,
          ts.ScriptKind.TS,
        );
      }
      return baseHost.getSourceFile(
        candidateFileName,
        languageVersion,
        onError,
        shouldCreateNewSourceFile,
      );
    },
  };

  const program = ts.createProgram({
    rootNames,
    options: projectContext.options,
    host,
  });
  const rsxBacked = createRsxBackedProgramForFile(
    program,
    fileName,
    sourceText,
  );
  if (!rsxBacked) {
    return null;
  }

  return {
    program: rsxBacked.program,
    fileName,
  };
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

  return createRsxStandaloneLanguageService({
    fileName: document.uri.fsPath,
    text: document.getText(),
  });
}

function resolveProjectContext(fileName: string): IResolvedProjectContext {
  const containingDirectory = path.dirname(fileName);
  const configFileName =
    ts.findConfigFile(
      containingDirectory,
      ts.sys.fileExists,
      'tsconfig.json',
    ) ??
    ts.findConfigFile(containingDirectory, ts.sys.fileExists, 'jsconfig.json');

  if (!configFileName) {
    return {
      options: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        allowJs: true,
        checkJs: true,
        jsx: ts.JsxEmit.Preserve,
        strict: true,
      },
      rootNames: [fileName],
    };
  }

  const parsedConfigFile = ts.getParsedCommandLineOfConfigFile(
    configFileName,
    undefined,
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: () => undefined,
    },
  );

  if (!parsedConfigFile) {
    return {
      options: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        allowJs: true,
        checkJs: true,
        jsx: ts.JsxEmit.Preserve,
        strict: true,
      },
      rootNames: [fileName],
    };
  }

  return {
    options: parsedConfigFile.options,
    rootNames: parsedConfigFile.fileNames,
  };
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
