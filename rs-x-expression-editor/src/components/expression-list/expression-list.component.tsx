import React from 'react';
import { FaEdit, FaEye, FaTrash, FaSuperscript } from 'react-icons/fa';

import './expression-list.component.css';
import { IExpressionInfo } from '../../models/expressionI-info.interface';
import { CrudRowActions } from '../crud-row-actions/crud-row-actions.component';

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
            key={`${expressionIndex}-${expressionInfo.version}`}
            className={`expression-item ${isSelected ? 'is-selected' : ''}`}
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
            {/* LEFT SIDE */}
            <div className='expression-left'>
              <FaSuperscript className='expression-icon' />
              <div className='expression-code'>
                {expressionInfo.expression.expressionString}
              </div>
            </div>

            {/* RIGHT SIDE */}
            <CrudRowActions
              prepend={
                <button
                  type='button'
                  className='icon-btn view-btn'
                  title='View details'
                  onClick={() => {
                    onView(modelIndex, expressionIndex);
                  }}
                >
                  <FaEye />
                </button>
              }
              onEdit={() => {
                onEdit(modelIndex, expressionIndex);
              }}
              onDelete={() => {
                onDelete(modelIndex, expressionIndex);
              }}
            />
          </div>
        );
      })}
    </div>
  );
};