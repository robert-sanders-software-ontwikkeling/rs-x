import { type Monaco } from '@monaco-editor/react';

import 'monaco-editor/esm/vs/language/typescript/monaco.contribution';

type Manifest = {
  files: string[];
};

type Chunk = {
  files: Array<{ uri: string; content: string }>;
};

const normalizeBaseUrl = (baseUrl: string): string => {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
};

const normalizeWebPath = (webPath: string): string => {
  return webPath.replace(/^\//, '');
};

export class RxjsMonacoTypesLoader {
  private static _instance: RxjsMonacoTypesLoader | null = null;
  private _installed = false;

  private constructor() {}

  public static getInstance(): RxjsMonacoTypesLoader {
    if (!this._instance) {
      this._instance = new RxjsMonacoTypesLoader();
    }
    return this._instance;
  }

  public async install(monaco: Monaco): Promise<void> {
    if (this._installed) {
      return;
    }

    // ✅ Use canonical API surface for Monaco TS/JS language service
    const ts = monaco.typescript;
    if (!ts) {
      return;
    }

    // ✅ Apply compiler options to BOTH TypeScript + JavaScript defaults
    const compilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      baseUrl: 'file:///',
      paths: {
        rxjs: ['node_modules/rxjs/dist/types/index.d.ts'],
        'rxjs/*': ['node_modules/rxjs/dist/types/*'],
        'rxjs/operators': ['node_modules/rxjs/dist/types/operators/index.d.ts'],
        'rxjs/operators/*': ['node_modules/rxjs/dist/types/operators/*'],
      },
      typeRoots: ['node_modules/@types'],

      // JS IntelliSense + checking
      allowJs: true,
      checkJs: true,
      allowNonTsExtensions: true,
    };

    ts.typescriptDefaults.setCompilerOptions(compilerOptions);
    ts.javascriptDefaults.setCompilerOptions(compilerOptions);

    const baseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_BASE_PATH ?? '/');

    const manifestRes = await fetch(`${baseUrl}monaco-dts/manifest.json`);
    if (!manifestRes.ok) {
      throw new Error(
        `Failed to load manifest: ${manifestRes.status} ${manifestRes.statusText}`,
      );
    }

    const manifest = (await manifestRes.json()) as Manifest;

    // Fetch only ~24 chunk files
    const chunkResults = await Promise.all(
      manifest.files.map(async (chunkPathRaw) => {
        const chunkPath = normalizeWebPath(chunkPathRaw);
        const res = await fetch(`${baseUrl}${chunkPath}`);
        if (!res.ok) {
          throw new Error(
            `Failed to load chunk ${chunkPath}: ${res.status} ${res.statusText}`,
          );
        }
        return (await res.json()) as Chunk;
      }),
    );

    // ✅ Add all d.ts to BOTH TS + JS defaults
    for (const chunk of chunkResults) {
      for (const f of chunk.files) {
        ts.typescriptDefaults.addExtraLib(f.content, f.uri);
        ts.javascriptDefaults.addExtraLib(f.content, f.uri);
      }
    }

    // ✅ Global 'api' for scripts (visible in JS + TS models)
    const globalLib = `
      import * as Core from 'rxjs';
      import * as Ops from 'rxjs/operators';

      declare global {
        interface IIndexWatchRule {
          context: unknown;
          test(index: unknown, target: unknown): boolean;
        }

        interface IExpression<TReturn = unknown> {
          value: TReturn;
        }

        const api: {
          rxjs: typeof Core & typeof Ops;

          rsx: <TReturn, TModel extends object = object>(
            expressionString: string,
          ) => (
            model: TModel,
            leafIndexWatchRule?: IIndexWatchRule,
          ) => IExpression<TReturn>;
        };
      }

      export {};
    `;

    ts.typescriptDefaults.addExtraLib(
      globalLib,
      'file:///globals/rsx-global.d.ts',
    );
    ts.javascriptDefaults.addExtraLib(
      globalLib,
      'file:///globals/rsx-global.d.ts',
    );

    this._installed = true;
  }
}
