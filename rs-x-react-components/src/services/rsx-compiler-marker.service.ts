import type * as Monaco from 'monaco-editor';

import { validatePlaygroundScriptWithRsxCompiler } from './playground-rsx-compiler.service';

const MARKER_OWNER = 'rsx-compiler';

function severityFromCategory(
  monaco: typeof Monaco,
  category: 'semantic' | 'syntax' | 'unsupported',
): Monaco.MarkerSeverity {
  switch (category) {
    case 'syntax':
    case 'semantic':
    case 'unsupported':
      return monaco.MarkerSeverity.Error;
    default:
      return monaco.MarkerSeverity.Warning;
  }
}

export function installRsxCompilerMarkers(args: {
  monaco: typeof Monaco;
  model: Monaco.editor.ITextModel;
}): () => void {
  const { monaco, model } = args;
  let generation = 0;

  const updateMarkers = () => {
    generation += 1;
    const currentGeneration = generation;
    const script = model.getValue();

    void validatePlaygroundScriptWithRsxCompiler(script).then((diagnostics) => {
      if (currentGeneration !== generation) {
        return;
      }

      const markers: Monaco.editor.IMarkerData[] = diagnostics.map(
        (diagnostic) => ({
          severity: severityFromCategory(monaco, diagnostic.category),
          source: MARKER_OWNER,
          message: `[${diagnostic.category}] ${diagnostic.message}`,
          startLineNumber: diagnostic.line,
          startColumn: diagnostic.column,
          endLineNumber: diagnostic.endLine,
          endColumn:
            diagnostic.endLine === diagnostic.line &&
            diagnostic.endColumn === diagnostic.column
              ? diagnostic.endColumn + 1
              : diagnostic.endColumn,
        }),
      );

      monaco.editor.setModelMarkers(model, MARKER_OWNER, markers);
    });
  };

  const sub = model.onDidChangeContent(() => updateMarkers());
  updateMarkers();

  return () => {
    generation += 1;
    sub.dispose();
    monaco.editor.setModelMarkers(model, MARKER_OWNER, []);
  };
}
