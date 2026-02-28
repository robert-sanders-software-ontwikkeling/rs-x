import { catchError, EMPTY, finalize, skip, take, timeout } from 'rxjs';

import { InjectionContainer, Type } from '@rs-x/core';
import {
  type IExpression,
  type IExpressionChangeHistory,
  type IExpressionChangePlayback,
  type IExpressionChangeTrackerManager,
  type IExpressionChangeTransactionManager,
  RsXExpressionParserInjectionTokens,
} from '@rs-x/expression-parser';

import { type IModelWithExpressions } from '../models/model-with-expressions.interface';

import { ModelEvaluator } from './model-evaluator';
import { ModelExpressionsFactory } from './model-expressions.factory';

export type CompileExpressionResult = {
  expressionString: string;
  expression?: IExpression;
  error?: string;
};

export type EvaluateModelResult =
  | { success: true; model: object }
  | { success: false; error: string };

export class ExpressionEditorBusinessService {
  private readonly _expressionChangePlayback: IExpressionChangePlayback;
  private readonly _expressionChangeTrackerManager: IExpressionChangeTrackerManager;
  private readonly _expressionChangeTransactionManager: IExpressionChangeTransactionManager;
  private static _instance: ExpressionEditorBusinessService;

  private constructor() {
    this._expressionChangePlayback = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionChangePlayback,
    );
    this._expressionChangeTrackerManager = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionChangeTrackerManager,
    );
    this._expressionChangeTransactionManager = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager,
    );
  }

  public static getInstance(): ExpressionEditorBusinessService {
    if (!this._instance) {
      this._instance = new ExpressionEditorBusinessService();
    }
    return this._instance;
  }

  public evaluateModel(editorModelString: string): EvaluateModelResult {
    return ModelEvaluator.getInstance().evaluate(editorModelString);
  }

  public validateModelName(
    name: string,
    modelIndex: number,
    models: IModelWithExpressions[],
  ): string {
    const trimmedName = name.trim();

    if (
      models.some(
        (modelWithExpressions, index) =>
          modelIndex !== index && modelWithExpressions.name === trimmedName,
      )
    ) {
      return `Model name '${trimmedName}' already exists. Model name must be unique`;
    }

    return '';
  }

  public validateExpressionlName(
    name: string,
    modelIndex: number,
    expressionIndex: number,
    models: IModelWithExpressions[],
  ): string {
    if (!models[modelIndex]) {
      return `No model found for index '${modelIndex}'`;
    }

    if (
      models[modelIndex].expressions.some(
        (expression, index) =>
          expressionIndex !== index && expression.name === name,
      )
    ) {
      return `Model '${models[modelIndex].name}' already contains an expression named '${name}'. Expression names must be unique within a model.`;
    }
    return '';
  }

  public compileExpression(
    model: object,
    expressionString: string,
  ): CompileExpressionResult {
    const r = ModelExpressionsFactory.getInstance().create(model, [
      expressionString,
    ])[0];
    return {
      expressionString: r.expressionString,
      expression: r.expression,
      error: r.error,
    };
  }

  public compileExpressions(
    model: object,
    expressionStrings: string[],
  ): CompileExpressionResult[] {
    const results = ModelExpressionsFactory.getInstance().create(
      model,
      expressionStrings,
    );
    return results.map((r) => {
      return {
        expressionString: r.expressionString,
        expression: r.expression,
        error: r.error,
      };
    });
  }

  public disposeExpression(expression?: IExpression | null): void {
    if (!expression) {
      return;
    }

    try {
      expression.dispose();
    } catch {
      // swallow
    }
  }

  public applyModelValues(target: object, source: object): void {
    this._expressionChangeTransactionManager.suspend();
    try {
      this.updateModelValues(target, source);
    } finally {
      this._expressionChangeTransactionManager.continue();
    }
  }

  public replayChangeHistory(args: {
    expression: IExpression;
    index: number;
    changeHistory: IExpressionChangeHistory[][];
  }): void {
    const { expression, index, changeHistory } = args;

    const tracker =
      this._expressionChangeTrackerManager.create(expression).instance;
    tracker.pause();

    expression.changed
      .pipe(
        skip(1),
        take(1),
        timeout({ first: 10000 }),
        catchError(() => {
          return EMPTY;
        }),
        finalize(() => {
          tracker.continue();
        }),
      )
      .subscribe();

    this._expressionChangePlayback.play(index, changeHistory);
  }

  private updateModelValues(target: object, source: object): void {
    Type.walkObjectTopToBottom(
      source,
      (_, key, value) => {
        if (Type.isPlainObject(value)) {
          this.updateModelValues(target[key], value);
        } else {
          target[key] = source[key];
        }
      },
      false,
    );
  }
}
