import { IExpressionChangeTransactionManager, IExpressionManager, RsXExpressionParserInjectionTokens } from '@rs-x/expression-parser';
import { catchError, finalize, skip, take, throwError, timeout } from 'rxjs';
import { InjectionContainer, Type } from '../../../rs-x-core/lib';
import { IExpressionChangePlayback } from '../../../rs-x-expression-parser/lib/expression-change-playback/expression-change-playback.interface';
import { IExpressionChangeHistory, IExpressionChangeTrackerManager } from '../../../rs-x-expression-parser/lib/expression-change-tracker';
import { IExpressionEditorState } from '../models/expression-editor-state.interface';
import { IModelWithExpressions } from '../models/model-with-expressions.interface';
import { IExpressionInfo } from '../models/expressionI-info.interface';

export class ExpressionEditorStateBuilder {

    private readonly _expressionChangePlayback: IExpressionChangePlayback;
    private readonly _expressionChangeTrackerManager: IExpressionChangeTrackerManager
    private readonly _expressionChangeTransactionManager: IExpressionChangeTransactionManager;
    private readonly _expressionManager: IExpressionManager;

    constructor(private _state: IExpressionEditorState) {
        this._expressionChangePlayback = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionChangePlayback);
        this._expressionChangeTrackerManager = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionChangeTrackerManager);
        this._expressionChangeTransactionManager = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager);
        this._expressionManager = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionManager);
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
        treeHighlight:  IExpressionChangeHistory[]
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

        const expressions = [... modelsWithExpressions[modelIndex] .expressions];

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

    public deleteExpression(modelIndex: number, expressionIndex: number | null): this {
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
            newSelectedIndex = null;
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

 



    public selectExpression(modelIndex: number, expressionIndex: number | null): this {
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

        this._state = { ...this._state, modelsWithExpressions };
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


        const modelsWithExpressions = [...this._state.modelsWithExpressions];
        modelsWithExpressions[modelIndex] = {
            ...current,
            editingExpressionIndex: clampedEditingExpressionIndex,
            selectedExpressionIndex: clampedEditingExpressionIndex,
        };

        this._state = { ...this._state, error: undefined, modelsWithExpressions };
        return this;
    }


    public setModel(modelIndex: number, model: object): this {
        const currentModel = this._state.modelsWithExpressions[modelIndex];

        if (!currentModel) {
            return this;
        }

        this._expressionChangeTransactionManager.suspend();
        try {
            this.updateModel(currentModel.model, model);
        } finally {
            this._expressionChangeTransactionManager.continue();
        }

        const modelsWithExpressions = [...this._state.modelsWithExpressions];

        const updatedModel = {
            ...currentModel,
            expressions: currentModel.expressions.map((exprInfo) => {
                return {
                    ...exprInfo,
                    version: exprInfo.version + 1
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
            selectedModelIndex: modelIndex
        };

        return this;
    }

    public setAddingModel(addingModel: boolean): this {
        this._state = {
            ...this._state,
            error: undefined,
            addingModel
        }
        return this;
    }

    public setAddingExpression(addingExpression: boolean): this {
        this._state = {
            ...this._state,
            error: undefined,
            addingExpression
        };

        return this;
    }


    public addModel(name: string, editorModelString: string): this {
        let model: object = this.tryToExecute(() => new Function(`return ${editorModelString}`)());

        if (!model) {
            return this;
        }

        const newModel: IModelWithExpressions = {
            name,
            model,
            editorModelString,
            isDeleting:false,
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
            addingModel: false,
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


        this.replayChangeHistory(expressionInfo, clampedSelectedChangeHistoryIndex, currentCursorIndex);


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


        const expression = this.tryToExecute(() =>
            this._expressionManager
                .create(modelInfo.model)
                .instance.create({ expressionString }).instance
        );

        if (!expression) {
            return this;
        }


        expressionInfo.expression.dispose();

        const modelsWithExpressions = [...this._state.modelsWithExpressions];

        const expressions = [...modelInfo.expressions];
        expressions[expressionIndex] = {
            ...expressionInfo,
            editorExpressionString: expressionString,
            changeHistory: [],
            version: expressionInfo.version + 1,
            name,
            treeHighlight: [],
            treeHighlightVersion: expressionInfo.treeHighlightVersion +1,
            expression: this._expressionManager
                .create(modelInfo.model)
                .instance.create({ expressionString }).instance
        }

        modelsWithExpressions[modelIndex] = {
            ...modelsWithExpressions[modelIndex],
            editingExpressionIndex: -1,
            expressions
        };

        this._state = {
            ...this._state,
            modelsWithExpressions
        }

        return this;
    }

    public addExpression(modelIndex: number, name: string, expressionString: string): this {
        if (!this._state.modelsWithExpressions[modelIndex]) {
            return this;
        }

        const model = this._state.modelsWithExpressions[modelIndex].model;

        const expression = this.tryToExecute(() =>
            this._expressionManager
                .create(model)
                .instance.create({ expressionString }).instance
        );
        if (!expression) {
            return this;
        }

        const modelsWithExpressions = [...this._state.modelsWithExpressions];

        const newExpressionInfo: IExpressionInfo = {
            version: 0,
            expression,
            editorExpressionString: expressionString,
            isDeleting: false,
            name,
            treeHighlight: [],
            treeHighlightVersion: 0,
            selecteChangeHistoryIndex: -1,
            changeHistory: [],
        };

        modelsWithExpressions[modelIndex] = {
            ...modelsWithExpressions[modelIndex],
            expressions: [...modelsWithExpressions[modelIndex].expressions, newExpressionInfo],
        };

        this._state = {
            ...this._state,
            addingExpression: false,
            modelsWithExpressions,
        };

        return this;
    }

    private updateModel(target: object, source: object): void {
        Type.walkObjectTopToBottom(
            target,
            (parent, key, value) => {

                if (Type.isPlainObject(value)) {

                    this.updateModel(value as object, source[key])
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
        currentCursorIndex: number
    ): void {
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
}