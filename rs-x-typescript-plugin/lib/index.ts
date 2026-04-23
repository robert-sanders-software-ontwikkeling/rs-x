import type tsModule from 'typescript/lib/tsserverlibrary';

import {
  detectExpressionSites,
  extractVueEmbeddedTypeScriptFile,
  findRsxExpressionRegionAtPosition,
  getRsxCompletionsAtPosition,
  getRsxDiagnosticsForFile,
  getRsxHoverAtPosition,
  getRsxSignatureHelpAtPosition,
  type IRsxToken,
  tokenizeRsxExpression,
} from '@rs-x/compiler';

import { patchLanguageServiceHostForRsxImports } from './rsx-language-service-host';
import {
  createRsxSemanticClassificationContext,
  resolveSemanticTokenTypeForIdentifier,
} from './rsx-semantic-classification';
import {
  excludeClassificationSpansInRanges,
  getEncodedLexicalClassificationsForRsxExpression,
} from './rsx-syntactic-classification';

interface ITypescriptPluginInit {
  typescript: typeof tsModule;
}

function getRelevantExpressionSitesForFile(
  program: tsModule.Program,
  fileName: string,
) {
  return detectExpressionSites(program, {
    includePartialRsxInvocations: true,
  }).filter(
    (site) => site.expressionSourceFile.fileName === fileName,
  );
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
    const classifications = getEncodedLexicalClassificationsForRsxExpression({
      ts,
      expressionText,
    });

    for (let index = 0; index < classifications.spans.length; index += 3) {
      const tokenStart = expressionStart + classifications.spans[index];
      const tokenLength = classifications.spans[index + 1];
      const tokenEnd = tokenStart + tokenLength;
      const classification = classifications.spans[index + 2];

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

  // Keep plugin coloring conservative: only semantic identifier/keyword tokens.
  // Let TypeScript's native syntactic classifier own operators/punctuation/strings
  // to avoid cross-range color artifacts in regular TS code.
  if (token.kind !== 'identifier' && token.kind !== 'keyword') {
    return null;
  }

  if (format === ts.SemanticClassificationFormat.TwentyTwenty) {
    const semanticTokenType = resolveSemanticTokenTypeForIdentifier({
      context,
      text,
      token,
    });
    return (semanticTokenType + 1) << 8;
  }

  return token.kind === 'keyword'
    ? ts.ClassificationType.keyword
    : ts.ClassificationType.identifier;
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
