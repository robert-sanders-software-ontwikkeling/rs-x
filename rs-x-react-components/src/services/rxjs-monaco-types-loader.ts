import { type Monaco } from '@monaco-editor/react';

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

const yieldToNextFrame = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      resolve();
    });
  });
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

    if (typeof window === 'undefined') {
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
      console.warn(
        `[rs-x] Monaco DTS manifest not found at ${baseUrl}monaco-dts/manifest.json ` +
          `(${manifestRes.status} ${manifestRes.statusText}). Skipping extra RxJS typings.`,
      );
      this._installed = true;
      return;
    }

    const manifest = (await manifestRes.json()) as Manifest;

    // Fetch only ~24 chunk files
    const chunkResults = await Promise.all(
      manifest.files.map(async (chunkPathRaw) => {
        const chunkPath = normalizeWebPath(chunkPathRaw);
        const res = await fetch(`${baseUrl}${chunkPath}`);
        if (!res.ok) {
          console.warn(
            `[rs-x] Monaco DTS chunk missing: ${baseUrl}${chunkPath} ` +
              `(${res.status} ${res.statusText}).`,
          );
          return { files: [] } as Chunk;
        }
        return (await res.json()) as Chunk;
      }),
    );

    // ✅ Add all d.ts to BOTH TS + JS defaults in small batches
    // so the UI can render while libs are being registered.
    const allFiles = chunkResults.flatMap((chunk) => {
      return chunk.files;
    });

    const BATCH_SIZE = 20;

    for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
      const batch = allFiles.slice(i, i + BATCH_SIZE);
      for (const f of batch) {
        ts.typescriptDefaults.addExtraLib(f.content, f.uri);
        ts.javascriptDefaults.addExtraLib(f.content, f.uri);
      }

      await yieldToNextFrame();
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
