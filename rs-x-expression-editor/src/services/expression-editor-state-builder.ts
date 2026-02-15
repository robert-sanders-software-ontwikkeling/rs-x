import { IExpression } from '@rs-x/expression-parser';
import { IExpressionEditorState } from '../models/expression-editor-state.interface';

export class ExpressionEditorStateBuilder {
    constructor(private _state: IExpressionEditorState) { }

    public get state(): IExpressionEditorState {
        return this._state
    }

    public setError(error: string): this {
        this._state = {
            ...this._state,
            error
        }

        return this;
    }

    public deleteModel(modelIndex: number): this {
        const models = this._state.modelsWithExpressions;

        if (
            modelIndex < 0 ||
            modelIndex >= models.length
        ) {
            return this;
        }

        const newModels = models.filter((_, index) => {
            return index !== modelIndex;
        });

        let newSelectedIndex = this._state.selectedModelIndex;

        if (newModels.length === 0) {
            newSelectedIndex = undefined;
        } else if (this._state.selectedModelIndex === modelIndex) {
            newSelectedIndex =
                modelIndex < newModels.length
                    ? modelIndex
                    : newModels.length - 1;
        } else if (
            this._state.selectedModelIndex !== undefined &&
            this._state.selectedModelIndex > modelIndex
        ) {
            newSelectedIndex = this._state.selectedModelIndex - 1;
        }

        this._state = {
            ...this._state,
            modelsWithExpressions: newModels,
            selectedModelIndex: newSelectedIndex
        };

        return this;
    }

    public deleteExpression(modelIndex: number, indexToDelete: number | null): this {
        if (indexToDelete === null) {
            return this;
        }


        const currentModel = this._state.modelsWithExpressions[modelIndex];
        if (!currentModel) {
            return this;
        }

        if (
            indexToDelete < 0 ||
            indexToDelete >= currentModel.expressions.length
        ) {
            return this;
        }

        const newExpressions = currentModel.expressions.filter(
            (_, i) => i !== indexToDelete
        );

        let newSelectedIndex = currentModel.selectedExpressionIndex;
        if (newExpressions.length === 0) {
            newSelectedIndex = null;
        } else if (currentModel.selectedExpressionIndex === indexToDelete) {
            newSelectedIndex =
                indexToDelete > 0 ? indexToDelete - 1 : 0;
        } else if (
            currentModel.selectedExpressionIndex !== null &&
            indexToDelete < currentModel.selectedExpressionIndex
        ) {
            newSelectedIndex = currentModel.selectedExpressionIndex - 1;
        }

        const modelsWithExpressions = [...this._state.modelsWithExpressions];

        modelsWithExpressions[modelIndex] = {
            ...currentModel,
            expressions: newExpressions,
            selectedExpressionIndex: newSelectedIndex,
        };

        this._state = {
            ...this._state,
            modelsWithExpressions,
        };

        return this;
    }

    public selectExpression(modelIndex: number, selectedExpressionIndex: number | null): this {
        const current = this._state.modelsWithExpressions[modelIndex];
        if (!current || current.selectedExpressionIndex === selectedExpressionIndex) {
            return this;
        }

        if (
            selectedExpressionIndex !== null &&
            (selectedExpressionIndex < 0 || selectedExpressionIndex >= current.expressions.length)
        ) {
            return this;
        }

        const modelsWithExpressions = [...this._state.modelsWithExpressions];
        modelsWithExpressions[modelIndex] = {
            ...modelsWithExpressions[modelIndex],
            selectedExpressionIndex,
        };

        this._state = { ...this._state, modelsWithExpressions };
        return this;
    }

    public editExpression(modelIndex: number, editingExpressionIndex: number | null): this {
        const current = this._state.modelsWithExpressions[modelIndex];

        if(!current) {
            return this;
        }

        if (
            editingExpressionIndex !== null &&
            (editingExpressionIndex < 0 || editingExpressionIndex >= current.expressions.length)
        ) {
            return this;
        }

        if (
            current.editingExpressionIndex === editingExpressionIndex &&
            current.selectedExpressionIndex === editingExpressionIndex
        ) {
            return this;
        }

        const modelsWithExpressions = [...this._state.modelsWithExpressions];
        modelsWithExpressions[modelIndex] = {
            ...current,
            editingExpressionIndex,
            selectedExpressionIndex: editingExpressionIndex,
        };

        this._state = { ...this._state, modelsWithExpressions };
        return this;
    }

    public selectModel(modelIndex: number): this {
        if (
            modelIndex < 0 ||
            modelIndex >= this._state.modelsWithExpressions.length
        ) {
            return this;
        }

        if (this._state.selectedModelIndex === modelIndex) {
            return this;
        }

        this._state = {
            ...this._state,
            selectedModelIndex: modelIndex
        };

        return this;
    }

    public setAddingModel(addingModel: boolean): this {
        this._state = {
            ...this._state,
            addingModel
        }
        return this;
    }

    public setAddingExpression(addingExpression: boolean): this {
        this._state = {
            ...this._state,
            addingExpression
        };

        return this;
    }

    public addModel(name: string, modelString: string, model: object): this {
        const newModel = {
            name,
            model,
            modelString,
            selectedExpressionIndex: null,
            editingExpressionIndex: null,
            expressions: []
        };

        const modelsWithExpressions = [
            ...this._state.modelsWithExpressions,
            newModel
        ];

        const newIndex = modelsWithExpressions.length - 1;

        this._state = {
            ...this._state,
            modelsWithExpressions,
            selectedModelIndex: newIndex
        };

        return this;
    }

    public addExpression(model: object, name: string, expression: IExpression): this {
        const index = this.getModelIndex(model);
        if (index === -1) {
            return this;
        }

        const modelsWithExpressions = [...this._state.modelsWithExpressions]
        modelsWithExpressions[index] = {
            ...modelsWithExpressions[index],
            expressions: [...modelsWithExpressions[index].expressions, expression],
        };

        this._state = {
            ...this._state,
            modelsWithExpressions
        };

        return this
    }

    private getModelIndex(model: object): number {
        return this._state.modelsWithExpressions.findIndex(modelWithExpressions => modelWithExpressions.model === model);
    }
}