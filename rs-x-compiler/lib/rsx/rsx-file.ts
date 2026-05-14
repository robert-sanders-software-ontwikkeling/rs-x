import ts from 'typescript';

import {
  getRsxExpressionExports,
  getRsxExpressionValueName,
} from './rsx-module-exports';

export interface IRsxExpressionMetadata {
  readonly name?: string;
  readonly nameStart?: number;
  readonly nameEnd?: number;
  readonly expression: string;
  readonly expressionStart: number;
  readonly expressionEnd: number;
  readonly modelTypeText: string;
  readonly returnTypeText?: string;
  readonly preparse: boolean;
  readonly lazy: boolean;
  readonly lazySpecified: boolean;
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

export interface IRsxModuleStructureDiagnostic {
  readonly key: string;
  readonly message: string;
  readonly start: number;
  readonly end: number;
  readonly line: number;
  readonly character: number;
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
  if (getRsxModuleStructureDiagnostics(normalized).length > 0) {
    return null;
  }

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

    const header = readTopLevelHeaderAt(normalized, cursor);
    if (!header || !isSupportedRsxHeaderKey(header.key)) {
      break;
    }

    globalHeaders.set(header.key, header.value);
    cursor = header.next;
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
    const expressionNameStartInLine =
      expressionHeaderLine.text.indexOf(rawExpressionName);
    const expressionNameStart =
      expressionNameStartInLine >= 0
        ? expressionHeaderLine.start + expressionNameStartInLine
        : expressionHeaderLine.start;

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
        readTopLevelHeaderAt(normalized, cursor) ??
        readIndentedHeaderAt(normalized, cursor);
      if (!header || !isSupportedRsxHeaderKey(header.key)) {
        break;
      }

      localHeaders.set(header.key, header.value);
      cursor = header.next;
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
      nameStart: expressionNameStart,
      nameEnd: expressionNameStart + rawExpressionName.length,
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

export function getRsxModuleStructureDiagnostics(
  text: string,
): IRsxModuleStructureDiagnostic[] {
  const normalized = text.replace(/\r\n/gu, '\n');
  const diagnostics: IRsxModuleStructureDiagnostic[] = [];
  const hasModuleTopLevelHeader = normalized
    .split('\n')
    .some(
      (line) =>
        isTopLevelExpressionHeader(line) || isTopLevelDefaultsHeader(line),
    );
  if (!hasModuleTopLevelHeader) {
    return diagnostics;
  }

  let cursor = 0;
  let lineNumber = 0;
  while (cursor < normalized.length) {
    const line = readLineAt(normalized, cursor);
    const header = parseTopLevelHeaderLine(line.text);
    if (
      header &&
      isSupportedRsxHeaderKey(header.key) &&
      header.key !== 'defaults' &&
      header.key !== 'expression'
    ) {
      const character = line.text.indexOf(header.key);
      diagnostics.push({
        key: header.key,
        message: `Header "${header.key}" must be indented under defaults: or an expression block in module-style .rsx files.`,
        start: line.start + Math.max(0, character),
        end:
          line.start +
          Math.max(header.key.length, character + header.key.length),
        line: lineNumber,
        character: Math.max(0, character),
      });
    }
    cursor = line.next;
    lineNumber += 1;
  }

  return diagnostics;
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
  const virtualSourceText = buildVirtualRsxFileSource({
    fileName,
    expressions: metadata.expressions,
  });
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

function buildVirtualRsxFileSource(args: {
  fileName: string;
  expressions: readonly IRsxExpressionMetadata[];
}): string {
  const lines: string[] = [];
  const expressionExports = getRsxExpressionExports(args);
  const localValues = expressionExports.map((expressionExport) => ({
    valueName: getRsxExpressionValueName(expressionExport.exportName),
    returnTypeText: expressionExport.expression.returnTypeText,
  }));
  for (let index = 0; index < args.expressions.length; index += 1) {
    const expression = args.expressions[index];
    const localModelFields = localValues
      .filter((value) => value.valueName !== localValues[index]?.valueName)
      .map(
        (value) =>
          `readonly ${JSON.stringify(value.valueName)}: ${value.returnTypeText ?? 'unknown'}`,
      )
      .join('; ');
    const localModelType = localModelFields ? ` & { ${localModelFields} }` : '';
    lines.push(
      `type __RSX_MODEL_${String(index)} = ${expression.modelTypeText}${localModelType};`,
    );
    if (expression.returnTypeText) {
      lines.push(
        `type __RSX_RETURN_${String(index)} = ${expression.returnTypeText};`,
      );
    }
  }

  if (args.expressions.length > 0) {
    lines.push('type __RSX_MODEL = __RSX_MODEL_0;');
    if (args.expressions[0].returnTypeText) {
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
  nameStart?: number;
  nameEnd?: number;
}): IRsxExpressionMetadata | null {
  const rawModelTypeText = args.headers.get('model')?.trim();
  if (!rawModelTypeText) {
    return null;
  }
  const modelTypeText =
    normalizeRsxModelExpressionReferenceTypeText(rawModelTypeText);

  const returnTypeText = args.headers.get('return')?.trim();
  const lazyGroup = parseLazyGroupHeader(args.headers.get('lazyGroup'));
  const lazyValue = parseBooleanHeader(args.headers.get('lazy'));
  const lazySpecified = args.headers.has('lazy');
  const compileValue = parseBooleanHeader(
    args.headers.get('compiled') ?? args.headers.get('compile'),
  );
  const preparseValue = parseBooleanHeader(args.headers.get('preparse'));

  const lazy = lazyGroup ? true : (lazyValue ?? false);
  const compiled = compileValue ?? true;
  const preparse = preparseValue ?? true;

  return {
    name: args.name,
    nameStart: args.nameStart,
    nameEnd: args.nameEnd,
    expression: args.expression,
    expressionStart: args.expressionStart,
    expressionEnd: args.expressionStart + args.expression.length,
    modelTypeText,
    returnTypeText,
    preparse,
    lazy,
    lazySpecified,
    lazyGroup,
    compiled,
  };
}

export function normalizeRsxModelExpressionReferenceTypeText(
  modelTypeText: string,
): string {
  const prefix = 'type __RSX_MODEL = ';
  const sourceFile = ts.createSourceFile(
    '/__rsx_model_type_normalize__.ts',
    `${prefix}${modelTypeText};`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  if (getSourceFileParseDiagnostics(sourceFile).length > 0) {
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
  const visitType = (node: ts.TypeNode): void => {
    if (ts.isParenthesizedTypeNode(node)) {
      visitType(node.type);
      return;
    }
    if (ts.isIntersectionTypeNode(node) || ts.isUnionTypeNode(node)) {
      for (const memberType of node.types) {
        visitType(memberType);
      }
      return;
    }
    if (!ts.isTypeLiteralNode(node)) {
      return;
    }

    for (const member of node.members) {
      if (
        !ts.isPropertySignature(member) ||
        !member.type ||
        !isExpressionReferenceTypeNode(member.type)
      ) {
        continue;
      }
      const start = member.type.getStart(sourceFile) - prefix.length;
      const end = member.type.getEnd() - prefix.length;
      if (start < 0 || end <= start) {
        continue;
      }
      replacements.push({
        start,
        end,
        text: `ReturnType<${member.type.getText(sourceFile)}>`,
      });
    }
  };

  visitType(modelAlias.type);
  if (replacements.length === 0) {
    return modelTypeText;
  }

  let normalized = modelTypeText;
  for (const replacement of replacements.sort(
    (left, right) => right.start - left.start,
  )) {
    normalized = `${normalized.slice(0, replacement.start)}${replacement.text}${normalized.slice(replacement.end)}`;
  }
  return normalized;
}

function isExpressionReferenceTypeNode(
  node: ts.TypeNode,
): node is ts.TypeQueryNode | ts.ImportTypeNode {
  return (
    ts.isTypeQueryNode(node) || (ts.isImportTypeNode(node) && node.isTypeOf)
  );
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

    const parsed = readIndentedHeaderAt(text, cursor);
    if (!parsed || !isSupportedRsxHeaderKey(parsed.key)) {
      break;
    }

    destination.set(parsed.key, parsed.value);
    cursor = parsed.next;
  }

  return cursor;
}

function hasIndent(line: string): boolean {
  return line.length > 0 && /^\s/u.test(line);
}

function readTopLevelHeaderAt(
  text: string,
  offset: number,
): { key: string; value: string; next: number } | null {
  const line = readLineAt(text, offset);
  if (hasIndent(line.text)) {
    return null;
  }

  return readHeaderAt(text, offset, false);
}

function parseTopLevelHeaderLine(
  line: string,
): { key: string; value: string } | null {
  if (hasIndent(line)) {
    return null;
  }

  const match = /^([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$/u.exec(line);
  if (!match || match[2].trim().length === 0) {
    return null;
  }

  return {
    key: match[1],
    value: match[2].trim(),
  };
}

function readIndentedHeaderAt(
  text: string,
  offset: number,
): { key: string; value: string; next: number } | null {
  const line = readLineAt(text, offset);
  if (!hasIndent(line.text)) {
    return null;
  }

  return readHeaderAt(text, offset, true);
}

function readHeaderAt(
  text: string,
  offset: number,
  requireIndent: boolean,
): { key: string; value: string; next: number } | null {
  const line = readLineAt(text, offset);
  const match = requireIndent
    ? /^\s+([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$/u.exec(line.text)
    : /^([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$/u.exec(line.text);
  if (!match) {
    return null;
  }

  const key = match[1];
  const firstLineValue = match[2].trim();
  if (key !== 'model' && key !== 'return') {
    return firstLineValue.length > 0
      ? {
          key,
          value: firstLineValue,
          next: line.next,
        }
      : null;
  }

  let value = firstLineValue;
  let next = line.next;
  while (next < text.length && !isTypeHeaderValueComplete(value)) {
    const continuationLine = readLineAt(text, next);
    if (!hasIndent(continuationLine.text)) {
      break;
    }

    value = value
      ? `${value}\n${continuationLine.text.trim()}`
      : continuationLine.text.trim();
    next = continuationLine.next;
  }

  return value.length > 0
    ? {
        key,
        value,
        next,
      }
    : null;
}

function isTypeHeaderValueComplete(value: string): boolean {
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
  return getSourceFileParseDiagnostics(sourceFile).length === 0;
}

function getSourceFileParseDiagnostics(
  sourceFile: ts.SourceFile,
): readonly ts.DiagnosticWithLocation[] {
  return (
    (
      sourceFile as ts.SourceFile & {
        parseDiagnostics?: readonly ts.DiagnosticWithLocation[];
      }
    ).parseDiagnostics ?? []
  );
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
