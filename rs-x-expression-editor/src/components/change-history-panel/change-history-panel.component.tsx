import { IExpressionChangeHistory } from '@rs-x/expression-parser';
import React from 'react';
import { FaTrash } from 'react-icons/fa';
import { IExpressionInfo } from '../../models/expression-info.interface';
import { ExpressionChangeHistoryView } from '../expression-change-history-view/expression-change-history-view.component';

export interface IChangeHistoryPanel {
    canClearSelectedHistory: boolean,
    selectedModelIndex: number,
    selectedExpressionIndex: number,
    selectedExpression: IExpressionInfo
    onClearSelectedHistory: () => void
    onHistoryChanged: (
        modelIndex: number, 
        expressionIndex,  
        changes: IExpressionChangeHistory[][]) => void
    onSelectionChanged: ( 
        modelIndex: number,
        expressionIndex: number,
        selectedChangeSetIndex: number,
        items:  IExpressionChangeHistory[]) => void
}


export const ChangeHistoryPanel: React.FC<IChangeHistoryPanel> = ({
    canClearSelectedHistory,
    selectedModelIndex,
    selectedExpressionIndex,
    selectedExpression,
    onHistoryChanged,
    onSelectionChanged,
    onClearSelectedHistory
}) => {

    return (
        <>
            <div className='panel-header panel-header-row'>
                <span>Change History</span>
                <button
                    type='button'
                    className='icon-btn '
                    disabled={!canClearSelectedHistory}
                    onClick={onClearSelectedHistory}
                    title='Clear full history for this expression'
                >
                    <FaTrash />
                </button>
            </div>

            <div className='panel-content'>
                <div className='scroll-host'>
                    <ExpressionChangeHistoryView
                        modelIndex={selectedModelIndex as number}
                        expressionIndex={selectedExpressionIndex as number}
                        expressionInfo={selectedExpression}
                        selectedChangeSetIndex={selectedExpression?.selecteChangeHistoryIndex ?? -1}
                        onHistoryChange={onHistoryChanged}
                        onSelectionChanged={onSelectionChanged}
                    />
                </div>
            </div>
        </>
    );
}