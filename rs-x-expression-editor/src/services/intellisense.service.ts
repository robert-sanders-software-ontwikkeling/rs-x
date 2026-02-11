import type * as monaco from "monaco-editor";

/**
 * Service to provide intellisense for expressions based on a JS model object.
 */
export class ModelIntellisenseService {
  public model: Record<string, unknown> = {};
  public monaco?: typeof monaco;

  /** Update the model from editor content */
  public updateModelFromEditor(editorModel: monaco.editor.ITextModel): void {
    try {
      // Parse safely as JavaScript object
      // eslint-disable-next-line no-new-func
      this.model = new Function(`return ${editorModel.getValue()}`)() as Record<string, unknown>;
    } catch {
      this.model = {}; // fallback on parse error
    }
  }

  /** Register completion provider for Monaco editor */
  public registerCompletionProvider(monacoInstance: typeof monaco): void {
    this.monaco = monacoInstance;

    monacoInstance.languages.registerCompletionItemProvider("javascript", {
      triggerCharacters: "_$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.".split(""),
      provideCompletionItems: (
        editorModel: monaco.editor.ITextModel,
        position: monaco.Position
      ): monaco.languages.ProviderResult<monaco.languages.CompletionList> => {
        if (!this.monaco) {
          return { suggestions: [] };
        }

        const range = this.getWordRangeAtPosition(editorModel, position);
        const textBeforeCursor = editorModel.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        });

        const memberExpression = this.getCurrentMemberExpression(textBeforeCursor);
        const suggestions = this.getSuggestionsForMemberExpression(memberExpression, range);

        return { suggestions };
      }
    });
  }

  /** Extracts the member expression immediately before the cursor */
  private getCurrentMemberExpression(textBeforeCursor: string): string {
    const match = textBeforeCursor.match(/([\w$][\w\d$]*(\.[\w$][\w\d$]*)*)$/);
    return match ? match[0] : "";
  }

  /** Get the range of the current word at the cursor */
  private getWordRangeAtPosition(
    editorModel: monaco.editor.ITextModel,
    position: monaco.Position
  ): monaco.IRange {
    const wordInfo = editorModel.getWordUntilPosition(position);
    return new this.monaco!.Range(
      position.lineNumber,
      wordInfo.startColumn,
      position.lineNumber,
      wordInfo.endColumn
    );
  }

  /** Generate completion items for a member expression like "b.c" */
  private getSuggestionsForMemberExpression(
    memberExpression: string,
    range: monaco.IRange
  ): monaco.languages.CompletionItem[] {
    if (!this.monaco) {
      return [];
    }

    const { objectAtPath, lastSegment } = this.resolveMemberExpression(memberExpression);

    if (!objectAtPath || typeof objectAtPath !== "object" || Array.isArray(objectAtPath)) {
      return [];
    }

    return Object.keys(objectAtPath as Record<string, unknown>)
      .filter((key) => key.startsWith(lastSegment))
      .map((key) => {
        return {
          label: key,
          kind: this.monaco!.languages.CompletionItemKind.Property,
          insertText: key,
          range
        } as monaco.languages.CompletionItem;
      });
  }

  /** Resolve the object at the given member expression path and the last segment */
  private resolveMemberExpression(
    memberExpression: string
  ): { objectAtPath: unknown; lastSegment: string } {
    // Split by dot
    const parts = memberExpression.split(".");

    // Determine last segment (after trailing dot it is "")
    let lastSegment = parts.pop() || "";

    let current: unknown = this.model;

    for (const part of parts) {
      if (current && typeof current === "object" && !Array.isArray(current)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        current = {};
        break;
      }
    }

    return { objectAtPath: current, lastSegment };
  }
}