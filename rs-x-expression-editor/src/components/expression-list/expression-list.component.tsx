import React from 'react';
import { FaEdit, FaEye, FaTrash } from 'react-icons/fa';

import './expression-list.component.css';
import type { IExpressionInfo } from '../../models/expressionI-info.interface';

export interface IExpressionListProps {
  modelIndex: number;
  expressions: IExpressionInfo[];
  selectedExpressionIndex: number | null;

  onSelect: (modelIndex: number, expressionIndex: number) => void;
  onEdit: (modelIndex: number, expressionIndex: number) => void;
  onDelete: (modelIndex: number, expressionIndex: number) => void;
  onView: (modelIndex: number, expressionIndex: number) => void;
}

export const ExpressionList: React.FC<IExpressionListProps> = ({
  modelIndex,
  expressions,
  selectedExpressionIndex,
  onSelect,
  onEdit,
  onDelete,
  onView,
}) => {
  if (!expressions.length) {
    return <i className='expression-empty'>No expressions yet</i>;
  }

  return (
    <div className='expression-list'>
      {expressions.map((expressionInfo, expressionIndex) => {
        const isSelected = selectedExpressionIndex === expressionIndex;

        return (
          <div
            key={`${expressionIndex}-${expressionInfo.expression.expressionString}`}
            className={`expression-row ${isSelected ? 'is-selected' : ''}`}
            onClick={() => {
              onSelect(modelIndex, expressionIndex);
            }}
            role='button'
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onSelect(modelIndex, expressionIndex);
              }
            }}
          >
            <div className='expression-code'>{expressionInfo.expression.expressionString}</div>

            <div
              className='expression-actions'
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <button
                type='button'
                className='expression-action'
                title='View details'
                onClick={() => {
                  onView(modelIndex, expressionIndex);
                }}
              >
                <FaEye />
              </button>

              <button
                type='button'
                className='expression-action'
                title='Edit'
                onClick={() => {
                  onEdit(modelIndex, expressionIndex);
                }}
              >
                <FaEdit />
              </button>

              <button
                type='button'
                className='expression-action expression-action--danger'
                title='Delete'
                onClick={() => {
                  onDelete(modelIndex, expressionIndex);
                }}
              >
                <FaTrash />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};