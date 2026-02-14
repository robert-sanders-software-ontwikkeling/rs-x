import * as monaco from 'monaco-editor';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import './app.css';

import { InjectionContainer } from '@rs-x/core';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import { RsXExpressionParserModule } from '../../rs-x-expression-parser/lib';


InjectionContainer.load(RsXExpressionParserModule);

// Provide Monaco a way to spawn its workers
window.MonacoEnvironment = {
  getWorker(_moduleId: string, label: string) {
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker();
    }
    return new editorWorker();
  },
};

monaco.typescript.javascriptDefaults.setCompilerOptions({
  allowJs: true,
  allowNonTsExtensions: true,
  checkJs: true,
  target: monaco.typescript.ScriptTarget.ESNext,
});

monaco.typescript.typescriptDefaults.setCompilerOptions({
  allowNonTsExtensions: true,
  noEmit: true,
  target: monaco.typescript.ScriptTarget.ESNext,
});


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
