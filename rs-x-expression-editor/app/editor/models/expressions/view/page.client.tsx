'use client';

import { useRouter } from 'next/navigation';
import React from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';

import { type IExpressionChangeHistory } from '@rs-x/expression-parser';

import { ChangeHistoryPanel } from '../../../../../src/components/change-history-panel/change-history-panel.component';
import { ExpressionTreePanel } from '../../../../../src/components/expression-tree-panel/expression-tree-panel';
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

  const selectedExpressionString =
    expressionInfo.expression?.expressionString ?? '';

  const canClearSelectedHistory =
    (expressionInfo.changeHistory?.length ?? 0) > 0;

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

  return (
    <div className="app">
      <Group orientation="horizontal" className="panels-container">
        <Panel defaultSize={100} className="panel">
          <Group orientation="horizontal" className="panels-container">
            <Panel defaultSize={35} className="panel">
              <Group orientation="vertical" className="panel-stack">
                <Panel defaultSize={40} className="panel">
                  <div className="panel-header">Model</div>
                  <div className="editor-wrapper">
                    <ModelEditor
                      key={`${modelIndex}`}
                      modelIndex={modelIndex}
                      model={modelInfo.model}
                      onCommit={onModelChange}
                    />
                  </div>
                </Panel>

                <Separator className="separator-horizontal" />

                <Panel defaultSize={60} className="panel">
                  <ChangeHistoryPanel
                    canClearSelectedHistory={canClearSelectedHistory}
                    selectedModelIndex={modelIndex}
                    selectedExpressionIndex={expressionIndex}
                    selectedExpression={expressionInfo}
                    onHistoryChanged={onHistoryChanged}
                    onSelectionChanged={onSelectHistoryBatch}
                    onClearSelectedHistory={onClearSelectedHistory}
                  />
                </Panel>
              </Group>
            </Panel>

            <Separator className="separator" />

            <Panel defaultSize={65} className="panel">
              <ExpressionTreePanel
                key={`${modelIndex}-${expressionIndex}`}
                selectedExpressionString={selectedExpressionString}
                expressionInfo={expressionInfo}
                treeZoomPercent={currentState.treeZoomPercent}
                onTreeZoomPercentChange={setTreeZoomPercent}
                onClose={onClose}
                isVisible={true}
              />
            </Panel>
          </Group>
        </Panel>
      </Group>
    </div>
  );
};

export default ExpressionDetailsPageClient;
