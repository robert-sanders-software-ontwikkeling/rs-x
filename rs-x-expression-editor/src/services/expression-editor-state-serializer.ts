import { InjectionContainer, type IObjectStorage, RsXCoreInjectionTokens } from '@rs-x/core';
import type { IExpressionChangePlayback } from '@rs-x/expression-parser';
import {
    ExpressionNodeIdIndex,
    type IExpressionChangeHistory,
    type IExpressionFactory,
    RsXExpressionParserInjectionTokens
} from '@rs-x/expression-parser';
import { take } from 'rxjs/operators';
import type { IExpressionEditorState } from '../models/expression-editor-state.interface';
import { ISerializedExpressionChangeHistory } from '../models/serialized-expression-change-history.interface';
import { ISerializedExpressionEditorState } from '../models/serialized-expression-editor-state.interface';


const stateId = '1513bdf8-c3fc-4f74-ad4f-e670724fc625';

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
      modelsWithExpressions: state.modelsWithExpressions.map((modelWithExpressions) => {
        return {
          name: modelWithExpressions.name,
          editorModelString: modelWithExpressions.editorModelString,
          isDeleting: modelWithExpressions.isDeleting,
          selectedExpressionIndex: modelWithExpressions.selectedExpressionIndex,
          expressions: modelWithExpressions.expressions.map((expressionInfo) => {
            const nodeIdIndex = ExpressionNodeIdIndex.build(expressionInfo.expression);

            return {
              name: expressionInfo.name,
              editorExpressionString: expressionInfo.editorExpressionString,
              isDeleting: expressionInfo.isDeleting,
              selecteChangeHistoryIndex: expressionInfo.selecteChangeHistoryIndex,

              treeHighlight: this.serializeHistorySet(expressionInfo.treeHighlight, nodeIdIndex),
              changeHistory: this.serializeHistory(expressionInfo.changeHistory ?? [], nodeIdIndex),
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
        addingModel: false,
        addingExpression: false,
        selectedModelIndex: -1,
        editingExpressionIndex: -1,
        editingModelIndex: -1,
        showExpressionTreeView: false,
        treeZoomPercent: 75,
        modelsWithExpressions: [],
      };
    }

    return {
      error: deserializeState.error,
      treeZoomPercent: deserializeState.treeZoomPercent ?? 75,
      showExpressionTreeView: deserializeState.showExpressionTreeView ?? false,
      addingModel: deserializeState.addingModel ?? false,
      addingExpression: deserializeState.addingExpression ?? false,
      selectedModelIndex: deserializeState.selectedModelIndex ?? -1,
      editingExpressionIndex: deserializeState.editingExpressionIndex ?? -1,
      editingModelIndex: deserializeState.editingModelIndex ?? -1,
      modelsWithExpressions: deserializeState.modelsWithExpressions.map((modelWithExpressions) => {
        const model = new Function(`return ${modelWithExpressions.editorModelString}`)();

        const selectedExpressionIndex = modelWithExpressions.selectedExpressionIndex;

        return {
          name: modelWithExpressions.name,
          model,
          editorModelString: modelWithExpressions.editorModelString,
          isDeleting: modelWithExpressions.isDeleting,
          selectedExpressionIndex,
          expressions: modelWithExpressions.expressions.map((exprInfo, index) => {
            const rootExpression = this._expressionFactory.create(model, exprInfo.editorExpressionString);

            const nodeIdIndex = ExpressionNodeIdIndex.build(rootExpression);

            const changeHistory = this.deserializeHistory(
              nodeIdIndex,
              exprInfo.changeHistory ?? []
            );

            const treeHighlight = this.deserializeHistorySet(
              nodeIdIndex,
              exprInfo.treeHighlight ?? []
            );

            const shouldAutoPlay =
              selectedExpressionIndex !== null &&
              index === selectedExpressionIndex &&
              isValidSelectionIndex({
                index: exprInfo.selecteChangeHistoryIndex,
                historyLength: changeHistory.length,
              });

            if (shouldAutoPlay) {
              rootExpression.changed
                .pipe(take(1))
                .subscribe(() => {
                  try {
                    this._expressionChangePlayback.play(
                      exprInfo.selecteChangeHistoryIndex,
                      changeHistory
                    );
                  } catch {
                    // swallow
                  }
                });
            }

            return {
              name: exprInfo.name,
              editorExpressionString: exprInfo.editorExpressionString,
              version: 0,
              isDeleting: exprInfo.isDeleting,
              expression: rootExpression,
              treeHighlight,
              treeHighlightVersion: 0,
              selecteChangeHistoryIndex: exprInfo.selecteChangeHistoryIndex,
              changeHistory,
            };
          }),
        };
      }),
    };
  }

  private serializeHistorySet(
    historySet: IExpressionChangeHistory[],
    nodeIdIndex: ExpressionNodeIdIndex
  ): ISerializedExpressionChangeHistory[] {
    return historySet.map((h) => {
      return {
        expressionId: nodeIdIndex.getId(h.expression),
        value: this.cloneValue(h.value),
        oldValue: this.cloneValue(h.oldValue),
      };
    });
  }

  private serializeHistory(
    history: IExpressionChangeHistory[][],
    nodeIdIndex: ExpressionNodeIdIndex
  ): ISerializedExpressionChangeHistory[][] {
    return history.map((batch) => this.serializeHistorySet(batch, nodeIdIndex));
  }

  private deserializeHistorySet(
    nodeIdIndex: ExpressionNodeIdIndex,
    history: ISerializedExpressionChangeHistory[]
  ): IExpressionChangeHistory[] {
    return history.map((h) => {
      return {
        expression: nodeIdIndex.getNode(h.expressionId),
        value: h.value,
        oldValue: h.oldValue,
      };
    });
  }

  private deserializeHistory(
    nodeIdIndex: ExpressionNodeIdIndex,
    history: ISerializedExpressionChangeHistory[][]
  ): IExpressionChangeHistory[][] {
    return history.map((batch) => this.deserializeHistorySet(nodeIdIndex, batch));
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