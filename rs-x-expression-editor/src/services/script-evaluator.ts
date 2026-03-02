import { rsx } from '@rs-x/expression-parser';

import { rxjsScope } from './rxjs-scope';

export type EvaluateModelResult<T> =
  | { success: true; returnValue: T }
  | { success: false; error: string };

export class ScriptEvaluator {
  private static _instance: ScriptEvaluator;

  private constructor() {}

  public static getInstance(): ScriptEvaluator {
    if (!this._instance) {
      this._instance = new ScriptEvaluator();
    }

    return this._instance;
  }

  public evaluateScript<T>(editorModelString: string): EvaluateModelResult<T> {
    try {
      const result = new Function('api', `${editorModelString}`)({
        rxjs: rxjsScope,
        rsx,
      });

      return {
        success: true,
        returnValue: result,
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  public evaluateModel<T>(editorModelString: string): EvaluateModelResult<T> {
    try {
      const result = new Function('api', `return ${editorModelString}`)({
        rxjs: rxjsScope,
        rsx,
      });

      return {
        success: true,
        returnValue: result,
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }
}
