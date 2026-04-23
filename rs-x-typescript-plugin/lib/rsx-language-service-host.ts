import type tsModule from 'typescript/lib/tsserverlibrary';

import {
  createRsxImportAwareCompilerHost,
  generateRsxModuleDeclaration,
  getRsxFileNameFromVirtualDeclaration,
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
    if (!args.moduleName.endsWith('.rsx')) {
      return undefined;
    }

    const baseHost = createRsxImportAwareCompilerHost({
      options: args.options ?? compilerOptions,
      rootNames: host.getScriptFileNames?.() ?? [],
    });

    return ts.resolveModuleName(
      args.moduleName,
      args.containingFile,
      args.options ?? compilerOptions,
      baseHost,
      undefined,
      args.redirectedReference,
    ).resolvedModule;
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
