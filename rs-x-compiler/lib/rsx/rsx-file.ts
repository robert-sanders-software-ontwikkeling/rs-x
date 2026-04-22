import ts from 'typescript';

export interface IRsxFileMetadata {
  readonly sourceFile: ts.SourceFile;
  readonly expression: string;
  readonly expressionStart: number;
  readonly expressionEnd: number;
  readonly modelTypeText: string;
  readonly returnTypeText?: string;
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
  const { fileName, text } = args;
  const sourceFile = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const normalized = text.replace(/\r\n/gu, '\n');
  const modelMatch = /^model:\s*(.+)$/mu.exec(normalized);
  if (!modelMatch || typeof modelMatch.index !== 'number') {
    return null;
  }

  const returnMatch = /^return:\s*(.+)$/mu.exec(normalized);
  const modelLineEnd = normalized.indexOf('\n', modelMatch.index);
  const headerEnd =
    returnMatch && typeof returnMatch.index === 'number'
      ? normalized.indexOf('\n', returnMatch.index)
      : modelLineEnd;
  const expressionStart = skipWhitespace(
    normalized,
    headerEnd === -1 ? normalized.length : headerEnd + 1,
  );
  const expression = normalized.slice(expressionStart).trim();
  if (!expression) {
    return null;
  }

  return {
    sourceFile,
    expression,
    expressionStart,
    expressionEnd: expressionStart + expression.length,
    modelTypeText: modelMatch[1].trim(),
    returnTypeText: returnMatch?.[1]?.trim(),
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
  const metadata = parseRsxFileContent({ fileName, text: sourceText });
  if (!metadata) {
    return null;
  }

  const compilerOptions = program.getCompilerOptions();
  const target = compilerOptions.target ?? ts.ScriptTarget.Latest;
  const defaultHost = ts.createCompilerHost(compilerOptions, true);
  const virtualFileName = `${fileName}.ts`;
  const virtualSourceText = buildVirtualRsxFileSource(metadata);
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

function buildVirtualRsxFileSource(metadata: IRsxFileMetadata): string {
  const lines = [`type __RSX_MODEL = ${metadata.modelTypeText};`];
  if (metadata.returnTypeText) {
    lines.push(`type __RSX_RETURN = ${metadata.returnTypeText};`);
  }
  return `${lines.join('\n')}\n`;
}

function skipWhitespace(text: string, index: number): number {
  let cursor = index;
  while (cursor < text.length && /\s/u.test(text[cursor])) {
    cursor += 1;
  }
  return cursor;
}
