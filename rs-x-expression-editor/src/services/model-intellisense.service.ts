
import type * as MonacoTypes from 'monaco-editor';
import { rxjsScope } from './rxjs-scope';
import { Monaco } from '@monaco-editor/react';

export class ModelIntellisenseService {
  private static _instance: ModelIntellisenseService;

  public model: object = {};
  public monaco?: Monaco;

  private readonly scopes: Record<string, unknown>;

  private constructor(scopes: Record<string, unknown>) {
    this.scopes = scopes;
  }
  
  // --------------------------------------------
  // Singleton factory with configuration
  // --------------------------------------------

  public static getInstance(

  ): ModelIntellisenseService {
    if (!this._instance) {
      

      this._instance = new ModelIntellisenseService({rxjs: rxjsScope});
    }

    return this._instance;
  }

  // --------------------------------------------
  // PUBLIC API
  // --------------------------------------------

  public setModel(model: object): void {
    this.model = model;
  }

  public register(monacoInstance: Monaco): void {
    this.monaco = monacoInstance;

    monacoInstance.languages.registerCompletionItemProvider('typescript', {
      triggerCharacters:
        '_$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.'.split(
          ''
        ),

      provideCompletionItems: (
        editorModel: MonacoTypes.editor.ITextModel,
        position: MonacoTypes.Position
      ): MonacoTypes.languages.ProviderResult<MonacoTypes.languages.CompletionList> => {
        if (!this.monaco) {
          return { suggestions: [] };
        }

        const range = this.getWordRangeAtPosition(editorModel, position);

        const textBeforeCursor = editorModel.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const memberExpression =
          this.getCurrentMemberExpression(textBeforeCursor);

        const suggestions = this.getSuggestions(memberExpression, range);

        return { suggestions };
      },
    });
  }

  // --------------------------------------------
  // INTERNALS
  // --------------------------------------------

  private getRootScope(): Record<string, unknown> {
    return {
      ...this.model,
      ...this.scopes,
    };
  }

  private getCurrentMemberExpression(textBeforeCursor: string): string {
    const match = textBeforeCursor.match(
      /[\w$][\w\d$]*(\.[\w$][\w\d$]*)*\.?$/
    );
    return match ? match[0] : '';
  }

  private getWordRangeAtPosition(
    editorModel: MonacoTypes.editor.ITextModel,
    position: MonacoTypes.Position
  ): MonacoTypes.IRange {
    const word = editorModel.getWordUntilPosition(position);

    return new this.monaco!.Range(
      position.lineNumber,
      word.startColumn,
      position.lineNumber,
      word.endColumn
    );
  }

  private getSuggestions(
    memberExpression: string,
    range: MonacoTypes.IRange
  ): MonacoTypes.languages.CompletionItem[] {
    if (!this.monaco) return [];

    const { objectAtPath, lastSegment } =
      this.resolveMemberExpression(memberExpression);

    if (!objectAtPath || typeof objectAtPath !== 'object') {
      return [];
    }

    return Object.keys(objectAtPath as Record<string, unknown>)
      .filter((key) => key.startsWith(lastSegment))
      .map((key) => ({
        label: key,
        kind: this.monaco!.languages.CompletionItemKind.Property,
        insertText: key,
        range,
      }));
  }

  private resolveMemberExpression(
    memberExpression: string
  ): { objectAtPath: unknown; lastSegment: string } {
    const fullExpr = memberExpression.trim();

    if (!fullExpr) {
      return {
        objectAtPath: this.getRootScope(),
        lastSegment: '',
      };
    }

    const parts = fullExpr.split('.').filter(Boolean);

    const lastSegment = fullExpr.endsWith('.')
      ? ''
      : parts.pop() || '';

    let current: unknown = this.getRootScope();

    for (const part of parts) {
      if (
        current &&
        typeof current === 'object' &&
        !Array.isArray(current)
      ) {
        current = (current as Record<string, unknown>)[part];
      } else {
        current = {};
        break;
      }
    }

    if (!current || typeof current !== 'object') {
      current = {};
    }

    return { objectAtPath: current, lastSegment };
  }
}