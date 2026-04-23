import ts from 'typescript';

export interface IRsxExpressionMetadata {
  readonly name?: string;
  readonly expression: string;
  readonly expressionStart: number;
  readonly expressionEnd: number;
  readonly modelTypeText: string;
  readonly returnTypeText?: string;
  readonly preparse: boolean;
  readonly lazy: boolean;
  readonly lazyGroup?: string;
  readonly compiled: boolean;
}

export interface IRsxFileMetadata extends IRsxExpressionMetadata {
  readonly sourceFile: ts.SourceFile;
  readonly expressions: readonly IRsxExpressionMetadata[];
}

export interface IRsxFileParseResult {
  readonly sourceFile: ts.SourceFile;
  readonly expressions: readonly IRsxExpressionMetadata[];
}

export interface IRsxBackedProgram {
  readonly program: ts.Program;
  readonly fileName: string;
  readonly virtualFileName: string;
  readonly sourceFile: ts.SourceFile;
  readonly virtualSourceFile: ts.SourceFile;
  readonly metadata: IRsxFileMetadata;
}

export function isRsxFileName(fileName: string): boolean {
  return fileName.endsWith('.rsx');
}

export function parseRsxFileContent(args: {
  fileName: string;
  text: string;
}): IRsxFileMetadata | null {
  const parsed = parseRsxFileExpressions(args);
  if (!parsed || parsed.expressions.length === 0) {
    return null;
  }

  const primaryExpression = parsed.expressions[0];
  return {
    ...primaryExpression,
    sourceFile: parsed.sourceFile,
    expressions: parsed.expressions,
  };
}

export function parseRsxFileExpressions(args: {
  fileName: string;
  text: string;
}): IRsxFileParseResult | null {
  const sourceFile = ts.createSourceFile(
    args.fileName,
    args.text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const normalized = args.text.replace(/\r\n/gu, '\n');

  const globalHeaders = new Map<string, string>();
  let cursor = 0;
  let sawExpressionHeader = false;
  const expressions: IRsxExpressionMetadata[] = [];

  while (cursor < normalized.length) {
    const line = readLineAt(normalized, cursor);
    const trimmed = line.text.trim();

    if (!trimmed) {
      cursor = line.next;
      continue;
    }

    if (isTopLevelExpressionHeader(line.text)) {
      sawExpressionHeader = true;
      break;
    }

    if (isTopLevelDefaultsHeader(line.text)) {
      cursor = collectDefaultsHeaders(normalized, line.next, globalHeaders);
      continue;
    }

    const header = parseTopLevelHeaderLine(line.text);
    if (!header || !isSupportedRsxHeaderKey(header.key)) {
      break;
    }

    globalHeaders.set(header.key, header.value);
    cursor = line.next;
  }

  if (!sawExpressionHeader) {
    const expressionStart = skipWhitespace(normalized, cursor);
    const expression = normalized.slice(expressionStart).trim();
    if (!expression) {
      return null;
    }

    const single = toExpressionMetadata({
      headers: globalHeaders,
      expression,
      expressionStart,
      name: undefined,
    });
    if (!single) {
      return null;
    }

    return {
      sourceFile,
      expressions: [single],
    };
  }

  while (cursor < normalized.length) {
    const expressionHeaderLine = readLineAt(normalized, cursor);
    if (!isTopLevelExpressionHeader(expressionHeaderLine.text)) {
      return null;
    }

    const expressionHeader = parseTopLevelHeaderLine(expressionHeaderLine.text);
    const rawExpressionName = expressionHeader?.value?.trim() ?? '';
    if (!isValidExpressionExportName(rawExpressionName)) {
      return null;
    }

    cursor = expressionHeaderLine.next;
    const localHeaders = new Map<string, string>();

    while (cursor < normalized.length) {
      const line = readLineAt(normalized, cursor);
      const trimmed = line.text.trim();

      if (!trimmed) {
        cursor = line.next;
        continue;
      }

      if (isTopLevelExpressionHeader(line.text)) {
        return null;
      }

      const header =
        parseTopLevelHeaderLine(line.text) ?? parseIndentedHeaderLine(line.text);
      if (!header || !isSupportedRsxHeaderKey(header.key)) {
        break;
      }

      localHeaders.set(header.key, header.value);
      cursor = line.next;
    }

    const expressionStart = skipWhitespace(normalized, cursor);
    const nextExpressionStart = findNextTopLevelExpressionHeaderOffset(
      normalized,
      expressionStart,
    );
    const expression = normalized
      .slice(expressionStart, nextExpressionStart)
      .trim();
    if (!expression) {
      return null;
    }

    const mergedHeaders = new Map<string, string>(globalHeaders);
    for (const [key, value] of localHeaders.entries()) {
      mergedHeaders.set(key, value);
    }

    const metadata = toExpressionMetadata({
      headers: mergedHeaders,
      expression,
      expressionStart,
      name: rawExpressionName,
    });
    if (!metadata) {
      return null;
    }

    expressions.push(metadata);
    cursor = nextExpressionStart;

    while (cursor < normalized.length) {
      const line = readLineAt(normalized, cursor);
      if (line.text.trim().length > 0) {
        break;
      }
      cursor = line.next;
    }
  }

  if (expressions.length === 0) {
    return null;
  }

  return {
    sourceFile,
    expressions,
  };
}

export function createRsxBackedProgramForFile(
  program: ts.Program,
  fileName: string,
  sourceTextOverride?: string,
): IRsxBackedProgram | null {
  if (
    !isRsxFileName(fileName) ||
    (typeof sourceTextOverride !== 'string' && !ts.sys.fileExists(fileName))
  ) {
    return null;
  }

  const sourceText = sourceTextOverride ?? ts.sys.readFile(fileName);
  if (typeof sourceText !== 'string') {
    return null;
  }
  const parsed = parseRsxFileExpressions({ fileName, text: sourceText });
  if (!parsed || parsed.expressions.length === 0) {
    return null;
  }

  const metadata: IRsxFileMetadata = {
    ...parsed.expressions[0],
    sourceFile: parsed.sourceFile,
    expressions: parsed.expressions,
  };

  const compilerOptions = program.getCompilerOptions();
  const target = compilerOptions.target ?? ts.ScriptTarget.Latest;
  const defaultHost = ts.createCompilerHost(compilerOptions, true);
  const virtualFileName = `${fileName}.ts`;
  const virtualSourceText = buildVirtualRsxFileSource(metadata.expressions);
  const virtualSourceFile = ts.createSourceFile(
    virtualFileName,
    virtualSourceText,
    target,
    true,
    ts.ScriptKind.TS,
  );

  const rootNames = [
    ...program.getRootFileNames().filter((root) => !isRsxFileName(root)),
    fileName,
    virtualFileName,
  ];

  const host: ts.CompilerHost = {
    ...defaultHost,
    fileExists(candidateFileName) {
      if (
        candidateFileName === fileName ||
        candidateFileName === virtualFileName
      ) {
        return true;
      }
      return defaultHost.fileExists(candidateFileName);
    },
    readFile(candidateFileName) {
      if (candidateFileName === fileName) {
        return sourceText;
      }
      if (candidateFileName === virtualFileName) {
        return virtualSourceText;
      }
      return defaultHost.readFile(candidateFileName);
    },
    getSourceFile(
      candidateFileName,
      languageVersion,
      onError,
      shouldCreateNewSourceFile,
    ) {
      if (candidateFileName === fileName) {
        return metadata.sourceFile;
      }
      if (candidateFileName === virtualFileName) {
        return virtualSourceFile;
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
    fileName,
    virtualFileName,
    sourceFile: metadata.sourceFile,
    virtualSourceFile,
    metadata,
  };
}

function buildVirtualRsxFileSource(
  expressions: readonly IRsxExpressionMetadata[],
): string {
  const lines: string[] = [];
  for (let index = 0; index < expressions.length; index += 1) {
    const expression = expressions[index];
    lines.push(
      `type __RSX_MODEL_${String(index)} = ${expression.modelTypeText};`,
    );
    if (expression.returnTypeText) {
      lines.push(
        `type __RSX_RETURN_${String(index)} = ${expression.returnTypeText};`,
      );
    }
  }

  if (expressions.length > 0) {
    lines.push('type __RSX_MODEL = __RSX_MODEL_0;');
    if (expressions[0].returnTypeText) {
      lines.push('type __RSX_RETURN = __RSX_RETURN_0;');
    }
  }

  return `${lines.join('\n')}\n`;
}

function toExpressionMetadata(args: {
  headers: ReadonlyMap<string, string>;
  expression: string;
  expressionStart: number;
  name?: string;
}): IRsxExpressionMetadata | null {
  const modelTypeText = args.headers.get('model')?.trim();
  if (!modelTypeText) {
    return null;
  }

  const returnTypeText = args.headers.get('return')?.trim();
  const lazyGroup = parseLazyGroupHeader(args.headers.get('lazyGroup'));
  const lazyValue = parseBooleanHeader(args.headers.get('lazy'));
  const compileValue = parseBooleanHeader(
    args.headers.get('compiled') ?? args.headers.get('compile'),
  );
  const preparseValue = parseBooleanHeader(args.headers.get('preparse'));

  const lazy = lazyGroup ? true : (lazyValue ?? false);
  const compiled = compileValue ?? true;
  const preparse = preparseValue ?? true;

  return {
    name: args.name,
    expression: args.expression,
    expressionStart: args.expressionStart,
    expressionEnd: args.expressionStart + args.expression.length,
    modelTypeText,
    returnTypeText,
    preparse,
    lazy,
    lazyGroup,
    compiled,
  };
}

function readLineAt(
  text: string,
  offset: number,
): {
  text: string;
  start: number;
  end: number;
  next: number;
} {
  const lineEndIndex = text.indexOf('\n', offset);
  const end = lineEndIndex === -1 ? text.length : lineEndIndex;
  return {
    text: text.slice(offset, end),
    start: offset,
    end,
    next: lineEndIndex === -1 ? text.length : end + 1,
  };
}

function collectDefaultsHeaders(
  text: string,
  startOffset: number,
  destination: Map<string, string>,
): number {
  let cursor = startOffset;

  while (cursor < text.length) {
    const line = readLineAt(text, cursor);
    const trimmed = line.text.trim();

    if (!trimmed) {
      cursor = line.next;
      continue;
    }

    if (!hasIndent(line.text)) {
      break;
    }

    const parsed = parseIndentedHeaderLine(line.text);
    if (!parsed || !isSupportedRsxHeaderKey(parsed.key)) {
      break;
    }

    destination.set(parsed.key, parsed.value);
    cursor = line.next;
  }

  return cursor;
}

function hasIndent(line: string): boolean {
  return line.length > 0 && /^\s/u.test(line);
}

function parseTopLevelHeaderLine(
  line: string,
): { key: string; value: string } | null {
  if (hasIndent(line)) {
    return null;
  }

  const match = /^([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.+)$/u.exec(line.trim());
  if (!match) {
    return null;
  }

  return {
    key: match[1],
    value: match[2].trim(),
  };
}

function parseIndentedHeaderLine(
  line: string,
): { key: string; value: string } | null {
  const match = /^\s+([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.+)$/u.exec(line);
  if (!match) {
    return null;
  }

  return {
    key: match[1],
    value: match[2].trim(),
  };
}

function findNextTopLevelExpressionHeaderOffset(
  text: string,
  fromOffset: number,
): number {
  let cursor = fromOffset;

  while (cursor < text.length) {
    const line = readLineAt(text, cursor);
    if (isTopLevelExpressionHeader(line.text)) {
      return cursor;
    }
    cursor = line.next;
  }

  return text.length;
}

function isTopLevelExpressionHeader(line: string): boolean {
  return !hasIndent(line) && /^expression\s*:\s*.+$/u.test(line.trim());
}

function isTopLevelDefaultsHeader(line: string): boolean {
  return !hasIndent(line) && /^defaults\s*:\s*$/u.test(line.trim());
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

function isValidExpressionExportName(name: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(name);
}

function skipWhitespace(text: string, index: number): number {
  let cursor = index;
  while (cursor < text.length && /\s/u.test(text[cursor])) {
    cursor += 1;
  }
  return cursor;
}

function parseBooleanHeader(value: string | undefined): boolean | undefined {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return undefined;
}

function parseLazyGroupHeader(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const quoted = /^(['"])([\s\S]*)\1$/u.exec(value);
  const normalized = quoted ? quoted[2] : value;
  const trimmed = normalized.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
