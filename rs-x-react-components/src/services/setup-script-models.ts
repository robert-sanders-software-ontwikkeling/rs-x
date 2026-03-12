import type * as Monaco from 'monaco-editor';

export type ScriptWrapperModels = {
  userModel: Monaco.editor.ITextModel;
  wrapperModel: Monaco.editor.ITextModel;
  dispose: () => void;
};

const USER_URI = (monaco: typeof Monaco) => {
  // Keep the same model URI as the mounted editor to avoid model switching.
  return monaco.Uri.parse('file:///src/main.ts');
};

const WRAP_URI = (monaco: typeof Monaco) => {
  return monaco.Uri.parse('inmemory://rsx/demo.wrapper.ts');
};

function buildWrapper(userCode: string): {
  wrapped: string;
  headerLines: number;
} {
  const header = `/* --- RS-X Demo Wrapper (generated) --- */

        type __Result =  IExpression<any, any>;

        function __rsx_demo(): __Result {
        `;

  const headerLines = header.split('\n').length - 1;

  const wrapped = `${header}${userCode}
}
`;

  return { wrapped, headerLines };
}

export function setupScriptModels(args: {
  monaco: typeof Monaco;
  initialUserCode: string;
}): ScriptWrapperModels {
  const { monaco, initialUserCode } = args;

  monaco.typescript.javascriptDefaults.setCompilerOptions({
    ...monaco.typescript.javascriptDefaults.getCompilerOptions(),
    allowJs: true,
    checkJs: true,
    allowNonTsExtensions: true,
    allowReturnOutsideFunction: true,
  });

  const userUri = USER_URI(monaco);
  const wrapUri = WRAP_URI(monaco);

  const userModel =
    monaco.editor.getModel(userUri) ??
    monaco.editor.createModel(initialUserCode, 'javascript', userUri);

  const initialWrapped = buildWrapper(userModel.getValue());

  const wrapperModel =
    monaco.editor.getModel(wrapUri) ??
    monaco.editor.createModel(initialWrapped.wrapped, 'typescript', wrapUri);

  wrapperModel.setValue(initialWrapped.wrapped);

  let headerLines = initialWrapped.headerLines;

  const syncWrapper = () => {
    const next = buildWrapper(userModel.getValue());
    headerLines = next.headerLines;
    wrapperModel.setValue(next.wrapped);
  };

  const applyMappedMarkers = () => {
    const wrapperMarkers = monaco.editor.getModelMarkers({ resource: wrapUri });

    const mapped: Monaco.editor.IMarkerData[] = [];

    for (const m of wrapperMarkers) {
      const startLine = m.startLineNumber - headerLines;
      const endLine = m.endLineNumber - headerLines;

      if (endLine < 1) {
        continue;
      }

      mapped.push({
        severity: m.severity,
        message: m.message,
        code: m.code,
        source: m.source ?? 'rsx-demo',
        startLineNumber: Math.max(1, startLine),
        startColumn: m.startColumn,
        endLineNumber: Math.max(1, endLine),
        endColumn: m.endColumn,
      });
    }

    monaco.editor.setModelMarkers(userModel, 'typescript', []);
    monaco.editor.setModelMarkers(userModel, 'javascript', []);
    monaco.editor.setModelMarkers(userModel, 'rsx-demo', mapped);
  };

  const userSub = userModel.onDidChangeContent(() => {
    syncWrapper();
  });

  const markersSub = monaco.editor.onDidChangeMarkers((uris) => {
    if (!uris.some((u) => u.toString() === wrapUri.toString())) {
      return;
    }
    applyMappedMarkers();
  });

  applyMappedMarkers();

  const dispose = () => {
    userSub.dispose();
    markersSub.dispose();
  };

  return { userModel, wrapperModel, dispose };
}
