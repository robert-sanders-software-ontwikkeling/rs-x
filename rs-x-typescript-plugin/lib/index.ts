import type tsModule from 'typescript/lib/tsserverlibrary';

import {
  detectExpressionSites,
  extractVueEmbeddedTypeScriptFile,
  findRsxExpressionRegionAtPosition,
  getRsxCompletionsAtPosition,
  getRsxDiagnosticsForFile,
  getRsxExpressionExportSourceSpan,
  getRsxFileNameFromVirtualDeclaration,
  getRsxHoverAtPosition,
  getRsxSignatureHelpAtPosition,
  type IRsxToken,
  shouldEmitRsxSemanticToken,
  shouldEmitTsClassificationForRsxToken,
  tokenizeRsxExpression,
  toTsClassificationTypeForRsxTokenKind,
} from '@rs-x/compiler';

import { patchLanguageServiceHostForRsxImports } from './rsx-language-service-host';
import {
  createRsxSemanticClassificationContext,
  resolveSemanticTokenType,
} from './rsx-semantic-classification';
import { excludeClassificationSpansInRanges } from './rsx-syntactic-classification';

interface ITypescriptPluginInit {
  typescript: typeof tsModule;
}

const RSX_INLINE_CLASSIFICATION_POLICY = Object.freeze({
  emitOperatorTokens: false,
});

function getRelevantExpressionSitesForFile(
  program: tsModule.Program,
  fileName: string,
) {
  return detectExpressionSites(program, {
    includePartialRsxInvocations: true,
  }).filter((site) => site.expressionSourceFile.fileName === fileName);
}

function init(modules: ITypescriptPluginInit): tsModule.server.PluginModule {
  const ts = modules.typescript;

  function create(
    info: tsModule.server.PluginCreateInfo,
  ): tsModule.LanguageService {
    patchLanguageServiceHostForRsxImports({ info, ts });
    const languageService = info.languageService;
    const proxy: tsModule.LanguageService = Object.create(null);

    for (const key of Object.keys(languageService) as Array<
      keyof tsModule.LanguageService
    >) {
      const value = languageService[key];
      (proxy[key] as unknown) =
        typeof value === 'function' ? value.bind(languageService) : value;
    }

    proxy.getCompletionsAtPosition = (
      fileName,
      position,
      options,
      formattingSettings,
    ) => {
      const baseCompletions = languageService.getCompletionsAtPosition(
        fileName,
        position,
        options,
        formattingSettings,
      );
      const program = languageService.getProgram?.();
      if (!program) {
        return baseCompletions;
      }

      const rsxProgram = resolveRsxProgramForFile({
        ts,
        info,
        program,
        fileName,
      });

      const rsxRegion = findRsxExpressionRegionAtPosition(
        rsxProgram.program,
        rsxProgram.fileName,
        position,
      );
      if (!rsxRegion) {
        return baseCompletions;
      }

      const rsxCompletions = getRsxCompletionsAtPosition(
        rsxProgram.program,
        rsxProgram.fileName,
        position,
      );
      if (rsxCompletions.length === 0) {
        return baseCompletions;
      }
      const pluginEntries = rsxCompletions.map(
        (completion): tsModule.CompletionEntry => ({
          name: completion.name,
          kind:
            completion.kind === 'method'
              ? ts.ScriptElementKind.memberFunctionElement
              : completion.kind === 'constructor'
                ? ts.ScriptElementKind.classElement
                : ts.ScriptElementKind.memberVariableElement,
          kindModifiers: '',
          sortText: '0',
        }),
      );
      const uniquePluginEntries = dedupeCompletionEntries(pluginEntries);

      return {
        entries: uniquePluginEntries,
        isGlobalCompletion: false,
        isMemberCompletion: true,
        isNewIdentifierLocation: false,
      };
    };

    proxy.getQuickInfoAtPosition = (fileName, position) => {
      const program = languageService.getProgram?.();
      if (!program) {
        return languageService.getQuickInfoAtPosition(fileName, position);
      }

      const rsxProgram = resolveRsxProgramForFile({
        ts,
        info,
        program,
        fileName,
      });

      const hover = getRsxHoverAtPosition(
        rsxProgram.program,
        rsxProgram.fileName,
        position,
      );
      if (!hover) {
        return languageService.getQuickInfoAtPosition(fileName, position);
      }

      const sourceFile =
        program.getSourceFile(fileName) ??
        rsxProgram.program.getSourceFile(rsxProgram.fileName);
      const hoveredIdentifier =
        sourceFile?.text.slice(hover.start, hover.end) ?? '';
      const hoverLabel =
        hoveredIdentifier && !hover.text.startsWith(`${hoveredIdentifier}:`)
          ? `${hoveredIdentifier}: ${hover.text}`
          : hover.text;

      return {
        // Use a neutral symbol kind and an explicit label to avoid duplicated
        // type-only renderings in VS Code tooltips.
        kind: ts.ScriptElementKind.unknown,
        kindModifiers: '',
        textSpan: {
          start: hover.start,
          length: hover.end - hover.start,
        },
        displayParts: [{ kind: 'text', text: hoverLabel }],
        documentation: [],
      };
    };

    proxy.getSignatureHelpItems = (fileName, position, options) => {
      const baseSignatureHelp = languageService.getSignatureHelpItems(
        fileName,
        position,
        options,
      );
      const program = languageService.getProgram?.();
      if (!program) {
        return baseSignatureHelp;
      }

      const rsxProgram = resolveRsxProgramForFile({
        ts,
        info,
        program,
        fileName,
      });

      const rsxRegion = findRsxExpressionRegionAtPosition(
        rsxProgram.program,
        rsxProgram.fileName,
        position,
      );
      if (!rsxRegion) {
        return baseSignatureHelp;
      }

      const rsxSignatureHelp = getRsxSignatureHelpAtPosition(
        rsxProgram.program,
        rsxProgram.fileName,
        position,
      );
      if (!rsxSignatureHelp) {
        return baseSignatureHelp;
      }

      const signatureItems: tsModule.SignatureHelpItem[] =
        rsxSignatureHelp.items.map((item) => ({
          isVariadic: item.parameters.some((parameter) => parameter.isRest),
          prefixDisplayParts: [{ kind: 'punctuation', text: '(' }],
          suffixDisplayParts: [
            { kind: 'text', text: `): ${item.returnTypeText}` },
          ],
          separatorDisplayParts: [{ kind: 'punctuation', text: ', ' }],
          parameters: item.parameters.map((parameter) => ({
            name: parameter.name,
            isOptional: parameter.isOptional,
            isRest: parameter.isRest,
            documentation: [],
            displayParts: [
              { kind: 'parameterName', text: parameter.name },
              { kind: 'text', text: ': ' },
              { kind: 'text', text: parameter.typeText },
            ],
          })),
          documentation: [],
          tags: [],
        }));

      return {
        items: signatureItems,
        applicableSpan: {
          start: rsxSignatureHelp.applicableStart,
          length: Math.max(
            1,
            rsxSignatureHelp.applicableEnd - rsxSignatureHelp.applicableStart,
          ),
        },
        selectedItemIndex: 0,
        argumentIndex: rsxSignatureHelp.argumentIndex,
        argumentCount: rsxSignatureHelp.argumentCount,
      };
    };

    proxy.getDefinitionAtPosition = (fileName, position) =>
      mapDefinitionInfosToSourceFiles({
        definitions: languageService.getDefinitionAtPosition(
          fileName,
          position,
        ),
        info,
      });

    proxy.getDefinitionAndBoundSpan = (fileName, position) => {
      const result = languageService.getDefinitionAndBoundSpan(
        fileName,
        position,
      );
      if (!result) {
        return result;
      }

      return {
        ...result,
        definitions: mapDefinitionInfosToSourceFiles({
          definitions: result.definitions,
          info,
        }),
      };
    };

    proxy.getTypeDefinitionAtPosition = (fileName, position) => {
      const importDefinition = resolveImportSpecifierDefinitionAtPosition({
        ts,
        info,
        program: languageService.getProgram?.(),
        fileName,
        position,
      });
      if (importDefinition) {
        return mapDefinitionInfosToSourceFiles({
          definitions: [importDefinition],
          info,
        });
      }

      const typeDefinitions = mapDefinitionInfosToSourceFiles({
        definitions: languageService.getTypeDefinitionAtPosition(
          fileName,
          position,
        ),
        info,
      });
      if (
        typeDefinitions &&
        typeDefinitions.length > 0 &&
        typeDefinitions.some((definition) => definition.fileName !== fileName)
      ) {
        return typeDefinitions;
      }

      return mapDefinitionInfosToSourceFiles({
        definitions: languageService.getDefinitionAtPosition(
          fileName,
          position,
        ),
        info,
      });
    };

    proxy.getEncodedSemanticClassifications = (fileName, span, format) => {
      const base = languageService.getEncodedSemanticClassifications(
        fileName,
        span,
        format,
      ) ?? { spans: [], endOfLineState: ts.EndOfLineState.None };

      const program = languageService.getProgram?.();
      if (!program) {
        return base;
      }

      const rsxProgram = resolveRsxProgramForFile({
        ts,
        info,
        program,
        fileName,
      });

      const pluginSpans = getRsxEncodedClassifications({
        ts,
        program: rsxProgram.program,
        fileName: rsxProgram.fileName,
        span,
        format,
      });

      if (pluginSpans.length === 0) {
        return base;
      }

      const expressionRanges = getRelevantExpressionSitesForFile(
        rsxProgram.program,
        rsxProgram.fileName,
      ).map((site) => ({
        start: site.expressionStart,
        end: site.expressionEnd,
      }));

      return {
        ...base,
        spans: mergeEncodedClassificationSpans(
          excludeClassificationSpansInRanges(base.spans, expressionRanges),
          pluginSpans,
        ),
      };
    };

    proxy.getEncodedSyntacticClassifications = (fileName, span) => {
      const base = languageService.getEncodedSyntacticClassifications(
        fileName,
        span,
      ) ?? { spans: [], endOfLineState: ts.EndOfLineState.None };

      const program = languageService.getProgram?.();
      if (!program) {
        return base;
      }

      const rsxProgram = resolveRsxProgramForFile({
        ts,
        info,
        program,
        fileName,
      });
      const sourceFile = rsxProgram.program.getSourceFile(rsxProgram.fileName);
      if (!sourceFile) {
        return base;
      }

      const sites = getRelevantExpressionSitesForFile(
        rsxProgram.program,
        rsxProgram.fileName,
      );
      if (sites.length === 0) {
        return base;
      }

      const pluginSpans = getRsxEncodedSyntacticClassifications({
        ts,
        fileName: rsxProgram.fileName,
        span,
        sites,
      });
      if (pluginSpans.length === 0) {
        return base;
      }

      const expressionRanges = sites.map((site) => ({
        start: site.expressionStart,
        end: site.expressionEnd,
      }));

      return {
        ...base,
        spans: mergeEncodedClassificationSpans(
          excludeClassificationSpansInRanges(base.spans, expressionRanges),
          pluginSpans,
        ),
      };
    };

    proxy.getSemanticDiagnostics = (fileName) => {
      const baseDiagnostics = languageService.getSemanticDiagnostics(fileName);
      const program = languageService.getProgram?.();
      if (!program) {
        return baseDiagnostics;
      }

      const rsxProgram = resolveRsxProgramForFile({
        ts,
        info,
        program,
        fileName,
      });

      const sourceFile =
        program.getSourceFile(fileName) ??
        rsxProgram.program.getSourceFile(rsxProgram.fileName);
      if (!sourceFile) {
        return baseDiagnostics;
      }

      const rsxDiagnostics = getRsxDiagnosticsForFile(
        rsxProgram.program,
        rsxProgram.fileName,
      ).map(
        (diagnostic): tsModule.Diagnostic => ({
          file: sourceFile,
          start: diagnostic.start,
          length: diagnostic.end - diagnostic.start,
          category: toTsDiagnosticCategory(ts, diagnostic.category),
          code: diagnosticCode(diagnostic.category),
          messageText: diagnostic.message,
          source: '@rs-x/typescript-plugin',
        }),
      );

      return [...baseDiagnostics, ...rsxDiagnostics];
    };

    return proxy;
  }

  return { create };
}

function dedupeCompletionEntries(
  entries: readonly tsModule.CompletionEntry[],
): tsModule.CompletionEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.name)) {
      return false;
    }

    seen.add(entry.name);
    return true;
  });
}

function mapDefinitionInfosToSourceFiles<
  TDefinition extends tsModule.DefinitionInfo,
>(args: {
  definitions: readonly TDefinition[] | undefined;
  info: tsModule.server.PluginCreateInfo;
}): TDefinition[] | undefined {
  const { definitions, info } = args;
  if (!definitions) {
    return definitions;
  }

  return definitions.map((definition) => {
    const rsxFileName = getRsxFileNameFromVirtualDeclaration(
      definition.fileName,
    );
    if (!rsxFileName) {
      return definition;
    }
    const sourceSpan = resolveRsxDefinitionSourceSpan({
      definition,
      rsxFileName,
      info,
    });

    return {
      ...definition,
      fileName: rsxFileName,
      textSpan: sourceSpan ?? {
        start: 0,
        length: 0,
      },
      contextSpan: undefined,
    };
  });
}

function resolveRsxDefinitionSourceSpan(args: {
  definition: tsModule.DefinitionInfo;
  rsxFileName: string;
  info: tsModule.server.PluginCreateInfo;
}): tsModule.TextSpan | null {
  const declarationSnapshot = args.info.languageServiceHost.getScriptSnapshot?.(
    args.definition.fileName,
  );
  const declarationText = declarationSnapshot?.getText(
    0,
    declarationSnapshot.getLength(),
  );
  if (typeof declarationText !== 'string') {
    return null;
  }

  const exportName =
    readIdentifierAt(declarationText, args.definition.textSpan.start) ??
    readExportNameFromDefinitionName(args.definition.name);
  if (!exportName) {
    return null;
  }

  const rsxText = readFileTextFromLanguageServiceHost({
    info: args.info,
    fileName: args.rsxFileName,
  });
  if (typeof rsxText !== 'string') {
    return null;
  }

  return getRsxExpressionExportSourceSpan({
    fileName: args.rsxFileName,
    text: rsxText,
    exportName,
  });
}

function readIdentifierAt(text: string, position: number): string | null {
  const identifierPattern = /[A-Za-z_$][A-Za-z0-9_$]*/gu;
  for (const match of text.matchAll(identifierPattern)) {
    if (typeof match.index !== 'number') {
      continue;
    }
    const start = match.index;
    const end = start + match[0].length;
    if (position >= start && position <= end) {
      return match[0];
    }
  }

  return null;
}

function readExportNameFromDefinitionName(name: string): string | null {
  const match =
    /\b(?:const|let|var|function|class|interface|type)\s+([A-Za-z_$][A-Za-z0-9_$]*)/u.exec(
      name,
    );
  if (match) {
    return match[1];
  }

  return /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(name) ? name : null;
}

function resolveImportSpecifierDefinitionAtPosition(args: {
  ts: typeof tsModule;
  info: tsModule.server.PluginCreateInfo;
  program: tsModule.Program | undefined;
  fileName: string;
  position: number;
}): tsModule.DefinitionInfo | null {
  const { ts, info, program, fileName, position } = args;
  const sourceFile =
    program?.getSourceFile(fileName) ??
    createSourceFileFromLanguageServiceHost({ ts, info, fileName });
  if (!sourceFile) {
    return null;
  }

  const importTarget = findImportTargetAtPosition({
    ts,
    sourceFile,
    position,
  });
  if (!importTarget) {
    return null;
  }

  const moduleSpecifier = importTarget.importDeclaration.moduleSpecifier;
  if (!moduleSpecifier || !ts.isStringLiteralLike(moduleSpecifier)) {
    return null;
  }

  const resolvedModule = resolveModuleFromLanguageServiceHost({
    ts,
    info,
    moduleName: moduleSpecifier.text,
    containingFile: fileName,
  });
  if (!resolvedModule?.resolvedFileName) {
    return null;
  }

  const targetFileName = resolvedModule.resolvedFileName;
  const targetSourceFile =
    program?.getSourceFile(targetFileName) ??
    createSourceFileFromLanguageServiceHost({
      ts,
      info,
      fileName: targetFileName,
    });
  if (!targetSourceFile) {
    return null;
  }

  if (!importTarget.importedName) {
    return {
      fileName: targetFileName,
      textSpan: { start: 0, length: 0 },
      kind: ts.ScriptElementKind.unknown,
      name: moduleSpecifier.text,
      containerKind: '',
      containerName: '',
    };
  }

  return resolveExportedDefinition({
    ts,
    info,
    program,
    sourceFile: targetSourceFile,
    sourceFileName: targetFileName,
    name: importTarget.importedName,
    seen: new Set<string>(),
  });
}

function createSourceFileFromLanguageServiceHost(args: {
  ts: typeof tsModule;
  info: tsModule.server.PluginCreateInfo;
  fileName: string;
}): tsModule.SourceFile | null {
  const text = readFileTextFromLanguageServiceHost({
    ts: args.ts,
    info: args.info,
    fileName: args.fileName,
  });
  if (typeof text !== 'string') {
    return null;
  }

  const compilerOptions =
    args.info.project.getCompilationSettings?.() ??
    args.info.languageServiceHost.getCompilationSettings?.() ??
    {};
  return args.ts.createSourceFile(
    args.fileName,
    text,
    compilerOptions.target ?? args.ts.ScriptTarget.Latest,
    true,
    args.ts.ScriptKind.TS,
  );
}

function readFileTextFromLanguageServiceHost(args: {
  ts?: typeof tsModule;
  info: tsModule.server.PluginCreateInfo;
  fileName: string;
}): string | undefined {
  const snapshot = args.info.languageServiceHost.getScriptSnapshot?.(
    args.fileName,
  );
  if (snapshot) {
    return snapshot.getText(0, snapshot.getLength());
  }

  return (
    args.info.languageServiceHost.readFile?.(args.fileName) ??
    args.ts?.sys.readFile(args.fileName)
  );
}

function findImportTargetAtPosition(args: {
  ts: typeof tsModule;
  sourceFile: tsModule.SourceFile;
  position: number;
}): {
  importDeclaration: tsModule.ImportDeclaration;
  importedName: string | null;
} | null {
  const contains = (node: tsModule.Node) =>
    args.position >= node.getStart(args.sourceFile) &&
    args.position <= node.getEnd();

  for (const statement of args.sourceFile.statements) {
    if (!args.ts.isImportDeclaration(statement)) {
      continue;
    }

    const moduleSpecifier = statement.moduleSpecifier;
    if (
      args.ts.isStringLiteralLike(moduleSpecifier) &&
      contains(moduleSpecifier)
    ) {
      return { importDeclaration: statement, importedName: null };
    }

    const importClause = statement.importClause;
    if (!importClause) {
      continue;
    }

    if (importClause.name && contains(importClause.name)) {
      return { importDeclaration: statement, importedName: 'default' };
    }

    const namedBindings = importClause.namedBindings;
    if (!namedBindings) {
      continue;
    }

    if (
      args.ts.isNamespaceImport(namedBindings) &&
      contains(namedBindings.name)
    ) {
      return { importDeclaration: statement, importedName: null };
    }

    if (!args.ts.isNamedImports(namedBindings)) {
      continue;
    }

    for (const element of namedBindings.elements) {
      if (
        contains(element.name) ||
        (element.propertyName && contains(element.propertyName))
      ) {
        return {
          importDeclaration: statement,
          importedName: element.propertyName?.text ?? element.name.text,
        };
      }
    }
  }

  return null;
}

function resolveModuleFromLanguageServiceHost(args: {
  ts: typeof tsModule;
  info: tsModule.server.PluginCreateInfo;
  moduleName: string;
  containingFile: string;
}): tsModule.ResolvedModuleFull | undefined {
  const host = args.info.languageServiceHost;
  const compilerOptions =
    args.info.project.getCompilationSettings?.() ??
    host.getCompilationSettings?.() ??
    {};

  const resolved = host.resolveModuleNames?.(
    [args.moduleName],
    args.containingFile,
    undefined,
    undefined,
    compilerOptions,
    undefined,
  )?.[0];
  if (resolved) {
    return resolved;
  }

  const compilerHost = args.ts.createCompilerHost(compilerOptions, true);
  const resolutionHost: tsModule.ModuleResolutionHost = {
    fileExists: (fileName) =>
      host.fileExists?.(fileName) ?? compilerHost.fileExists(fileName),
    readFile: (fileName) =>
      host.readFile?.(fileName) ?? compilerHost.readFile(fileName),
    directoryExists: (directoryName) =>
      host.directoryExists?.(directoryName) ??
      compilerHost.directoryExists?.(directoryName) ??
      true,
    getCurrentDirectory: () =>
      host.getCurrentDirectory?.() ?? compilerHost.getCurrentDirectory(),
    getDirectories: (directoryName) =>
      host.getDirectories?.(directoryName) ??
      compilerHost.getDirectories?.(directoryName) ??
      [],
    realpath:
      host.realpath?.bind(host) ?? compilerHost.realpath?.bind(compilerHost),
  };
  return args.ts.resolveModuleName(
    args.moduleName,
    args.containingFile,
    compilerOptions,
    resolutionHost,
  ).resolvedModule;
}

function resolveExportedDefinition(args: {
  ts: typeof tsModule;
  info: tsModule.server.PluginCreateInfo;
  program: tsModule.Program | undefined;
  sourceFile: tsModule.SourceFile;
  sourceFileName: string;
  name: string;
  seen: Set<string>;
}): tsModule.DefinitionInfo | null {
  const { ts, sourceFile, sourceFileName, name, seen } = args;
  const seenKey = `${sourceFileName}:${name}`;
  if (seen.has(seenKey)) {
    return null;
  }
  seen.add(seenKey);

  for (const statement of args.sourceFile.statements) {
    const exportedName = getDirectExportedDeclarationName({
      ts,
      statement,
      name,
    });
    if (exportedName) {
      return createDefinitionInfoForIdentifier({
        ts,
        sourceFile,
        sourceFileName,
        name,
        identifier: exportedName,
      });
    }

    const reExport = getNamedReExport({
      ts,
      statement,
      name,
    });
    if (!reExport) {
      continue;
    }

    if (!reExport.moduleName) {
      const localDeclarationName = findLocalDeclarationName({
        ts,
        sourceFile,
        name: reExport.importedName,
      });
      if (localDeclarationName) {
        return createDefinitionInfoForIdentifier({
          ts,
          sourceFile,
          sourceFileName,
          name,
          identifier: localDeclarationName,
        });
      }
      continue;
    }

    const resolvedModule = resolveModuleFromLanguageServiceHost({
      ts,
      info: args.info,
      moduleName: reExport.moduleName,
      containingFile: sourceFileName,
    });
    if (!resolvedModule?.resolvedFileName) {
      return createDefinitionInfoForIdentifier({
        ts,
        sourceFile,
        sourceFileName,
        name,
        identifier: reExport.exportedName,
      });
    }

    const reExportedFileName = resolvedModule.resolvedFileName;
    const reExportedSourceFile =
      args.program?.getSourceFile(reExportedFileName) ??
      createSourceFileFromLanguageServiceHost({
        ts,
        info: args.info,
        fileName: reExportedFileName,
      });
    if (!reExportedSourceFile) {
      return createDefinitionInfoForIdentifier({
        ts,
        sourceFile,
        sourceFileName,
        name,
        identifier: reExport.exportedName,
      });
    }

    const reExportedDefinition = resolveExportedDefinition({
      ...args,
      sourceFile: reExportedSourceFile,
      sourceFileName: reExportedFileName,
      name: reExport.importedName,
    });
    if (reExportedDefinition) {
      return reExportedDefinition;
    }

    return createDefinitionInfoForIdentifier({
      ts,
      sourceFile,
      sourceFileName,
      name,
      identifier: reExport.exportedName,
    });
  }

  return null;
}

function createDefinitionInfoForIdentifier(args: {
  ts: typeof tsModule;
  sourceFile: tsModule.SourceFile;
  sourceFileName: string;
  name: string;
  identifier: tsModule.Identifier;
}): tsModule.DefinitionInfo {
  const { ts, sourceFile, sourceFileName, name, identifier } = args;
  return {
    fileName: sourceFileName,
    textSpan: {
      start: identifier.getStart(sourceFile),
      length: identifier.getWidth(sourceFile),
    },
    kind: ts.ScriptElementKind.unknown,
    name,
    containerKind: '',
    containerName: '',
  };
}

function getDirectExportedDeclarationName(args: {
  ts: typeof tsModule;
  statement: tsModule.Statement;
  name: string;
}): tsModule.Identifier | null {
  const { ts, statement, name } = args;
  if (
    (ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isFunctionDeclaration(statement) ||
      ts.isEnumDeclaration(statement)) &&
    statement.name?.text === name &&
    hasExportModifier(ts, statement)
  ) {
    return statement.name;
  }

  if (ts.isVariableStatement(statement) && hasExportModifier(ts, statement)) {
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === name) {
        return declaration.name;
      }
    }
  }

  return null;
}

function findLocalDeclarationName(args: {
  ts: typeof tsModule;
  sourceFile: tsModule.SourceFile;
  name: string;
}): tsModule.Identifier | null {
  for (const statement of args.sourceFile.statements) {
    const declarationName = getLocalDeclarationName({
      ts: args.ts,
      statement,
      name: args.name,
    });
    if (declarationName) {
      return declarationName;
    }
  }

  return null;
}

function getLocalDeclarationName(args: {
  ts: typeof tsModule;
  statement: tsModule.Statement;
  name: string;
}): tsModule.Identifier | null {
  const { ts, statement, name } = args;
  if (
    (ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isFunctionDeclaration(statement) ||
      ts.isEnumDeclaration(statement)) &&
    statement.name?.text === name
  ) {
    return statement.name;
  }

  if (ts.isVariableStatement(statement)) {
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === name) {
        return declaration.name;
      }
    }
  }

  return null;
}

function getNamedReExport(args: {
  ts: typeof tsModule;
  statement: tsModule.Statement;
  name: string;
}): {
  exportedName: tsModule.Identifier;
  importedName: string;
  moduleName: string | null;
} | null {
  const { ts, statement, name } = args;
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
      exportedName: element.name,
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

function hasExportModifier(ts: typeof tsModule, node: tsModule.Node): boolean {
  return (
    ts
      .getModifiers(node)
      ?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ??
    false
  );
}

function resolveRsxProgramForFile(args: {
  ts: typeof tsModule;
  info: tsModule.server.PluginCreateInfo;
  program: tsModule.Program;
  fileName: string;
}): { program: tsModule.Program; fileName: string } {
  const { ts, info, program, fileName } = args;

  if (!fileName.endsWith('.vue')) {
    return { program, fileName };
  }

  const existingSourceFile = program.getSourceFile(fileName);
  if (existingSourceFile && !existingSourceFile.text.includes('<script')) {
    return { program, fileName };
  }

  const snapshot = info.languageServiceHost.getScriptSnapshot?.(fileName);
  if (!snapshot) {
    return { program, fileName };
  }

  const sourceText = snapshot.getText(0, snapshot.getLength());
  const virtualFile = extractVueEmbeddedTypeScriptFile(sourceText, fileName);
  if (!virtualFile) {
    return { program, fileName };
  }

  const compilerOptions =
    info.project.getCompilationSettings?.() ?? program.getCompilerOptions();
  const target = compilerOptions.target ?? ts.ScriptTarget.Latest;
  const defaultHost = ts.createCompilerHost(compilerOptions, true);
  const virtualSourceFile = ts.createSourceFile(
    virtualFile.virtualFileName,
    virtualFile.text,
    target,
    true,
    virtualFile.scriptKind,
  );

  const rootNames = [
    ...program
      .getRootFileNames()
      .filter((rootFileName) => rootFileName !== fileName),
    virtualFile.virtualFileName,
  ];

  const host: tsModule.CompilerHost = {
    ...defaultHost,
    fileExists(candidateFileName) {
      if (candidateFileName === virtualFile.virtualFileName) {
        return true;
      }
      if (candidateFileName === fileName) {
        return true;
      }
      return defaultHost.fileExists(candidateFileName);
    },
    readFile(candidateFileName) {
      if (candidateFileName === virtualFile.virtualFileName) {
        return virtualFile.text;
      }
      if (candidateFileName === fileName) {
        return sourceText;
      }
      return defaultHost.readFile(candidateFileName);
    },
    getSourceFile(
      candidateFileName,
      languageVersion,
      onError,
      shouldCreateNewSourceFile,
    ) {
      if (candidateFileName === virtualFile.virtualFileName) {
        return virtualSourceFile;
      }
      if (candidateFileName === fileName) {
        return undefined;
      }
      return defaultHost.getSourceFile(
        candidateFileName,
        languageVersion,
        onError,
        shouldCreateNewSourceFile,
      );
    },
  };

  return {
    program: ts.createProgram({
      rootNames,
      options: compilerOptions,
      host,
    }),
    fileName: virtualFile.virtualFileName,
  };
}

function getRsxEncodedClassifications(args: {
  ts: typeof tsModule;
  program: tsModule.Program;
  fileName: string;
  span: tsModule.TextSpan;
  format?: tsModule.SemanticClassificationFormat;
}): number[] {
  const { ts, program, fileName, span, format } = args;
  const sourceFile = program.getSourceFile(fileName);
  if (!sourceFile) {
    return [];
  }

  const sites = getRelevantExpressionSitesForFile(program, fileName);
  if (sites.length === 0) {
    return [];
  }

  const spanStart = span.start;
  const spanEnd = span.start + span.length;
  const encoded: number[] = [];

  for (const site of sites) {
    const expressionSourceFile = site.expressionSourceFile;
    const expressionStart = site.expressionStart;
    const expressionEnd = site.expressionEnd;

    if (expressionEnd <= spanStart || expressionStart >= spanEnd) {
      continue;
    }

    const expressionText = expressionSourceFile.text.slice(
      expressionStart,
      expressionEnd,
    );
    const semanticContext =
      createRsxSemanticClassificationContext(expressionText);
    const tokens = tokenizeRsxExpression(expressionText);
    if (tokens.length === 0) {
      continue;
    }

    for (const token of tokens) {
      const tokenStart = expressionStart + token.start;
      const tokenEnd = expressionStart + token.end;
      if (tokenEnd <= spanStart || tokenStart >= spanEnd) {
        continue;
      }

      const clippedStart = tokenStart < spanStart ? spanStart : tokenStart;
      const clippedEnd = tokenEnd > spanEnd ? spanEnd : tokenEnd;
      if (clippedEnd <= clippedStart) {
        continue;
      }

      const classification = encodeClassification({
        ts,
        token,
        format,
        context: semanticContext,
        text: expressionText,
      });
      if (classification === null) {
        continue;
      }

      encoded.push(clippedStart, clippedEnd - clippedStart, classification);
    }
  }

  return encoded;
}

function getRsxEncodedSyntacticClassifications(args: {
  ts: typeof tsModule;
  fileName: string;
  span: tsModule.TextSpan;
  sites: ReturnType<typeof detectExpressionSites>;
}): number[] {
  const { ts, fileName, span, sites } = args;
  const spanStart = span.start;
  const spanEnd = span.start + span.length;
  const encoded: number[] = [];

  for (const site of sites) {
    const expressionSourceFile = site.expressionSourceFile;
    if (expressionSourceFile.fileName !== fileName) {
      continue;
    }
    const expressionStart = site.expressionStart;
    const expressionEnd = site.expressionEnd;

    if (expressionEnd <= spanStart || expressionStart >= spanEnd) {
      continue;
    }

    const expressionText = expressionSourceFile.text.slice(
      expressionStart,
      expressionEnd,
    );
    const tokens = tokenizeRsxExpression(expressionText);
    for (const token of tokens) {
      const tokenStart = expressionStart + token.start;
      const tokenEnd = expressionStart + token.end;
      const classification = encodeSyntacticClassification({
        ts,
        token,
      });
      if (classification === null) {
        continue;
      }

      if (tokenEnd <= spanStart || tokenStart >= spanEnd) {
        continue;
      }

      const clippedStart = tokenStart < spanStart ? spanStart : tokenStart;
      const clippedEnd = tokenEnd > spanEnd ? spanEnd : tokenEnd;
      if (clippedEnd <= clippedStart) {
        continue;
      }

      encoded.push(clippedStart, clippedEnd - clippedStart, classification);
    }
  }

  return encoded;
}

function encodeClassification(args: {
  ts: typeof tsModule;
  token: IRsxToken;
  format?: tsModule.SemanticClassificationFormat;
  context: ReturnType<typeof createRsxSemanticClassificationContext>;
  text: string;
}): number | null {
  const { ts, token, format, context, text } = args;
  const semanticTokenType = resolveSemanticTokenType({
    context,
    text,
    token,
  });
  if (semanticTokenType === null) {
    return null;
  }
  const tokenText = text.slice(token.start, token.end);
  if (
    !shouldEmitRsxSemanticToken({
      tokenType: semanticTokenType,
      tokenText,
      policy: RSX_INLINE_CLASSIFICATION_POLICY,
    })
  ) {
    return null;
  }

  if (format === ts.SemanticClassificationFormat.TwentyTwenty) {
    return (semanticTokenType + 1) << 8;
  }

  switch (token.kind) {
    case 'identifier':
      return ts.ClassificationType.identifier;
    case 'keyword':
      return ts.ClassificationType.keyword;
    case 'number':
      return ts.ClassificationType.numericLiteral;
    case 'string':
      return ts.ClassificationType.stringLiteral;
    case 'operator':
    case 'punctuation':
      return ts.ClassificationType.operator;
    default:
      return null;
  }
}

function encodeSyntacticClassification(args: {
  ts: typeof tsModule;
  token: IRsxToken;
}): number | null {
  const { ts, token } = args;
  const classification = toTsClassificationTypeForRsxTokenKind({
    classificationType: {
      identifier: ts.ClassificationType.identifier,
      keyword: ts.ClassificationType.keyword,
      numericLiteral: ts.ClassificationType.numericLiteral,
      stringLiteral: ts.ClassificationType.stringLiteral,
      operator: ts.ClassificationType.operator,
      punctuation: ts.ClassificationType.punctuation,
    },
    tokenKind: token.kind,
  });
  if (classification === null) {
    return null;
  }

  if (
    !shouldEmitTsClassificationForRsxToken({
      classification,
      operatorClassification: ts.ClassificationType.operator,
      policy: RSX_INLINE_CLASSIFICATION_POLICY,
    })
  ) {
    return null;
  }

  return classification;
}

function mergeEncodedClassificationSpans(
  baseSpans: number[],
  pluginSpans: number[],
): number[] {
  const merged: Array<{
    start: number;
    length: number;
    classification: number;
  }> = [];

  for (let index = 0; index < baseSpans.length; index += 3) {
    merged.push({
      start: baseSpans[index],
      length: baseSpans[index + 1],
      classification: baseSpans[index + 2],
    });
  }

  for (let index = 0; index < pluginSpans.length; index += 3) {
    merged.push({
      start: pluginSpans[index],
      length: pluginSpans[index + 1],
      classification: pluginSpans[index + 2],
    });
  }

  merged.sort((left, right) => left.start - right.start);

  return merged.flatMap((item) => [
    item.start,
    item.length,
    item.classification,
  ]);
}

function toTsDiagnosticCategory(
  ts: typeof tsModule,
  category: 'semantic' | 'syntax' | 'unsupported',
): tsModule.DiagnosticCategory {
  switch (category) {
    case 'syntax':
    case 'semantic':
    case 'unsupported':
      return ts.DiagnosticCategory.Error;
    default:
      return ts.DiagnosticCategory.Warning;
  }
}

function diagnosticCode(
  category: 'semantic' | 'syntax' | 'unsupported',
): number {
  switch (category) {
    case 'syntax':
      return 97001;
    case 'semantic':
      return 97002;
    case 'unsupported':
      return 97003;
    default:
      return 97000;
  }
}

export = init;
