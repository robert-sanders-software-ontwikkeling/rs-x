import React from 'react';
import { FaTrash } from 'react-icons/fa';

import {
  type IExpression,
  type IExpressionChangeHistory,
} from '@rs-x/expression-parser';

import { ExpressionChangeHistoryView } from '../expression-change-history-view/expression-change-history-view.component';

import '../../styles/component-shell.css';

export interface IChangeHistoryPanel {
  version: number;
  canClearSelectedHistory: boolean;
  modelIndex: number;
  expressionIndex: number;
  changeHistoryIndex: number;
  expression: IExpression;
  changeHistory: IExpressionChangeHistory[][];
  onClearSelectedHistory?: () => void;
  onHistoryChanged?: (
    modelIndex: number,
    expressionIndex,
    changes: IExpressionChangeHistory[][],
  ) => void;
  onSelectionChanged?: (
    modelIndex: number,
    expressionIndex: number,
    selectedChangeSetIndex: number,
    items: IExpressionChangeHistory[],
    replay: boolean,
  ) => void;
}

export const ChangeHistoryPanel: React.FC<IChangeHistoryPanel> = ({
  version,
  canClearSelectedHistory,
  modelIndex,
  expressionIndex,
  changeHistoryIndex,
  expression,
  changeHistory,
  onHistoryChanged,
  onSelectionChanged,
  onClearSelectedHistory,
}) => {
  return (
    <>
      <div className="panel-header panel-header-row">
        <span>Change History</span>
        <button
          type="button"
          className="icon-btn "
          disabled={!canClearSelectedHistory}
          onClick={onClearSelectedHistory}
          title="Clear full history for this expression"
        >
          <FaTrash />
        </button>
      </div>

      <div className="panel-content">
        <div className="scroll-host">
          <ExpressionChangeHistoryView
            version={version}
            modelIndex={modelIndex as number}
            expressionIndex={expressionIndex as number}
            expression={expression}
            changeHistory={changeHistory}
            changeHistoryIndex={changeHistoryIndex}
            onHistoryChange={onHistoryChanged}
            onSelectionChanged={onSelectionChanged}
          />
        </div>
      </div>
    </>
  );
};
