import ts from 'typescript';

import { parseRsxFileContent } from './rsx-file';

export function getRsxVirtualDeclarationFileName(fileName: string): string {
  return `${fileName}.d.ts`;
}

export function getRsxFileNameFromVirtualDeclaration(
  fileName: string,
): string | null {
  return fileName.endsWith('.rsx.d.ts')
    ? fileName.slice(0, -'.d.ts'.length)
    : null;
}

export function generateRsxModuleDeclaration(args: {
  fileName: string;
  text: string;
}): string | null {
  const metadata = parseRsxFileContent(args);
  if (!metadata) {
    return null;
  }

  const exportName = toRsxExportName(args.fileName);
  const returnType = metadata.returnTypeText ?? 'unknown';

  return [
    "import type { IExpression } from '@rs-x/expression-parser';",
    "import type { IIndexWatchRule } from '@rs-x/state-manager';",
    '',
    `declare const ${exportName}: (`,
    `  model: ${metadata.modelTypeText},`,
    '  leafIndexWatchRule?: IIndexWatchRule,',
    `) => IExpression<${returnType}>;`,
    '',
    `export default ${exportName};`,
    '',
  ].join('\n');
}

export function createRsxImportAwareCompilerHost(args: {
  options: ts.CompilerOptions;
  rootNames: readonly string[];
}): ts.CompilerHost {
  const { options } = args;
  const defaultHost = ts.createCompilerHost(options, true);

  const resolveModuleNames: ts.CompilerHost['resolveModuleNames'] = (
    moduleNames,
    containingFile,
    reusedNames,
    redirectedReference,
    compilerOptions,
  ) =>
    moduleNames.map((moduleName) => {
      if (!moduleName.endsWith('.rsx')) {
        return ts.resolveModuleName(
          moduleName,
          containingFile,
          compilerOptions ?? options,
          defaultHost,
          undefined,
          redirectedReference,
        ).resolvedModule;
      }

      const resolvedFileName = resolveRelativePath(containingFile, moduleName);
      if (!ts.sys.fileExists(resolvedFileName)) {
        return undefined;
      }

      return {
        resolvedFileName: getRsxVirtualDeclarationFileName(resolvedFileName),
        extension: ts.Extension.Dts,
        isExternalLibraryImport: false,
      };
    });

  return {
    ...defaultHost,
    resolveModuleNames,
    fileExists(fileName) {
      const rsxFileName = getRsxFileNameFromVirtualDeclaration(fileName);
      if (rsxFileName) {
        return ts.sys.fileExists(rsxFileName);
      }
      return defaultHost.fileExists(fileName);
    },
    readFile(fileName) {
      const rsxFileName = getRsxFileNameFromVirtualDeclaration(fileName);
      if (rsxFileName) {
        const text = ts.sys.readFile(rsxFileName);
        return typeof text === 'string'
          ? (generateRsxModuleDeclaration({
              fileName: rsxFileName,
              text,
            }) ?? undefined)
          : undefined;
      }
      return defaultHost.readFile(fileName);
    },
    getSourceFile(
      fileName,
      languageVersion,
      onError,
      shouldCreateNewSourceFile,
    ) {
      const rsxFileName = getRsxFileNameFromVirtualDeclaration(fileName);
      if (rsxFileName) {
        const text = ts.sys.readFile(rsxFileName);
        if (typeof text !== 'string') {
          return undefined;
        }
        const declarationText = generateRsxModuleDeclaration({
          fileName: rsxFileName,
          text,
        });
        if (typeof declarationText !== 'string') {
          return undefined;
        }
        return ts.createSourceFile(
          fileName,
          declarationText,
          languageVersion,
          true,
          ts.ScriptKind.TS,
        );
      }

      return defaultHost.getSourceFile(
        fileName,
        languageVersion,
        onError,
        shouldCreateNewSourceFile,
      );
    },
  };
}

function toRsxExportName(fileName: string): string {
  const normalizedFileName = fileName.replace(/\\/gu, '/');
  const fileSegment = normalizedFileName.slice(
    normalizedFileName.lastIndexOf('/') + 1,
  );
  const baseName = fileSegment.endsWith('.rsx')
    ? fileSegment.slice(0, -'.rsx'.length)
    : fileSegment;
  const parts = baseName.split(/[^A-Za-z0-9_$]+/u).filter(Boolean);
  if (parts.length === 0) {
    return 'rsxExpression';
  }

  const [first, ...rest] = parts;
  const joined = [
    first.toLowerCase(),
    ...rest.map((part) => part[0].toUpperCase() + part.slice(1)),
  ].join('');

  return /^[A-Za-z_$]/u.test(joined) ? joined : `rsx${joined}`;
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
