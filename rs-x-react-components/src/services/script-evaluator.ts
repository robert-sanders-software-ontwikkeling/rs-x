import { InjectionContainer, printValue, WaitForEvent } from '@rs-x/core';
import {
  type IExpressionChangeTransactionManager,
  RsXExpressionParserInjectionTokens,
  rsx,
} from '@rs-x/expression-parser';
import {
  IndexWatchRule,
  type IStateManager,
  RsXStateManagerInjectionTokens,
} from '@rs-x/state-manager';

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

  public async evaluateScript<T>(
    editorModelString: string,
  ): Promise<EvaluateModelResult<T>> {
    const SOURCE_NAME = 'rsx-user-script.js';

    // We wrap so user can "return { ... }" at top-level.
    // User code starts after these wrapper lines.
    const wrapperHeaderLines = ['"use strict";', '(async function (api) {'];

    const wrapperFooterLines = ['})'];

    // IMPORTANT: sourceURL must be inside the evaluated string (not only outside).
    const wrapped = [
      ...wrapperHeaderLines,
      editorModelString,
      ...wrapperFooterLines,
      `//# sourceURL=${SOURCE_NAME}`,
      '',
    ].join('\n');

    // User code begins after the header lines.
    const WRAPPER_LINE_OFFSET = wrapperHeaderLines.length;

    const api = this.buildApi();

    try {
      // Evaluate function expression, then call it with api.
      // The expression is: (function(api){ ...user... })
      // We then immediately invoke it: (...) (api)
      const factory = (0, eval)(wrapped) as (
        a: typeof api,
      ) => T | Promise<T>;
      const result = await factory(api);

      return {
        success: true,
        returnValue: result,
      };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      const stack = err.stack ?? '';
      const message = err.message ?? String(e);

      // Try to find "rsx-user-script.js:line:col" in stack OR message (engine-dependent).
      const loc =
        this._extractLocationFromText(stack, SOURCE_NAME) ??
        this._extractLocationFromText(message, SOURCE_NAME) ??
        // Some engines report "<anonymous>:line:col" for eval; accept that too.
        this._extractAnonymousLocationFromText(stack) ??
        this._extractAnonymousLocationFromText(message);

      let line: number | null = null;
      let column: number | null = null;

      if (loc) {
        // Convert wrapped line -> user editor line
        line = Math.max(1, loc.line - WRAPPER_LINE_OFFSET);
        column = Math.max(1, loc.column);
      }

      // Filter stack to show only relevant frames (user script) if present
      const filteredStackLines = stack
        .split('\n')
        .filter((l) => l.includes(SOURCE_NAME) || l.includes('<anonymous>'));

      const compactStack =
        filteredStackLines.length > 0 ? filteredStackLines.join('\n') : stack;

      return {
        success: false,
        error:
          `${message}` +
          (line !== null && column !== null
            ? ` (line ${line}, col ${column})`
            : '') +
          `\n\nStack:\n${compactStack}`,
      };
    }
  }

  /**
   * Extracts "file:line:col" where file is SOURCE_NAME.
   */
  private _extractLocationFromText(
    text: string,
    sourceName: string,
  ): { line: number; column: number } | null {
    // Matches: rsx-user-script.js:12:34
    const re = new RegExp(`${this._escapeRegExp(sourceName)}:(\\d+):(\\d+)`);
    const m = text.match(re);
    if (!m) {
      return null;
    }

    return {
      line: Number(m[1]),
      column: Number(m[2]),
    };
  }

  /**
   * Fallback: extract "<anonymous>:line:col" (some browsers do this for eval).
   */
  private _extractAnonymousLocationFromText(
    text: string,
  ): { line: number; column: number } | null {
    const m = text.match(/<anonymous>:(\d+):(\d+)/);
    if (!m) {
      return null;
    }

    return {
      line: Number(m[1]),
      column: Number(m[2]),
    };
  }

  private _escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  public evaluateModel<T>(editorModelString: string): EvaluateModelResult<T> {
    try {
      const result = new Function('api', `return ${editorModelString}`)(
        this.buildApi(),
      );

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

  private buildApi(): {
    rxjs: typeof rxjsScope;
    rsx: typeof rsx;
    printValue: typeof printValue;
    stateManager: IStateManager;
    IndexWatchRule: typeof IndexWatchRule;
    WaitForEvent: typeof WaitForEvent;
    ExpressionChangeTransactionManager: IExpressionChangeTransactionManager;
  } {
    return {
      rxjs: rxjsScope,
      rsx,
      printValue,
      stateManager: InjectionContainer.get<IStateManager>(
        RsXStateManagerInjectionTokens.IStateManager,
      ),
      IndexWatchRule,
      WaitForEvent,
      ExpressionChangeTransactionManager:
        InjectionContainer.get<IExpressionChangeTransactionManager>(
          RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager,
        ),
    };
  }
}
