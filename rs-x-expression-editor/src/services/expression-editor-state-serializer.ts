import {
    type IExpression,
    type IExpressionChangeHistory,
    type IExpressionFactory,
    RsXExpressionParserInjectionTokens,
} from '@rs-x/expression-parser';
import { InjectionContainer, type IObjectStorage, RsXCoreInjectionTokens } from '@rs-x/core';
import type { IExpressionEditorState } from '../models/expression-editor-state.interface';

const stateId = '1513bdf8-c3fc-4f74-ad4f-e670724fc625';

export interface ISerializedExpressionChangeHistory {
    expression: string; // expressionString of the node inside the expression tree
    value: unknown;
    oldValue: unknown;
}

export interface ISerializedExpressionInfo {
    name: string;
    expression: string; // root expressionString
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
    addingModel?: boolean;
    addingExpression?: boolean;
    selectedModelIndex?: number;
    modelsWithExpressions: ISerializedModelWithExpressions[];
}

export class ExpressionEdtitorStateSerializer {
    private readonly _objectStorage: IObjectStorage =
        InjectionContainer.get(RsXCoreInjectionTokens.IObjectStorage);

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
                            changeHistory: this.serializeHistory(expressionInfo.changeHistory ?? []),
                        };
                    }),
                };
            }),
        };

        return this._objectStorage.set(stateId, serializedState);
    }

    public async deserialize(): Promise<IExpressionEditorState> {
        const deserializeState =
            await this._objectStorage.get<ISerializedExpressionEditorState>(stateId);

        if (!deserializeState) {
            return {
                modelsWithExpressions: [],
            };
        }

        return {
            error: deserializeState.error,
            addingModel: deserializeState.addingModel,
            addingExpression: deserializeState.addingExpression,
            selectedModelIndex: deserializeState.selectedModelIndex,
            modelsWithExpressions: deserializeState.modelsWithExpressions.map((modelWithExpressions) => {
                const model = new Function(`return ${modelWithExpressions.modelString}`)();

                return {
    
                    name: modelWithExpressions.name,
                    model,
                    modelString: modelWithExpressions.modelString,
                    selectedExpressionIndex: modelWithExpressions.selectedExpressionIndex,
                    editingExpressionIndex: modelWithExpressions.editingExpressionIndex,
                    expressions: modelWithExpressions.expressions.map((exprInfo) => {
                        const rootExpression = this._expressionFactory.create(model, exprInfo.expression);

                        return {
                            name: exprInfo.name,
                            version: 0,
                            expression: rootExpression,
                            changeHistory: this.deserializeHistory(rootExpression, exprInfo.changeHistory ?? []),
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