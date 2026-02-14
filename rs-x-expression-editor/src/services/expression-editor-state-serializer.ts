import { IExpressionFactory, RsXExpressionParserInjectionTokens } from '@rs-x/expression-parser';
import { InjectionContainer, IObjectStorage, RsXCoreInjectionTokens } from '@rs-x/core';
import { IExpressionEditorState } from '../models/expression-editor-state.interface';

const stateId = '1513bdf8-c3fc-4f74-ad4f-e670724fc625';

interface ISerializedModelWithExpressions {
    name: string;
    modelString: string;
    selected?: boolean;
    selectedExpressionIndex: number | null;
    editingExpressionIndex: number | null;
    expressions: string[];
}

interface ISerializedExpressionEditorState {
    modelsWithExpressions: ISerializedModelWithExpressions[]
}

export class ExpressionEdtitorStateSerializer {
    private readonly _objectStorage: IObjectStorage = InjectionContainer.get(RsXCoreInjectionTokens.IObjectStorage);
    private readonly _expressionFactory: IExpressionFactory = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionFactory);
    private static _instance: ExpressionEdtitorStateSerializer

    private constructor() { }

    public static getInstance(): ExpressionEdtitorStateSerializer {
        if (!this._instance) {
            this._instance = new ExpressionEdtitorStateSerializer();
        }
        return this._instance;
    }

    public async serialize(state: IExpressionEditorState): Promise<void> {
        const serializedState: ISerializedExpressionEditorState = {
            modelsWithExpressions: state.modelsWithExpressions.map(modelWithExpressions => ({
                selected: modelWithExpressions.selected,
                selectedExpressionIndex: modelWithExpressions.selectedExpressionIndex,
                editingExpressionIndex: modelWithExpressions.editingExpressionIndex,
                name: modelWithExpressions.name,
                modelString: modelWithExpressions.modelString,
                expressions: modelWithExpressions.expressions.map(expression => expression.expressionString)
            }))
        }
        return this._objectStorage.set(stateId, serializedState);
    }

    public async deserialize(): Promise<IExpressionEditorState> {
        const deserializeState = await this._objectStorage.get<ISerializedExpressionEditorState>(stateId);

        if (!deserializeState) {
            return {
                modelsWithExpressions: []
            };
        }

        return {
            modelsWithExpressions: deserializeState.modelsWithExpressions.map((modelWithExpressions) => {

                const model = new Function(`return ${modelWithExpressions.modelString}`)();
                return {
                    name: modelWithExpressions.name,
                    model,
                    modelString: modelWithExpressions.modelString,
                    selectedExpressionIndex: modelWithExpressions.selectedExpressionIndex,
                    editingExpressionIndex:  modelWithExpressions.editingExpressionIndex,
                    expressions: modelWithExpressions.expressions.map(expression => this._expressionFactory.create(model, expression))
                }
            })
        };
    }
}