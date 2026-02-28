import React from 'react';
import { FaDatabase, FaLayerGroup, FaPlus } from 'react-icons/fa';

import type { IModelWithExpressions } from '../../models/model-with-expressions.interface';
import {
  Accordion,
  type AccordionPanel,
} from '../accordion/accordion.component';
import { CrudRowActions } from '../crud-row-actions/crud-row-actions.component';
import { ExpressionList } from '../expression-list/expression-list.component';

export interface IModelListProps {
  selectedModelIndex?: number;
  selectedExpressionIndex?: number;
  modelsWithExpressions: IModelWithExpressions[];
  onAddModel: () => void;
  onEditModel: (modelIndex: number) => void;
  onDeleteModel: (modelIndex: number) => void;
  onSelectModel: (modelIndex: number) => void;
  onAddExpression: (modelIndex: number) => void;
  onSelectExpression: (modelIndex: number, expressionIndex: number) => void;
  onDeleteExpression: (modelIndex: number, expressionIndex: number) => void;
  onEditExpression: (modelIndex: number, expressionIndex: number) => void;
}

export const ModelList: React.FC<IModelListProps> = ({
  selectedModelIndex,
  selectedExpressionIndex,
  modelsWithExpressions,
  onSelectModel,
  onAddModel,
  onEditModel,
  onDeleteModel,
  onAddExpression,
  onSelectExpression,
  onDeleteExpression,
  onEditExpression,
}) => {
  const panels: AccordionPanel[] = modelsWithExpressions.map(
    (modelWithExpressions, modelIndex) => ({
      id: modelWithExpressions.name,
      header: (
        <div
          className={`model-row ${selectedModelIndex === modelIndex ? 'is-selected' : ''}`}
        >
          <div className="model-row-left">
            <FaDatabase className="model-row-icon" />
            <span className="model-row-title">{modelWithExpressions.name}</span>
          </div>

          <CrudRowActions
            prepend={
              <button
                type="button"
                className="icon-btn edit-btn"
                title="Add Expression"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddExpression(modelIndex);
                }}
              >
                <FaPlus />
              </button>
            }
            onEdit={() => {
              onEditModel(modelIndex);
            }}
            onDelete={() => {
              onDeleteModel(modelIndex);
            }}
          />
        </div>
      ),
      body: (
        <ExpressionList
          expressions={modelWithExpressions.expressions}
          selectedExpressionIndex={selectedExpressionIndex}
          modelIndex={modelIndex}
          onSelect={onSelectExpression}
          onDelete={onDeleteExpression}
          onEdit={onEditExpression}
        />
      ),
    }),
  );

  return (
    <>
      <div className="panel-header">
        <div className="panel-header__left">
          <FaLayerGroup className="panel-header__icon" />
          <span>Models</span>
        </div>

        <button
          type="button"
          className="btn btn--addModel"
          onClick={onAddModel}
        >
          <FaPlus />
          Add Model
        </button>
      </div>

      <div className="editor-wrapper">
        <Accordion
          panels={panels}
          openPanelIndex={selectedModelIndex}
          onOpenChange={onSelectModel}
        />
      </div>
    </>
  );
};
