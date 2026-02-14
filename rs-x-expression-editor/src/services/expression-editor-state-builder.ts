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

    public deleteExpression(model: object, indexToDelete: number | null): this {
        if (indexToDelete === null) {
            return this;
        }

        const modelIndex = this.getModelIndex(model);
        if (modelIndex === -1) {
            return this;
        }

        const current = this._state.modelsWithExpressions[modelIndex];

        if (
            indexToDelete < 0 ||
            indexToDelete >= current.expressions.length
        ) {
            return this;
        }

        const newExpressions = current.expressions.filter(
            (_, i) => i !== indexToDelete
        );

        let newSelectedIndex = current.selectedExpressionIndex;
        if (newExpressions.length === 0) {
            newSelectedIndex = null;
        } else if (current.selectedExpressionIndex === indexToDelete) {
            newSelectedIndex =
                indexToDelete > 0 ? indexToDelete - 1 : 0;
        } else if (
            current.selectedExpressionIndex !== null &&
            indexToDelete < current.selectedExpressionIndex
        ) {
            newSelectedIndex = current.selectedExpressionIndex - 1;
        }

        const modelsWithExpressions = [...this._state.modelsWithExpressions];

        modelsWithExpressions[modelIndex] = {
            ...current,
            expressions: newExpressions,
            selectedExpressionIndex: newSelectedIndex,
        };

        this._state = {
            ...this._state,
            modelsWithExpressions,
        };

        return this;
    }

    public selectExpression(model: object, selectedExpressionIndex: number | null): this {
        const modelIndex = this.getModelIndex(model);
        if (modelIndex === -1) {
            return this;
        }

        const current = this._state.modelsWithExpressions[modelIndex];
        if (current.selectedExpressionIndex === selectedExpressionIndex) {
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

    public editExpression(model: object, editingExpressionIndex: number | null): this {
        const modelIndex = this.getModelIndex(model);
        if (modelIndex === -1) {
            return this;
        }

        const current = this._state.modelsWithExpressions[modelIndex];

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

    public selectModel(model: object, selected: boolean): this {
        const index = this.getModelIndex(model);
        if (index === -1) {
            return this;
        }

        const oldModelsWithExpressions = this._state.modelsWithExpressions;
        if (oldModelsWithExpressions[index].selected === selected) {
            return this;
        }

        const modelsWithExpressions = oldModelsWithExpressions.map((m, i) => {
            const nextSelected = selected ? i === index : (i === index ? false : m.selected);
            return m.selected === nextSelected ? m : { ...m, selected: nextSelected };
        });

        this._state = { ...this._state, modelsWithExpressions };

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
        const modelsWithExpressions = [
            ...this._state.modelsWithExpressions,
            {
                name,
                model,
                modelString,
                selectedExpressionIndex: -1,
                editingExpressionIndex: -1,
                expressions: []
            }
        ];

        this._state = {
            ...this._state,
            modelsWithExpressions
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