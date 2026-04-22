import path from 'node:path';

import ts from 'typescript/lib/tsserverlibrary';

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
      "model: import('./rsx-file-model.fixture').IModel",
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
});
