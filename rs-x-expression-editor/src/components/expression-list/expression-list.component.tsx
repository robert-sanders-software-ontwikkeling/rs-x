import React from 'react';
import { FaEye, FaSuperscript, FaExclamationTriangle } from 'react-icons/fa';

import { IExpressionInfo } from '../../models/expression-info.interface';
import { CrudRowActions } from '../crud-row-actions/crud-row-actions.component';
import './expression-list.component.css';

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
        const className = `expression-item ${isSelected ? 'is-selected' : ''}`;
      
        return (

          
          (<div
            key={`${expressionIndex}-${expressionInfo.version}`}
            className={className} 
            title={expressionInfo.error}
            onClick={ expressionInfo.expression ? () => {

              onSelect(modelIndex, expressionIndex);
            } : undefined}
            role='button'
            tabIndex={0}
            onKeyDown={(e) => {
              
              if (expressionInfo.expression && e.key === 'Enter' || e.key === ' ') {
                onSelect(modelIndex, expressionIndex);
              }
            }}
          >
             {expressionInfo.error  &&  (<FaExclamationTriangle title={expressionInfo.error} className='expression-error-icon'/>)}
            {/* LEFT SIDE */}
            <div className='expression-left'>
              <FaSuperscript className='expression-icon' />
              <div className='expression-code'>
                {expressionInfo.expression?.expressionString ?? expressionInfo.editorExpressionString }
              </div>
            </div>

            {/* RIGHT SIDE */}
            <CrudRowActions
              prepend={
                ( expressionInfo.expression &&
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
                )
              }
              onEdit={() => {
                onEdit(modelIndex, expressionIndex);
              }}
              onDelete={() => {
                onDelete(modelIndex, expressionIndex);
              }}
            />
          </div>
          )
        );
      })}
    </div>
  );
};