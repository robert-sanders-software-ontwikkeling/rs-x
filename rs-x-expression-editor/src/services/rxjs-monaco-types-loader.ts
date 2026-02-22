import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution';

type Manifest = {
    files: string[];
};

export class RxjsMonacoTypesLoader {
    private static _instance: RxjsMonacoTypesLoader | null = null;
    private _installed = false;

    private constructor() { }

    public static getInstance(): RxjsMonacoTypesLoader {
        if (!this._instance) {
            this._instance = new RxjsMonacoTypesLoader();
        }
        return this._instance;
    }

    public async install(monaco: typeof Monaco): Promise<void> {
        if (this._installed) return;

        const ts = (monaco as any).typescript;
        if (!ts) return;

        ts.typescriptDefaults.setCompilerOptions({
            noEmit: true,
            strict: true,
            skipLibCheck: true,
            moduleResolution: ts.ModuleResolutionKind.NodeJs,
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2020,
            esModuleInterop: true,
            allowJs: true,
        });

        const res = await fetch('/monaco-dts/manifest.json');
        const manifest = (await res.json()) as Manifest;

        for (const webPath of manifest.files) {
            const fileRes = await fetch(webPath);
            const content = await fileRes.text();
            const rel = webPath.replace('/monaco-dts/node_modules/', '');
            const uri = `file:///node_modules/${rel}`;
            ts.typescriptDefaults.addExtraLib(content, uri);
        }

        const globalLib = `
            declare global {
                const rxjs:
                typeof import("rxjs") &
                typeof import("rxjs/operators");
            }
            export {};
        `;

        ts.typescriptDefaults.addExtraLib(
            globalLib,
            'file:///globals/rxjs-global.d.ts'
        );

        this._installed = true;
    }
}