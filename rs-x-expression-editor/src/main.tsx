
import * as monaco from 'monaco-editor';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import './app.css';

import { InjectionContainer } from '@rs-x/core';
import { RsXExpressionParserModule } from '@rs-x/expression-parser';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';


async function bootstrap(): Promise<void> {
  await InjectionContainer.load(RsXExpressionParserModule);

  window.MonacoEnvironment = {
    getWorker(_moduleId: string, label: string) {
      if (label === 'typescript' || label === 'javascript') {
        return new tsWorker();
      }
      return new editorWorker();
    },
  };


  // const ts = monaco.typescript;

  // ts.typescriptDefaults.setCompilerOptions({
  //   target: ts.ScriptTarget.ESNext,
  //   module: ts.ModuleKind.ESNext,
  //   moduleResolution: ts.ModuleResolutionKind.NodeJs,
  //   allowNonTsExtensions: true,

  //   baseUrl: 'file:///',

  //   paths: {
  //     rxjs: ['node_modules/rxjs/dist/types/index.d.ts'],
  //     'rxjs/*': ['node_modules/rxjs/dist/types/*'],

  //     // If you use operators via 'rxjs/operators':
  //     'rxjs/operators': ['node_modules/rxjs/dist/types/operators/index.d.ts'],
  //     'rxjs/operators/*': ['node_modules/rxjs/dist/types/operators/*']
  //   },

  //   typeRoots: ['node_modules/@types']
  // });



  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

bootstrap().catch((e) => {
  console.error('Application bootstrap failed', e);
});