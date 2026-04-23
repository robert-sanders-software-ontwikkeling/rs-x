import * as path from 'node:path';

import ts from 'typescript';

import {
  createRsxBackedProgramForFile,
  createRsxImportAwareCompilerHost,
  generateRsxModuleDeclaration,
  getRsxFileNameFromVirtualDeclaration,
  getRsxVirtualDeclarationFileName,
  parseExpressionDiagnostic,
} from '@rs-x/compiler';

const RSX_MODEL_PREFIX = 'type __RSX_MODEL = ';
const RSX_RETURN_PREFIX = 'type __RSX_RETURN = ';
const RSX_BODY_PREFIX = 'const __rsx_expression';

export interface IRsxMappedSpan {
  readonly fileName: string;
  readonly start: number;
  readonly end: number;
}

export interface IRsxRenameLocation extends IRsxMappedSpan {
  readonly newText: string;
}

export interface IRsxSemanticToken {
  readonly start: number;
  readonly length: number;
  readonly tokenType: number;
  readonly tokenModifiers: number;
}

export interface IRsxDocumentSymbol {
  readonly name: string;
  readonly detail?: string;
  readonly kind: 'type' | 'property' | 'function' | 'variable';
  readonly range: IRsxMappedSpan;
  readonly selectionRange: IRsxMappedSpan;
  readonly children: readonly IRsxDocumentSymbol[];
}

export interface IRsxCodeFixEdit extends IRsxMappedSpan {
  readonly newText: string;
}

export interface IRsxCodeFix {
  readonly title: string;
  readonly edits: readonly IRsxCodeFixEdit[];
}

export interface IRsxCompletionItem {
  readonly name: string;
  readonly kind: 'property' | 'method' | 'constructor';
}

export interface IRsxHoverInfo {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export interface IRsxSignatureParameter {
  readonly name: string;
  readonly typeText: string;
  readonly isOptional: boolean;
  readonly isRest: boolean;
}

export interface IRsxSignatureHelpItem {
  readonly parameters: readonly IRsxSignatureParameter[];
  readonly returnTypeText: string;
}

export interface IRsxSignatureHelp {
  readonly items: readonly IRsxSignatureHelpItem[];
  readonly argumentIndex: number;
  readonly argumentCount: number;
  readonly applicableStart: number;
  readonly applicableEnd: number;
}

export interface IRsxDiagnostic {
  readonly category: 'syntax' | 'semantic' | 'suggestion';
  readonly message: string;
  readonly start: number;
  readonly end: number;
}

interface IRsxFileParts {
  readonly headers: readonly string[];
  readonly body: string;
}

interface IResolvedProjectContext {
  readonly options: ts.CompilerOptions;
  readonly rootNames: readonly string[];
}

interface IMappedRegion {
  readonly originalStart: number;
  readonly originalEnd: number;
  readonly virtualStart: number;
  readonly virtualEnd: number;
}

interface IRsxVirtualDocument {
  readonly fileName: string;
  readonly virtualFileName: string;
  readonly originalText: string;
  readonly virtualText: string;
  readonly modelPropertyNames: readonly string[];
  readonly modelTypeRegion: IMappedRegion;
  readonly returnTypeRegion?: IMappedRegion;
  readonly bodyRegion: IMappedRegion;
  readonly languageService: ts.LanguageService;
}

interface IStandaloneRuntime {
  readonly languageService: ts.LanguageService;
  readonly rootNames: readonly string[];
  readonly options: ts.CompilerOptions;
  readonly virtualFileName: string;
  setVirtualText(text: string): void;
}

const projectContextCache = new Map<string, IResolvedProjectContext>();
const projectContextByFileCache = new Map<string, IResolvedProjectContext>();
const standaloneRuntimeByVirtualFile = new Map<string, IStandaloneRuntime>();

export const rsxSemanticTokenTypes = [
  'class',
  'enum',
  'interface',
  'namespace',
  'typeParameter',
  'type',
  'parameter',
  'variable',
  'enumMember',
  'property',
  'function',
  'method',
  'macro',
  'keyword',
  'modifier',
  'comment',
  'string',
  'number',
  'regexp',
  'operator',
  'decorator',
] as const;

export const rsxSemanticTokenModifiers = [
  'declaration',
  'static',
  'async',
  'readonly',
  'defaultLibrary',
  'local',
] as const;

export function createRsxStandaloneLanguageService(args: {
  fileName: string;
  text: string;
  modelPropertyNamesHint?: readonly string[];
  virtualFileNameSuffix?: string;
}): IRsxVirtualDocument | null {
  const parsed = parseRsxFile(args.text);
  if (!parsed) {
    return null;
  }

  const projectContext = resolveProjectContext(args.fileName);
  const hintedModelPropertyNames =
    args.modelPropertyNamesHint
      ?.map((propertyName) => propertyName.trim())
      .filter((propertyName) =>
        /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(propertyName),
      ) ?? [];
  const virtual = buildVirtualDocument({
    fileName: args.fileName,
    text: args.text,
    virtualFileNameSuffix: args.virtualFileNameSuffix,
    parsed,
    modelPropertyNames:
      hintedModelPropertyNames.length > 0
        ? hintedModelPropertyNames
        : resolveTopLevelModelPropertyNames({
            fileName: args.fileName,
            text: args.text,
            projectContext,
          }),
  });
  const rootNames = Array.from(
    new Set([
      ...projectContext.rootNames.filter(
        (rootName) => rootName !== args.fileName && !rootName.endsWith('.rsx'),
      ),
      virtual.virtualFileName,
      getRsxVirtualDeclarationFileName(args.fileName),
    ]),
  );
  const runtime = getOrCreateStandaloneRuntime({
    fileName: args.fileName,
    virtualFileName: virtual.virtualFileName,
    options: projectContext.options,
    rootNames,
  });
  runtime.setVirtualText(virtual.virtualText);

  return {
    ...virtual,
    languageService: runtime.languageService,
  };
}

function getOrCreateStandaloneRuntime(args: {
  fileName: string;
  virtualFileName: string;
  options: ts.CompilerOptions;
  rootNames: readonly string[];
}): IStandaloneRuntime {
  const existing = standaloneRuntimeByVirtualFile.get(args.virtualFileName);
  if (existing) {
    return existing;
  }

  const runtimeState = {
    virtualText: '',
    scriptVersion: 0,
  };
  const moduleResolutionHost = createRsxImportAwareCompilerHost({
    options: args.options,
    rootNames: args.rootNames,
  });
  const languageServiceHost: ts.LanguageServiceHost = {
    getCompilationSettings: () => args.options,
    getScriptFileNames: () => [...args.rootNames],
    getScriptVersion: (fileName) =>
      fileName === args.virtualFileName
        ? String(runtimeState.scriptVersion)
        : '1',
    getScriptSnapshot: (fileName) => {
      if (fileName === args.virtualFileName) {
        return ts.ScriptSnapshot.fromString(runtimeState.virtualText);
      }

      const rsxFileName = getRsxFileNameFromVirtualDeclaration(fileName);
      if (rsxFileName) {
        const rsxText = ts.sys.readFile(rsxFileName);
        if (typeof rsxText !== 'string') {
          return undefined;
        }
        const declarationText = generateRsxModuleDeclaration({
          fileName: rsxFileName,
          text: rsxText,
          compilerOptions: args.options,
          rootNames: args.rootNames,
        });
        return typeof declarationText === 'string'
          ? ts.ScriptSnapshot.fromString(declarationText)
          : undefined;
      }

      const text = ts.sys.readFile(fileName);
      return typeof text === 'string'
        ? ts.ScriptSnapshot.fromString(text)
        : undefined;
    },
    getCurrentDirectory: () => path.dirname(args.fileName),
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
    readFile: (fileName) =>
      fileName === args.virtualFileName
        ? runtimeState.virtualText
        : (() => {
            const rsxFileName = getRsxFileNameFromVirtualDeclaration(fileName);
            if (!rsxFileName) {
              return ts.sys.readFile(fileName);
            }
            const rsxText = ts.sys.readFile(rsxFileName);
            if (typeof rsxText !== 'string') {
              return undefined;
            }
            return (
              generateRsxModuleDeclaration({
                fileName: rsxFileName,
                text: rsxText,
                compilerOptions: args.options,
                rootNames: args.rootNames,
              }) ?? undefined
            );
          })(),
    fileExists: (fileName) =>
      fileName === args.virtualFileName ||
      (() => {
        const rsxFileName = getRsxFileNameFromVirtualDeclaration(fileName);
        return rsxFileName
          ? ts.sys.fileExists(rsxFileName)
          : ts.sys.fileExists(fileName);
      })(),
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
    resolveModuleNames: (
      moduleNames,
      containingFile,
      _,
      redirectedReference,
      options,
    ) =>
      moduleNames.map(
        (moduleName) =>
          ts.resolveModuleName(
            moduleName,
            containingFile,
            options ?? args.options,
            moduleResolutionHost,
            undefined,
            redirectedReference,
          ).resolvedModule,
      ),
  };
  const runtime: IStandaloneRuntime = {
    languageService: ts.createLanguageService(languageServiceHost),
    rootNames: args.rootNames,
    options: args.options,
    virtualFileName: args.virtualFileName,
    setVirtualText(text: string) {
      if (runtimeState.virtualText === text) {
        return;
      }
      runtimeState.virtualText = text;
      runtimeState.scriptVersion += 1;
    },
  };
  standaloneRuntimeByVirtualFile.set(args.virtualFileName, runtime);
  return runtime;
}

export function getRsxDefinitionsAtPosition(
  document: IRsxVirtualDocument,
  position: number,
): IRsxMappedSpan[] {
  const virtualPosition = mapOriginalOffsetToVirtual(document, position);
  if (virtualPosition === null) {
    return [];
  }

  return mapBoundSpansToOriginal(
    document,
    document.languageService.getDefinitionAtPosition(
      document.virtualFileName,
      virtualPosition,
    ) ?? [],
  );
}

export function getRsxReferencesAtPosition(
  document: IRsxVirtualDocument,
  position: number,
): IRsxMappedSpan[] {
  const virtualPosition = mapOriginalOffsetToVirtual(document, position);
  if (virtualPosition === null) {
    return [];
  }

  const symbolReferences = mapBoundSpansToOriginal(
    document,
    document.languageService.getReferencesAtPosition(
      document.virtualFileName,
      virtualPosition,
    ) ?? [],
  );

  const moduleReferences = getRsxModuleImportReferences(document);
  const merged = new Map<string, IRsxMappedSpan>();
  for (const reference of [...symbolReferences, ...moduleReferences]) {
    merged.set(
      `${reference.fileName}:${reference.start}:${reference.end}`,
      reference,
    );
  }

  return [...merged.values()];
}

export function getRsxImplementationsAtPosition(
  document: IRsxVirtualDocument,
  position: number,
): IRsxMappedSpan[] {
  const virtualPosition = mapOriginalOffsetToVirtual(document, position);
  if (virtualPosition === null) {
    return [];
  }

  return mapBoundSpansToOriginal(
    document,
    document.languageService.getImplementationAtPosition(
      document.virtualFileName,
      virtualPosition,
    ) ?? [],
  );
}

export function canRenameRsxSymbolAtPosition(
  document: IRsxVirtualDocument,
  position: number,
): { canRename: boolean; displayName?: string; reason?: string } {
  const virtualPosition = mapOriginalOffsetToVirtual(document, position);
  if (virtualPosition === null) {
    return {
      canRename: false,
      reason: 'No RS-X symbol is available at this position.',
    };
  }

  const renameInfo = document.languageService.getRenameInfo(
    document.virtualFileName,
    virtualPosition,
    {
      allowRenameOfImportPath: false,
      providePrefixAndSuffixTextForRename: false,
    },
  );

  return renameInfo.canRename
    ? {
        canRename: true,
        displayName: renameInfo.displayName,
      }
    : {
        canRename: false,
        reason: renameInfo.localizedErrorMessage,
      };
}

export function getRsxRenameLocationsAtPosition(args: {
  document: IRsxVirtualDocument;
  position: number;
  newName: string;
}): IRsxRenameLocation[] {
  const virtualPosition = mapOriginalOffsetToVirtual(
    args.document,
    args.position,
  );
  if (virtualPosition === null) {
    return [];
  }

  const locations =
    args.document.languageService.findRenameLocations(
      args.document.virtualFileName,
      virtualPosition,
      false,
      false,
      true,
    ) ?? [];

  return locations.flatMap((location) => {
    const mappedSpan = mapVirtualSpanToOriginal({
      document: args.document,
      fileName: location.fileName,
      start: location.textSpan.start,
      end: location.textSpan.start + location.textSpan.length,
    });
    if (!mappedSpan) {
      return [];
    }

    return [
      {
        ...mappedSpan,
        newText: args.newName,
      },
    ];
  });
}

export function getRsxCompletionsAtPosition(
  document: IRsxVirtualDocument,
  position: number,
): IRsxCompletionItem[] {
  const virtualPosition = mapOriginalOffsetToVirtual(document, position);
  if (virtualPosition === null) {
    return [];
  }

  const completions = document.languageService.getCompletionsAtPosition(
    document.virtualFileName,
    virtualPosition,
    {
      includeInsertTextCompletions: true,
      includeCompletionsForModuleExports: false,
      includeCompletionsWithInsertText: true,
    },
  );
  if (!completions) {
    return [];
  }

  const seen = new Set<string>();
  return completions.entries.flatMap((entry) => {
    const name = entry.insertText ?? entry.name;
    if (!name || seen.has(name)) {
      return [];
    }
    seen.add(name);

    return [
      {
        name,
        kind: toCompletionKind(entry.kind),
      },
    ];
  });
}

export function getRsxHoverAtPosition(
  document: IRsxVirtualDocument,
  position: number,
): IRsxHoverInfo | null {
  const virtualPosition = mapOriginalOffsetToVirtual(document, position);
  if (virtualPosition === null) {
    return null;
  }

  const quickInfo = document.languageService.getQuickInfoAtPosition(
    document.virtualFileName,
    virtualPosition,
  );
  if (!quickInfo) {
    return null;
  }

  const mapped = mapVirtualSpanToOriginal({
    document,
    fileName: document.virtualFileName,
    start: quickInfo.textSpan.start,
    end: quickInfo.textSpan.start + quickInfo.textSpan.length,
  });
  if (!mapped) {
    return null;
  }

  const text = [
    formatHoverDisplayText({
      document,
      displayText: ts.displayPartsToString(quickInfo.displayParts),
      rangeStart: mapped.start,
      rangeEnd: mapped.end,
    }),
    ts.displayPartsToString(quickInfo.documentation),
  ]
    .filter((segment) => segment.length > 0)
    .join('\n\n');

  return {
    text,
    start: mapped.start,
    end: mapped.end,
  };
}

export function getRsxSignatureHelpAtPosition(
  document: IRsxVirtualDocument,
  position: number,
): IRsxSignatureHelp | null {
  const virtualPosition = mapOriginalOffsetToVirtual(document, position);
  if (virtualPosition === null) {
    return null;
  }

  const help = document.languageService.getSignatureHelpItems(
    document.virtualFileName,
    virtualPosition,
    {
      triggerReason: {
        kind: 'invoked',
      },
    },
  );
  if (!help || !help.applicableSpan) {
    return null;
  }

  const mappedApplicable = mapVirtualSpanToOriginal({
    document,
    fileName: document.virtualFileName,
    start: help.applicableSpan.start,
    end: help.applicableSpan.start + help.applicableSpan.length,
  });
  if (!mappedApplicable) {
    return null;
  }

  return {
    items: help.items.map((item) => ({
      parameters: item.parameters.map((parameter) => ({
        name: parameter.name,
        typeText: toSignatureParameterTypeText(parameter),
        isOptional: !!parameter.isOptional,
        isRest: !!parameter.isRest,
      })),
      returnTypeText: toSignatureReturnTypeText(item),
    })),
    argumentIndex: help.argumentIndex,
    argumentCount: help.argumentCount,
    applicableStart: mappedApplicable.start,
    applicableEnd: mappedApplicable.end,
  };
}

export function getRsxSemanticTokens(
  document: IRsxVirtualDocument,
): IRsxSemanticToken[] {
  const semanticTokens = collectSemanticTokens(document);
  const syntacticTokens = collectSyntacticTokens(document);

  const bySpan = new Map<string, IRsxSemanticToken>();
  for (const token of syntacticTokens) {
    bySpan.set(`${token.start}:${token.length}`, token);
  }

  // Prefer semantic classifications whenever they exist for the same span.
  for (const token of semanticTokens) {
    bySpan.set(`${token.start}:${token.length}`, token);
  }

  return [...bySpan.values()].sort((left, right) =>
    left.start === right.start
      ? left.length - right.length
      : left.start - right.start,
  );
}

export function getRsxSyntacticTokensForText(
  text: string,
): IRsxSemanticToken[] {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    text,
    undefined,
  );
  const tokens: IRsxSemanticToken[] = [];
  const tokenTypeIndexes = {
    keyword: rsxSemanticTokenTypes.indexOf('keyword'),
    comment: rsxSemanticTokenTypes.indexOf('comment'),
    string: rsxSemanticTokenTypes.indexOf('string'),
    number: rsxSemanticTokenTypes.indexOf('number'),
    regexp: rsxSemanticTokenTypes.indexOf('regexp'),
    operator: rsxSemanticTokenTypes.indexOf('operator'),
  } as const;

  let token = scanner.scan();
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    const tokenStart = scanner.getTokenPos();
    const tokenEnd = scanner.getTextPos();
    if (tokenEnd > tokenStart) {
      const tokenType = toSyntacticTokenType(token, tokenTypeIndexes);
      if (tokenType !== null) {
        tokens.push({
          start: tokenStart,
          length: tokenEnd - tokenStart,
          tokenType,
          tokenModifiers: 0,
        });
      }
    }

    token = scanner.scan();
  }

  return tokens;
}

function collectSemanticTokens(
  document: IRsxVirtualDocument,
): IRsxSemanticToken[] {
  const classifications =
    document.languageService.getEncodedSemanticClassifications(
      document.virtualFileName,
      {
        start: 0,
        length: document.virtualText.length,
      },
      ts.SemanticClassificationFormat.TwentyTwenty,
    ).spans ?? [];

  const tokens: IRsxSemanticToken[] = [];
  const operatorTokenType = rsxSemanticTokenTypes.indexOf('operator');
  const literalLikeTokenTypes = new Set<number>(
    ['string', 'number', 'regexp', 'comment']
      .map((name) => rsxSemanticTokenTypes.indexOf(name))
      .filter((value) => value >= 0),
  );
  for (let index = 0; index < classifications.length; index += 3) {
    const start = classifications[index];
    const length = classifications[index + 1];
    const encoded = classifications[index + 2];
    const mappedStart = mapVirtualOffsetToOriginal(document, start);
    const mappedEnd = mapVirtualOffsetToOriginal(document, start + length);
    if (
      mappedStart === null ||
      mappedEnd === null ||
      mappedEnd <= mappedStart
    ) {
      continue;
    }

    const tokenType = (encoded >> 8) - 1;
    const tokenModifiers = encoded & 0xff;
    if (tokenType < 0 || tokenType >= rsxSemanticTokenTypes.length) {
      continue;
    }

    const tokenText = document.originalText
      .slice(mappedStart, mappedEnd)
      .trim();
    if (
      tokenType === operatorTokenType &&
      !isOperatorLikeTokenText(tokenText)
    ) {
      continue;
    }
    if (
      tokenType !== operatorTokenType &&
      !literalLikeTokenTypes.has(tokenType) &&
      hasOperatorLikePunctuation(tokenText)
    ) {
      continue;
    }

    tokens.push({
      start: mappedStart,
      length: mappedEnd - mappedStart,
      tokenType,
      tokenModifiers,
    });
  }

  return tokens;
}

function collectSyntacticTokens(
  document: IRsxVirtualDocument,
): IRsxSemanticToken[] {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    document.virtualText,
    undefined,
  );
  const tokens: IRsxSemanticToken[] = [];
  const tokenTypeIndexes = {
    keyword: rsxSemanticTokenTypes.indexOf('keyword'),
    comment: rsxSemanticTokenTypes.indexOf('comment'),
    string: rsxSemanticTokenTypes.indexOf('string'),
    number: rsxSemanticTokenTypes.indexOf('number'),
    regexp: rsxSemanticTokenTypes.indexOf('regexp'),
    operator: rsxSemanticTokenTypes.indexOf('operator'),
  } as const;

  let token = scanner.scan();
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    const tokenStart = scanner.getTokenPos();
    const tokenEnd = scanner.getTextPos();
    const mappedStart = mapVirtualOffsetToOriginal(document, tokenStart);
    const mappedEnd = mapVirtualOffsetToOriginal(document, tokenEnd);
    if (mappedStart !== null && mappedEnd !== null && mappedEnd > mappedStart) {
      const tokenType = toSyntacticTokenType(token, tokenTypeIndexes);
      if (tokenType !== null) {
        tokens.push({
          start: mappedStart,
          length: mappedEnd - mappedStart,
          tokenType,
          tokenModifiers: 0,
        });
      }
    }

    token = scanner.scan();
  }

  return tokens;
}

function toSyntacticTokenType(
  token: ts.SyntaxKind,
  indexes: {
    keyword: number;
    comment: number;
    string: number;
    number: number;
    regexp: number;
    operator: number;
  },
): number | null {
  if (
    token >= ts.SyntaxKind.FirstKeyword &&
    token <= ts.SyntaxKind.LastKeyword
  ) {
    return indexes.keyword >= 0 ? indexes.keyword : null;
  }

  if (
    token === ts.SyntaxKind.SingleLineCommentTrivia ||
    token === ts.SyntaxKind.MultiLineCommentTrivia
  ) {
    return indexes.comment >= 0 ? indexes.comment : null;
  }

  if (
    token === ts.SyntaxKind.StringLiteral ||
    token === ts.SyntaxKind.NoSubstitutionTemplateLiteral ||
    token === ts.SyntaxKind.TemplateHead ||
    token === ts.SyntaxKind.TemplateMiddle ||
    token === ts.SyntaxKind.TemplateTail
  ) {
    return indexes.string >= 0 ? indexes.string : null;
  }

  if (
    token === ts.SyntaxKind.NumericLiteral ||
    token === ts.SyntaxKind.BigIntLiteral
  ) {
    return indexes.number >= 0 ? indexes.number : null;
  }

  if (token === ts.SyntaxKind.RegularExpressionLiteral) {
    return indexes.regexp >= 0 ? indexes.regexp : null;
  }

  const tokenText = ts.tokenToString(token);
  if (
    tokenText &&
    isOperatorLikeTokenText(tokenText) &&
    indexes.operator >= 0
  ) {
    return indexes.operator;
  }

  return null;
}

function isOperatorLikeTokenText(text: string): boolean {
  return /^[+\-*\/%<>=!&|^~?:.,;()\[\]{}]+$/u.test(text);
}

function hasOperatorLikePunctuation(text: string): boolean {
  return /[+\-*\/%<>=!&|^~?:.,;()\[\]{}]/u.test(text);
}

export function getRsxDiagnostics(
  document: IRsxVirtualDocument,
): IRsxDiagnostic[] {
  const diagnostics: IRsxDiagnostic[] = [];
  const seen = new Set<string>();
  const unsupportedBodyMessage = resolveUnsupportedBodyMessage(document);
  const byCategory: Array<{
    category: IRsxDiagnostic['category'];
    values: readonly ts.DiagnosticWithLocation[];
  }> = [
    {
      category: 'semantic',
      values:
        document.languageService.getSemanticDiagnostics(
          document.virtualFileName,
        ) ?? [],
    },
    {
      category: 'syntax',
      values:
        document.languageService.getSyntacticDiagnostics(
          document.virtualFileName,
        ) ?? [],
    },
    {
      category: 'suggestion',
      values:
        document.languageService.getSuggestionDiagnostics(
          document.virtualFileName,
        ) ?? [],
    },
  ];

  for (const { category, values } of byCategory) {
    for (const diagnostic of values) {
      const diagnosticStart = diagnostic.start ?? 0;
      const diagnosticLength = diagnostic.length ?? 0;
      const mapped = mapVirtualSpanToOriginal({
        document,
        fileName: diagnostic.file?.fileName ?? document.virtualFileName,
        start: diagnosticStart,
        end: diagnosticStart + diagnosticLength,
      });
      if (!mapped || mapped.fileName !== document.fileName) {
        continue;
      }

      const start = mapped.start;
      const end = Math.max(mapped.end, mapped.start + 1);
      if (
        unsupportedBodyMessage &&
        category !== 'suggestion' &&
        rangesOverlap(
          start,
          end,
          document.bodyRegion.originalStart,
          document.bodyRegion.originalEnd,
        )
      ) {
        continue;
      }

      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        '\n',
      );
      const key = `${category}:${start}:${end}:${message}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      diagnostics.push({
        category,
        message,
        start,
        end,
      });
    }
  }

  if (unsupportedBodyMessage) {
    const start = document.bodyRegion.originalStart;
    const end = Math.max(document.bodyRegion.originalEnd, start + 1);
    const key = `semantic:${start}:${end}:${unsupportedBodyMessage}`;
    if (!seen.has(key)) {
      seen.add(key);
      diagnostics.push({
        category: 'semantic',
        message: unsupportedBodyMessage,
        start,
        end,
      });
    }
  }

  diagnostics.sort((left, right) => left.start - right.start);
  return diagnostics;
}

function resolveUnsupportedBodyMessage(
  document: IRsxVirtualDocument,
): string | null {
  const bodyExpression = document.originalText
    .slice(document.bodyRegion.originalStart, document.bodyRegion.originalEnd)
    .trim();
  if (!bodyExpression) {
    return null;
  }

  const parsedDiagnostic = parseExpressionDiagnostic(bodyExpression);
  if (parsedDiagnostic?.category !== 'unsupported') {
    return null;
  }

  return parsedDiagnostic.message;
}

export function getRsxDocumentSymbols(
  document: IRsxVirtualDocument,
): IRsxDocumentSymbol[] {
  const navigationTree = document.languageService.getNavigationTree(
    document.virtualFileName,
  );
  const bodySymbols = navigationTree.childItems
    .flatMap((child) => toRsxDocumentSymbols(document, child))
    .filter((symbol) => symbol.name !== '__rsx_expression');

  const symbols: IRsxDocumentSymbol[] = [
    {
      name: 'model',
      detail: 'RS-X model contract',
      kind: 'type',
      range: {
        fileName: document.fileName,
        start: document.modelTypeRegion.originalStart,
        end: document.modelTypeRegion.originalEnd,
      },
      selectionRange: {
        fileName: document.fileName,
        start: document.modelTypeRegion.originalStart,
        end: document.modelTypeRegion.originalEnd,
      },
      children: [],
    },
  ];

  if (document.returnTypeRegion) {
    symbols.push({
      name: 'return',
      detail: 'RS-X return contract',
      kind: 'type',
      range: {
        fileName: document.fileName,
        start: document.returnTypeRegion.originalStart,
        end: document.returnTypeRegion.originalEnd,
      },
      selectionRange: {
        fileName: document.fileName,
        start: document.returnTypeRegion.originalStart,
        end: document.returnTypeRegion.originalEnd,
      },
      children: [],
    });
  }

  symbols.push({
    name: 'expression',
    detail: 'RS-X expression body',
    kind: 'function',
    range: {
      fileName: document.fileName,
      start: document.bodyRegion.originalStart,
      end: document.bodyRegion.originalEnd,
    },
    selectionRange: {
      fileName: document.fileName,
      start: document.bodyRegion.originalStart,
      end: Math.min(
        document.bodyRegion.originalEnd,
        document.bodyRegion.originalStart + 1,
      ),
    },
    children: bodySymbols,
  });

  return symbols;
}

export function getRsxCodeFixes(args: {
  document: IRsxVirtualDocument;
  start: number;
  end: number;
}): IRsxCodeFix[] {
  const virtualStart = mapOriginalOffsetToVirtual(args.document, args.start);
  const virtualEnd = mapOriginalOffsetToVirtual(args.document, args.end);
  if (virtualStart === null || virtualEnd === null) {
    return [];
  }

  const diagnostics = [
    ...args.document.languageService.getSemanticDiagnostics(
      args.document.virtualFileName,
    ),
    ...args.document.languageService.getSyntacticDiagnostics(
      args.document.virtualFileName,
    ),
  ].filter((diagnostic) => {
    const start = diagnostic.start ?? 0;
    const end = start + (diagnostic.length ?? 0);
    return rangesOverlap(start, end, virtualStart, virtualEnd);
  });

  if (diagnostics.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  return diagnostics.flatMap((diagnostic) => {
    const diagnosticStart = diagnostic.start ?? virtualStart;
    const diagnosticEnd = diagnosticStart + (diagnostic.length ?? 0);
    return args.document.languageService
      .getCodeFixesAtPosition(
        args.document.virtualFileName,
        diagnosticStart,
        diagnosticEnd,
        [diagnostic.code],
        {},
        {},
      )
      .flatMap((fix) => {
        const edits = fix.changes.flatMap((change) =>
          change.textChanges.flatMap((textChange) => {
            const mapped = mapVirtualSpanToOriginal({
              document: args.document,
              fileName: change.fileName,
              start: textChange.span.start,
              end: textChange.span.start + textChange.span.length,
            });
            return mapped
              ? [
                  {
                    ...mapped,
                    newText: textChange.newText,
                  },
                ]
              : [];
          }),
        );

        if (edits.length === 0) {
          return [];
        }

        const key = `${fix.fixName}:${fix.description}:${edits
          .map(
            (edit) =>
              `${edit.fileName}:${edit.start}:${edit.end}:${edit.newText}`,
          )
          .join('|')}`;
        if (seen.has(key)) {
          return [];
        }
        seen.add(key);

        return [
          {
            title: fix.description,
            edits,
          },
        ];
      });
  });
}

function buildVirtualDocument(args: {
  fileName: string;
  text: string;
  virtualFileNameSuffix?: string;
  parsed: IRsxFileParts;
  modelPropertyNames: readonly string[];
}): Omit<IRsxVirtualDocument, 'languageService'> {
  const normalizedText = args.text.replace(/\r\n/gu, '\n');
  const modelTypeMatch = /^(model)\s*:\s*(.+)$/mu.exec(normalizedText);
  if (!modelTypeMatch || typeof modelTypeMatch.index !== 'number') {
    throw new Error('RS-X file is missing a model header.');
  }

  const modelTypeOriginalStart =
    modelTypeMatch.index + modelTypeMatch[0].indexOf(modelTypeMatch[2]);
  const modelTypeOriginalEnd =
    modelTypeOriginalStart + modelTypeMatch[2].length;

  let virtualText = '';
  const modelTypeVirtualStart = virtualText.length + RSX_MODEL_PREFIX.length;
  virtualText += `${RSX_MODEL_PREFIX}${modelTypeMatch[2]};\n`;
  const modelTypeVirtualEnd = modelTypeVirtualStart + modelTypeMatch[2].length;

  const returnTypeMatch = /^(return)\s*:\s*(.+)$/mu.exec(normalizedText);
  let returnTypeRegion: IMappedRegion | undefined;
  if (returnTypeMatch && typeof returnTypeMatch.index === 'number') {
    const returnTypeOriginalStart =
      returnTypeMatch.index + returnTypeMatch[0].indexOf(returnTypeMatch[2]);
    const returnTypeVirtualStart =
      virtualText.length + RSX_RETURN_PREFIX.length;
    virtualText += `${RSX_RETURN_PREFIX}${returnTypeMatch[2]};\n`;
    returnTypeRegion = {
      originalStart: returnTypeOriginalStart,
      originalEnd: returnTypeOriginalStart + returnTypeMatch[2].length,
      virtualStart: returnTypeVirtualStart,
      virtualEnd: returnTypeVirtualStart + returnTypeMatch[2].length,
    };
  }

  if (args.modelPropertyNames.length > 0) {
    virtualText += args.modelPropertyNames
      .map(
        (propertyName) =>
          `declare const ${propertyName}: __RSX_MODEL[${JSON.stringify(propertyName)}];`,
      )
      .join('\n');
    virtualText += '\n';
  }

  const bodyOriginalStart = findRsxBodyStartOffset(normalizedText);
  const bodyOriginalText = normalizedText.slice(bodyOriginalStart);
  const bodyDeclarationPrefix = returnTypeRegion
    ? `const __rsx_expression: __RSX_RETURN = (\n`
    : `${RSX_BODY_PREFIX} = (\n`;
  const bodyVirtualStart = virtualText.length + bodyDeclarationPrefix.length;
  virtualText += `${bodyDeclarationPrefix}${bodyOriginalText}\n);\n`;
  const virtualFileName = args.virtualFileNameSuffix
    ? `${args.fileName}.standalone.${args.virtualFileNameSuffix}.ts`
    : `${args.fileName}.standalone.ts`;

  return {
    fileName: args.fileName,
    virtualFileName,
    originalText: normalizedText,
    virtualText,
    modelPropertyNames: args.modelPropertyNames,
    modelTypeRegion: {
      originalStart: modelTypeOriginalStart,
      originalEnd: modelTypeOriginalEnd,
      virtualStart: modelTypeVirtualStart,
      virtualEnd: modelTypeVirtualEnd,
    },
    returnTypeRegion,
    bodyRegion: {
      originalStart: bodyOriginalStart,
      originalEnd: normalizedText.length,
      virtualStart: bodyVirtualStart,
      virtualEnd: bodyVirtualStart + bodyOriginalText.length,
    },
  };
}

function formatHoverDisplayText(args: {
  document: IRsxVirtualDocument;
  displayText: string;
  rangeStart: number;
  rangeEnd: number;
}): string {
  const { document, displayText, rangeStart, rangeEnd } = args;
  const match = /^const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*:\s*([\s\S]+)$/u.exec(
    displayText.trim(),
  );
  if (!match) {
    return displayText;
  }

  const propertyName = match[1];
  const propertyType = match[2];
  const hoveredText = document.originalText.slice(rangeStart, rangeEnd);
  if (
    hoveredText !== propertyName ||
    !document.modelPropertyNames.includes(propertyName)
  ) {
    return displayText;
  }

  return `model.${propertyName}: ${propertyType}`;
}

function resolveTopLevelModelPropertyNames(args: {
  fileName: string;
  text: string;
  projectContext: IResolvedProjectContext;
}): string[] {
  const rootNames = Array.from(
    new Set([
      ...args.projectContext.rootNames.filter(
        (rootName) => !rootName.endsWith('.rsx'),
      ),
      args.fileName,
    ]),
  );
  const baseHost = createRsxImportAwareCompilerHost({
    options: args.projectContext.options,
    rootNames,
  });
  const scriptTarget =
    args.projectContext.options.target ?? ts.ScriptTarget.Latest;
  const host: ts.CompilerHost = {
    ...baseHost,
    fileExists(candidateFileName) {
      if (candidateFileName === args.fileName) {
        return true;
      }
      return baseHost.fileExists(candidateFileName);
    },
    readFile(candidateFileName) {
      if (candidateFileName === args.fileName) {
        return args.text;
      }
      return baseHost.readFile(candidateFileName);
    },
    getSourceFile(
      candidateFileName,
      languageVersion,
      onError,
      shouldCreateNewSourceFile,
    ) {
      if (candidateFileName === args.fileName) {
        return ts.createSourceFile(
          args.fileName,
          args.text,
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
    options: args.projectContext.options,
    host,
  });
  const rsxBacked = createRsxBackedProgramForFile(
    program,
    args.fileName,
    args.text,
  );
  if (!rsxBacked) {
    return [];
  }

  const checker = rsxBacked.program.getTypeChecker();
  const modelAlias = rsxBacked.virtualSourceFile.statements.find(
    (statement): statement is ts.TypeAliasDeclaration =>
      ts.isTypeAliasDeclaration(statement) &&
      statement.name.text === '__RSX_MODEL',
  );
  if (!modelAlias) {
    return [];
  }

  return checker
    .getTypeFromTypeNode(modelAlias.type)
    .getProperties()
    .map((property) => property.getName())
    .filter((propertyName) => /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(propertyName));
}

function parseRsxFile(text: string): IRsxFileParts | null {
  const normalizedText = text.replace(/\r\n/gu, '\n');
  // Standalone mode supports a single expression body. Module-style RS-X files
  // that declare multiple `expression:` blocks should be handled by imports,
  // not by per-file standalone diagnostics.
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

function resolveProjectContext(fileName: string): IResolvedProjectContext {
  const cachedByFile = projectContextByFileCache.get(fileName);
  if (cachedByFile) {
    return cachedByFile;
  }

  const containingDirectory = path.dirname(fileName);
  const configFileName =
    ts.findConfigFile(
      containingDirectory,
      ts.sys.fileExists,
      'tsconfig.json',
    ) ??
    ts.findConfigFile(containingDirectory, ts.sys.fileExists, 'jsconfig.json');

  const defaultContext = (): IResolvedProjectContext => ({
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
  });
  const cacheKey = configFileName
    ? `config:${configFileName}`
    : `default:${fileName}`;
  const cached = projectContextCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  if (!configFileName) {
    const resolved = defaultContext();
    projectContextCache.set(cacheKey, resolved);
    projectContextByFileCache.set(fileName, resolved);
    return resolved;
  }

  const parsedConfig = ts.getParsedCommandLineOfConfigFile(
    configFileName,
    undefined,
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: () => undefined,
    },
  );

  if (!parsedConfig) {
    const resolved = defaultContext();
    projectContextCache.set(cacheKey, resolved);
    projectContextByFileCache.set(fileName, resolved);
    return resolved;
  }

  const resolved = {
    options: parsedConfig.options,
    rootNames: parsedConfig.fileNames,
  };
  projectContextCache.set(cacheKey, resolved);
  projectContextByFileCache.set(fileName, resolved);
  return resolved;
}

function mapBoundSpansToOriginal(
  document: IRsxVirtualDocument,
  spans:
    | readonly ts.DefinitionInfo[]
    | readonly ts.ReferenceEntry[]
    | readonly ts.ImplementationLocation[],
): IRsxMappedSpan[] {
  return spans.flatMap((span) => {
    const mapped = mapVirtualSpanToOriginal({
      document,
      fileName: span.fileName,
      start: span.textSpan.start,
      end: span.textSpan.start + span.textSpan.length,
    });
    return mapped ? [mapped] : [];
  });
}

function getRsxModuleImportReferences(
  document: IRsxVirtualDocument,
): IRsxMappedSpan[] {
  const declarationFileName = getRsxVirtualDeclarationFileName(
    document.fileName,
  );
  const declarationText = generateRsxModuleDeclaration({
    fileName: document.fileName,
    text: document.originalText,
  });
  if (!declarationText) {
    return [];
  }

  const exportMatch = /declare const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*:/u.exec(
    declarationText,
  );
  if (!exportMatch || typeof exportMatch.index !== 'number') {
    return [];
  }

  const symbolPosition =
    exportMatch.index + exportMatch[0].indexOf(exportMatch[1]);
  const references =
    document.languageService.getReferencesAtPosition(
      declarationFileName,
      symbolPosition,
    ) ?? [];

  return references
    .flatMap((reference) => {
      const mapped = mapVirtualSpanToOriginal({
        document,
        fileName: reference.fileName,
        start: reference.textSpan.start,
        end: reference.textSpan.start + reference.textSpan.length,
      });
      return mapped ? [mapped] : [];
    })
    .filter((reference) => !reference.fileName.endsWith('.rsx.d.ts'));
}

function toRsxDocumentSymbols(
  document: IRsxVirtualDocument,
  item: ts.NavigationTree,
): IRsxDocumentSymbol[] {
  if (
    item.text === '<global>' ||
    item.text === '__RSX_MODEL' ||
    item.text === '__RSX_RETURN'
  ) {
    return (item.childItems ?? []).flatMap((child) =>
      toRsxDocumentSymbols(document, child),
    );
  }

  if (
    item.text !== '__rsx_expression' &&
    item.spans.every(
      (span) =>
        mapVirtualSpanToOriginal({
          document,
          fileName: document.virtualFileName,
          start: span.start,
          end: span.start + span.length,
        }) === null,
    )
  ) {
    return (item.childItems ?? []).flatMap((child) =>
      toRsxDocumentSymbols(document, child),
    );
  }

  const primarySpan = item.spans[0];
  if (!primarySpan) {
    return [];
  }

  const mappedRange = mapVirtualSpanToOriginal({
    document,
    fileName: document.virtualFileName,
    start: primarySpan.start,
    end: primarySpan.start + primarySpan.length,
  });
  if (!mappedRange) {
    return [];
  }

  return [
    {
      name: item.text === '__rsx_expression' ? 'expression' : item.text,
      detail: item.kindModifiers || undefined,
      kind: toDocumentSymbolKind(item.kind),
      range: mappedRange,
      selectionRange: mappedRange,
      children: (item.childItems ?? []).flatMap((child) =>
        toRsxDocumentSymbols(document, child),
      ),
    },
  ];
}

function toDocumentSymbolKind(
  kind: ts.ScriptElementKind,
): IRsxDocumentSymbol['kind'] {
  if (
    kind === ts.ScriptElementKind.functionElement ||
    kind === ts.ScriptElementKind.memberFunctionElement
  ) {
    return 'function';
  }

  if (
    kind === ts.ScriptElementKind.memberVariableElement ||
    kind === ts.ScriptElementKind.memberGetAccessorElement ||
    kind === ts.ScriptElementKind.memberSetAccessorElement
  ) {
    return 'property';
  }

  if (
    kind === ts.ScriptElementKind.interfaceElement ||
    kind === ts.ScriptElementKind.typeElement ||
    kind === ts.ScriptElementKind.classElement
  ) {
    return 'type';
  }

  return 'variable';
}

function toCompletionKind(
  kind: ts.ScriptElementKind,
): IRsxCompletionItem['kind'] {
  if (
    kind === ts.ScriptElementKind.memberFunctionElement ||
    kind === ts.ScriptElementKind.functionElement
  ) {
    return 'method';
  }

  if (kind === ts.ScriptElementKind.constructorImplementationElement) {
    return 'constructor';
  }

  return 'property';
}

function toSignatureParameterTypeText(
  parameter: ts.SignatureHelpParameter,
): string {
  const displayText = ts.displayPartsToString(parameter.displayParts).trim();
  const prefixPattern = new RegExp(
    `^\\.\\.\\.${escapeRegExp(parameter.name)}\\??\\s*:\\s*|^${escapeRegExp(parameter.name)}\\??\\s*:\\s*`,
    'u',
  );
  return displayText.replace(prefixPattern, '').trim();
}

function toSignatureReturnTypeText(item: ts.SignatureHelpItem): string {
  const suffixText = ts.displayPartsToString(item.suffixDisplayParts).trim();
  return suffixText.replace(/^\)\s*:\s*/u, '').trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function mapVirtualSpanToOriginal(args: {
  document: IRsxVirtualDocument;
  fileName: string;
  start: number;
  end: number;
}): IRsxMappedSpan | null {
  if (args.fileName !== args.document.virtualFileName) {
    return {
      fileName: args.fileName,
      start: args.start,
      end: args.end,
    };
  }

  const start = mapVirtualOffsetToOriginal(args.document, args.start);
  const end = mapVirtualOffsetToOriginal(args.document, args.end);
  if (start === null || end === null) {
    return null;
  }

  return {
    fileName: args.document.fileName,
    start,
    end,
  };
}

function mapOriginalOffsetToVirtual(
  document: IRsxVirtualDocument,
  offset: number,
): number | null {
  return mapOffset({
    offset,
    regions: [
      document.modelTypeRegion,
      ...(document.returnTypeRegion ? [document.returnTypeRegion] : []),
      document.bodyRegion,
    ],
    source: 'original',
  });
}

function mapVirtualOffsetToOriginal(
  document: IRsxVirtualDocument,
  offset: number,
): number | null {
  return mapOffset({
    offset,
    regions: [
      document.modelTypeRegion,
      ...(document.returnTypeRegion ? [document.returnTypeRegion] : []),
      document.bodyRegion,
    ],
    source: 'virtual',
  });
}

function mapOffset(args: {
  offset: number;
  regions: readonly IMappedRegion[];
  source: 'original' | 'virtual';
}): number | null {
  for (const region of args.regions) {
    const sourceStart =
      args.source === 'original' ? region.originalStart : region.virtualStart;
    const sourceEnd =
      args.source === 'original' ? region.originalEnd : region.virtualEnd;
    const targetStart =
      args.source === 'original' ? region.virtualStart : region.originalStart;
    const targetEnd =
      args.source === 'original' ? region.virtualEnd : region.originalEnd;

    if (args.offset < sourceStart || args.offset > sourceEnd) {
      continue;
    }

    if (args.offset === sourceEnd) {
      return targetEnd;
    }

    return targetStart + (args.offset - sourceStart);
  }

  return null;
}

function skipWhitespace(text: string, index: number): number {
  let cursor = index;
  while (cursor < text.length && /\s/u.test(text[cursor])) {
    cursor += 1;
  }
  return cursor;
}

function findRsxBodyStartOffset(text: string): number {
  let cursor = 0;

  while (cursor < text.length) {
    const lineEndIndex = text.indexOf('\n', cursor);
    const lineEnd = lineEndIndex === -1 ? text.length : lineEndIndex;
    const line = text.slice(cursor, lineEnd);
    const trimmed = line.trim();
    const nextLineOffset = lineEndIndex === -1 ? text.length : lineEnd + 1;

    if (trimmed.length === 0) {
      cursor = nextLineOffset;
      continue;
    }

    const headerMatch = /^([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.+)$/u.exec(trimmed);
    if (!headerMatch || !isSupportedRsxHeaderKey(headerMatch[1])) {
      break;
    }

    cursor = nextLineOffset;
  }

  return skipWhitespace(text, cursor);
}

function isSupportedRsxHeaderKey(key: string): boolean {
  return (
    key === 'model' ||
    key === 'return' ||
    key === 'preparse' ||
    key === 'lazy' ||
    key === 'lazyGroup' ||
    key === 'compiled' ||
    key === 'compile'
  );
}

function rangesOverlap(
  leftStart: number,
  leftEnd: number,
  rightStart: number,
  rightEnd: number,
): boolean {
  return leftStart <= rightEnd && rightStart <= leftEnd;
}
