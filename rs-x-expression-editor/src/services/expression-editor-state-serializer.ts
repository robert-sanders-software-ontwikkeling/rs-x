import {
    type IExpressionChangeHistory,
    type IExpression,
    type IExpressionFactory,
    RsXExpressionParserInjectionTokens,
} from '@rs-x/expression-parser';
import { InjectionContainer, type IObjectStorage, RsXCoreInjectionTokens } from '@rs-x/core';
import type { IExpressionEditorState } from '../models/expression-editor-state.interface';
import type { IExpressionChangePlayback } from '@rs-x/expression-parser';
import { take } from 'rxjs/operators';

const stateId = '1513bdf8-c3fc-4f74-ad4f-e670724fc625';

export interface ISerializedExpressionChangeHistory {
    expression: string; // expressionString of the node inside the expression tree
    value: unknown;
    oldValue: unknown;
}

export interface ISerializedExpressionInfo {
    name: string;
    expression: string;
    selecteChangeHistoryIndex: number;
    changeHistory: ISerializedExpressionChangeHistory[][];
}

interface ISerializedModelWithExpressions {
    name: string;
    modelString: string;
    selectedExpressionIndex: number | null;
    editingExpressionIndex: number | null;
    expressions: ISerializedExpressionInfo[];
}

interface ISerializedExpressionEditorState {
    error?: string;
    treeZoomPercent?: number;
    addingModel?: boolean;
    addingExpression?: boolean;
    selectedModelIndex?: number;
    modelsWithExpressions: ISerializedModelWithExpressions[];
}

function isValidSelectionIndex(args: { index: number; historyLength: number }): boolean {
    const { index, historyLength } = args;
    return Number.isFinite(index) && index >= 0 && index < historyLength;
}

export class ExpressionEdtitorStateSerializer {
    private readonly _objectStorage: IObjectStorage =
        InjectionContainer.get(RsXCoreInjectionTokens.IObjectStorage);

    private readonly _expressionChangePlayback: IExpressionChangePlayback =
        InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionChangePlayback);

    private readonly _expressionFactory: IExpressionFactory =
        InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionFactory);

    private static _instance: ExpressionEdtitorStateSerializer;

    private constructor() { }

    public static getInstance(): ExpressionEdtitorStateSerializer {
        if (!this._instance) {
            this._instance = new ExpressionEdtitorStateSerializer();
        }
        return this._instance;
    }

    public async serialize(state: IExpressionEditorState): Promise<void> {
        const serializedState: ISerializedExpressionEditorState = {
            error: state.error,
            treeZoomPercent:  state.treeZoomPercent,
            addingExpression: state.addingExpression,
            addingModel: state.addingModel,
            selectedModelIndex: state.selectedModelIndex,
            modelsWithExpressions: state.modelsWithExpressions.map((modelWithExpressions) => {
                return {
                    name: modelWithExpressions.name,
                    modelString: modelWithExpressions.modelString,
                    selectedExpressionIndex: modelWithExpressions.selectedExpressionIndex,
                    editingExpressionIndex: modelWithExpressions.editingExpressionIndex,
                    expressions: modelWithExpressions.expressions.map((expressionInfo) => {
                        return {
                            name: expressionInfo.name,
                            expression: expressionInfo.expression.expressionString,
                            selecteChangeHistoryIndex: expressionInfo.selecteChangeHistoryIndex,
                            changeHistory: this.serializeHistory(expressionInfo.changeHistory ?? []),
                        };
                    }),
                };
            }),
        };

        await this._objectStorage.set(stateId, serializedState);
    }

    public async deserialize(): Promise<IExpressionEditorState> {
        const deserializeState =
            await this._objectStorage.get<ISerializedExpressionEditorState>(stateId);

        if (!deserializeState) {
            return { 

                treeZoomPercent: 100,
                modelsWithExpressions: [] };
        }

        return {
            error: deserializeState.error,
            treeZoomPercent: deserializeState.treeZoomPercent ?? 100,
            addingModel: deserializeState.addingModel,
            addingExpression: deserializeState.addingExpression,
            selectedModelIndex: deserializeState.selectedModelIndex,
            modelsWithExpressions: deserializeState.modelsWithExpressions.map((modelWithExpressions) => {
                // NOTE: executing user-provided modelString is dangerous; assuming you control input.
                const model = new Function(`return ${modelWithExpressions.modelString}`)();

                const selectedExpressionIndex = modelWithExpressions.selectedExpressionIndex;

                return {
                    name: modelWithExpressions.name,
                    model,
                    modelString: modelWithExpressions.modelString,
                    selectedExpressionIndex,
                    editingExpressionIndex: modelWithExpressions.editingExpressionIndex,
                    expressions: modelWithExpressions.expressions.map((exprInfo, index) => {
                        const rootExpression = this._expressionFactory.create(model, exprInfo.expression);

                        const changeHistory = this.deserializeHistory(
                            rootExpression,
                            exprInfo.changeHistory ?? []
                        );

                        // ✅ Bullet-proof: only auto-play for the currently selected expression,
                        // and only if selection index is valid and history is non-empty.
                        const shouldAutoPlay =
                            selectedExpressionIndex !== null &&
                            index === selectedExpressionIndex &&
                            isValidSelectionIndex({
                                index: exprInfo.selecteChangeHistoryIndex,
                                historyLength: changeHistory.length,
                            });

                        if (shouldAutoPlay) {
                            // Wait until expression is initialized (first changed emit).
                            // take(1) auto-unsubscribes, so no leaks / no duplicate plays.
                            rootExpression.changed
                                .pipe(take(1))
                                .subscribe(() => {
                                    try {
                                        this._expressionChangePlayback.play(
                                            exprInfo.selecteChangeHistoryIndex,
                                            changeHistory
                                        );
                                    } catch {
                                        // swallow: we don't want deserialize to crash the whole app
                                        // optionally log
                                    }
                                });
                        }

                        return {
                            name: exprInfo.name,
                            version: 0,
                            expression: rootExpression,
                            selecteChangeHistoryIndex: exprInfo.selecteChangeHistoryIndex,
                            changeHistory,
                        };
                    }),
                };
            }),
        };
    }

    private serializeHistory(
        history: IExpressionChangeHistory[][]
    ): ISerializedExpressionChangeHistory[][] {
        return history.map((batch) => {
            return batch.map((h) => {
                return {
                    expression: h.expression.expressionString,
                    value: this.cloneValue(h.value),
                    oldValue: this.cloneValue(h.oldValue),
                };
            });
        });
    }

    private deserializeHistory(
        rootExpression: IExpression,
        history: ISerializedExpressionChangeHistory[][]
    ): IExpressionChangeHistory[][] {
        const index = this.buildExpressionIndex(rootExpression);

        return history.map((batch) => {
            return batch.map((h) => {
                const expr = index.get(h.expression);

                if (!expr) {
                    throw new Error(`Could not find expression node for history entry: '${h.expression}'`);
                }

                return {
                    expression: expr,
                    value: h.value,
                    oldValue: h.oldValue,
                };
            });
        });
    }

    private buildExpressionIndex(root: IExpression): Map<string, IExpression> {
        const index = new Map<string, IExpression>();
        const stack: IExpression[] = [root];

        while (stack.length) {
            const node = stack.pop()!;
            index.set(node.expressionString, node);

            const children = node.childExpressions ?? [];
            for (let i = children.length - 1; i >= 0; i--) {
                stack.push(children[i]!);
            }
        }

        return index;
    }

    private cloneValue(value: unknown): unknown {
        try {
            if (typeof structuredClone === 'function') {
                return structuredClone(value);
            }
            return value;
        } catch {
            return value;
        }
    }
}