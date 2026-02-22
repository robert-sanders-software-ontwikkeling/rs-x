import React from 'react';
import { ModelList } from '../model-list/model-list.component';
import { IModelWithExpressions } from '../../models/model-with-expressions.interface';

export interface IModelListPanelProps {
    visible: boolean;
    selectedModelIndex: number;
    modelsWithExpressions: IModelWithExpressions[];
    onSelectModel: (modelIndex: number) => void;
    onAddModel: () => void;
    onDeleteModel: (modelIndex: number) => void;
    onEditModel: (modelIndex: number) => void;
    onAddExpression: (modelIndex: number) => void;
    onSelectExpression: (modelIndex: number, expressionIndex: number) => void;
    onEditExpression: (modelIndex: number, expressionIndex: number) => void;
    onDeleteExpression: (modelIndex: number, expressionIndex: number) => void;
    onViewExpression: (modelIndex: number, expressionIndex: number) => void;
}


export const ModelListPanel: React.FC<IModelListPanelProps> = ({
    visible,
    selectedModelIndex,
    modelsWithExpressions,
    onSelectModel,
    onAddModel,
    onDeleteModel,
    onEditModel,
    onAddExpression,
    onSelectExpression,
    onEditExpression,
    onDeleteExpression,
    onViewExpression
}) => {

    return (
        <div
            className={`view-layer ${visible
                ? 'view-layer--active'
                : 'view-layer--inactive'
                }`}
        >
            <ModelList
                selectModelIndex={selectedModelIndex}
                modelsWithExpressions={modelsWithExpressions}
                onSelectModel={onSelectModel}
                onAddModel={onAddModel}
                onDeleteModel={onDeleteModel}
                onEditModel={onEditModel}
                onAddExpression={onAddExpression}
                onSelectExpression={onSelectExpression}
                onEditExpression={onEditExpression}
                onDeleteExpression={onDeleteExpression}
                onViewExpression={onViewExpression}
            />
        </div>

    );

};