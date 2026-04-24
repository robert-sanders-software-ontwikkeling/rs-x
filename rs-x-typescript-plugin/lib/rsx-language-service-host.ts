import type tsModule from 'typescript/lib/tsserverlibrary';

import {
  generateRsxModuleDeclaration,
  getRsxFileNameFromVirtualDeclaration,
  getRsxVirtualDeclarationFileName,
} from '@rs-x/compiler';

export function patchLanguageServiceHostForRsxImports(args: {
  info: tsModule.server.PluginCreateInfo;
  ts: typeof tsModule;
}): void {
  const { info, ts } = args;
  const host = info.languageServiceHost;
  const compilerOptions =
    info.project.getCompilationSettings?.() ?? host.getCompilationSettings?.();
  if (!compilerOptions) {
    return;
  }
  const fallbackModuleHost = ts.createCompilerHost(compilerOptions, true);

  const resolveWithFallbackHost = (args: {
    moduleName: string;
    containingFile: string;
    options?: tsModule.CompilerOptions;
    redirectedReference?: tsModule.ResolvedProjectReference;
  }): tsModule.ResolvedModuleFull | undefined =>
    ts.resolveModuleName(
      args.moduleName,
      args.containingFile,
      args.options ?? compilerOptions,
      fallbackModuleHost,
      undefined,
      args.redirectedReference,
    ).resolvedModule;

  const resolveRsxModule = (args: {
    moduleName: string;
    containingFile: string;
    options?: tsModule.CompilerOptions;
    redirectedReference?: tsModule.ResolvedProjectReference;
  }): tsModule.ResolvedModuleFull | undefined => {
    const rsxFileName = resolveRsxModuleFileName({
      moduleName: args.moduleName,
      containingFile: args.containingFile,
      host,
      ts,
    });
    if (!rsxFileName) {
      return undefined;
    }

    return {
      resolvedFileName: getRsxVirtualDeclarationFileName(rsxFileName),
      extension: ts.Extension.Dts,
      isExternalLibraryImport: false,
    };
  };

  const baseResolveModuleNames = host.resolveModuleNames?.bind(host);
  host.resolveModuleNames = (
    moduleNames,
    containingFile,
    reusedNames,
    redirectedReference,
    options,
    containingSourceFile,
  ) => {
    const resolved = moduleNames.map((moduleName) =>
      resolveRsxModule({
        moduleName,
        containingFile,
        options,
        redirectedReference,
      }),
    );

    const baseResolved = baseResolveModuleNames?.(
      moduleNames,
      containingFile,
      reusedNames,
      redirectedReference,
      options,
      containingSourceFile,
    );

    return moduleNames.map(
      (moduleName, index) =>
        resolved[index] ??
        baseResolved?.[index] ??
        resolveWithFallbackHost({
          moduleName,
          containingFile,
          options,
          redirectedReference,
        }),
    );
  };

  const baseResolveModuleNameLiterals =
    host.resolveModuleNameLiterals?.bind(host);
  host.resolveModuleNameLiterals = (
    moduleLiterals,
    containingFile,
    redirectedReference,
    options,
    containingSourceFile,
    reusedNames,
  ) => {
    const resolved = moduleLiterals.map((moduleLiteral) => {
      const resolvedModule = resolveRsxModule({
        moduleName: moduleLiteral.text,
        containingFile,
        options,
        redirectedReference,
      });
      return resolvedModule ? { resolvedModule } : undefined;
    });

    const baseResolved = baseResolveModuleNameLiterals?.(
      moduleLiterals,
      containingFile,
      redirectedReference,
      options,
      containingSourceFile,
      reusedNames,
    );

    return moduleLiterals.map(
      (moduleLiteral, index) =>
        resolved[index] ??
        baseResolved?.[index] ?? {
          resolvedModule: resolveWithFallbackHost({
            moduleName: moduleLiteral.text,
            containingFile,
            options,
            redirectedReference,
          }),
        },
    );
  };

  const baseGetScriptSnapshot = host.getScriptSnapshot?.bind(host);
  host.getScriptSnapshot = (fileName) => {
    const rsxFileName = getRsxFileNameFromVirtualDeclaration(fileName);
    if (rsxFileName) {
      const rsxSnapshot = baseGetScriptSnapshot?.(rsxFileName);
      const rsxText = rsxSnapshot?.getText(0, rsxSnapshot.getLength());
      if (typeof rsxText !== 'string') {
        return undefined;
      }

      const declarationText = generateRsxModuleDeclaration({
        fileName: rsxFileName,
        text: rsxText,
        compilerOptions,
        rootNames: host.getScriptFileNames?.() ?? [],
      });
      return typeof declarationText === 'string'
        ? ts.ScriptSnapshot.fromString(declarationText)
        : undefined;
    }

    return baseGetScriptSnapshot?.(fileName);
  };

  const baseGetScriptVersion = host.getScriptVersion?.bind(host);
  host.getScriptVersion = (fileName) => {
    const rsxFileName = getRsxFileNameFromVirtualDeclaration(fileName);
    if (rsxFileName) {
      return baseGetScriptVersion?.(rsxFileName) ?? '0';
    }

    return baseGetScriptVersion?.(fileName) ?? '0';
  };

  const baseFileExists = host.fileExists?.bind(host);
  host.fileExists = (fileName) => {
    const rsxFileName = getRsxFileNameFromVirtualDeclaration(fileName);
    if (rsxFileName) {
      return baseFileExists?.(rsxFileName) ?? ts.sys.fileExists(rsxFileName);
    }
    return baseFileExists?.(fileName) ?? ts.sys.fileExists(fileName);
  };

  const baseReadFile = host.readFile?.bind(host);
  host.readFile = (fileName) => {
    const rsxFileName = getRsxFileNameFromVirtualDeclaration(fileName);
    if (rsxFileName) {
      const rsxText =
        baseReadFile?.(rsxFileName) ?? ts.sys.readFile(rsxFileName);
      return typeof rsxText === 'string'
        ? (generateRsxModuleDeclaration({
            fileName: rsxFileName,
            text: rsxText,
            compilerOptions,
            rootNames: host.getScriptFileNames?.() ?? [],
          }) ?? undefined)
        : undefined;
    }

    return baseReadFile?.(fileName) ?? ts.sys.readFile(fileName);
  };
}

function resolveRsxModuleFileName(args: {
  moduleName: string;
  containingFile: string;
  host: tsModule.LanguageServiceHost;
  ts: typeof tsModule;
}): string | null {
  if (!isRelativeModuleName(args.moduleName)) {
    return null;
  }

  const candidates = args.moduleName.endsWith('.rsx')
    ? [args.moduleName]
    : [`${args.moduleName}.rsx`, `${args.moduleName}/index.rsx`];
  for (const candidate of candidates) {
    const resolvedFileName = normalizePath(
      resolveRelativePath(args.containingFile, candidate),
    );
    if (
      args.host.fileExists?.(resolvedFileName) ??
      args.ts.sys.fileExists(resolvedFileName)
    ) {
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
  const normalizedContainingFile = normalizePath(containingFile);
  const containingDirectory = normalizedContainingFile.includes('/')
    ? normalizedContainingFile.slice(
        0,
        normalizedContainingFile.lastIndexOf('/'),
      )
    : '.';
  const joined = `${containingDirectory}/${moduleName}`;
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

function normalizePath(fileName: string): string {
  return fileName.replace(/\\/gu, '/');
}
