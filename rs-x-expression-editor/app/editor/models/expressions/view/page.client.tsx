'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { type IExpressionChangeHistory } from '@rs-x/expression-parser';

import { ExpressionTreeViewWithModel } from '../../../../../src/components/expression-tree-view-with-model/expression-tree-view-with-model.component';
import { ModelEditor } from '../../../../../src/components/model-editor/model-editor.component';
import { ExpressionEditorBusinessService } from '../../../../../src/services/expression-editor-business.service';
import { ExpressionEditorStateBuilder } from '../../../../../src/services/expression-editor-state-builder';
import { createQueryString, useEditorContext } from '../../../provider.client';

const ExpressionDetailsPageClient: React.FC = () => {
  const router = useRouter();
  const {
    currentState,
    setCurrentState,
    getModelIndex: getModelId,
    getExpressionIndex: getExpressionId,
  } = useEditorContext();
  const business = ExpressionEditorBusinessService.getInstance();

  const modelIndex = getModelId();
  const expressionIndex = getExpressionId();

  const modelInfo = currentState.modelsWithExpressions[modelIndex];
  const expressionInfo = modelInfo?.expressions[expressionIndex];
  const selectedHistoryIndex =
    currentState.modelsWithExpressions[modelIndex]?.expressions[expressionIndex]
      ?.selecteChangeHistoryIndex;

  if (!modelInfo || !expressionInfo) {
    return (
      <div style={{ padding: 16 }}>
        Expression not found.
        <button
          onClick={() => {
            router.push('/editor');
          }}
        >
          Back
        </button>
      </div>
    );
  }

  const onClose = () => {
    router.push(`/editor?${createQueryString(modelIndex, expressionIndex)}`);
  };

  const onModelChange = (idx: number, model: unknown) => {
    business.applyModelValues(modelInfo.model, model as object);

    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).bumpModelVersion(idx).state;
    });
  };

  const onHistoryChanged = (
    _modelIndex: number,
    _expressionIndex: number,
    history: IExpressionChangeHistory[][],
  ) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).setExpressionHistory({
        modelIndex,
        expressionIndex,
        history,
      }).state;
    });
  };

  const onSelectHistoryBatch = (
    _modelIndex: number,
    _expressionIndex: number,
    selectedIndex: number,
    items: IExpressionChangeHistory[],
    replay: boolean,
  ) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(
        prev,
      ).setSelectedChangeHistoryIndex(
        modelIndex,
        expressionIndex,
        selectedIndex,
        items,
      ).state;
    });

    if (replay && expressionInfo.expression) {
      try {
        business.replayChangeHistory({
          expression: expressionInfo.expression,
          index: selectedIndex,
          changeHistory: expressionInfo.changeHistory ?? [],
        });
      } catch {
        // swallow
      }
    }
  };

  const onClearSelectedHistory = () => {
    const history = expressionInfo.changeHistory.slice(0, 1);

    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).setExpressionHistory({
        modelIndex,
        expressionIndex,
        history,
      }).state;
    });

    if (selectedHistoryIndex !== 0) {
      onSelectHistoryBatch(
        modelIndex,
        expressionIndex,
        0,
        history[0] ?? [],
        true,
      );
    }
  };

  const setTreeZoomPercent = (zoom: number) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).setTreeZoomPercent(zoom)
        .state;
    });
  };

  const modelEditor = (
    <ModelEditor
      key={`${modelIndex}`}
      modelIndex={modelIndex}
      model={modelInfo.model}
      onCommit={onModelChange}
    />
  );
  return (
    <div className="app">
      <ExpressionTreeViewWithModel
        version={expressionInfo.version}
        treeHighlightVersion={expressionInfo.treeHighlightVersion}
        modelIndex={modelIndex}
        expressionIndex={expressionIndex}
        changeHistoryIndex={expressionInfo.selecteChangeHistoryIndex}
        expression={expressionInfo.expression}
        changeHistory={expressionInfo.changeHistory}
        treeHighlight={expressionInfo.treeHighlight}
        treeZoomPercent={currentState.treeZoomPercent}
        onHistoryChanged={onHistoryChanged}
        onSelectHistoryBatch={onSelectHistoryBatch}
        onClearSelectedHistory={onClearSelectedHistory}
        onClose={onClose}
        setTreeZoomPercent={setTreeZoomPercent}
        modelEditor={modelEditor}
      />
    </div>
  );
};

export default ExpressionDetailsPageClient;
