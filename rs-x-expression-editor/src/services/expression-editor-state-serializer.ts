import { firstValueFrom } from 'rxjs';
import { take, timeout } from 'rxjs/operators';

import {
  InjectionContainer,
  type IObjectStorage,
  RsXCoreInjectionTokens,
} from '@rs-x/core';
import type {
  ExpressionNodeIdIndex,
  IExpression,
  type IExpressionChangeHistory,
  IExpressionChangePlayback,
  RsXExpressionParserInjectionTokens,
} from '@rs-x/expression-parser';

import {
  getInitialExpressionEditorState,
  type IExpressionEditorState,
} from '../models/expression-editor-state.interface';
import { type IExpressionInfo } from '../models/expression-info.interface';
import { type IModelWithExpressions } from '../models/model-with-expressions.interface';
import { type ISerializedExpressionChangeHistory } from '../models/serialized-expression-change-history.interface';
import { type ISerializedExpressionEditorState } from '../models/serialized-expression-editor-state.interface';
import { type ISerializedExpressionInfo } from '../models/serialized-expression-info.interface';
import { type ISerializedModelWithExpressions } from '../models/serialized-model-with-expressions.interface';

import { ModelEvaluator } from './model-evaluator';
import { ModelExpressionsFactory } from './model-expressions.factory';

const stateId = '1513bdf8-c3fc-4f74-ad4f-e670724fc625';

function isValidSelectionIndex(args: {
  index: number;
  historyLength: number;
}): boolean {
  const { index, historyLength } = args;
  return Number.isFinite(index) && index >= 0 && index < historyLength;
}

export class ExpressionEdtitorStateSerializer {
  private readonly _objectStorage: IObjectStorage = InjectionContainer.get(
    RsXCoreInjectionTokens.IObjectStorage,
  );

  private readonly _expressionChangePlayback: IExpressionChangePlayback =
    InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionChangePlayback,
    );

  private static _instance: ExpressionEdtitorStateSerializer;

  private constructor() {}

  public static getInstance(): ExpressionEdtitorStateSerializer {
    if (!this._instance) {
      this._instance = new ExpressionEdtitorStateSerializer();
    }
    return this._instance;
  }

  public async serialize(state: IExpressionEditorState): Promise<void> {
    const serializedState: ISerializedExpressionEditorState = {
      error: state.error,
      treeZoomPercent: state.treeZoomPercent,
      showExpressionTreeView: state.showExpressionTreeView,
      addingExpression: state.addingExpression,
      addingModel: state.addingModel,
      editingExpressionIndex: state.editingExpressionIndex,
      editingModelIndex: state.editingModelIndex,
      selectedModelIndex: state.selectedModelIndex,
      modelsWithExpressions: state.modelsWithExpressions.map(
        this.serializeModelWithExpressions,
      ),
    };

    await this._objectStorage.set(stateId, serializedState);
  }

  public async deserialize(): Promise<IExpressionEditorState> {
    const deserializeState =
      await this._objectStorage.get<ISerializedExpressionEditorState>(stateId);

    if (!deserializeState) {
      return getInitialExpressionEditorState();
    }

    try {
      const { state, tasks, modelErrors } =
        this.tryGetExpressionEditorState(deserializeState);

      await Promise.all(tasks);

      if (modelErrors.length > 0) {
        state.error = modelErrors.join('/n') + '\n' + state.error;
      }

      return state;
    } catch (e) {
      console.log(e instanceof Error ? e.message : String(e));
      return getInitialExpressionEditorState();
    }
  }

  private async createAutoPlayTask(
    expression: IExpression,
    selectedIndex: number,
    changeHistory: IExpressionChangeHistory[][],
  ): Promise<void> {
    try {
      await firstValueFrom(expression.changed.pipe(take(1), timeout(10000)));

      this._expressionChangePlayback.play(selectedIndex, changeHistory);
    } catch {
      // swallow (same behavior as before)
    }
  }

  private deserializedExpressionInfo(
    model: object,
    index: number,
    selectedExpressionIndex: number,
    serializedExpressionInfo: ISerializedExpressionInfo,
  ): { info: IExpressionInfo; task?: Promise<void> } {
    const result = ModelExpressionsFactory.getInstance().create(model, [
      serializedExpressionInfo.editorExpressionString,
    ])[0];

    let changeHistory: IExpressionChangeHistory[][] = [];
    let treeHighlight: IExpressionChangeHistory<IExpression>[] = [];
    let task: Promise<void> | undefined;

    if (result.expression) {
      const nodeIdIndex = ExpressionNodeIdIndex.build(result.expression);

      changeHistory = this.deserializeHistory(
        nodeIdIndex,
        serializedExpressionInfo.changeHistory ?? [],
      );

      treeHighlight = this.deserializeHistorySet(
        nodeIdIndex,
        serializedExpressionInfo.treeHighlight ?? [],
      );

      const shouldAutoPlay =
        index === selectedExpressionIndex &&
        isValidSelectionIndex({
          index: serializedExpressionInfo.selecteChangeHistoryIndex,
          historyLength: changeHistory.length,
        });

      if (shouldAutoPlay) {
        task = this.createAutoPlayTask(
          result.expression,
          serializedExpressionInfo.selecteChangeHistoryIndex,
          changeHistory,
        );
      }
    }

    return {
      info: {
        name: serializedExpressionInfo.name,
        editorExpressionString: serializedExpressionInfo.editorExpressionString,
        version: 0,
        error: result.error,
        isDeleting: serializedExpressionInfo.isDeleting,
        expression: result.expression,
        treeHighlight,
        treeHighlightVersion: 0,
        selecteChangeHistoryIndex:
          serializedExpressionInfo.selecteChangeHistoryIndex,
        changeHistory,
      },
      task,
    };
  }

  private tryGetExpressionEditorState(
    deserializeState: ISerializedExpressionEditorState,
  ): {
    modelErrors: string[];
    state: IExpressionEditorState;
    tasks: Promise<void>[];
  } {
    const tasks: Promise<void>[] = [];

    const modelErrors: string[] = [];

    const state: IExpressionEditorState = {
      error: deserializeState.error,
      treeZoomPercent: deserializeState.treeZoomPercent ?? 75,
      showExpressionTreeView: deserializeState.showExpressionTreeView ?? false,
      addingModel: deserializeState.addingModel ?? false,
      addingExpression: deserializeState.addingExpression ?? false,
      selectedModelIndex: deserializeState.selectedModelIndex ?? -1,
      editingExpressionIndex: deserializeState.editingExpressionIndex ?? -1,
      editingModelIndex: deserializeState.editingModelIndex ?? -1,
      modelsWithExpressions: deserializeState.modelsWithExpressions.map(
        (modelWithExpressions) => {
          const result = ModelEvaluator.getInstance().evaluate(
            modelWithExpressions.editorModelString,
          );

          const model = result.success ? result.model : {};
          if (!result.success) {
            modelErrors.push(result.error);
          }
          const selectedExpressionIndex =
            modelWithExpressions.selectedExpressionIndex;

          const expressions = modelWithExpressions.expressions.map(
            (serializedExpressionInfo, index) => {
              const { info, task } = this.deserializedExpressionInfo(
                model,
                index,
                selectedExpressionIndex,
                serializedExpressionInfo,
              );

              if (task) {
                tasks.push(task);
              }

              return info;
            },
          );

          return {
            name: modelWithExpressions.name,
            model,
            version: modelWithExpressions.version,
            editorModelString: modelWithExpressions.editorModelString,
            isDeleting: modelWithExpressions.isDeleting,
            selectedExpressionIndex,
            expressions,
          };
        },
      ),
    };

    return { state, tasks, modelErrors };
  }

  private serializeExpressionInfo = (
    expressionInfo: IExpressionInfo,
  ): ISerializedExpressionInfo => {
    let treeHighlight: ISerializedExpressionChangeHistory[] = [];
    let changeHistory: ISerializedExpressionChangeHistory[][] = [];

    if (expressionInfo.expression) {
      const nodeIdIndex = ExpressionNodeIdIndex.build(
        expressionInfo.expression,
      );
      treeHighlight = this.serializeHistorySet(
        expressionInfo.treeHighlight,
        nodeIdIndex,
      );
      changeHistory = this.serializeHistory(
        expressionInfo.changeHistory ?? [],
        nodeIdIndex,
      );
    }

    return {
      name: expressionInfo.name,
      editorExpressionString: expressionInfo.editorExpressionString,
      isDeleting: expressionInfo.isDeleting,
      selecteChangeHistoryIndex: expressionInfo.selecteChangeHistoryIndex,
      treeHighlight,
      changeHistory,
    };
  };

  private serializeModelWithExpressions = (
    modelWithExpressions: IModelWithExpressions,
  ): ISerializedModelWithExpressions => {
    return {
      name: modelWithExpressions.name,
      version: 0,
      editorModelString: modelWithExpressions.editorModelString,
      isDeleting: modelWithExpressions.isDeleting,
      selectedExpressionIndex: modelWithExpressions.selectedExpressionIndex,
      expressions: modelWithExpressions.expressions.map(
        this.serializeExpressionInfo,
      ),
    };
  };

  private serializeHistorySet(
    historySet: IExpressionChangeHistory[],
    nodeIdIndex: ExpressionNodeIdIndex,
  ): ISerializedExpressionChangeHistory[] {
    return historySet.map((historyChangeRecord) => {
      return {
        expressionId: nodeIdIndex.getId(historyChangeRecord.expression),
        value: this.cloneValue(historyChangeRecord.value),
        oldValue: this.cloneValue(historyChangeRecord.oldValue),
      };
    });
  }

  private serializeHistory(
    history: IExpressionChangeHistory[][],
    nodeIdIndex: ExpressionNodeIdIndex,
  ): ISerializedExpressionChangeHistory[][] {
    return history.map((batch) => this.serializeHistorySet(batch, nodeIdIndex));
  }

  private deserializeHistorySet(
    nodeIdIndex: ExpressionNodeIdIndex,
    history: ISerializedExpressionChangeHistory[],
  ): IExpressionChangeHistory[] {
    return history.map((historyChangeRecord) => {
      return {
        expression: nodeIdIndex.getNode(historyChangeRecord.expressionId),
        value: historyChangeRecord.value,
        oldValue: historyChangeRecord.oldValue,
      };
    });
  }

  private deserializeHistory(
    nodeIdIndex: ExpressionNodeIdIndex,
    history: ISerializedExpressionChangeHistory[][],
  ): IExpressionChangeHistory[][] {
    return history.map((batch) =>
      this.deserializeHistorySet(nodeIdIndex, batch),
    );
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
