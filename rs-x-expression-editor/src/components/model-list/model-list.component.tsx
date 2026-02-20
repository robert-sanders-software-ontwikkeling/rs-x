import React from 'react';
import { FaPlus } from 'react-icons/fa';

import type { IModelWithExpressions } from '../../models/model-with-expressions.interface';
import { Accordion, type AccordionPanel } from '../accordion/accordion.component';
import { ExpressionList } from '../expression-list/expression-list.component';

export interface IModelListProps {
  selectModelIndex?: number;
  modelsWithExpressions: IModelWithExpressions[];
  onAddModel: () => void;
  onSelectModel: (modelIndex: number) => void;
  onAddExpression: (modelIndex: number) => void;
  onSelectExpression: (modelIndex: number, expressionIndex: number) => void;
  onDeleteExpression: (modelIndex: number, expressionIndex: number) => void;
  onEditExpression: (modelIndex: number, expressionIndex: number) => void;
  onViewExpression: (modelIndex: number, expressionIndex: number) => void;
}

export const ModelList: React.FC<IModelListProps> = ({
  selectModelIndex,
  modelsWithExpressions,
  onSelectModel,
  onAddModel: handleAddModel,
  onAddExpression: handleAddExpression,
  onSelectExpression,
  onDeleteExpression,
  onEditExpression,
  onViewExpression,
}) => {
  const panels: AccordionPanel[] = modelsWithExpressions.map((modelWithExpressions, modelIndex) => ({
    id: modelWithExpressions.name,
    header: (
      <div className={`model-row ${selectModelIndex === modelIndex ? 'is-selected' : ''}`}>
        <span className='model-row-title'>{modelWithExpressions.name}</span>

        <button
          type='button'
          className='btn btn--addExpression'
          onClick={(e) => {
            e.stopPropagation();
            handleAddExpression(modelIndex);
          }}
        >
          <FaPlus /> Add Expression
        </button>
      </div>
    ),
    body: (
      <ExpressionList
        expressions={modelWithExpressions.expressions}
        selectedExpressionIndex={modelWithExpressions.selectedExpressionIndex}
        modelIndex={modelIndex}
        onSelect={onSelectExpression}
        onDelete={onDeleteExpression}
        onEdit={onEditExpression}
        onView={onViewExpression}
      />
    ),
  }));

  return (
    <>
      <div className='panel-header'>
        <span>Models</span>

        <button
          type='button'
          className='btn btn--addModel'
          onClick={() => {
            handleAddModel();
          }}
        >
          <FaPlus /> Add Model
        </button>
      </div>

      <div className='editor-wrapper'>
        <Accordion
          panels={panels}
          openPanelIndex={selectModelIndex}
          onOpenChange={onSelectModel}
        />
      </div>
    </>
  );
};