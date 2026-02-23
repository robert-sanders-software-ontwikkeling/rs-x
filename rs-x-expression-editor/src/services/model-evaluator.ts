import { rxjsScope } from './rxjs-scope';

export type EvaluateModelResult =
  | { success: true; model: object }
  | { success: false; error: string };

export class ModelEvaluator {
  private static _instance: ModelEvaluator;

  private constructor() {}

  public static getInstance(): ModelEvaluator {
    if (!this._instance) {
      this._instance = new ModelEvaluator();
    }

    return this._instance;
  }

  public evaluate(editorModelString: string): EvaluateModelResult {
    try {
      const model = new Function('rxjs', `return ${editorModelString}`)(
        rxjsScope,
      );

      return {
        success: true,
        model,
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }
}
