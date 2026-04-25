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
  const baseReadFile = host.readFile?.bind(host);
  const readRsxSourceText = (rsxFileName: string): string | undefined => {
    const rsxSnapshot = baseGetScriptSnapshot?.(rsxFileName);
    const snapshotText = rsxSnapshot?.getText(0, rsxSnapshot.getLength());
    if (typeof snapshotText === 'string') {
      return snapshotText;
    }

    return baseReadFile?.(rsxFileName) ?? ts.sys.readFile(rsxFileName);
  };

  host.getScriptSnapshot = (fileName) => {
    const rsxFileName = getRsxFileNameFromVirtualDeclaration(fileName);
    if (rsxFileName) {
      const declarationText = getVirtualDeclarationText({
        info,
        ts,
        virtualFileName: fileName,
        rsxFileName,
        readRsxSourceText,
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
      return getVirtualDeclarationVersion({
        rsxFileName,
        readRsxSourceText,
        baseVersion: baseGetScriptVersion?.(rsxFileName),
      });
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

  host.readFile = (fileName) => {
    const rsxFileName = getRsxFileNameFromVirtualDeclaration(fileName);
    if (rsxFileName) {
      return getVirtualDeclarationText({
        info,
        ts,
        virtualFileName: fileName,
        rsxFileName,
        readRsxSourceText,
        compilerOptions,
        rootNames: host.getScriptFileNames?.() ?? [],
      });
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

function getVirtualDeclarationText(args: {
  info: tsModule.server.PluginCreateInfo;
  ts: typeof tsModule;
  virtualFileName: string;
  rsxFileName: string;
  readRsxSourceText: (rsxFileName: string) => string | undefined;
  compilerOptions: tsModule.CompilerOptions;
  rootNames: readonly string[];
}): string | undefined {
  const rsxText = args.readRsxSourceText(args.rsxFileName);
  if (typeof rsxText !== 'string') {
    return undefined;
  }

  const declarationText = generateRsxModuleDeclaration({
    fileName: args.rsxFileName,
    text: rsxText,
    compilerOptions: args.compilerOptions,
    rootNames: args.rootNames,
  });
  if (typeof declarationText === 'string') {
    ensureVirtualDeclarationScriptInfo({
      info: args.info,
      ts: args.ts,
      fileName: args.virtualFileName,
      text: declarationText,
    });
  }

  return declarationText ?? undefined;
}

function getVirtualDeclarationVersion(args: {
  rsxFileName: string;
  readRsxSourceText: (rsxFileName: string) => string | undefined;
  baseVersion: string | undefined;
}): string {
  const rsxText = args.readRsxSourceText(args.rsxFileName);
  if (typeof rsxText !== 'string') {
    return args.baseVersion ?? '0';
  }

  return `${args.baseVersion ?? '0'}:${hashText(rsxText)}`;
}

function hashText(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16);
}

function ensureVirtualDeclarationScriptInfo(args: {
  info: tsModule.server.PluginCreateInfo;
  ts: typeof tsModule;
  fileName: string;
  text: string;
}): void {
  const projectService = args.info.project.projectService;
  if (!projectService?.getOrCreateScriptInfoForNormalizedPath) {
    return;
  }

  const normalizedFileName = args.ts.server.toNormalizedPath(args.fileName);
  const scriptInfo = projectService.getOrCreateScriptInfoForNormalizedPath(
    normalizedFileName,
    false,
    undefined,
    args.ts.ScriptKind.TS,
    false,
    {
      fileExists: (candidateFileName) =>
        normalizePath(candidateFileName) === normalizePath(args.fileName),
    },
  );

  scriptInfo?.open(args.text);
  scriptInfo?.attachToProject(args.info.project);
}
