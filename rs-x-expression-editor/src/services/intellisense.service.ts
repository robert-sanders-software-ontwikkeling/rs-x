import type * as monaco from "monaco-editor";

/**
 * Provides intelligent autocomplete for expressions based on a JS model.
 */
export class ModelIntellisenseService {
  public model: Record<string, unknown> = {};
  public monaco?: typeof monaco;

  /** Set or update the model object */
  public setModel(model: Record<string, unknown>): void {
    this.model = model;
  }

  /** Register Monaco completion provider */
  public registerCompletionProvider(monacoInstance: typeof monaco): void {
    this.monaco = monacoInstance;

    monacoInstance.languages.registerCompletionItemProvider("javascript", {
      triggerCharacters: "_$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.".split(""),
      provideCompletionItems: (
        editorModel: monaco.editor.ITextModel,
        position: monaco.Position
      ): monaco.languages.ProviderResult<monaco.languages.CompletionList> => {
        if (!this.monaco) return { suggestions: [] };

        const range = this.getWordRangeAtPosition(editorModel, position);
        const textBeforeCursor = editorModel.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        });

        const memberExpression = this.getCurrentMemberExpression(textBeforeCursor);
        const suggestions = this.getSuggestions(memberExpression, range);

        return { suggestions };
      }
    });
  }

  /** Extract the member expression immediately before the cursor */
  private getCurrentMemberExpression(textBeforeCursor: string): string {
    const match = textBeforeCursor.match(/[\w$][\w\d$]*(\.[\w$][\w\d$]*)*\.?$/);
    return match ? match[0] : "";
  }

  /** Get the range of the current word at the cursor */
  private getWordRangeAtPosition(
    editorModel: monaco.editor.ITextModel,
    position: monaco.Position
  ): monaco.IRange {
    const word = editorModel.getWordUntilPosition(position);
    return new this.monaco!.Range(
      position.lineNumber,
      word.startColumn,
      position.lineNumber,
      word.endColumn
    );
  }

  /** Generate completion items for a member expression like "b.c" */
  private getSuggestions(
    memberExpression: string,
    range: monaco.IRange
  ): monaco.languages.CompletionItem[] {
    if (!this.monaco) return [];

    const { objectAtPath, lastSegment } = this.resolveMemberExpression(memberExpression);

    if (!objectAtPath || typeof objectAtPath !== "object" || Array.isArray(objectAtPath)) {
      return [];
    }

    // Only return direct properties of the objectAtPath that match lastSegment
    return Object.keys(objectAtPath as Record<string, unknown>)
      .filter((key) => key.startsWith(lastSegment))
      .map((key) => ({
        label: key,
        kind: this.monaco!.languages.CompletionItemKind.Property,
        insertText: key,
        range
      }) as monaco.languages.CompletionItem);
  }

  /**
   * Resolve the member expression to the object whose keys should be suggested
   * and the last segment being typed
   */
  private resolveMemberExpression(
    memberExpression: string
  ): { objectAtPath: unknown; lastSegment: string } {
    // Remove trailing dot if present
    const cleaned = memberExpression.endsWith(".")
      ? memberExpression.slice(0, -1)
      : memberExpression;

    // Split into path segments
    const parts = cleaned.split(".").filter(Boolean);

    // Last segment is what user is currently typing (empty if trailing dot)
    const lastSegment = memberExpression.endsWith(".")
      ? ""
      : parts.pop() || "";

    // Traverse all parts except lastSegment to get the object for suggestions
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