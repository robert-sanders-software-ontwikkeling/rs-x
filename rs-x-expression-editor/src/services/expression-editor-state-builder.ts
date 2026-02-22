import { IExpressionChangeTransactionManager, RsXExpressionParserInjectionTokens } from '@rs-x/expression-parser';
import { catchError, finalize, skip, take, throwError, timeout } from 'rxjs';
import { InjectionContainer, Type } from '../../../rs-x-core/lib';
import { IExpressionChangePlayback } from '../../../rs-x-expression-parser/lib/expression-change-playback/expression-change-playback.interface';
import { IExpressionChangeHistory, IExpressionChangeTrackerManager } from '../../../rs-x-expression-parser/lib/expression-change-tracker';
import { IExpressionEditorState, NON_EDITITING_STATE } from '../models/expression-editor-state.interface';
import { IExpressionInfo } from '../models/expression-info.interface';
import { IModelWithExpressions } from '../models/model-with-expressions.interface';
import { ModelExpressionsFactory } from './model-expressions.factory';



export class ExpressionEditorStateBuilder {
    private readonly _expressionChangePlayback: IExpressionChangePlayback;
    private readonly _expressionChangeTrackerManager: IExpressionChangeTrackerManager
    private readonly _expressionChangeTransactionManager: IExpressionChangeTransactionManager;


    constructor(private _state: IExpressionEditorState) {
        this._expressionChangePlayback = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionChangePlayback);
        this._expressionChangeTrackerManager = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionChangeTrackerManager);
        this._expressionChangeTransactionManager = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager);
    }

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

    public setTreeZoomPercent(treeZoomPercent: number): this {

        this._state = {
            ...this._state,
            treeZoomPercent
        }

        return this;
    }

    public setShowExpressionTreeView(showExpressionTreeView: boolean): this {
        this._state = {
            ...this._state,
            showExpressionTreeView
        }

        return this;
    }

    public setTreeHighlight(
        modelIndex: number,
        expressionIndex: number,
        treeHighlight: IExpressionChangeHistory[]
    ): this {
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


        if (
            expressionIndex !== null &&
            (expressionIndex < 0 || expressionIndex >= modelWithExpressions.expressions.length)
        ) {
            return this;
        }


        const modelsWithExpressions = [...this._state.modelsWithExpressions];

        const expressions = [...modelsWithExpressions[modelIndex].expressions];

        expressions[expressionIndex] = {
            ...expressions[expressionIndex],
            isDeleting,
        }

        modelsWithExpressions[modelIndex] = {
            ...modelsWithExpressions[modelIndex],
            expressions,
            selectedExpressionIndex: expressionIndex
        };



        this._state = {
            ...this._state,
            selectedModelIndex: modelIndex,
            modelsWithExpressions
        };

        return this;
    }

    public deleteExpression(modelIndex: number, expressionIndex: number): this {
        if (expressionIndex === null) {
            return this;
        }

        const currentModel = this._state.modelsWithExpressions[modelIndex];
        if (!currentModel) {
            return this;
        }

        if (!currentModel.expressions[expressionIndex]) {
            return this;
        }

        const newExpressions = currentModel.expressions.filter(
            (_, i) => i !== expressionIndex
        );

        let newSelectedIndex = currentModel.selectedExpressionIndex;
        if (newExpressions.length === 0) {
            newSelectedIndex = -1;
        } else if (currentModel.selectedExpressionIndex === expressionIndex) {
            newSelectedIndex =
                expressionIndex > 0 ? expressionIndex - 1 : 0;
        } else if (
            currentModel.selectedExpressionIndex !== null &&
            expressionIndex < currentModel.selectedExpressionIndex
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

    public selectExpression(modelIndex: number, expressionIndex: number): this {
        const modelWithExpressions = this._state.modelsWithExpressions[modelIndex];
        if (!modelWithExpressions || modelWithExpressions.selectedExpressionIndex === expressionIndex) {
            return this;
        }

        if (
            expressionIndex !== null &&
            (expressionIndex < 0 || expressionIndex >= modelWithExpressions.expressions.length)
        ) {
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
            modelsWithExpressions
        };
        return this;
    }

    public setEditingExpressionIndex(modelIndex: number, editingExpressionIndex: number): this {
        const current = this._state.modelsWithExpressions[modelIndex];

        if (!current) {
            return this;
        }

        const clampedEditingExpressionIndex = editingExpressionIndex >= 0 && editingExpressionIndex < current.expressions.length
            ? editingExpressionIndex
            : -1;


        let modelsWithExpressions = this._state.modelsWithExpressions;
        if (editingExpressionIndex !== -1) {
            modelsWithExpressions = [...modelsWithExpressions];
            modelsWithExpressions[modelIndex] = {
                ...current,
                selectedExpressionIndex: clampedEditingExpressionIndex,
            };
        }


        this._state = {
            ...this._state,
            ...NON_EDITITING_STATE,
            selectedModelIndex: modelIndex,
            editingExpressionIndex: clampedEditingExpressionIndex,
            modelsWithExpressions
        };
        return this;
    }


    public setModel(modelIndex: number, model: object): this {
        const currentModel = this._state.modelsWithExpressions[modelIndex];

        if (!currentModel) {
            return this;
        }

        this._expressionChangeTransactionManager.suspend();
        try {
            this.updateModelValues(currentModel.model, model);
        } finally {
            this._expressionChangeTransactionManager.continue();
        }

        const modelsWithExpressions = [...this._state.modelsWithExpressions];

        const updatedModel = {
            ...currentModel,
            version: (currentModel.version ?? 0) + 1,
            expressions: currentModel.expressions.map((exprInfo) => {
                return {
                    ...exprInfo,
                    treeHighlightVersion: (exprInfo.treeHighlightVersion ?? 0) + 1
                };
            })
        };

        modelsWithExpressions[modelIndex] = updatedModel;

        this._state = {
            ...this._state,
            modelsWithExpressions
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
            addingModel
        }
        return this;
    }

    public setEditingModelIndex(modelIndex: number): this {
        const clampedEditingModelIndex = modelIndex >= 0 && modelIndex < this._state.modelsWithExpressions.length
            ? modelIndex
            : -1;

        this._state = {
            ...this._state,
            ...NON_EDITITING_STATE,
            selectedModelIndex: clampedEditingModelIndex === -1 ? this._state.selectedModelIndex : modelIndex,
            editingModelIndex: clampedEditingModelIndex,
        };
        return this;
    }

    public updateModel(modelIndex: number, name: string, editorModelString: string): this {
        const modelInfo = this._state.modelsWithExpressions[modelIndex];
        if (!modelInfo) {
            return this;
        }

        const model = this.evaluateModel(editorModelString);
        if (model === undefined) {
            return this;
        }


        const expressionStrings = modelInfo.expressions.map(expressionInfo => expressionInfo.editorExpressionString);
        const result = ModelExpressionsFactory.getInstance().create(model, expressionStrings);

        const modelsWithExpressions = [...this._state.modelsWithExpressions];
        const expressions = [...modelInfo.expressions];
        for (let i = 0; i < result.length; i++) {
            if (result[i].expression) {
                expressions[i].expression.dispose();
            }
            expressions[i] = {
                ...expressions[i],
                expression: result[i].expression,
                editorExpressionString: result[i].expressionString,
                changeHistory: [],
                selecteChangeHistoryIndex: -1,
                error: result[i].error,
            } as IExpressionInfo;
        }

        modelsWithExpressions[modelIndex] = {
            ...modelInfo,
            editorModelString,
            model,
            name,
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

        model.expressions
            .filter(expressionInfo => expressionInfo.exppression)
            .forEach((expressionInfo) => {
                expressionInfo.expression.dispose();
            });

        modelsWithExpressions.splice(modelIndex, 1);

        this._state = {
            ...this._state,
            selectedModelIndex: newSelectedIndex,
            modelsWithExpressions,
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

    public addModel(name: string, editorModelString: string): this {
        const model: object = this.evaluateModel(editorModelString);

        if (!model) {
            return this;
        }

        const newModel: IModelWithExpressions = {
            name,
            model,
            version: 0,
            editorModelString,
            isDeleting: false,
            selectedExpressionIndex: -1,
            expressions: []
        };

        const modelsWithExpressions = [
            ...this._state.modelsWithExpressions,
            newModel
        ];

        const newIndex = modelsWithExpressions.length - 1;

        this._state = {
            ...this._state,
            ...NON_EDITITING_STATE,
            modelsWithExpressions,
            selectedModelIndex: newIndex
        };

        return this;
    }


    public setSelectedChangeHistoryIndex(
        modelIndex: number,
        expressionIndex: number,
        selectedChangeHistoryIndex: number
    ): this {
        const modelWithExpressions = this._state.modelsWithExpressions[modelIndex];
        if (!modelWithExpressions) {
            return this;
        }

        const expressionInfo = modelWithExpressions.expressions[expressionIndex];
        if (!expressionInfo) {
            return this;
        }

        const changeHistory = expressionInfo.changeHistory ?? [];
        const changeHistoryLength = changeHistory.length;

        if (changeHistoryLength === 0) {
            return this;
        }

        const clampedSelectedChangeHistoryIndex = Math.max(
            0,
            Math.min(selectedChangeHistoryIndex, changeHistoryLength - 1)
        );

        // Current cursor:
        // - if current selection is invalid (e.g. -1), treat as "newest"
        const currentSelectedChangeHistoryIndexRaw = expressionInfo.selecteChangeHistoryIndex;
        const currentCursorIndex =
            currentSelectedChangeHistoryIndexRaw >= 0 &&
                currentSelectedChangeHistoryIndexRaw < changeHistoryLength
                ? currentSelectedChangeHistoryIndexRaw
                : changeHistoryLength - 1;

        if (clampedSelectedChangeHistoryIndex === currentCursorIndex) {
            // Selection already at that point-in-time
            return this;
        }


        this.replayChangeHistory(expressionInfo, clampedSelectedChangeHistoryIndex);


        const changedExpressionInfo = {
            ...expressionInfo,
            selecteChangeHistoryIndex: clampedSelectedChangeHistoryIndex,
        };

        const updatedExpressions = modelWithExpressions.expressions.map((existingExpressionInfo, index) => {
            if (index !== expressionIndex) {
                return existingExpressionInfo;
            }
            return changedExpressionInfo;
        });

        const updatedModelsWithExpressions = this._state.modelsWithExpressions.map((existingModel, index) => {
            if (index !== modelIndex) {
                return existingModel;
            }
            return {
                ...modelWithExpressions,
                version: (modelWithExpressions.version ?? 0) + 1,
                expressions: updatedExpressions,
            };
        });

        this._state = {
            ...this._state,
            modelsWithExpressions: updatedModelsWithExpressions,
        };

        return this;
    }

    public setExpressionHistory(
        modelIndex: number,
        expressionIndex: number,
        history: IExpressionChangeHistory[][]
    ): this {
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


    public updateExpression(modelIndex: number, expressionIndex: number, name: string, expressionString: string): this {
        const modelInfo = this._state.modelsWithExpressions[modelIndex];
        if (!modelInfo) {
            return this;
        }

        const expressionInfo = modelInfo.expressions[expressionIndex];
        if (!expressionInfo) {
            return this;
        }


        const result = ModelExpressionsFactory.getInstance().create(modelInfo.model, [expressionString])[0];
        if (result.expression && expressionInfo.expression) {
            expressionInfo.expression.dispose();
        }


        const modelsWithExpressions = [...this._state.modelsWithExpressions];

        const expressions = [...modelInfo.expressions];
        expressions[expressionIndex] = {
            ...expressionInfo,
            editorExpressionString: expressionString,
            changeHistory: [],
            version: expressionInfo.version + 1,
            error: result?.error,
            name,
            treeHighlight: [],
            treeHighlightVersion: expressionInfo.treeHighlightVersion + 1,
            expression: result?.expression
        }

        modelsWithExpressions[modelIndex] = {
            ...modelsWithExpressions[modelIndex],
            expressions
        };

        this._state = {
            ...this._state,
            ...NON_EDITITING_STATE,
            selectedModelIndex: modelIndex,
            modelsWithExpressions
        }

        return this;
    }

    public addExpression(modelIndex: number, name: string, expressionString: string): this {
        if (!this._state.modelsWithExpressions[modelIndex]) {
            return this;
        }

        const model = this._state.modelsWithExpressions[modelIndex].model;
        const result = ModelExpressionsFactory.getInstance().create(model, [expressionString])[0];
        if (!result.expression) {
            this._state = {
                ...this._state,
                error: result.error
            };
            return this;
        }

        const modelsWithExpressions = [...this._state.modelsWithExpressions];

        const newExpressionInfo: IExpressionInfo = {
            version: 0,
            expression: result.expression,
            editorExpressionString: expressionString,
            isDeleting: false,
            error: '',
            name,
            treeHighlight: [],
            treeHighlightVersion: 0,
            selecteChangeHistoryIndex: -1,
            changeHistory: [],
        };

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

    private updateModelValues(target: object, source: object): void {
        Type.walkObjectTopToBottom(
            target,
            (parent, key, value) => {

                if (Type.isPlainObject(value)) {

                    this.updateModelValues(value as object, source[key])
                } else {
                    parent[key] = source[key];
                }
            },
            false
        );
    }

    private replayChangeHistory(
        expressionInfo: IExpressionInfo,
        index: number,
    ): void {

        if(!expressionInfo.expression) {
            return;
        }
        const tracker = this._expressionChangeTrackerManager
            .create(expressionInfo.expression).instance;

        tracker.pause();

        const resume = (): void => {
            tracker.continue();
        };

        expressionInfo.expression.changed
            .pipe(
                skip(1),  // the current value is always emiited when subscribing so skip it
                take(1),
                timeout({ first: 10000 }),
                catchError((e) => {
                    console.warn(
                        'replayChangeHistory did not emit `changed` within 10s',
                        e
                    );

                    return throwError(() => e);
                }),
                finalize(() => {
                    tracker.continue();
                })
            )
            .subscribe({
                error: (e) => {
                    console.error('Replay pipeline failed', e);
                }
            });

        try {

            this._expressionChangePlayback.play(index, expressionInfo.changeHistory);
        } catch (e) {
            resume();
            throw e;
        }
    }

    private tryToExecute<T>(action: () => T): T | undefined {
        try {
            return action();
        } catch (e) {
            this._state = {
                ...this._state,
                error: (e instanceof Error ? e.message : e as string)
            };
        }
        return undefined;
    }

    private getNewIndexAfterDelete<T>(
        selectedIndex: number,
        deletedIndex: number,
        itemsBeforeDelete: T[]
    ): number {
        const nextLength = itemsBeforeDelete.length - 1;

        // nothing left after delete
        if (nextLength <= 0) {
            return -1;
        }

        // If nothing was selected, pick a sensible default (keep -1)
        if (selectedIndex < 0) {
            return -1;
        }

        // If selected item was deleted:
        // - if we deleted the last item, move selection to previous
        // - otherwise keep same index (next item slides into this index)
        if (selectedIndex === deletedIndex) {
            const deletedWasLast = deletedIndex >= nextLength; // since nextLength = oldLength - 1
            return deletedWasLast ? nextLength - 1 : deletedIndex;
        }

        // If delete happened before selection, selection shifts left by 1
        if (deletedIndex < selectedIndex) {
            return selectedIndex - 1;
        }

        // Delete after selection => selection unchanged
        return selectedIndex;
    }

    private evaluateModel(editorModelString: string): object {
        return this.tryToExecute(() => new Function(`return ${editorModelString}`)());
    }

}