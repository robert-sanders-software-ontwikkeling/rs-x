import path from 'node:path';

import ts from 'typescript/lib/tsserverlibrary';
import init = require('../lib/index');

import { patchLanguageServiceHostForRsxImports } from '../lib/rsx-language-service-host';

const workspaceRoot = path.resolve(__dirname, '../..');

describe('rsx language service host', () => {
  it('resolves .rsx imports to typed virtual declaration files', () => {
    const rsxPath = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures/expression-file.fixture.rsx',
    );
    const containingFile = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures/rsx-file-import-consumer.fixture.ts',
    );
    const snapshots = new Map<string, string>([
      [
        rsxPath,
        [
          "model: import('./rsx-file-model.fixture').IModel",
          'return: number',
          '',
          'lines.reduce((sum, line) => sum + line.lineTotal, 0)',
          '',
        ].join('\n'),
      ],
    ]);

    const languageServiceHost: ts.LanguageServiceHost = {
      getCompilationSettings: () => ({
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      }),
      getScriptFileNames: () => [containingFile, rsxPath],
      getScriptSnapshot: (fileName) => {
        const text = snapshots.get(fileName);
        return typeof text === 'string'
          ? ts.ScriptSnapshot.fromString(text)
          : undefined;
      },
      getScriptVersion: () => '1',
      getCurrentDirectory: () => workspaceRoot,
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
      fileExists: (fileName) =>
        snapshots.has(fileName) || ts.sys.fileExists(fileName),
      readFile: (fileName) =>
        snapshots.get(fileName) ?? ts.sys.readFile(fileName),
      readDirectory: ts.sys.readDirectory,
      directoryExists: ts.sys.directoryExists,
      getDirectories: ts.sys.getDirectories,
    };

    const info = {
      languageServiceHost,
      project: {
        getCompilationSettings: () =>
          languageServiceHost.getCompilationSettings!(),
      },
    } as unknown as ts.server.PluginCreateInfo;

    patchLanguageServiceHostForRsxImports({ info, ts });

    const resolved = languageServiceHost.resolveModuleNames?.(
      ['./expression-file.fixture.rsx'],
      containingFile,
      undefined,
      undefined,
      languageServiceHost.getCompilationSettings!(),
      undefined,
    );

    expect(resolved?.[0]?.resolvedFileName).toBe(`${rsxPath}.d.ts`);

    const declarationSnapshot = languageServiceHost.getScriptSnapshot?.(
      `${rsxPath}.d.ts`,
    );
    expect(declarationSnapshot).toBeDefined();
    const declarationText = declarationSnapshot!.getText(
      0,
      declarationSnapshot!.getLength(),
    );

    expect(declarationText).toContain(
      "model: RsxModelInput<import('./rsx-file-model.fixture').IModel>",
    );
    expect(declarationText).toContain('IExpression<number>');
    expect(declarationText).toContain('expressionFileFixture');
  });

  it('resolves .rsx imports through resolveModuleNameLiterals too', () => {
    const rsxPath = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures/expression-file.fixture.rsx',
    );
    const containingFile = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures/rsx-file-import-consumer.fixture.ts',
    );
    const snapshots = new Map<string, string>([
      [
        rsxPath,
        [
          "model: import('./rsx-file-model.fixture').IModel",
          'return: number',
          '',
          'lines.reduce((sum, line) => sum + line.lineTotal, 0)',
          '',
        ].join('\n'),
      ],
    ]);

    const languageServiceHost: ts.LanguageServiceHost = {
      getCompilationSettings: () => ({
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      }),
      getScriptFileNames: () => [containingFile, rsxPath],
      getScriptSnapshot: (fileName) => {
        const text = snapshots.get(fileName);
        return typeof text === 'string'
          ? ts.ScriptSnapshot.fromString(text)
          : undefined;
      },
      getScriptVersion: () => '1',
      getCurrentDirectory: () => workspaceRoot,
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
      fileExists: (fileName) =>
        snapshots.has(fileName) || ts.sys.fileExists(fileName),
      readFile: (fileName) =>
        snapshots.get(fileName) ?? ts.sys.readFile(fileName),
      readDirectory: ts.sys.readDirectory,
      directoryExists: ts.sys.directoryExists,
      getDirectories: ts.sys.getDirectories,
    };

    const info = {
      languageServiceHost,
      project: {
        getCompilationSettings: () =>
          languageServiceHost.getCompilationSettings!(),
      },
    } as unknown as ts.server.PluginCreateInfo;

    patchLanguageServiceHostForRsxImports({ info, ts });

    const moduleLiteral = ts.factory.createStringLiteral(
      './expression-file.fixture.rsx',
    );
    const resolved = languageServiceHost.resolveModuleNameLiterals?.(
      [moduleLiteral],
      containingFile,
      undefined,
      languageServiceHost.getCompilationSettings!(),
      undefined,
      undefined,
    );

    expect(resolved?.[0]?.resolvedModule?.resolvedFileName).toBe(
      `${rsxPath}.d.ts`,
    );
  });

  it('registers virtual .rsx declaration script info before returning snapshots', () => {
    const rsxPath = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures/expression-file.fixture.rsx',
    );
    const snapshots = new Map<string, string>([
      [
        rsxPath,
        [
          "model: import('./rsx-file-model.fixture').IModel",
          'return: number',
          '',
          'lines.reduce((sum, line) => sum + line.lineTotal, 0)',
          '',
        ].join('\n'),
      ],
    ]);
    const scriptInfo = {
      open: jest.fn(),
      attachToProject: jest.fn(),
    };
    const getOrCreateScriptInfoForNormalizedPath = jest.fn(() => scriptInfo);

    const languageServiceHost: ts.LanguageServiceHost = {
      getCompilationSettings: () => ({
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      }),
      getScriptFileNames: () => [rsxPath],
      getScriptSnapshot: (fileName) => {
        const text = snapshots.get(fileName);
        return typeof text === 'string'
          ? ts.ScriptSnapshot.fromString(text)
          : undefined;
      },
      getScriptVersion: () => '1',
      getCurrentDirectory: () => workspaceRoot,
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
      fileExists: (fileName) => snapshots.has(fileName),
      readFile: (fileName) => snapshots.get(fileName),
    };
    const project = {
      getCompilationSettings: () =>
        languageServiceHost.getCompilationSettings!(),
      projectService: {
        getOrCreateScriptInfoForNormalizedPath,
      },
    };

    const info = {
      languageServiceHost,
      project,
    } as unknown as ts.server.PluginCreateInfo;

    patchLanguageServiceHostForRsxImports({ info, ts });

    const virtualDeclarationFileName = `${rsxPath}.d.ts`;
    const snapshot = languageServiceHost.getScriptSnapshot?.(
      virtualDeclarationFileName,
    );

    expect(snapshot).toBeDefined();
    expect(getOrCreateScriptInfoForNormalizedPath).toHaveBeenCalledWith(
      ts.server.toNormalizedPath(virtualDeclarationFileName),
      false,
      undefined,
      ts.ScriptKind.TS,
      false,
      expect.objectContaining({ fileExists: expect.any(Function) }),
    );
    expect(scriptInfo.open).toHaveBeenCalledWith(
      expect.stringContaining('IExpression<number>'),
    );
    expect(scriptInfo.attachToProject).toHaveBeenCalledWith(project);

    getOrCreateScriptInfoForNormalizedPath.mockClear();
    scriptInfo.open.mockClear();
    scriptInfo.attachToProject.mockClear();

    const declarationText = languageServiceHost.readFile?.(
      virtualDeclarationFileName,
    );

    expect(declarationText).toContain('IExpression<number>');
    expect(getOrCreateScriptInfoForNormalizedPath).toHaveBeenCalledWith(
      ts.server.toNormalizedPath(virtualDeclarationFileName),
      false,
      undefined,
      ts.ScriptKind.TS,
      false,
      expect.objectContaining({ fileExists: expect.any(Function) }),
    );
    expect(scriptInfo.open).toHaveBeenCalledWith(
      expect.stringContaining('IExpression<number>'),
    );
    expect(scriptInfo.attachToProject).toHaveBeenCalledWith(project);
  });

  it('resolves extensionless imports to .rsx virtual declaration files', () => {
    const rsxPath = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures/expression-file-multi.fixture.rsx',
    );
    const containingFile = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures/rsx-file-multi-extensionless-import-consumer.fixture.ts',
    );
    const snapshots = new Map<string, string>([
      [rsxPath, ts.sys.readFile(rsxPath) ?? ''],
      [
        containingFile,
        "import { total } from './expression-file-multi.fixture';\nvoid total;\n",
      ],
    ]);

    const languageServiceHost: ts.LanguageServiceHost = {
      getCompilationSettings: () => ({
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      }),
      getScriptFileNames: () => [containingFile, rsxPath],
      getScriptSnapshot: (fileName) => {
        const text = snapshots.get(fileName);
        return typeof text === 'string'
          ? ts.ScriptSnapshot.fromString(text)
          : undefined;
      },
      getScriptVersion: () => '1',
      getCurrentDirectory: () => workspaceRoot,
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
      fileExists: (fileName) =>
        snapshots.has(fileName) || ts.sys.fileExists(fileName),
      readFile: (fileName) =>
        snapshots.get(fileName) ?? ts.sys.readFile(fileName),
    };

    const info = {
      languageServiceHost,
      project: {
        getCompilationSettings: () =>
          languageServiceHost.getCompilationSettings!(),
      },
    } as unknown as ts.server.PluginCreateInfo;

    patchLanguageServiceHostForRsxImports({ info, ts });

    const resolved = languageServiceHost.resolveModuleNames?.(
      ['./expression-file-multi.fixture'],
      containingFile,
      undefined,
      undefined,
      languageServiceHost.getCompilationSettings!(),
      undefined,
    );

    expect(resolved?.[0]?.resolvedFileName).toBe(`${rsxPath}.d.ts`);
  });

  it('maps .rsx import definitions back to the source .rsx file', () => {
    const rsxPath = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures/expression-file-multi.fixture.rsx',
    );
    const containingFile = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures/rsx-file-multi-extensionless-import-consumer.fixture.ts',
    );
    const sourceText =
      "import { total } from './expression-file-multi.fixture';\nvoid total;\n";
    const snapshots = new Map<string, string>([
      [rsxPath, ts.sys.readFile(rsxPath) ?? ''],
      [containingFile, sourceText],
    ]);
    const languageServiceHost = createTestLanguageServiceHost({
      snapshots,
      scriptFileNames: [containingFile, rsxPath],
    });
    const service = createPluginLanguageService(languageServiceHost);
    const importPosition = sourceText.indexOf('total');
    expect(importPosition).toBeGreaterThanOrEqual(0);

    const definitions = service.getDefinitionAtPosition(
      containingFile,
      importPosition,
    );
    const typeDefinitions = service.getTypeDefinitionAtPosition(
      containingFile,
      importPosition,
    );

    const expectedExpressionNameStart =
      (snapshots.get(rsxPath) ?? '').indexOf('expression: total') +
      'expression: '.length;

    expect(definitions?.[0]?.fileName).toBe(rsxPath);
    expect(definitions?.[0]?.textSpan.start).toBe(expectedExpressionNameStart);
    expect(typeDefinitions?.[0]?.fileName).toBe(rsxPath);
    expect(typeDefinitions?.[0]?.textSpan.start).toBe(
      expectedExpressionNameStart,
    );
  });

  it('keeps .rsx import type-definition navigation after the importer is loaded', () => {
    const rsxPath = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures/expression-file-multi.fixture.rsx',
    );
    const containingFile = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures/rsx-file-multi-extensionless-import-consumer.fixture.ts',
    );
    const sourceText =
      "import { total } from './expression-file-multi.fixture';\nvoid total;\n";
    const snapshots = new Map<string, string>([
      [rsxPath, ts.sys.readFile(rsxPath) ?? ''],
      [containingFile, sourceText],
    ]);
    const languageServiceHost = createTestLanguageServiceHost({
      snapshots,
      scriptFileNames: [containingFile, rsxPath],
    });
    const service = createPluginLanguageService(languageServiceHost);
    const importPosition = sourceText.indexOf('total');
    const moduleSpecifierPosition = sourceText.indexOf(
      'expression-file-multi.fixture',
    );
    expect(importPosition).toBeGreaterThanOrEqual(0);
    expect(moduleSpecifierPosition).toBeGreaterThanOrEqual(0);

    expect(
      service.getQuickInfoAtPosition(containingFile, importPosition),
    ).toBeDefined();

    const importTypeDefinitions = service.getTypeDefinitionAtPosition(
      containingFile,
      importPosition,
    );
    const moduleTypeDefinitions = service.getTypeDefinitionAtPosition(
      containingFile,
      moduleSpecifierPosition,
    );

    const expectedExpressionNameStart =
      (snapshots.get(rsxPath) ?? '').indexOf('expression: total') +
      'expression: '.length;

    expect(importTypeDefinitions?.[0]?.fileName).toBe(rsxPath);
    expect(importTypeDefinitions?.[0]?.textSpan.start).toBe(
      expectedExpressionNameStart,
    );
    expect(moduleTypeDefinitions?.[0]?.fileName).toBe(rsxPath);
    expect(moduleTypeDefinitions?.[0]?.textSpan.start).toBe(0);
  });

  it('falls back to definitions for type-definition navigation on imports', () => {
    const modelFile = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures/rsx-file-model.fixture.ts',
    );
    const containingFile = path.resolve(
      path.dirname(modelFile),
      './import-type-consumer.fixture.ts',
    );
    const sourceText =
      "import type { IModel } from './rsx-file-model.fixture';\nvoid 0;\n";
    const snapshots = new Map<string, string>([
      [modelFile, ts.sys.readFile(modelFile) ?? ''],
      [containingFile, sourceText],
    ]);
    const languageServiceHost = createTestLanguageServiceHost({
      snapshots,
      scriptFileNames: [containingFile, modelFile],
    });
    const service = createPluginLanguageService(languageServiceHost);
    const importPosition = sourceText.indexOf('IModel');
    expect(importPosition).toBeGreaterThanOrEqual(0);

    const typeDefinitions = service.getTypeDefinitionAtPosition(
      containingFile,
      importPosition,
    );

    expect(typeDefinitions?.[0]?.fileName).toBe(modelFile);
  });

  it('follows named re-export chains for type-definition navigation on imports', () => {
    const sourceDir = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures',
    );
    const modelFile = path.resolve(sourceDir, './re-export-target.fixture.ts');
    const packageBarrelFile = path.resolve(
      sourceDir,
      './re-export-package-barrel.fixture.ts',
    );
    const localBarrelFile = path.resolve(
      sourceDir,
      './re-export-local-barrel.fixture.ts',
    );
    const containingFile = path.resolve(
      sourceDir,
      './re-export-import-consumer.fixture.ts',
    );
    const sourceText =
      "import { type CouponCode } from './re-export-local-barrel.fixture';\nvoid 0;\n";
    const snapshots = new Map<string, string>([
      [
        modelFile,
        "export type CouponCode = 'NONE' | 'SPRING15' | 'FREESHIP';\n",
      ],
      [
        packageBarrelFile,
        "export type { CouponCode } from './re-export-target.fixture';\n",
      ],
      [
        localBarrelFile,
        "export { type CouponCode } from './re-export-package-barrel.fixture';\n",
      ],
      [containingFile, sourceText],
    ]);
    const languageServiceHost = createTestLanguageServiceHost({
      snapshots,
      scriptFileNames: [
        containingFile,
        localBarrelFile,
        packageBarrelFile,
        modelFile,
      ],
    });
    const service = createPluginLanguageService(languageServiceHost);
    const importPosition = sourceText.indexOf('CouponCode');
    expect(importPosition).toBeGreaterThanOrEqual(0);

    const typeDefinitions = service.getTypeDefinitionAtPosition(
      containingFile,
      importPosition,
    );

    expect(typeDefinitions?.[0]?.fileName).toBe(modelFile);
    expect(typeDefinitions?.[0]?.textSpan.start).toBe(
      snapshots.get(modelFile)?.indexOf('CouponCode'),
    );
  });

  it('infers return type from expression when return header is omitted', () => {
    const rsxPath = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures/expression-file.fixture.rsx',
    );
    const containingFile = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures/rsx-file-import-consumer.fixture.ts',
    );
    const snapshots = new Map<string, string>([
      [
        rsxPath,
        [
          "model: import('./rsx-file-model.fixture').IModel",
          '',
          "lines.length > 0 ? user.name : ''",
          '',
        ].join('\n'),
      ],
    ]);

    const languageServiceHost: ts.LanguageServiceHost = {
      getCompilationSettings: () => ({
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      }),
      getScriptFileNames: () => [containingFile, rsxPath],
      getScriptSnapshot: (fileName) => {
        const text = snapshots.get(fileName);
        return typeof text === 'string'
          ? ts.ScriptSnapshot.fromString(text)
          : undefined;
      },
      getScriptVersion: () => '1',
      getCurrentDirectory: () => workspaceRoot,
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
      fileExists: (fileName) => snapshots.has(fileName),
      readFile: (fileName) => snapshots.get(fileName),
    };

    const info = {
      languageServiceHost,
      project: {
        getCompilationSettings: () =>
          languageServiceHost.getCompilationSettings!(),
      },
    } as unknown as ts.server.PluginCreateInfo;

    patchLanguageServiceHostForRsxImports({ info, ts });

    const declarationSnapshot = languageServiceHost.getScriptSnapshot?.(
      `${rsxPath}.d.ts`,
    );
    expect(declarationSnapshot).toBeDefined();
    const declarationText = declarationSnapshot!.getText(
      0,
      declarationSnapshot!.getLength(),
    );

    expect(declarationText).toContain('IExpression<string>');
  });

  it('infers return type from expression-reference model fields in .rsx files', () => {
    const rsxPath = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures/expression-file-expression-ref-inference.fixture.rsx',
    );
    const containingFile = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures/rsx-file-import-consumer.fixture.ts',
    );
    const snapshots = new Map<string, string>([
      [
        rsxPath,
        [
          'expression: totalRsx',
          "  model: { subtotal: import('@rs-x/expression-parser').IExpression<number>; shipping: import('@rs-x/expression-parser').IExpression<number> }",
          '  subtotal + shipping',
          '',
        ].join('\n'),
      ],
    ]);

    const languageServiceHost: ts.LanguageServiceHost = {
      getCompilationSettings: () => ({
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
        strict: true,
      }),
      getScriptFileNames: () => [containingFile, rsxPath],
      getScriptSnapshot: (fileName) => {
        const text = snapshots.get(fileName);
        return typeof text === 'string'
          ? ts.ScriptSnapshot.fromString(text)
          : undefined;
      },
      getScriptVersion: () => '1',
      getCurrentDirectory: () => workspaceRoot,
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
      fileExists: (fileName) => snapshots.has(fileName),
      readFile: (fileName) => snapshots.get(fileName),
    };

    const info = {
      languageServiceHost,
      project: {
        getCompilationSettings: () =>
          languageServiceHost.getCompilationSettings!(),
      },
    } as unknown as ts.server.PluginCreateInfo;

    patchLanguageServiceHostForRsxImports({ info, ts });

    const declarationSnapshot = languageServiceHost.getScriptSnapshot?.(
      `${rsxPath}.d.ts`,
    );
    expect(declarationSnapshot).toBeDefined();
    const declarationText = declarationSnapshot!.getText(
      0,
      declarationSnapshot!.getLength(),
    );

    expect(declarationText).toContain(') => IExpression<number>;');
    expect(declarationText).not.toContain(') => IExpression<any>;');
  });

  it('infers return type from same-file expression references in .rsx files', () => {
    const rsxPath = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures/expression-file-same-file-reference.fixture.rsx',
    );
    const containingFile = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures/rsx-file-import-consumer.fixture.ts',
    );
    const snapshots = new Map<string, string>([
      [
        rsxPath,
        [
          'defaults:',
          '  model: { value: number }',
          '',
          'expression: subtotalRsx',
          '  value * 2',
          '',
          'expression: totalRsx',
          '  subtotal + 1',
          '',
        ].join('\n'),
      ],
    ]);

    const languageServiceHost: ts.LanguageServiceHost = {
      getCompilationSettings: () => ({
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
        strict: true,
      }),
      getScriptFileNames: () => [containingFile, rsxPath],
      getScriptSnapshot: (fileName) => {
        const text = snapshots.get(fileName);
        return typeof text === 'string'
          ? ts.ScriptSnapshot.fromString(text)
          : undefined;
      },
      getScriptVersion: () => '1',
      getCurrentDirectory: () => workspaceRoot,
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
      fileExists: (fileName) =>
        snapshots.has(fileName) || ts.sys.fileExists(fileName),
      readFile: (fileName) =>
        snapshots.get(fileName) ?? ts.sys.readFile(fileName),
      readDirectory: ts.sys.readDirectory,
      directoryExists: ts.sys.directoryExists,
      getDirectories: ts.sys.getDirectories,
    };

    const info = {
      languageServiceHost,
      project: {
        getCompilationSettings: () =>
          languageServiceHost.getCompilationSettings!(),
      },
    } as unknown as ts.server.PluginCreateInfo;

    patchLanguageServiceHostForRsxImports({ info, ts });

    const declarationSnapshot = languageServiceHost.getScriptSnapshot?.(
      `${rsxPath}.d.ts`,
    );
    expect(declarationSnapshot).toBeDefined();
    const declarationText = declarationSnapshot!.getText(
      0,
      declarationSnapshot!.getLength(),
    );

    expect(declarationText).toContain('declare const totalRsx');
    expect(declarationText).toContain(') => IExpression<number>;');
  });

  it('provides quick info for symbols imported from .rsx modules', () => {
    const rsxPath = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures/expression-file.fixture.rsx',
    );
    const modelPath = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures/rsx-file-model.fixture.ts',
    );
    const containingFile = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures/rsx-file-import-consumer.fixture.ts',
    );
    const snapshots = new Map<string, string>([
      [rsxPath, ts.sys.readFile(rsxPath) ?? ''],
      [modelPath, ts.sys.readFile(modelPath) ?? ''],
      [containingFile, ts.sys.readFile(containingFile) ?? ''],
    ]);

    const languageServiceHost: ts.LanguageServiceHost = {
      getCompilationSettings: () => ({
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
        strict: true,
        allowSyntheticDefaultImports: true,
      }),
      getScriptFileNames: () => [containingFile, rsxPath, modelPath],
      getScriptSnapshot: (fileName) => {
        const text = snapshots.get(fileName);
        return typeof text === 'string'
          ? ts.ScriptSnapshot.fromString(text)
          : undefined;
      },
      getScriptVersion: () => '1',
      getCurrentDirectory: () => workspaceRoot,
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
      fileExists: (fileName) =>
        snapshots.has(fileName) || ts.sys.fileExists(fileName),
      readFile: (fileName) =>
        snapshots.get(fileName) ?? ts.sys.readFile(fileName),
      readDirectory: ts.sys.readDirectory,
      directoryExists: ts.sys.directoryExists,
      getDirectories: ts.sys.getDirectories,
    };

    const info = {
      languageServiceHost,
      project: {
        getCompilationSettings: () =>
          languageServiceHost.getCompilationSettings!(),
      },
    } as unknown as ts.server.PluginCreateInfo;

    patchLanguageServiceHostForRsxImports({ info, ts });
    const languageService = ts.createLanguageService(languageServiceHost);
    const consumerText = snapshots.get(containingFile) ?? '';
    const symbolPosition = consumerText.indexOf('totalExpr') + 1;

    const quickInfo = languageService.getQuickInfoAtPosition(
      containingFile,
      symbolPosition,
    );
    expect(quickInfo).not.toBeUndefined();
    expect(ts.displayPartsToString(quickInfo?.displayParts ?? [])).toContain(
      'IExpression<number>',
    );
  });

  it('loads generated .rsx declarations from readFile when the rsx source is not a script snapshot', () => {
    const rsxPath = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures/expression-file-multi.fixture.rsx',
    );
    const containingFile = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures/rsx-file-multi-extensionless-import-consumer.fixture.ts',
    );
    const sourceText =
      "import { total } from './expression-file-multi.fixture';\nvoid total;\n";
    const snapshots = new Map<string, string>([[containingFile, sourceText]]);
    const diskFiles = new Map<string, string>([
      [rsxPath, ts.sys.readFile(rsxPath) ?? ''],
    ]);
    const languageServiceHost = createTestLanguageServiceHost({
      snapshots,
      scriptFileNames: [containingFile],
      readFileFallbacks: diskFiles,
    });
    const service = createPluginLanguageService(languageServiceHost);
    const importPosition = sourceText.indexOf('total');
    expect(importPosition).toBeGreaterThanOrEqual(0);

    const quickInfo = service.getQuickInfoAtPosition(
      containingFile,
      importPosition,
    );
    const typeDefinitions = service.getTypeDefinitionAtPosition(
      containingFile,
      importPosition,
    );

    expect(ts.displayPartsToString(quickInfo?.displayParts ?? [])).toContain(
      'IExpression<number>',
    );
    expect(typeDefinitions?.[0]?.fileName).toBe(rsxPath);
    expect(typeDefinitions?.[0]?.textSpan.start).toBe(
      (diskFiles.get(rsxPath) ?? '').indexOf('expression: total') +
        'expression: '.length,
    );
  });

  it('refreshes generated .rsx declarations when readFile-backed .rsx sources change', () => {
    const rsxPath = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures/expression-file-multi.fixture.rsx',
    );
    const containingFile = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures/rsx-file-multi-refresh-consumer.fixture.ts',
    );
    const importerVersions = new Map<string, string>([[containingFile, '1']]);
    const snapshots = new Map<string, string>([
      [
        containingFile,
        "import { total } from './expression-file-multi.fixture';\nvoid total;\n",
      ],
    ]);
    const originalRsxText = ts.sys.readFile(rsxPath) ?? '';
    const diskFiles = new Map<string, string>([[rsxPath, originalRsxText]]);
    const languageServiceHost = createTestLanguageServiceHost({
      snapshots,
      scriptFileNames: [containingFile],
      readFileFallbacks: diskFiles,
      getScriptVersion: (fileName) => importerVersions.get(fileName),
    });
    const service = createPluginLanguageService(languageServiceHost);

    const initialText = snapshots.get(containingFile) ?? '';
    const initialImportPosition = initialText.indexOf('total');
    expect(initialImportPosition).toBeGreaterThanOrEqual(0);
    const initialQuickInfo = service.getQuickInfoAtPosition(
      containingFile,
      initialImportPosition,
    );
    expect(
      ts.displayPartsToString(initialQuickInfo?.displayParts ?? []),
    ).toContain('IExpression<number>');

    const addedExpressionText = [
      originalRsxText.trimEnd(),
      '',
      'expression: addedTotal',
      '  return: number',
      '  lines.length',
      '',
    ].join('\n');
    diskFiles.set(rsxPath, addedExpressionText);
    snapshots.set(
      containingFile,
      "import { addedTotal } from './expression-file-multi.fixture';\nvoid addedTotal;\n",
    );
    importerVersions.set(containingFile, '2');

    const updatedText = snapshots.get(containingFile) ?? '';
    const updatedImportPosition = updatedText.indexOf('addedTotal');
    expect(updatedImportPosition).toBeGreaterThanOrEqual(0);
    const updatedQuickInfo = service.getQuickInfoAtPosition(
      containingFile,
      updatedImportPosition,
    );
    const updatedTypeDefinitions = service.getTypeDefinitionAtPosition(
      containingFile,
      updatedImportPosition,
    );

    expect(
      ts.displayPartsToString(updatedQuickInfo?.displayParts ?? []),
    ).toContain('IExpression<number>');
    expect(updatedTypeDefinitions?.[0]?.fileName).toBe(rsxPath);
    expect(updatedTypeDefinitions?.[0]?.textSpan.start).toBe(
      addedExpressionText.indexOf('expression: addedTotal') +
        'expression: '.length,
    );
  });

  it('keeps normal TS and .rsx import intelligence working after opening an .rsx importer', () => {
    const sourceDir = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures',
    );
    const modelFile = path.resolve(sourceDir, './rsx-file-model.fixture.ts');
    const normalTsFile = path.resolve(sourceDir, './normal-ts-consumer.ts');
    const rsxPath = path.resolve(
      sourceDir,
      './expression-file-multi.fixture.rsx',
    );
    const rsxImporterFile = path.resolve(
      sourceDir,
      './rsx-importer-consumer.ts',
    );
    const normalTsText = [
      "import type { IModel } from './rsx-file-model.fixture';",
      'declare const model: IModel;',
      'model.',
      '',
    ].join('\n');
    const rsxImporterText = [
      "import { total } from './expression-file-multi.fixture';",
      'void total;',
      '',
    ].join('\n');
    const snapshots = new Map<string, string>([
      [modelFile, ts.sys.readFile(modelFile) ?? ''],
      [normalTsFile, normalTsText],
      [rsxImporterFile, rsxImporterText],
    ]);
    const diskFiles = new Map<string, string>([
      [rsxPath, ts.sys.readFile(rsxPath) ?? ''],
    ]);
    const languageServiceHost = createTestLanguageServiceHost({
      snapshots,
      scriptFileNames: [normalTsFile, rsxImporterFile, modelFile],
      readFileFallbacks: diskFiles,
    });
    const service = createPluginLanguageService(languageServiceHost);

    const normalTypePosition = normalTsText.indexOf('IModel');
    const normalCompletionPosition =
      normalTsText.lastIndexOf('model.') + 'model.'.length;
    const baselineTypeDefinitions = service.getTypeDefinitionAtPosition(
      normalTsFile,
      normalTypePosition,
    );
    const baselineCompletions = service.getCompletionsAtPosition(
      normalTsFile,
      normalCompletionPosition,
      {},
    );

    expect(baselineTypeDefinitions?.[0]?.fileName).toBe(modelFile);
    expect(
      baselineCompletions?.entries.some((entry) => entry.name === 'lines'),
    ).toBe(true);

    const rsxImportPosition = rsxImporterText.indexOf('total');
    const rsxQuickInfo = service.getQuickInfoAtPosition(
      rsxImporterFile,
      rsxImportPosition,
    );
    const rsxTypeDefinitions = service.getTypeDefinitionAtPosition(
      rsxImporterFile,
      rsxImportPosition,
    );

    expect(ts.displayPartsToString(rsxQuickInfo?.displayParts ?? [])).toContain(
      'IExpression<number>',
    );
    expect(rsxTypeDefinitions?.[0]?.fileName).toBe(rsxPath);
    expect(rsxTypeDefinitions?.[0]?.textSpan.start).toBe(
      (diskFiles.get(rsxPath) ?? '').indexOf('expression: total') +
        'expression: '.length,
    );

    const afterImporterTypeDefinitions = service.getTypeDefinitionAtPosition(
      normalTsFile,
      normalTypePosition,
    );
    const afterImporterCompletions = service.getCompletionsAtPosition(
      normalTsFile,
      normalCompletionPosition,
      {},
    );

    expect(afterImporterTypeDefinitions?.[0]?.fileName).toBe(modelFile);
    expect(
      afterImporterCompletions?.entries.some((entry) => entry.name === 'lines'),
    ).toBe(true);
  });
});

function createTestLanguageServiceHost(args: {
  snapshots: ReadonlyMap<string, string>;
  scriptFileNames: readonly string[];
  readFileFallbacks?: ReadonlyMap<string, string>;
  getScriptVersion?: (fileName: string) => string | undefined;
}): ts.LanguageServiceHost {
  return {
    getCompilationSettings: () => ({
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true,
      allowSyntheticDefaultImports: true,
    }),
    getScriptFileNames: () => [...args.scriptFileNames],
    getScriptSnapshot: (fileName) => {
      const text = args.snapshots.get(fileName);
      return typeof text === 'string'
        ? ts.ScriptSnapshot.fromString(text)
        : undefined;
    },
    getScriptVersion: (fileName) => args.getScriptVersion?.(fileName) ?? '1',
    getCurrentDirectory: () => workspaceRoot,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: (fileName) =>
      args.snapshots.has(fileName) ||
      !!args.readFileFallbacks?.has(fileName) ||
      ts.sys.fileExists(fileName),
    readFile: (fileName) =>
      args.snapshots.get(fileName) ??
      args.readFileFallbacks?.get(fileName) ??
      ts.sys.readFile(fileName),
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  };
}

function createPluginLanguageService(
  languageServiceHost: ts.LanguageServiceHost,
): ts.LanguageService {
  const baseLanguageService = ts.createLanguageService(languageServiceHost);
  const pluginModule = init({ typescript: ts });
  return pluginModule.create({
    languageService: baseLanguageService,
    languageServiceHost,
    project: {
      getCompilationSettings: () =>
        languageServiceHost.getCompilationSettings?.() ?? {},
    },
  } as unknown as ts.server.PluginCreateInfo);
}
