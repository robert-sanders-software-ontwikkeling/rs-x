import type { ReactNode } from 'react';

type EditorDiagnostic = {
  source: string;
  message: string;
  line: number;
  column: number;
};

export function FrameworkExampleFeedback({
  preview,
  runtimeError,
  editorErrors,
}: {
  preview: ReactNode;
  runtimeError?: string | null;
  editorErrors?: EditorDiagnostic[];
}) {
  const rsxDiagnostics = (editorErrors ?? []).filter(
    (error) => error.source === 'rsx-compiler',
  );
  const typeScriptDiagnostics = (editorErrors ?? []).filter(
    (error) => error.source !== 'rsx-compiler',
  );
  const hasEditorErrors = (editorErrors?.length ?? 0) > 0;

  return (
    <div className="frameworkExampleFeedback">
      {!runtimeError && !hasEditorErrors ? (
        <section className="frameworkLabDemoArea" aria-label="Live demo">
          <div className="frameworkLabDemoHeader">
            <p className="frameworkLabDemoEyebrow">Live demo</p>
          </div>
          <div className="frameworkLabDemoBody">{preview}</div>
        </section>
      ) : null}

      {hasEditorErrors ? (
        <div className="frameworkLabDiagnostics">
          <p className="frameworkLabDiagnosticsTitle">Editor diagnostics</p>
          <p className="frameworkLabDiagnosticsNote">
            Fix these errors to run the preview again.
          </p>
          {rsxDiagnostics.length > 0 ? (
            <div className="frameworkLabDiagnosticsGroup">
              <p className="frameworkLabDiagnosticsLabel">RS-X</p>
              <ul className="frameworkLabDiagnosticsList">
                {rsxDiagnostics.map((error) => (
                  <li
                    key={`${error.source}:${error.message}:${error.line}:${error.column}`}
                  >
                    {error.message} (line {error.line}, col {error.column})
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {typeScriptDiagnostics.length > 0 ? (
            <div className="frameworkLabDiagnosticsGroup">
              <p className="frameworkLabDiagnosticsLabel">TypeScript</p>
              <ul className="frameworkLabDiagnosticsList">
                {typeScriptDiagnostics.map((error) => (
                  <li
                    key={`${error.source}:${error.message}:${error.line}:${error.column}`}
                  >
                    {error.message} (line {error.line}, col {error.column})
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {!hasEditorErrors && runtimeError ? (
        <div className="frameworkLabDiagnostics frameworkLabDiagnosticsRuntime">
          <p className="frameworkLabDiagnosticsTitle">Runtime issue</p>
          <p className="frameworkLabDiagnosticsNote">
            The example compiled, but running it failed. Update the code and the
            preview will try again.
          </p>
          <div className="frameworkLabDiagnosticsGroup">
            <p className="frameworkLabDiagnosticsLabel">Runtime</p>
            <ul className="frameworkLabDiagnosticsList">
              <li>{runtimeError}</li>
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
