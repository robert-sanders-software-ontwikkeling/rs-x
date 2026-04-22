import * as path from 'node:path';

import ts from 'typescript';

import {
  createRsxBackedProgramForFile,
  createRsxImportAwareCompilerHost,
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
  readonly modelTypeRegion: IMappedRegion;
  readonly returnTypeRegion?: IMappedRegion;
  readonly bodyRegion: IMappedRegion;
  readonly languageService: ts.LanguageService;
}

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
  'member',
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
}): IRsxVirtualDocument | null {
  const parsed = parseRsxFile(args.text);
  if (!parsed) {
    return null;
  }

  const projectContext = resolveProjectContext(args.fileName);
  const virtual = buildVirtualDocument({
    fileName: args.fileName,
    text: args.text,
    parsed,
    modelPropertyNames: resolveTopLevelModelPropertyNames({
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
    ]),
  );
  const moduleResolutionHost = createRsxImportAwareCompilerHost({
    options: projectContext.options,
    rootNames,
  });

  const languageServiceHost: ts.LanguageServiceHost = {
    getCompilationSettings: () => projectContext.options,
    getScriptFileNames: () => rootNames,
    getScriptVersion: () => '1',
    getScriptSnapshot: (fileName) => {
      if (fileName === virtual.virtualFileName) {
        return ts.ScriptSnapshot.fromString(virtual.virtualText);
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
      fileName === virtual.virtualFileName
        ? virtual.virtualText
        : ts.sys.readFile(fileName),
    fileExists: (fileName) =>
      fileName === virtual.virtualFileName || ts.sys.fileExists(fileName),
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
            options ?? projectContext.options,
            moduleResolutionHost,
            undefined,
            redirectedReference,
          ).resolvedModule,
      ),
  };

  return {
    ...virtual,
    languageService: ts.createLanguageService(languageServiceHost),
  };
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

  return mapBoundSpansToOriginal(
    document,
    document.languageService.getReferencesAtPosition(
      document.virtualFileName,
      virtualPosition,
    ) ?? [],
  );
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

export function getRsxSemanticTokens(
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

    tokens.push({
      start: mappedStart,
      length: mappedEnd - mappedStart,
      tokenType,
      tokenModifiers,
    });
  }

  return tokens;
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

  const lastHeaderMatch = returnTypeMatch ?? modelTypeMatch;
  const bodyHeaderEnd = normalizedText.indexOf('\n', lastHeaderMatch.index);
  const bodyOriginalStart = skipWhitespace(
    normalizedText,
    bodyHeaderEnd === -1 ? normalizedText.length : bodyHeaderEnd + 1,
  );
  const bodyOriginalText = normalizedText.slice(bodyOriginalStart);
  const bodyDeclarationPrefix = returnTypeRegion
    ? `const __rsx_expression: __RSX_RETURN = (\n`
    : `${RSX_BODY_PREFIX} = (\n`;
  const bodyVirtualStart = virtualText.length + bodyDeclarationPrefix.length;
  virtualText += `${bodyDeclarationPrefix}${bodyOriginalText}\n);\n`;
  const virtualFileName = `${args.fileName}.standalone.ts`;

  return {
    fileName: args.fileName,
    virtualFileName,
    originalText: normalizedText,
    virtualText,
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

  const parsedConfig = ts.getParsedCommandLineOfConfigFile(
    configFileName,
    undefined,
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: () => undefined,
    },
  );

  if (!parsedConfig) {
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
    options: parsedConfig.options,
    rootNames: parsedConfig.fileNames,
  };
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

function rangesOverlap(
  leftStart: number,
  leftEnd: number,
  rightStart: number,
  rightEnd: number,
): boolean {
  return leftStart <= rightEnd && rightStart <= leftEnd;
}
