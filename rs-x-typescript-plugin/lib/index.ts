import type tsModule from 'typescript/lib/tsserverlibrary';

import {
  detectExpressionSitesInSourceFile,
  getRsxCompletionsAtPosition,
  getRsxDiagnosticsForFile,
  getRsxHoverAtPosition,
} from '@rs-x/compiler';

interface ITypescriptPluginInit {
  typescript: typeof tsModule;
}

function init(modules: ITypescriptPluginInit): tsModule.server.PluginModule {
  const ts = modules.typescript;

  function create(info: tsModule.server.PluginCreateInfo): tsModule.LanguageService {
    const languageService = info.languageService;
    const proxy: tsModule.LanguageService = Object.create(null);

    for (const key of Object.keys(languageService) as Array<keyof tsModule.LanguageService>) {
      const value = languageService[key];
      (proxy[key] as unknown) = typeof value === 'function' ? value.bind(languageService) : value;
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

      const rsxCompletions = getRsxCompletionsAtPosition(program, fileName, position);
      if (rsxCompletions.length === 0) {
        return baseCompletions;
      }

      const baseEntries = baseCompletions?.entries ?? [];
      const seenNames = new Set(baseEntries.map((entry) => entry.name));
      const pluginEntries = rsxCompletions
        .filter((completion) => !seenNames.has(completion.name))
        .map((completion): tsModule.CompletionEntry => ({
          name: completion.name,
          kind:
            completion.kind === 'method'
              ? ts.ScriptElementKind.memberFunctionElement
              : ts.ScriptElementKind.memberVariableElement,
          kindModifiers: '',
          sortText: '0',
        }));

      if (!baseCompletions) {
        return {
          entries: pluginEntries,
          isGlobalCompletion: false,
          isMemberCompletion: true,
          isNewIdentifierLocation: false,
        };
      }

      return {
        ...baseCompletions,
        entries: [...baseCompletions.entries, ...pluginEntries],
      };
    };

    proxy.getQuickInfoAtPosition = (fileName, position) => {
      const program = languageService.getProgram?.();
      if (!program) {
        return languageService.getQuickInfoAtPosition(fileName, position);
      }

      const hover = getRsxHoverAtPosition(program, fileName, position);
      if (!hover) {
        return languageService.getQuickInfoAtPosition(fileName, position);
      }

      const sourceFile = program.getSourceFile(fileName);
      const hoveredIdentifier = sourceFile?.text.slice(hover.start, hover.end) ?? '';
      const hoverLabel =
        hoveredIdentifier && !hover.text.startsWith(`${hoveredIdentifier}:`)
          ? `${hoveredIdentifier}: ${hover.text}`
          : hover.text;

      return {
        // Use a neutral symbol kind and an explicit label to avoid duplicated
        // type-only renderings such as "number number" in VS Code tooltips.
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

    proxy.getEncodedSemanticClassifications = (fileName, span, format) => {
      const base =
        languageService.getEncodedSemanticClassifications(
          fileName,
          span,
          format,
        ) ?? { spans: [], endOfLineState: ts.EndOfLineState.None };

      const program = languageService.getProgram?.();
      if (!program) {
        return base;
      }

      const pluginSpans = getRsxEncodedClassifications({
        ts,
        program,
        fileName,
        span,
        format,
      });

      if (pluginSpans.length === 0) {
        return base;
      }

      return {
        ...base,
        spans: [...base.spans, ...pluginSpans],
      };
    };

    proxy.getSemanticDiagnostics = (fileName) => {
      const baseDiagnostics = languageService.getSemanticDiagnostics(fileName);
      const program = languageService.getProgram?.();
      if (!program) {
        return baseDiagnostics;
      }

      const sourceFile = program.getSourceFile(fileName);
      if (!sourceFile) {
        return baseDiagnostics;
      }

      const rsxDiagnostics = getRsxDiagnosticsForFile(program, fileName).map(
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

type RsxTokenKind =
  | 'identifier'
  | 'keyword'
  | 'number'
  | 'operator'
  | 'punctuation'
  | 'string';

type RsxToken = {
  start: number;
  end: number;
  kind: RsxTokenKind;
};

const RSX_KEYWORDS = new Set([
  'true',
  'false',
  'null',
  'undefined',
  'new',
  'typeof',
  'instanceof',
  'in',
  'void',
  'delete',
  'this',
]);

const OPERATOR_HEAD = new Set([
  '+',
  '-',
  '*',
  '/',
  '%',
  '=',
  '!',
  '<',
  '>',
  '&',
  '|',
  '^',
  '~',
  '?',
]);

const OPERATORS = [
  '>>>',
  '===',
  '!==',
  '<<=',
  '>>=',
  '&&',
  '||',
  '??',
  '==',
  '!=',
  '<=',
  '>=',
  '=>',
  '<<',
  '>>',
  '**',
  '?.',
  '+=',
  '-=',
  '*=',
  '/=',
  '%=',
  '&=',
  '|=',
  '^=',
  '++',
  '--',
] as const;

const PUNCTUATION = new Set(['(', ')', '[', ']', '{', '}', '.', ',', ':', ';']);

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

  const checker = program.getTypeChecker();
  const sites = detectExpressionSitesInSourceFile(sourceFile, checker);
  if (sites.length === 0) {
    return [];
  }

  const spanStart = span.start;
  const spanEnd = span.start + span.length;
  const encoded: number[] = [];

  for (const site of sites) {
    const expressionStart = site.expressionLiteral.getStart(sourceFile) + 1;
    const expressionEnd = site.expressionLiteral.getEnd() - 1;

    if (expressionEnd <= spanStart || expressionStart >= spanEnd) {
      continue;
    }

    const expressionText = sourceFile.text.slice(expressionStart, expressionEnd);
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

function encodeClassification(args: {
  ts: typeof tsModule;
  token: RsxToken;
  format?: tsModule.SemanticClassificationFormat;
  text: string;
}): number | null {
  const { ts, token, format, text } = args;

  // Keep plugin coloring conservative: only semantic identifier/keyword tokens.
  // Let TypeScript's native syntactic classifier own operators/punctuation/strings
  // to avoid cross-range color artifacts in regular TS code.
  if (token.kind !== 'identifier' && token.kind !== 'keyword') {
    return null;
  }

  if (format === ts.SemanticClassificationFormat.TwentyTwenty) {
    const semanticTokenType = resolveSemanticTokenTypeForIdentifier(text, token);
    return (semanticTokenType + 1) << 8;
  }

  return token.kind === 'keyword'
    ? ts.ClassificationType.keyword
    : ts.ClassificationType.identifier;
}

function resolveSemanticTokenTypeForIdentifier(
  text: string,
  token: RsxToken,
): number {
  const prev = previousNonWhitespaceChar(text, token.start - 1);
  const next = nextNonWhitespaceChar(text, token.end);

  // Mirrors TypeScript 2020 token type indexes (classifier2020.ts).
  if (prev === '.') {
    return 9; // property
  }
  if (next === '(') {
    return 10; // function
  }
  return 7; // variable
}

function previousNonWhitespaceChar(
  text: string,
  from: number,
): string | null {
  for (let i = from; i >= 0; i--) {
    if (!isWhitespace(text[i])) {
      return text[i];
    }
  }
  return null;
}

function nextNonWhitespaceChar(text: string, from: number): string | null {
  for (let i = from; i < text.length; i++) {
    if (!isWhitespace(text[i])) {
      return text[i];
    }
  }
  return null;
}

function tokenizeRsxExpression(text: string): RsxToken[] {
  const tokens: RsxToken[] = [];
  let index = 0;

  while (index < text.length) {
    const char = text[index];
    if (isWhitespace(char)) {
      index++;
      continue;
    }

    if (isQuote(char)) {
      const end = consumeQuoted(text, index, char);
      tokens.push({ start: index, end, kind: 'string' });
      index = end;
      continue;
    }

    if (isNumberStart(text, index)) {
      const end = consumeNumber(text, index);
      tokens.push({ start: index, end, kind: 'number' });
      index = end;
      continue;
    }

    if (isIdentifierStart(char)) {
      const end = consumeIdentifier(text, index);
      const value = text.slice(index, end);
      tokens.push({
        start: index,
        end,
        kind: RSX_KEYWORDS.has(value) ? 'keyword' : 'identifier',
      });
      index = end;
      continue;
    }

    const operator = matchOperator(text, index);
    if (operator) {
      tokens.push({
        start: index,
        end: index + operator.length,
        kind: 'operator',
      });
      index += operator.length;
      continue;
    }

    if (PUNCTUATION.has(char)) {
      tokens.push({ start: index, end: index + 1, kind: 'punctuation' });
      index += 1;
      continue;
    }

    if (OPERATOR_HEAD.has(char)) {
      tokens.push({ start: index, end: index + 1, kind: 'operator' });
      index += 1;
      continue;
    }

    index += 1;
  }

  return tokens;
}

function isWhitespace(char: string): boolean {
  return /\s/u.test(char);
}

function isIdentifierStart(char: string): boolean {
  return /[A-Za-z_$]/u.test(char);
}

function isIdentifierPart(char: string): boolean {
  return /[A-Za-z0-9_$]/u.test(char);
}

function consumeIdentifier(text: string, start: number): number {
  let end = start + 1;
  while (end < text.length && isIdentifierPart(text[end])) {
    end++;
  }
  return end;
}

function isNumberStart(text: string, index: number): boolean {
  const char = text[index];
  const next = text[index + 1];
  if (/\d/u.test(char)) {
    return true;
  }
  return char === '.' && /\d/u.test(next);
}

function consumeNumber(text: string, start: number): number {
  let index = start;

  if (text[index] === '0' && index + 1 < text.length) {
    const marker = text[index + 1];
    if (marker === 'x' || marker === 'X') {
      index += 2;
      while (index < text.length && /[0-9A-Fa-f_]/u.test(text[index])) {
        index++;
      }
      return index;
    }
    if (marker === 'b' || marker === 'B') {
      index += 2;
      while (index < text.length && /[01_]/u.test(text[index])) {
        index++;
      }
      return index;
    }
    if (marker === 'o' || marker === 'O') {
      index += 2;
      while (index < text.length && /[0-7_]/u.test(text[index])) {
        index++;
      }
      return index;
    }
  }

  while (index < text.length && /[0-9_]/u.test(text[index])) {
    index++;
  }

  if (text[index] === '.') {
    index++;
    while (index < text.length && /[0-9_]/u.test(text[index])) {
      index++;
    }
  }

  if (text[index] === 'e' || text[index] === 'E') {
    const exponentStart = index;
    index++;
    if (text[index] === '+' || text[index] === '-') {
      index++;
    }
    const digitsStart = index;
    while (index < text.length && /[0-9_]/u.test(text[index])) {
      index++;
    }
    if (digitsStart === index) {
      return exponentStart;
    }
  }

  if (text[index] === 'n') {
    index++;
  }

  return index;
}

function isQuote(char: string): boolean {
  return char === '\'' || char === '"' || char === '`';
}

function consumeQuoted(text: string, start: number, quote: string): number {
  let index = start + 1;
  while (index < text.length) {
    const char = text[index];
    if (char === '\\') {
      index += 2;
      continue;
    }
    index++;
    if (char === quote) {
      return index;
    }
  }
  return text.length;
}

function matchOperator(text: string, index: number): string | null {
  for (const op of OPERATORS) {
    if (text.startsWith(op, index)) {
      return op;
    }
  }
  return null;
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

function diagnosticCode(category: 'semantic' | 'syntax' | 'unsupported'): number {
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
