import type { IExpressionChangeHistory, IExpression } from '@rs-x/expression-parser';
import { NON_EDITITING_STATE, type IExpressionEditorState } from '../models/expression-editor-state.interface';
import type { IExpressionInfo } from '../models/expression-info.interface';
import type { CompileExpressionResult } from './expression-editor-business.service';
import type { IModelWithExpressions } from '../models/model-with-expressions.interface';

export class ExpressionEditorStateBuilder {
    public constructor(private _state: IExpressionEditorState) { }

    public get state(): IExpressionEditorState {
        return this._state;
    }

    public setError(error: string): this {
        this._state = {
            ...this._state,
            error,
        };
        return this;
    }

    public setTreeZoomPercent(treeZoomPercent: number): this {
        this._state = {
            ...this._state,
            treeZoomPercent,
        };
        return this;
    }

    public setShowExpressionTreeView(showExpressionTreeView: boolean): this {
        this._state = {
            ...this._state,
            showExpressionTreeView,
        };
        return this;
    }

    public setSelectedChangeHistoryIndex(
        modelIndex: number,
        expressionIndex: number,
        selectedChangeHistoryIndex: number,
        treeHighlight: IExpressionChangeHistory[]
    ): this {
        const model = this._state.modelsWithExpressions[modelIndex];
        if (!model) {
            return this;
        }

        const expressionInfo = model.expressions[expressionIndex];
        if (!expressionInfo) {
            return this;
        }

        const changeHistoryLength = (expressionInfo.changeHistory ?? []).length;

        // Clamp selection; allow -1 when no history
        let clamped = selectedChangeHistoryIndex;
        if (changeHistoryLength <= 0) {
            clamped = -1;
        } else {
            clamped = Math.max(0, Math.min(selectedChangeHistoryIndex, changeHistoryLength - 1));
        }

        // If no real change, still allow highlight update (because user may click same batch)
        const modelsWithExpressions = [...this._state.modelsWithExpressions];
        const expressions = [...model.expressions];

        const prev = expressions[expressionIndex];

        expressions[expressionIndex] = {
            ...prev,
            selecteChangeHistoryIndex: clamped,
            treeHighlight,
            treeHighlightVersion: (prev.treeHighlightVersion ?? 0) + 1,
        };

        modelsWithExpressions[modelIndex] = {
            ...model,
            version: (model.version ?? 0) + 1,
            expressions,
        };

        this._state = {
            ...this._state,
            modelsWithExpressions,
        };

        return this;
    }

    public bumpModelVersion(modelIndex: number): this {
        const model = this._state.modelsWithExpressions[modelIndex];
        if (!model) {
            return this;
        }

        const modelsWithExpressions = [...this._state.modelsWithExpressions];

        modelsWithExpressions[modelIndex] = {
            ...model,
            version: (model.version ?? 0) + 1,
            expressions: model.expressions.map((expr) => {
                return {
                    ...expr,
                    treeHighlightVersion: (expr.treeHighlightVersion ?? 0) + 1,
                };
            }),
        };

        this._state = {
            ...this._state,
            modelsWithExpressions,
        };

        return this;
    }

    public selectModel(modelIndex: number): this {
        if (!this._state.modelsWithExpressions[modelIndex]) {
            return this;
        }

        if (this._state.selectedModelIndex === modelIndex) {
            return this;
        }

        this._state = {
            ...this._state,
            ...NON_EDITITING_STATE,
            selectedModelIndex: modelIndex,
        };

        return this;
    }

    public setAddingModel(addingModel: boolean): this {
        this._state = {
            ...this._state,
            ...NON_EDITITING_STATE,
            addingModel,
        };
        return this;
    }

    public setEditingModelIndex(modelIndex: number): this {
        const clampedEditingModelIndex =
            modelIndex >= 0 && modelIndex < this._state.modelsWithExpressions.length ? modelIndex : -1;

        this._state = {
            ...this._state,
            ...NON_EDITITING_STATE,
            selectedModelIndex: clampedEditingModelIndex === -1 ? this._state.selectedModelIndex : modelIndex,
            editingModelIndex: clampedEditingModelIndex,
        };

        return this;
    }

    public setAddingExpression(modelIndex: number, addingExpression: boolean): this {
        this._state = {
            ...this._state,
            ...NON_EDITITING_STATE,
            selectedModelIndex: modelIndex,
            addingExpression,
        };

        return this;
    }

    public setEditingExpressionIndex(modelIndex: number, editingExpressionIndex: number): this {
        const current = this._state.modelsWithExpressions[modelIndex];

        if (!current) {
            return this;
        }

        const clamped =
            editingExpressionIndex >= 0 && editingExpressionIndex < current.expressions.length
                ? editingExpressionIndex
                : -1;

        let modelsWithExpressions = this._state.modelsWithExpressions;
        if (editingExpressionIndex !== -1) {
            modelsWithExpressions = [...modelsWithExpressions];
            modelsWithExpressions[modelIndex] = {
                ...current,
                selectedExpressionIndex: clamped,
            };
        }

        this._state = {
            ...this._state,
            ...NON_EDITITING_STATE,
            selectedModelIndex: modelIndex,
            editingExpressionIndex: clamped,
            modelsWithExpressions,
        };

        return this;
    }

    public selectExpression(modelIndex: number, expressionIndex: number): this {
        const modelWithExpressions = this._state.modelsWithExpressions[modelIndex];
        if (!modelWithExpressions || modelWithExpressions.selectedExpressionIndex === expressionIndex) {
            return this;
        }

        if (expressionIndex < 0 || expressionIndex >= modelWithExpressions.expressions.length) {
            return this;
        }

        const modelsWithExpressions = [...this._state.modelsWithExpressions];
        modelsWithExpressions[modelIndex] = {
            ...modelsWithExpressions[modelIndex],
            selectedExpressionIndex: expressionIndex,
        };

        this._state = {
            ...this._state,
            ...NON_EDITITING_STATE,
            selectedModelIndex: modelIndex,
            modelsWithExpressions,
        };

        return this;
    }

    public setTreeHighlight(modelIndex: number, expressionIndex: number, treeHighlight: IExpressionChangeHistory[]): this {
        const modelWithExpressions = this._state.modelsWithExpressions[modelIndex];
        if (!modelWithExpressions) {
            return this;
        }

        if (expressionIndex < 0 || expressionIndex >= modelWithExpressions.expressions.length) {
            return this;
        }

        const modelsWithExpressions = [...this._state.modelsWithExpressions];
        const expressions = [...modelsWithExpressions[modelIndex].expressions];

        const prevExpressionInfo = expressions[expressionIndex];
        if (!prevExpressionInfo) {
            return this;
        }

        const updatedExpressionInfo: IExpressionInfo = {
            ...prevExpressionInfo,
            treeHighlight,
            treeHighlightVersion: (prevExpressionInfo.treeHighlightVersion ?? 0) + 1,
        };

        expressions[expressionIndex] = updatedExpressionInfo;

        modelsWithExpressions[modelIndex] = {
            ...modelsWithExpressions[modelIndex],
            expressions,
        };

        this._state = {
            ...this._state,
            modelsWithExpressions,
        };

        return this;
    }

    public setExpressionIsDeleting(modelIndex: number, expressionIndex: number, isDeleting: boolean): this {
        const modelWithExpressions = this._state.modelsWithExpressions[modelIndex];
        if (!modelWithExpressions) {
            return this;
        }

        if (expressionIndex < 0 || expressionIndex >= modelWithExpressions.expressions.length) {
            return this;
        }

        const modelsWithExpressions = [...this._state.modelsWithExpressions];
        const expressions = [...modelsWithExpressions[modelIndex].expressions];

        expressions[expressionIndex] = {
            ...expressions[expressionIndex],
            isDeleting,
        };

        modelsWithExpressions[modelIndex] = {
            ...modelsWithExpressions[modelIndex],
            expressions,
            selectedExpressionIndex: expressionIndex,
        };

        this._state = {
            ...this._state,
            selectedModelIndex: modelIndex,
            modelsWithExpressions,
        };

        return this;
    }

    public setModelIsDeleting(modelIndex: number, isDeleting: boolean): this {
        const model = this._state.modelsWithExpressions[modelIndex];
        if (!model) {
            return this;
        }

        const modelsWithExpressions = [...this._state.modelsWithExpressions];

        modelsWithExpressions[modelIndex] = {
            ...model,
            isDeleting,
        };

        this._state = {
            ...this._state,
            modelsWithExpressions,
        };

        return this;
    }

    public addModel(args: { name: string; editorModelString: string; model: object }): this {
        const { name, editorModelString, model } = args;

        const newModel: IModelWithExpressions = {
            name,
            model,
            version: 0,
            editorModelString,
            isDeleting: false,
            selectedExpressionIndex: -1,
            expressions: [],
        };

        const modelsWithExpressions = [...this._state.modelsWithExpressions, newModel];
        const newIndex = modelsWithExpressions.length - 1;

        this._state = {
            ...this._state,
            ...NON_EDITITING_STATE,
            modelsWithExpressions,
            selectedModelIndex: newIndex,
        };

        return this;
    }

    public updateModel(args: {
        modelIndex: number;
        name: string;
        editorModelString: string;
        model: object;
        compileResults: CompileExpressionResult[];
    }): this {
        const { modelIndex, name, editorModelString, model, compileResults } = args;

        const modelInfo = this._state.modelsWithExpressions[modelIndex];
        if (!modelInfo) {
            return this;
        }

        const modelsWithExpressions = [...this._state.modelsWithExpressions];
        const expressions = [...modelInfo.expressions];

        for (let i = 0; i < expressions.length; i++) {
            const r = compileResults[i];
            const prev = expressions[i];

            expressions[i] = {
                ...prev,
                expression: r?.expression,
                editorExpressionString: r?.expressionString ?? prev.editorExpressionString,
                changeHistory: [],
                selecteChangeHistoryIndex: -1,
                error: r?.error ?? '',
                treeHighlight: [],
                treeHighlightVersion: (prev.treeHighlightVersion ?? 0) + 1,
                version: (prev.version ?? 0) + 1,
            };
        }

        modelsWithExpressions[modelIndex] = {
            ...modelInfo,
            editorModelString,
            model,
            name,
            expressions,
            version: (modelInfo.version ?? 0) + 1,
        };

        this._state = {
            ...this._state,
            ...NON_EDITITING_STATE,
            selectedModelIndex: modelIndex,
            modelsWithExpressions,
        };

        return this;
    }

    public addExpression(args: {
        modelIndex: number;
        name: string;
        expressionString: string;
        compileResult: CompileExpressionResult;
    }): this {
        const { modelIndex, name, expressionString, compileResult } = args;

        const model = this._state.modelsWithExpressions[modelIndex];
        if (!model) {
            return this;
        }

        const newExpressionInfo: IExpressionInfo = {
            version: 0,
            expression: compileResult.expression,
            editorExpressionString: expressionString,
            isDeleting: false,
            error: compileResult.error ?? '',
            name,
            treeHighlight: [],
            treeHighlightVersion: 0,
            selecteChangeHistoryIndex: -1,
            changeHistory: [],
        };

        const modelsWithExpressions = [...this._state.modelsWithExpressions];
        modelsWithExpressions[modelIndex] = {
            ...modelsWithExpressions[modelIndex],
            selectedExpressionIndex: modelsWithExpressions[modelIndex].expressions.length,
            expressions: [...modelsWithExpressions[modelIndex].expressions, newExpressionInfo],
        };

        this._state = {
            ...this._state,
            ...NON_EDITITING_STATE,
            selectedModelIndex: modelIndex,
            modelsWithExpressions,
        };

        return this;
    }

    public updateExpression(args: {
        modelIndex: number;
        expressionIndex: number;
        name: string;
        expressionString: string;
        compileResult: CompileExpressionResult;
    }): this {
        const { modelIndex, expressionIndex, name, expressionString, compileResult } = args;

        const modelInfo = this._state.modelsWithExpressions[modelIndex];
        if (!modelInfo) {
            return this;
        }

        const expressionInfo = modelInfo.expressions[expressionIndex];
        if (!expressionInfo) {
            return this;
        }

        const modelsWithExpressions = [...this._state.modelsWithExpressions];
        const expressions = [...modelInfo.expressions];

        expressions[expressionIndex] = {
            ...expressionInfo,
            editorExpressionString: expressionString,
            changeHistory: [],
            version: (expressionInfo.version ?? 0) + 1,
            error: compileResult.error ?? '',
            name,
            treeHighlight: [],
            treeHighlightVersion: (expressionInfo.treeHighlightVersion ?? 0) + 1,
            expression: compileResult.expression,
            selecteChangeHistoryIndex: -1,
        };

        modelsWithExpressions[modelIndex] = {
            ...modelsWithExpressions[modelIndex],
            expressions,
        };

        this._state = {
            ...this._state,
            ...NON_EDITITING_STATE,
            selectedModelIndex: modelIndex,
            modelsWithExpressions,
        };

        return this;
    }

    public setExpressionHistory(args: {
        modelIndex: number;
        expressionIndex: number;
        history: IExpressionChangeHistory[][];
    }): this {
        const { modelIndex, expressionIndex, history } = args;

        if (modelIndex < 0 || modelIndex >= this._state.modelsWithExpressions.length) {
            return this;
        }

        const model = this._state.modelsWithExpressions[modelIndex];
        if (!model) {
            return this;
        }

        if (expressionIndex < 0 || expressionIndex >= model.expressions.length) {
            return this;
        }

        const clonedHistory: IExpressionChangeHistory[][] = history.map((batch) => {
            return [...batch];
        });

        const modelsWithExpressions = [...this._state.modelsWithExpressions];
        const expressions = [...model.expressions];

        const previousExpressionInfo = expressions[expressionIndex];
        if (!previousExpressionInfo) {
            return this;
        }

        const historyLength = clonedHistory.length;

        let selectedChangeHistoryIndex = previousExpressionInfo.selecteChangeHistoryIndex;

        if (historyLength === 0) {
            selectedChangeHistoryIndex = -1;
        } else {
            if (!Number.isFinite(selectedChangeHistoryIndex)) {
                selectedChangeHistoryIndex = historyLength - 1;
            }

            if (selectedChangeHistoryIndex < 0) {
                selectedChangeHistoryIndex = 0;
            }

            if (selectedChangeHistoryIndex >= historyLength) {
                selectedChangeHistoryIndex = historyLength - 1;
            }
        }

        const updatedExpressionInfo: IExpressionInfo = {
            ...previousExpressionInfo,
            changeHistory: clonedHistory,
            selecteChangeHistoryIndex: selectedChangeHistoryIndex,
        };

        expressions[expressionIndex] = updatedExpressionInfo;

        modelsWithExpressions[modelIndex] = {
            ...model,
            expressions,
        };

        this._state = {
            ...this._state,
            modelsWithExpressions,
        };

        return this;
    }

    public deleteExpression(modelIndex: number, expressionIndex: number): this {
        const currentModel = this._state.modelsWithExpressions[modelIndex];
        if (!currentModel) {
            return this;
        }

        if (!currentModel.expressions[expressionIndex]) {
            return this;
        }

        const newExpressions = currentModel.expressions.filter((_, i) => i !== expressionIndex);

        let newSelectedIndex = currentModel.selectedExpressionIndex;
        if (newExpressions.length === 0) {
            newSelectedIndex = -1;
        } else if (currentModel.selectedExpressionIndex === expressionIndex) {
            newSelectedIndex = expressionIndex > 0 ? expressionIndex - 1 : 0;
        } else if (expressionIndex < currentModel.selectedExpressionIndex) {
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

    public deleteModel(modelIndex: number): this {
        const modelsWithExpressions = [...this._state.modelsWithExpressions];
        const model = modelsWithExpressions[modelIndex];
        if (!model) {
            return this;
        }

        const newSelectedIndex = this.getNewIndexAfterDelete(
            this._state.selectedModelIndex,
            modelIndex,
            modelsWithExpressions
        );

        modelsWithExpressions.splice(modelIndex, 1);

        this._state = {
            ...this._state,
            selectedModelIndex: newSelectedIndex,
            modelsWithExpressions,
        };

        return this;
    }

    private getNewIndexAfterDelete<T>(selectedIndex: number, deletedIndex: number, itemsBeforeDelete: T[]): number {
        const nextLength = itemsBeforeDelete.length - 1;

        if (nextLength <= 0) {
            return -1;
        }

        if (selectedIndex < 0) {
            return -1;
        }

        if (selectedIndex === deletedIndex) {
            const deletedWasLast = deletedIndex >= nextLength;
            return deletedWasLast ? nextLength - 1 : deletedIndex;
        }

        if (deletedIndex < selectedIndex) {
            return selectedIndex - 1;
        }

        return selectedIndex;
    }
}