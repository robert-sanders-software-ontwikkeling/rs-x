import * as path from 'node:path';

import ts from 'typescript';

import {
  createRsxBackedProgramForFile,
  createRsxImportAwareCompilerHost,
  generateRsxModuleDeclaration,
  getRsxExpressionExportSourceSpan,
  getRsxFileNameFromVirtualDeclaration,
  getRsxVirtualDeclarationFileName,
  normalizeRsxModelExpressionReferenceTypeText,
  parseExpressionDiagnostic,
  rsxSemanticTokenTypes,
  shouldEmitRsxSemanticToken,
  toRsxSyntacticTokenType,
} from '@rs-x/compiler';

const RSX_MODEL_PREFIX = 'type __RSX_MODEL = ';
const RSX_RETURN_PREFIX = 'type __RSX_RETURN = ';
const RSX_BODY_PREFIX = 'const __rsx_expression';
const RSX_UNWRAP_EXPRESSION_HELPER =
  "type __RSX_UNWRAP_EXPRESSION<T> = T extends import('@rs-x/expression-parser').IExpression<infer TValue> ? TValue : T extends import('@rs-x/expression-parser').IExpressionTree<infer TValue> ? TValue : T;\n";

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

export interface IRsxHeaderImportDiagnostic {
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

export { rsxSemanticTokenTypes };

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
  const modelTypeText = getModelTypeText(args.text);
  const fastModelPropertyNames =
    hintedModelPropertyNames.length > 0 || !modelTypeText
      ? null
      : resolveFastModelPropertyNames({
          containingFile: args.fileName,
          modelTypeText,
        });
  const virtual = buildVirtualDocument({
    fileName: args.fileName,
    text: args.text,
    virtualFileNameSuffix: args.virtualFileNameSuffix,
    parsed,
    modelPropertyNames:
      hintedModelPropertyNames.length > 0
        ? hintedModelPropertyNames
        : (fastModelPropertyNames ??
          resolveTopLevelModelPropertyNames({
            fileName: args.fileName,
            text: args.text,
            projectContext,
          })),
  });
  const rootNames = [virtual.virtualFileName];
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
        : getStandaloneDependencyScriptVersion(fileName),
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
      reusedNames,
      redirectedReference,
      options,
    ) => {
      const resolvedByRsxHost = moduleResolutionHost.resolveModuleNames?.(
        moduleNames,
        containingFile,
        reusedNames,
        redirectedReference,
        options ?? args.options,
      );
      if (resolvedByRsxHost) {
        return resolvedByRsxHost;
      }

      return moduleNames.map(
        (moduleName) =>
          ts.resolveModuleName(
            moduleName,
            containingFile,
            options ?? args.options,
            moduleResolutionHost,
            undefined,
            redirectedReference,
          ).resolvedModule,
      );
    },
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

function getStandaloneDependencyScriptVersion(fileName: string): string {
  const rsxFileName = getRsxFileNameFromVirtualDeclaration(fileName);
  if (rsxFileName) {
    const rsxText = ts.sys.readFile(rsxFileName);
    return typeof rsxText === 'string'
      ? `rsx:${hashStandaloneText(rsxText)}`
      : 'missing';
  }

  const text = ts.sys.readFile(fileName);
  return typeof text === 'string'
    ? `file:${hashStandaloneText(text)}`
    : 'missing';
}

function hashStandaloneText(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16);
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

export function getRsxTypeDefinitionsAtPosition(
  document: IRsxVirtualDocument,
  position: number,
): IRsxMappedSpan[] {
  const headerImportDefinitions = getRsxHeaderImportTypeDefinitionsAtPosition(
    document,
    position,
  );
  if (headerImportDefinitions.length > 0) {
    return headerImportDefinitions;
  }

  const virtualPosition = mapOriginalOffsetToVirtual(document, position);
  if (virtualPosition === null) {
    return [];
  }

  const typeDefinitions = mapBoundSpansToOriginal(
    document,
    document.languageService.getTypeDefinitionAtPosition(
      document.virtualFileName,
      virtualPosition,
    ) ?? [],
  );
  if (typeDefinitions.length > 0) {
    return typeDefinitions;
  }

  return mapBoundSpansToOriginal(
    document,
    document.languageService.getDefinitionAtPosition(
      document.virtualFileName,
      virtualPosition,
    ) ?? [],
  );
}

export function getRsxHeaderImportTypeDefinitionsAtTextPosition(args: {
  fileName: string;
  text: string;
  position: number;
}): IRsxMappedSpan[] {
  const header = getHeaderValueAtTextPosition(args);
  if (!header) {
    return [];
  }

  return resolveHeaderImportTypeDefinitionsInText({
    containingFile: args.fileName,
    headerText: header.text,
    relativePosition: args.position - header.start,
  });
}

export function getRsxHeaderImportHoverAtTextPosition(args: {
  fileName: string;
  text: string;
  position: number;
}): IRsxHoverInfo | null {
  const header = getHeaderValueAtTextPosition(args);
  if (!header) {
    return null;
  }

  return resolveHeaderImportHoverInText({
    containingFile: args.fileName,
    headerText: header.text,
    headerStart: header.start,
    relativePosition: args.position - header.start,
  });
}

export function getRsxHeaderImportDiagnosticsForText(args: {
  fileName: string;
  headerText: string;
}): IRsxHeaderImportDiagnostic[] {
  const diagnostics: IRsxHeaderImportDiagnostic[] = [];
  for (const reference of findHeaderImportTypeReferences(args.headerText)) {
    const resolvedFileName = resolveHeaderImportModuleFileName({
      containingFile: args.fileName,
      moduleName: reference.moduleName,
    });
    if (!resolvedFileName) {
      diagnostics.push({
        message: `Cannot find module '${reference.moduleName}' or its corresponding type declarations.`,
        start: reference.moduleStart,
        end: reference.moduleEnd,
      });
      continue;
    }

    const exportedSpan = resolveExportedTypeSpan({
      fileName: resolvedFileName,
      name: reference.typeName,
      seen: new Set<string>(),
    });
    if (!exportedSpan) {
      diagnostics.push({
        message: `Module '${reference.moduleName}' has no exported type '${reference.typeName}'.`,
        start: reference.typeStart,
        end: reference.typeEnd,
      });
    }
  }

  return diagnostics;
}

function getHeaderValueAtTextPosition(args: {
  text: string;
  position: number;
}): {
  text: string;
  start: number;
  end: number;
  key: 'model' | 'return';
} | null {
  const normalizedPosition = Math.max(
    0,
    Math.min(args.position, args.text.length),
  );

  for (const headerLine of getTextLines(args.text)) {
    if (headerLine.start > normalizedPosition) {
      break;
    }

    const headerMatch = /^(\s*)(model|return)\s*:\s*(.*)$/u.exec(
      headerLine.text,
    );
    if (!headerMatch) {
      continue;
    }

    const separatorIndex = headerLine.text.indexOf(':');
    if (separatorIndex < 0) {
      continue;
    }

    let valueStartCharacter = separatorIndex + 1;
    while (
      valueStartCharacter < headerLine.text.length &&
      /\s/u.test(headerLine.text[valueStartCharacter])
    ) {
      valueStartCharacter += 1;
    }

    const valueStart = headerLine.start + valueStartCharacter;
    const valueLines = [headerLine.text.slice(valueStartCharacter).trim()];
    let end = headerLine.end;
    let next = headerLine.next;
    while (
      next < args.text.length &&
      !isStandaloneTypeHeaderValueComplete(valueLines.join('\n'))
    ) {
      const continuationLine = readTextLineAt(args.text, next);
      if (!/^\s/u.test(continuationLine.text)) {
        break;
      }
      valueLines.push(continuationLine.text.trim());
      end = continuationLine.end;
      next = continuationLine.next;
    }

    if (normalizedPosition < valueStart || normalizedPosition > end) {
      continue;
    }

    return {
      text: args.text.slice(valueStart, end),
      start: valueStart,
      end,
      key: headerMatch[2] as 'model' | 'return',
    };
  }

  return null;
}

function getTextLines(text: string): Array<{
  text: string;
  start: number;
  end: number;
  next: number;
}> {
  const lines: Array<{
    text: string;
    start: number;
    end: number;
    next: number;
  }> = [];
  let offset = 0;
  while (offset <= text.length) {
    const line = readTextLineAt(text, offset);
    lines.push(line);
    if (line.next <= offset || line.next > text.length) {
      break;
    }
    offset = line.next;
  }
  return lines;
}

function readTextLineAt(
  text: string,
  offset: number,
): { text: string; start: number; end: number; next: number } {
  const lineEndIndex = text.indexOf('\n', offset);
  const end = lineEndIndex === -1 ? text.length : lineEndIndex;
  return {
    text: text.slice(offset, end),
    start: offset,
    end,
    next: lineEndIndex === -1 ? text.length + 1 : end + 1,
  };
}

function getRsxHeaderImportTypeDefinitionsAtPosition(
  document: IRsxVirtualDocument,
  position: number,
): IRsxMappedSpan[] {
  const headerRegions = [
    document.modelTypeRegion,
    ...(document.returnTypeRegion ? [document.returnTypeRegion] : []),
  ];
  const headerRegion = headerRegions.find(
    (region) =>
      position >= region.originalStart && position <= region.originalEnd,
  );
  if (!headerRegion) {
    return [];
  }

  const headerText = document.originalText.slice(
    headerRegion.originalStart,
    headerRegion.originalEnd,
  );
  const relativePosition = position - headerRegion.originalStart;
  return resolveHeaderImportTypeDefinitionsInText({
    containingFile: document.fileName,
    headerText,
    relativePosition,
  });
}

function resolveHeaderImportTypeDefinitionsInText(args: {
  containingFile: string;
  headerText: string;
  relativePosition: number;
}): IRsxMappedSpan[] {
  for (const reference of findHeaderImportTypeReferences(args.headerText)) {
    if (
      args.relativePosition < reference.moduleStart ||
      args.relativePosition > Math.max(reference.moduleEnd, reference.typeEnd)
    ) {
      continue;
    }

    const resolvedFileName = resolveHeaderImportModuleFileName({
      containingFile: args.containingFile,
      moduleName: reference.moduleName,
    });
    if (!resolvedFileName) {
      return [];
    }

    if (args.relativePosition <= reference.moduleEnd) {
      return [{ fileName: resolvedFileName, start: 0, end: 0 }];
    }

    const exportedSpan = resolveExportedTypeSpan({
      fileName: resolvedFileName,
      name: reference.typeName,
      seen: new Set<string>(),
    });
    return exportedSpan
      ? [exportedSpan]
      : [{ fileName: resolvedFileName, start: 0, end: 0 }];
  }

  return [];
}

function resolveHeaderImportHoverInText(args: {
  containingFile: string;
  headerText: string;
  headerStart: number;
  relativePosition: number;
}): IRsxHoverInfo | null {
  for (const reference of findHeaderImportTypeReferences(args.headerText)) {
    if (
      args.relativePosition < reference.moduleStart ||
      args.relativePosition > Math.max(reference.moduleEnd, reference.typeEnd)
    ) {
      continue;
    }

    const resolvedFileName = resolveHeaderImportModuleFileName({
      containingFile: args.containingFile,
      moduleName: reference.moduleName,
    });
    if (!resolvedFileName) {
      return {
        text: `Cannot find module '${reference.moduleName}'.`,
        start: args.headerStart + reference.moduleStart,
        end: args.headerStart + reference.moduleEnd,
      };
    }

    if (args.relativePosition <= reference.moduleEnd) {
      return {
        text: `module "${reference.moduleName}"`,
        start: args.headerStart + reference.moduleStart,
        end: args.headerStart + reference.moduleEnd,
      };
    }

    const exportedSpan = resolveExportedTypeSpan({
      fileName: resolvedFileName,
      name: reference.typeName,
      seen: new Set<string>(),
    });
    return {
      text:
        formatExportedTypeHoverText({
          fileName: resolvedFileName,
          span: exportedSpan,
          name: reference.typeName,
        }) ?? `type ${reference.typeName}`,
      start: args.headerStart + reference.typeStart,
      end: args.headerStart + reference.typeEnd,
    };
  }

  return null;
}

function findHeaderImportTypeReferences(headerText: string): Array<{
  moduleName: string;
  typeName: string;
  moduleStart: number;
  moduleEnd: number;
  typeStart: number;
  typeEnd: number;
}> {
  const importTypePattern =
    /import\s*\(\s*(['"])([^'"]+)\1\s*\)\s*\.\s*([A-Za-z_$][A-Za-z0-9_$]*)/gu;
  const references: Array<{
    moduleName: string;
    typeName: string;
    moduleStart: number;
    moduleEnd: number;
    typeStart: number;
    typeEnd: number;
  }> = [];

  for (const match of headerText.matchAll(importTypePattern)) {
    if (typeof match.index !== 'number') {
      continue;
    }

    const fullText = match[0];
    const moduleName = match[2];
    const typeName = match[3];
    const moduleStart = match.index + fullText.indexOf(moduleName);
    const moduleEnd = moduleStart + moduleName.length;
    const typeStart = match.index + fullText.lastIndexOf(typeName);
    const typeEnd = typeStart + typeName.length;
    references.push({
      moduleName,
      typeName,
      moduleStart,
      moduleEnd,
      typeStart,
      typeEnd,
    });
  }

  return references;
}

function formatExportedTypeHoverText(args: {
  fileName: string;
  span: IRsxMappedSpan | null;
  name: string;
}): string | null {
  if (!args.span) {
    return null;
  }

  const sourceText = ts.sys.readFile(args.fileName);
  if (typeof sourceText !== 'string') {
    return null;
  }

  const sourceFile = ts.createSourceFile(
    args.fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
  );
  const declaration = findNodeAtPosition(sourceFile, args.span.start);
  const statement = findNearestStatement(declaration);
  const text = statement?.getText(sourceFile).split(/\r?\n/u)[0]?.trim();
  return text && text.length > 0 ? text : `type ${args.name}`;
}

function findNodeAtPosition(node: ts.Node, position: number): ts.Node {
  let current = node;
  node.forEachChild((child) => {
    if (position >= child.getStart() && position <= child.getEnd()) {
      current = findNodeAtPosition(child, position);
    }
  });
  return current;
}

function findNearestStatement(node: ts.Node): ts.Node | null {
  let current: ts.Node | undefined = node;
  while (current) {
    if (
      ts.isInterfaceDeclaration(current) ||
      ts.isTypeAliasDeclaration(current) ||
      ts.isClassDeclaration(current) ||
      ts.isEnumDeclaration(current)
    ) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function resolveHeaderImportModuleFileName(args: {
  containingFile: string;
  moduleName: string;
}): string | null {
  const resolvedRsxFileName = resolveHeaderImportRsxModuleFileName(args);
  if (resolvedRsxFileName) {
    return resolvedRsxFileName;
  }

  const projectContext = resolveProjectContext(args.containingFile);
  const compilerHost = ts.createCompilerHost(projectContext.options, true);
  return (
    ts.resolveModuleName(
      args.moduleName,
      args.containingFile,
      projectContext.options,
      compilerHost,
    ).resolvedModule?.resolvedFileName ?? null
  );
}

function resolveHeaderImportRsxModuleFileName(args: {
  containingFile: string;
  moduleName: string;
}): string | null {
  if (!isRelativeModuleName(args.moduleName)) {
    return null;
  }

  const candidates = args.moduleName.endsWith('.rsx')
    ? [args.moduleName]
    : [`${args.moduleName}.rsx`, `${args.moduleName}/index.rsx`];
  for (const candidate of candidates) {
    const resolvedFileName = resolveRelativePath(
      args.containingFile,
      candidate,
    );
    if (ts.sys.fileExists(resolvedFileName)) {
      return resolvedFileName;
    }
  }

  return null;
}

function isRelativeModuleName(moduleName: string): boolean {
  return (
    moduleName.startsWith('./') ||
    moduleName.startsWith('../') ||
    moduleName === '.' ||
    moduleName === '..'
  );
}

function resolveRelativePath(
  containingFile: string,
  moduleName: string,
): string {
  const normalizedContainingFile = containingFile.replace(/\\/gu, '/');
  const containingDirectory = normalizedContainingFile.includes('/')
    ? normalizedContainingFile.slice(
        0,
        normalizedContainingFile.lastIndexOf('/'),
      )
    : '.';
  const joined = `${containingDirectory}/${moduleName}`.replace(/\\/gu, '/');
  const parts = joined.split('/');
  const normalizedParts: string[] = [];

  for (const part of parts) {
    if (!part || part === '.') {
      continue;
    }
    if (part === '..') {
      normalizedParts.pop();
      continue;
    }
    normalizedParts.push(part);
  }

  const prefix = joined.startsWith('/') ? '/' : '';
  return `${prefix}${normalizedParts.join('/')}`;
}

function resolveFastModelPropertyNames(args: {
  containingFile: string;
  modelTypeText: string;
}): string[] | null {
  const typeNode = parseModelTypeNode(args.modelTypeText);
  if (!typeNode) {
    return null;
  }

  return resolveModelTypeNodePropertyNames({
    containingFile: args.containingFile,
    typeNode,
    seen: new Set<string>(),
  });
}

function parseModelTypeNode(modelTypeText: string): ts.TypeNode | null {
  const sourceFile = ts.createSourceFile(
    'rsx-model-type.ts',
    `type __RSX_Model = ${modelTypeText};`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const statement = sourceFile.statements[0];
  return statement && ts.isTypeAliasDeclaration(statement)
    ? statement.type
    : null;
}

function resolveModelTypeNodePropertyNames(args: {
  containingFile: string;
  typeNode: ts.TypeNode;
  seen: Set<string>;
}): string[] | null {
  if (ts.isParenthesizedTypeNode(args.typeNode)) {
    return resolveModelTypeNodePropertyNames({
      ...args,
      typeNode: args.typeNode.type,
    });
  }

  if (ts.isTypeLiteralNode(args.typeNode)) {
    return getTopLevelPropertyNamesFromMembers(args.typeNode.members);
  }

  if (ts.isIntersectionTypeNode(args.typeNode)) {
    const names = new Set<string>();
    for (const child of args.typeNode.types) {
      const childNames = resolveModelTypeNodePropertyNames({
        ...args,
        typeNode: child,
      });
      if (!childNames) {
        return null;
      }
      for (const name of childNames) {
        names.add(name);
      }
    }
    return [...names];
  }

  const importType = getImportTypeReferenceFromTypeNode(args.typeNode);
  if (!importType) {
    return null;
  }

  const resolvedFileName = resolveHeaderImportModuleFileName({
    containingFile: args.containingFile,
    moduleName: importType.moduleName,
  });
  if (!resolvedFileName) {
    return null;
  }

  return resolveExportedTypePropertyNames({
    fileName: resolvedFileName,
    name: importType.typeName,
    seen: args.seen,
  });
}

function getImportTypeReferenceFromTypeNode(
  typeNode: ts.TypeNode,
): { moduleName: string; typeName: string } | null {
  if (
    !ts.isImportTypeNode(typeNode) ||
    !ts.isLiteralTypeNode(typeNode.argument) ||
    !ts.isStringLiteral(typeNode.argument.literal) ||
    !typeNode.qualifier ||
    !ts.isIdentifier(typeNode.qualifier)
  ) {
    return null;
  }

  return {
    moduleName: typeNode.argument.literal.text,
    typeName: typeNode.qualifier.text,
  };
}

function resolveExportedTypePropertyNames(args: {
  fileName: string;
  name: string;
  seen: Set<string>;
}): string[] | null {
  const seenKey = `${args.fileName}:${args.name}`;
  if (args.seen.has(seenKey)) {
    return null;
  }
  args.seen.add(seenKey);

  const text = ts.sys.readFile(args.fileName);
  if (typeof text !== 'string') {
    return null;
  }

  const sourceFile = ts.createSourceFile(
    args.fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  for (const statement of sourceFile.statements) {
    const directName = getDirectExportedTypeName(statement);
    if (directName?.text === args.name) {
      return getTopLevelPropertyNamesFromTypeDeclaration(statement);
    }

    const reExport = getNamedTypeReExport(statement, args.name);
    if (!reExport) {
      continue;
    }

    if (!reExport.moduleName) {
      const localDeclaration = getLocalTypeDeclaration(
        sourceFile,
        reExport.importedName,
      );
      return localDeclaration
        ? getTopLevelPropertyNamesFromTypeDeclaration(localDeclaration)
        : null;
    }

    const resolvedFileName = resolveHeaderImportModuleFileName({
      containingFile: args.fileName,
      moduleName: reExport.moduleName,
    });
    if (!resolvedFileName) {
      return null;
    }

    return resolveExportedTypePropertyNames({
      fileName: resolvedFileName,
      name: reExport.importedName,
      seen: args.seen,
    });
  }

  return null;
}

function getTopLevelPropertyNamesFromTypeDeclaration(
  statement: ts.Statement,
): string[] | null {
  if (ts.isInterfaceDeclaration(statement)) {
    return getTopLevelPropertyNamesFromMembers(statement.members);
  }

  if (ts.isTypeAliasDeclaration(statement)) {
    if (!ts.isTypeLiteralNode(statement.type)) {
      return null;
    }
    return getTopLevelPropertyNamesFromMembers(statement.type.members);
  }

  if (ts.isClassDeclaration(statement)) {
    return statement.members
      .flatMap((member) =>
        ts.isPropertyDeclaration(member)
          ? getPropertyNameText(member.name)
          : [],
      )
      .filter(isValidModelPropertyName);
  }

  return null;
}

function getTopLevelPropertyNamesFromMembers(
  members: ts.NodeArray<ts.TypeElement>,
): string[] {
  return members
    .flatMap((member) =>
      ts.isPropertySignature(member) || ts.isMethodSignature(member)
        ? getPropertyNameText(member.name)
        : [],
    )
    .filter(isValidModelPropertyName);
}

function getPropertyNameText(name: ts.PropertyName): string[] {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) {
    return [name.text];
  }
  return [];
}

function isValidModelPropertyName(propertyName: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(propertyName);
}

function resolveExportedTypeSpan(args: {
  fileName: string;
  name: string;
  seen: Set<string>;
}): IRsxMappedSpan | null {
  if (args.fileName.endsWith('.rsx')) {
    return resolveRsxExpressionExportSpan({
      fileName: args.fileName,
      name: args.name,
    });
  }

  const seenKey = `${args.fileName}:${args.name}`;
  if (args.seen.has(seenKey)) {
    return null;
  }
  args.seen.add(seenKey);

  const text = ts.sys.readFile(args.fileName);
  if (typeof text !== 'string') {
    return null;
  }

  const sourceFile = ts.createSourceFile(
    args.fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  for (const statement of sourceFile.statements) {
    const directName = getDirectExportedTypeName(statement);
    if (directName?.text === args.name) {
      return {
        fileName: args.fileName,
        start: directName.getStart(sourceFile),
        end: directName.getEnd(),
      };
    }

    const reExport = getNamedTypeReExport(statement, args.name);
    if (!reExport) {
      continue;
    }

    if (!reExport.moduleName) {
      const localName = getLocalTypeName(sourceFile, reExport.importedName);
      return localName
        ? {
            fileName: args.fileName,
            start: localName.getStart(sourceFile),
            end: localName.getEnd(),
          }
        : null;
    }

    const resolvedFileName = resolveHeaderImportModuleFileName({
      containingFile: args.fileName,
      moduleName: reExport.moduleName,
    });
    if (!resolvedFileName) {
      return null;
    }

    return resolveExportedTypeSpan({
      fileName: resolvedFileName,
      name: reExport.importedName,
      seen: args.seen,
    });
  }

  return null;
}

function resolveRsxExpressionExportSpan(args: {
  fileName: string;
  name: string;
}): IRsxMappedSpan | null {
  const text = ts.sys.readFile(args.fileName);
  if (typeof text !== 'string') {
    return null;
  }

  const span = getRsxExpressionExportSourceSpan({
    fileName: args.fileName,
    text,
    exportName: args.name,
  });
  return span
    ? {
        fileName: args.fileName,
        start: span.start,
        end: span.start + span.length,
      }
    : null;
}

function getDirectExportedTypeName(
  statement: ts.Statement,
): ts.Identifier | null {
  if (
    (ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isEnumDeclaration(statement)) &&
    statement.name &&
    hasExportModifier(statement)
  ) {
    return statement.name;
  }

  return null;
}

function getLocalTypeName(
  sourceFile: ts.SourceFile,
  name: string,
): ts.Identifier | null {
  return getLocalTypeDeclaration(sourceFile, name)?.name ?? null;
}

function getLocalTypeDeclaration(
  sourceFile: ts.SourceFile,
  name: string,
):
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.ClassDeclaration
  | ts.EnumDeclaration
  | null {
  for (const statement of sourceFile.statements) {
    if (
      (ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      statement.name?.text === name
    ) {
      return statement;
    }
  }

  return null;
}

function getNamedTypeReExport(
  statement: ts.Statement,
  name: string,
): {
  importedName: string;
  moduleName: string | null;
} | null {
  if (!ts.isExportDeclaration(statement)) {
    return null;
  }

  const exportClause = statement.exportClause;
  if (!exportClause || !ts.isNamedExports(exportClause)) {
    return null;
  }

  for (const element of exportClause.elements) {
    if (element.name.text !== name) {
      continue;
    }

    return {
      importedName: element.propertyName?.text ?? element.name.text,
      moduleName:
        statement.moduleSpecifier &&
        ts.isStringLiteralLike(statement.moduleSpecifier)
          ? statement.moduleSpecifier.text
          : null,
    };
  }

  return null;
}

function hasExportModifier(node: ts.Node): boolean {
  return (
    ts
      .getModifiers(node)
      ?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ??
    false
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

  let token = scanner.scan();
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    const tokenStart = scanner.getTokenPos();
    const tokenEnd = scanner.getTextPos();
    if (tokenEnd > tokenStart) {
      const tokenType = toRsxSyntacticTokenType(token);
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

    const tokenText = document.originalText.slice(mappedStart, mappedEnd);
    if (!shouldEmitRsxSemanticToken({ tokenType, tokenText })) {
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

  let token = scanner.scan();
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    const tokenStart = scanner.getTokenPos();
    const tokenEnd = scanner.getTextPos();
    const mappedStart = mapVirtualOffsetToOriginal(document, tokenStart);
    const mappedEnd = mapVirtualOffsetToOriginal(document, tokenEnd);
    if (mappedStart !== null && mappedEnd !== null && mappedEnd > mappedStart) {
      const tokenType = toRsxSyntacticTokenType(token);
      if (tokenType !== null) {
        const tokenText = document.originalText.slice(mappedStart, mappedEnd);
        if (!shouldEmitRsxSemanticToken({ tokenType, tokenText })) {
          token = scanner.scan();
          continue;
        }
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
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        '\n',
      );
      const mapped = mapVirtualSpanToOriginal({
        document,
        fileName: diagnostic.file?.fileName ?? document.virtualFileName,
        start: diagnosticStart,
        end: diagnosticStart + diagnosticLength,
      });
      if (!mapped || mapped.fileName !== document.fileName) {
        if (
          category === 'semantic' &&
          isDeclaredReturnAssignabilityDiagnostic(document, diagnostic, message)
        ) {
          const start = document.bodyRegion.originalStart;
          const end = Math.max(document.bodyRegion.originalEnd, start + 1);
          const declaredReturnMessage =
            formatDeclaredReturnMismatchMessage(document);
          const key = `${category}:${start}:${end}:${declaredReturnMessage}`;
          if (!seen.has(key)) {
            seen.add(key);
            diagnostics.push({
              category,
              message: declaredReturnMessage,
              start,
              end,
            });
          }
        }
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

function isDeclaredReturnAssignabilityDiagnostic(
  document: IRsxVirtualDocument,
  diagnostic: ts.DiagnosticWithLocation,
  message: string,
): boolean {
  if (!document.returnTypeRegion) {
    return false;
  }
  if (diagnostic.file?.fileName !== document.virtualFileName) {
    return false;
  }

  return /is not assignable to type/iu.test(message);
}

function formatDeclaredReturnMismatchMessage(
  document: IRsxVirtualDocument,
): string {
  const declaredReturnType = document.returnTypeRegion
    ? document.originalText
        .slice(
          document.returnTypeRegion.originalStart,
          document.returnTypeRegion.originalEnd,
        )
        .trim()
    : 'unknown';
  return `Expression result is not assignable to declared return type '${declaredReturnType}'.`;
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
  const modelTypeRegion = getStandaloneHeaderValueRegion(
    normalizedText,
    'model',
  );
  if (!modelTypeRegion) {
    throw new Error('RS-X file is missing a model header.');
  }

  let virtualText = '';
  virtualText += RSX_UNWRAP_EXPRESSION_HELPER;
  const modelTypeVirtualStart = virtualText.length + RSX_MODEL_PREFIX.length;
  virtualText += `${RSX_MODEL_PREFIX}${modelTypeRegion.value};\n`;
  const modelTypeVirtualEnd =
    modelTypeVirtualStart + modelTypeRegion.value.length;

  const returnTypeRegionSource = getStandaloneHeaderValueRegion(
    normalizedText,
    'return',
  );
  let returnTypeRegion: IMappedRegion | undefined;
  if (returnTypeRegionSource) {
    const returnTypeVirtualStart =
      virtualText.length + RSX_RETURN_PREFIX.length;
    virtualText += `${RSX_RETURN_PREFIX}${returnTypeRegionSource.value};\n`;
    returnTypeRegion = {
      originalStart: returnTypeRegionSource.start,
      originalEnd: returnTypeRegionSource.end,
      virtualStart: returnTypeVirtualStart,
      virtualEnd: returnTypeVirtualStart + returnTypeRegionSource.value.length,
    };
  }

  if (args.modelPropertyNames.length > 0) {
    virtualText += args.modelPropertyNames
      .map(
        (propertyName) =>
          `declare const ${propertyName}: __RSX_UNWRAP_EXPRESSION<__RSX_MODEL[${JSON.stringify(propertyName)}]>;`,
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
      originalStart: modelTypeRegion.start,
      originalEnd: modelTypeRegion.end,
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

function getStandaloneHeaderValueRegion(
  text: string,
  key: 'model' | 'return',
): { value: string; start: number; end: number } | null {
  let offset = 0;
  while (offset <= text.length) {
    const lineEndIndex = text.indexOf('\n', offset);
    const lineEnd = lineEndIndex === -1 ? text.length : lineEndIndex;
    const line = text.slice(offset, lineEnd);
    const match = new RegExp(`^${key}\\s*:\\s*(.*)$`, 'u').exec(line);
    if (!match) {
      if (lineEndIndex === -1) {
        break;
      }
      offset = lineEnd + 1;
      continue;
    }

    const valueStartInLine = line.indexOf(match[1]);
    const valueLines = [match[1].trim()];
    let end = lineEnd;
    let next = lineEndIndex === -1 ? text.length : lineEnd + 1;
    while (
      next < text.length &&
      !isStandaloneTypeHeaderValueComplete(valueLines.join('\n'))
    ) {
      const continuationLineEndIndex = text.indexOf('\n', next);
      const continuationLineEnd =
        continuationLineEndIndex === -1
          ? text.length
          : continuationLineEndIndex;
      const continuationLine = text.slice(next, continuationLineEnd);
      if (!/^\s/u.test(continuationLine)) {
        break;
      }
      valueLines.push(continuationLine.trim());
      end = continuationLineEnd;
      next =
        continuationLineEndIndex === -1 ? text.length : continuationLineEnd + 1;
    }

    return {
      value:
        key === 'model'
          ? normalizeRsxModelExpressionReferenceTypeText(
              valueLines.join('\n').trim(),
            )
          : valueLines.join('\n').trim(),
      start: offset + Math.max(0, valueStartInLine),
      end,
    };
  }

  return null;
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

    const headerMatch = /^(model|return)\s*:\s*(.*)$/u.exec(line);
    if (!headerMatch) {
      break;
    }

    const headerKey = headerMatch[1];
    const headerValueLines = [headerMatch[2].trim()];
    index += 1;
    while (
      index < lines.length &&
      !isStandaloneTypeHeaderValueComplete(headerValueLines.join('\n')) &&
      /^\s/u.test(lines[index] ?? '')
    ) {
      headerValueLines.push(lines[index].trim());
      index += 1;
    }

    headers.push(`${headerKey}: ${headerValueLines.join('\n').trim()}`);
  }

  const body = lines.slice(index).join('\n').trim();
  if (headers.length === 0 && body.length === 0) {
    return null;
  }

  return { headers, body };
}

function isStandaloneTypeHeaderValueComplete(value: string): boolean {
  if (!value.trim()) {
    return false;
  }
  const sourceFile = ts.createSourceFile(
    '/__rsx_header_type_check__.ts',
    `type __RSX_HEADER = ${value};`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  return sourceFile.parseDiagnostics.length === 0;
}

function getModelTypeText(text: string): string | null {
  const modelHeader = parseRsxFile(text)?.headers.find((header) =>
    /^model\s*:/u.test(header),
  );
  if (!modelHeader) {
    return null;
  }
  const modelTypeMatch = /^model\s*:\s*([\s\S]+)$/u.exec(modelHeader);
  return modelTypeMatch
    ? normalizeRsxModelExpressionReferenceTypeText(modelTypeMatch[1].trim())
    : null;
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

  if (
    !document.languageService.getProgram()?.getSourceFile(declarationFileName)
  ) {
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

    const headerMatch = /^([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$/u.exec(trimmed);
    if (!headerMatch || !isSupportedRsxHeaderKey(headerMatch[1])) {
      break;
    }

    if (headerMatch[1] === 'model' || headerMatch[1] === 'return') {
      const valueLines = [headerMatch[2].trim()];
      cursor = nextLineOffset;
      while (
        cursor < text.length &&
        !isStandaloneTypeHeaderValueComplete(valueLines.join('\n'))
      ) {
        const continuationLineEndIndex = text.indexOf('\n', cursor);
        const continuationLineEnd =
          continuationLineEndIndex === -1
            ? text.length
            : continuationLineEndIndex;
        const continuationLine = text.slice(cursor, continuationLineEnd);
        if (!/^\s/u.test(continuationLine)) {
          break;
        }
        valueLines.push(continuationLine.trim());
        cursor =
          continuationLineEndIndex === -1
            ? text.length
            : continuationLineEnd + 1;
      }
      continue;
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
