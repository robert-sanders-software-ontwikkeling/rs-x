'use client';

import React, { type JSX } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';

import {
  type IExpression,
  type IExpressionChangeHistory,
} from '@rs-x/expression-parser';

import { ChangeHistoryPanel } from '../change-history-panel/change-history-panel.component';
import { ExpressionTreePanel } from '../expression-tree-panel/expression-tree-panel';

import '../../styles/component-shell.css';

export interface IExpressionTreeViewWithModel {
  version?: number;
  treeHighlightVersion?: number;
  modelIndex?: number;
  expressionIndex?: number;
  hideTrackChange?: boolean;
  hideHeader?: boolean;
  changeHistoryIndex?: number;
  expression?: IExpression;
  changeHistory?: IExpressionChangeHistory[][];
  treeHighlight: IExpressionChangeHistory[];
  treeZoomPercent: number;
  modelEditor: JSX.Element;
  onHistoryChanged?: (
    modelIndex: number,
    expressionIndex: number,
    history: IExpressionChangeHistory[][],
  ) => void;
  onSelectHistoryBatch?: (
    modelIndex: number,
    expressionIndex: number,
    selectedIndex: number,
    items: IExpressionChangeHistory[],
    replay: boolean,
  ) => void;
  onClearSelectedHistory?: () => void;
  setTreeZoomPercent: (zoom: number) => void;
  onClose?: () => void;
}

export const ExpressionTreeViewWithModel: React.FC<
  IExpressionTreeViewWithModel
> = ({
  version,
  treeHighlightVersion,
  modelIndex,
  expressionIndex,
  changeHistoryIndex,
  expression,
  changeHistory,
  treeHighlight,

  modelEditor,
  hideTrackChange,
  treeZoomPercent,
  hideHeader,
  onSelectHistoryBatch,
  onHistoryChanged,
  onClearSelectedHistory,
  setTreeZoomPercent,
  onClose,
}) => {
  const showChangeHistoryPanel = !hideTrackChange && expression;
  const selectedExpressionString = expression?.expressionString ?? '';
  const canClearSelectedHistory = changeHistory && changeHistory.length > 0;
  const leftPanelSize = expression ? 35 : 100;
  const editorPanelSize = showChangeHistoryPanel ? 40 : 100;

  return (
    <div className="app">
      <Group orientation="horizontal" className="panels-container">
        <Panel defaultSize={100} className="panel panelPlain">
          <Group orientation="horizontal" className="panels-container">
            <Panel defaultSize={leftPanelSize} className="panel panelPlain">
              <Group orientation="vertical" className="panel-stack">
                <Panel
                  defaultSize={editorPanelSize}
                  className="panel panelPlain panelFlat"
                >
                  {!hideHeader && <div className="panel-header">Model</div>}
                  <div className="editor-wrapper">{modelEditor}</div>
                </Panel>
                {showChangeHistoryPanel && (
                  <>
                    <Separator className="separator-horizontal" />
                    <Panel
                      defaultSize={60}
                      className="panel panelElevated panelFlat"
                    >
                      <ChangeHistoryPanel
                        version={version ?? -1}
                        modelIndex={modelIndex ?? -1}
                        expressionIndex={expressionIndex ?? -1}
                        changeHistoryIndex={changeHistoryIndex ?? -1}
                        expression={expression}
                        changeHistory={changeHistory ?? []}
                        canClearSelectedHistory={!!canClearSelectedHistory}
                        onHistoryChanged={onHistoryChanged}
                        onSelectionChanged={onSelectHistoryBatch}
                        onClearSelectedHistory={onClearSelectedHistory}
                      />
                    </Panel>
                  </>
                )}
              </Group>
            </Panel>
            {expression && (
              <>
                <Separator className="separator" />
                <Panel
                  defaultSize={65}
                  className="panel panelElevated panelFlat"
                >
                  <ExpressionTreePanel
                    key={`${modelIndex}-${expressionIndex}`}
                    version={version ?? -1}
                    highlightVersion={treeHighlightVersion ?? -1}
                    selectedExpressionString={selectedExpressionString}
                    expression={expression}
                    treeHighlight={treeHighlight}
                    treeZoomPercent={treeZoomPercent}
                    onTreeZoomPercentChange={setTreeZoomPercent}
                    onClose={onClose}
                    isVisible={true}
                  />
                </Panel>
              </>
            )}
          </Group>
        </Panel>
      </Group>
    </div>
  );
};
