import { IExpression, RsXExpressionParserInjectionTokens } from '@rs-x/expression-parser';
import { IExpressionEditorState } from '../models/expression-editor-state.interface';
import { IExpressionInfo } from '../models/model-with-expressions.interface';
import { InjectionContainer, Type } from '../../../rs-x-core/lib';
import { IExpressionChangePlayback } from '../../../rs-x-expression-parser/lib/expression-change-playback/expression-change-playback.interface';
import { IExpressionChangeHistory, IExpressionChangeTrackerManager } from '../../../rs-x-expression-parser/lib/expression-change-tracker';
import { catchError, EMPTY, finalize, skip, take, throwError, timeout } from 'rxjs';

export class ExpressionEditorStateBuilder {

    private readonly _expressionChangePlayback: IExpressionChangePlayback;
    private readonly _expressionChangeTrackerManager: IExpressionChangeTrackerManager
    constructor(private _state: IExpressionEditorState) {
        this._expressionChangePlayback = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionChangePlayback);
        this._expressionChangeTrackerManager = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionChangeTrackerManager);
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

        if (!currentModel.expressions[indexToDelete]) {
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

    public selectExpression(modelIndex: number, expressionIndex: number | null): this {
        const current = this._state.modelsWithExpressions[modelIndex];
        if (!current || current.selectedExpressionIndex === expressionIndex) {
            return this;
        }

        if (
            expressionIndex !== null &&
            (expressionIndex < 0 || expressionIndex >= current.expressions.length)
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

    public editExpression(modelIndex: number, editingExpressionIndex: number | null): this {
        const current = this._state.modelsWithExpressions[modelIndex];

        if (!current) {
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


    public setModel(modelIndex: number, model: object): this {
        const currentModel = this._state.modelsWithExpressions[modelIndex];

        if (!currentModel) {
            return this;
        }

        this.updateModel(currentModel.model, model);

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

        // ✅ Validate / clamp selected index against new history
        // Rules:
        // - If history is empty => -1
        // - Else clamp into [0 .. history.length - 1]
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

    public addExpression(modelIndex: number, name: string, expression: IExpression): this {
        if (!this._state.modelsWithExpressions[modelIndex]) {
            return this;
        }

        const modelsWithExpressions = [...this._state.modelsWithExpressions];

        const newExpressionInfo: IExpressionInfo = {
            version: 0,
            expression,
            name,
            selecteChangeHistoryIndex: -1,
            changeHistory: [],
        };

        modelsWithExpressions[modelIndex] = {
            ...modelsWithExpressions[modelIndex],
            expressions: [...modelsWithExpressions[modelIndex].expressions, newExpressionInfo],
        };

        this._state = {
            ...this._state,
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
        )
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
            if (index > currentCursorIndex) {
                this._expressionChangePlayback.play(index, expressionInfo.changeHistory);
                return;
            }

            this._expressionChangePlayback.playBackward(index, expressionInfo.changeHistory);
        } catch (e) {
            resume();
            throw e;
        }
    }
}