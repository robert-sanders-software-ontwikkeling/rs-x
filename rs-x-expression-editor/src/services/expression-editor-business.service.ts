import { InjectionContainer, Type } from '@rs-x/core';
import {
    type IExpression,
    type IExpressionChangeHistory,
    type IExpressionChangePlayback,
    type IExpressionChangeTrackerManager,
    type IExpressionChangeTransactionManager,
    RsXExpressionParserInjectionTokens,
} from '@rs-x/expression-parser';
import { catchError, finalize, skip, take, throwError, timeout } from 'rxjs';

import { ModelExpressionsFactory } from './model-expressions.factory';

import { rxjsScope } from './rxjs-scope';
import { ModelEvaluator } from './model-evaluator';



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
            RsXExpressionParserInjectionTokens.IExpressionChangePlayback
        );
        this._expressionChangeTrackerManager = InjectionContainer.get(
            RsXExpressionParserInjectionTokens.IExpressionChangeTrackerManager
        );
        this._expressionChangeTransactionManager = InjectionContainer.get(
            RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager
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

    public compileExpression(model: object, expressionString: string): CompileExpressionResult {
        const r = ModelExpressionsFactory.getInstance().create(model, [expressionString])[0];
        return {
            expressionString: r.expressionString,
            expression: r.expression,
            error: r.error,
        };
    }

    public compileExpressions(model: object, expressionStrings: string[]): CompileExpressionResult[] {
        const results = ModelExpressionsFactory.getInstance().create(model, expressionStrings);
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

        const tracker = this._expressionChangeTrackerManager.create(expression).instance;
        tracker.pause();

        expression.changed
            .pipe(
                skip(1), // current value is emitted on subscribe
                take(1),
                timeout({ first: 10000 }),
                catchError((e) => {
                    return throwError(() => e);
                }),
                finalize(() => {
                    tracker.continue();
                })
            )
            .subscribe({
                error: (e) => {
                    console.error('Replay pipeline failed', e);
                },
            });

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
            false
        );
    }
}