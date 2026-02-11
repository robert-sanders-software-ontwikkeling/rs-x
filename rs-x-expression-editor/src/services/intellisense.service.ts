import type { languages, IDisposable, editor as MonacoEditor } from "monaco-editor";
import * as monaco from "monaco-editor";

export class ModelIntellisenseService {
  private modelObject: Record<string, unknown> = {};

  /** Update model object */
  public setModel(model: Record<string, unknown>): void {
    this.modelObject = model ?? {};
  }

  /** Create a completion provider for Monaco */
  public registerCompletionProvider(): IDisposable {
    return monaco.languages.registerCompletionItemProvider("javascript", {
      triggerCharacters: [..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$_"],

      provideCompletionItems: (editorModel: MonacoEditor.ITextModel, position: monaco.IPosition) => {
        const textUntilCursor = editorModel.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const lastWordMatch = textUntilCursor.match(/([\w$]+(?:\.[\w$]*)?)$/) ?? [];
        const path = lastWordMatch[1] ?? "";

        const startColumn = position.column - (path.length ?? 0);
        const range: monaco.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn,
          endColumn: position.column,
        };

        const resolveObject = (obj: unknown, parts: string[]): Record<string, unknown> =>
          parts.reduce<Record<string, unknown>>(
            (acc, key) => (typeof acc === "object" && acc !== null && key in acc ? acc[key] as Record<string, unknown> : {}),
            obj as Record<string, unknown>
          );

        const keys: string[] = path.includes(".")
          ? Object.keys(resolveObject(this.modelObject, path.split(".").slice(0, -1)))
          : Object.keys(this.modelObject);

        const suggestions: languages.CompletionItem[] = keys.map((key) => ({
          label: key,
          kind: monaco.languages.CompletionItemKind.Property,
          insertText: key,
          range,
        }));

        return { suggestions };
      },
    });
  }
}