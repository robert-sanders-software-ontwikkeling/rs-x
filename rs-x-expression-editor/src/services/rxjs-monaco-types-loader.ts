import { type Monaco } from '@monaco-editor/react';

import 'monaco-editor/esm/vs/language/typescript/monaco.contribution';

type Manifest = {
  files: string[];
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
    if (this._installed) return;

    const ts = monaco.typescript;
    if (!ts) return;

    ts.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      baseUrl: 'file:///',

      paths: {
        rxjs: ['node_modules/rxjs/dist/types/index.d.ts'],
        'rxjs/*': ['node_modules/rxjs/dist/types/*'],

        'rxjs/operators': ['node_modules/rxjs/dist/types/operators/index.d.ts'],
        'rxjs/operators/*': ['node_modules/rxjs/dist/types/operators/*'],
      },

      typeRoots: ['node_modules/@types'],
    });

    // ✅ Works locally (/) and on GitHub Pages (/rs-x/)
    const baseUrl = import.meta.env.BASE_URL.endsWith('/')
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`;

    // Manifest now should contain RELATIVE paths (recommended):
    // "monaco-dts/node_modules/..."
    // If some entries still start with "/", we normalize them anyway.
    const res = await fetch(`${baseUrl}monaco-dts/manifest.json`);
    const manifest = (await res.json()) as Manifest;

    for (const webPathRaw of manifest.files) {
      const webPath = webPathRaw.replace(/^\//, ''); // tolerate old manifests too
      const fileRes = await fetch(`${baseUrl}${webPath}`);
      const content = await fileRes.text();

      // Map public path -> Monaco virtual FS path
      // monaco-dts/node_modules/<pkg>/... -> file:///node_modules/<pkg>/...
      const rel = webPath.replace(/^monaco-dts\/node_modules\//, '');
      const uri = `file:///node_modules/${rel}`;

      ts.typescriptDefaults.addExtraLib(content, uri);
    }

    // ✅ Better completions for `rxjs.<...>` (core + operators together)
    const globalLib = `
      import * as Core from 'rxjs';
      import * as Ops from 'rxjs/operators';

      declare global {
        const rxjs: typeof Core & typeof Ops;
      }

      export {};
    `;

    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      globalLib,
      'file:///globals/rxjs-global.d.ts',
    );

    this._installed = true;
  }
}
