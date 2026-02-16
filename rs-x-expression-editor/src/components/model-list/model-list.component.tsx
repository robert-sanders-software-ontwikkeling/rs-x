import React from 'react';
import { FaPlus } from 'react-icons/fa';
import { IModelWithExpressions } from '../../models/model-with-expressions.interface';
import { Accordion, AccordionPanel } from '../accordion/accordion.component';
import { ExpressionList } from '../expression-list/expression-list.component';


export interface IModelListProps {
    selectModelIndex?: number;
    modelsWithExpressions: IModelWithExpressions[];
    onAddModel: () => void;
    onSelectModel: (modelIndex: number) => void,
    onAddExpression: (modelIndex: number) => void,
    onSelectExpression: (modelIndex: number, expressionIndex: number) => void,
    onDeleteExpression: (modelIndex: number, expressionIndex: number) => void,
    onEditExpression: (modelIndex: number, expressionIndex: number) => void,
}

export const ModelList: React.FC<IModelListProps> = ({
    selectModelIndex,
    modelsWithExpressions,
    onSelectModel,
    onAddModel: handleAddModel,
    onAddExpression: handleAddExpression,
    onSelectExpression,
    onDeleteExpression,
    onEditExpression
}) => {

    const panels: AccordionPanel[] = modelsWithExpressions.map((modelWithExpressions, modelIndex) => ({
        id: modelWithExpressions.name,
        header: (
            <>
                <span>{modelWithExpressions.name}</span>
                <button className='btn add-btn' onClick={() => handleAddExpression(modelIndex)}>
                    <FaPlus /> Add Expression
                </button>
            </>
        ),
        body: <ExpressionList
            expressions={modelWithExpressions.expressions}
            selectedExpressionIndex={modelWithExpressions.selectedExpressionIndex}
            modelIndex= {modelIndex}
            onSelect={onSelectExpression}
            onDelete={onDeleteExpression}
            onEdit={onEditExpression}
        />,
    }));

    return (
        <>
            <div className='panel-header'>
                Models
                <button className='btn add-btn' onClick={handleAddModel}>
                    <FaPlus /> Add
                </button>
            </div>
            <div className='editor-wrapper'>
                <Accordion panels={panels} openPanelIndex={selectModelIndex} onOpenChange={onSelectModel} />

            </div>
        </>
    );
}