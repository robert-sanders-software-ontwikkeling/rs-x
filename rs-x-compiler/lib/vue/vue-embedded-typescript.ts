import ts from 'typescript';

export interface IVueEmbeddedTypeScriptFile {
  readonly originalFileName: string;
  readonly virtualFileName: string;
  readonly text: string;
  readonly scriptKind: ts.ScriptKind;
}

type SupportedVueScriptKind = 'js' | 'jsx' | 'ts' | 'tsx';

const SUPPORTED_VUE_SCRIPT_KINDS = new Set<SupportedVueScriptKind>([
  'js',
  'jsx',
  'ts',
  'tsx',
]);

export function isVueFileName(fileName: string): boolean {
  return /\.vue$/iu.test(fileName);
}

export function extractVueEmbeddedTypeScriptFile(
  sourceText: string,
  fileName: string,
): IVueEmbeddedTypeScriptFile | null {
  if (!isVueFileName(fileName)) {
    return null;
  }

  const maskedChars = Array.from(maskPreservingNewlines(sourceText));
  let selectedKind: SupportedVueScriptKind | null = null;
  let hasScriptContent = false;

  const openTagPattern = /<script\b([^>]*)>/giu;
  let match: RegExpExecArray | null;
  while ((match = openTagPattern.exec(sourceText)) !== null) {
    const fullMatch = match[0];
    const rawAttributes = match[1] ?? '';
    const openTagStart = match.index;
    const contentStart = openTagStart + fullMatch.length;
    const closeTagStart = sourceText.indexOf('</script>', contentStart);
    if (closeTagStart < 0) {
      continue;
    }

    const scriptKind = resolveVueScriptKind(rawAttributes);
    if (!scriptKind) {
      continue;
    }

    hasScriptContent = true;
    if (selectedKind === null || scriptKind === 'tsx' || scriptKind === 'jsx') {
      selectedKind = scriptKind;
    }

    for (let index = contentStart; index < closeTagStart; index += 1) {
      maskedChars[index] = sourceText[index];
    }
  }

  if (!hasScriptContent || selectedKind === null) {
    return null;
  }

  const virtualExtension =
    selectedKind === 'tsx' || selectedKind === 'jsx' ? 'tsx' : 'ts';

  return {
    originalFileName: fileName,
    virtualFileName: `${fileName}.${virtualExtension}`,
    text: maskedChars.join(''),
    scriptKind:
      virtualExtension === 'tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  };
}

export function createVueBackedProgramForFile(
  baseProgram: ts.Program,
  fileName: string,
  sourceText?: string,
): { program: ts.Program; fileName: string } | null {
  if (!isVueFileName(fileName)) {
    return null;
  }

  const existingSourceFile = baseProgram.getSourceFile(fileName);
  if (existingSourceFile && !existingSourceFile.text.includes('<script')) {
    return {
      program: baseProgram,
      fileName,
    };
  }

  const resolvedSourceText =
    sourceText ?? existingSourceFile?.text ?? ts.sys.readFile(fileName);
  if (!resolvedSourceText) {
    return null;
  }

  const virtualFile = extractVueEmbeddedTypeScriptFile(
    resolvedSourceText,
    fileName,
  );
  if (!virtualFile) {
    return null;
  }

  const compilerOptions = baseProgram.getCompilerOptions();
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
    ...baseProgram
      .getRootFileNames()
      .filter((rootFileName) => rootFileName !== fileName),
    virtualFile.virtualFileName,
  ];

  const host: ts.CompilerHost = {
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
        return resolvedSourceText;
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

function resolveVueScriptKind(
  rawAttributes: string,
): SupportedVueScriptKind | null {
  const langMatch = /\blang\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/iu.exec(
    rawAttributes,
  );
  const rawLang = (langMatch?.[1] ?? langMatch?.[2] ?? langMatch?.[3] ?? 'js')
    .trim()
    .toLowerCase();

  if (!SUPPORTED_VUE_SCRIPT_KINDS.has(rawLang as SupportedVueScriptKind)) {
    return null;
  }

  return rawLang as SupportedVueScriptKind;
}

function maskPreservingNewlines(sourceText: string): string {
  let result = '';
  for (let index = 0; index < sourceText.length; index += 1) {
    const char = sourceText[index];
    result += char === '\n' || char === '\r' ? char : ' ';
  }
  return result;
}
