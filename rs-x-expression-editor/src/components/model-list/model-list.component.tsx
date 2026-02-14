import React from 'react';
import { FaPlus } from 'react-icons/fa';
import { IModelWithExpressions } from '../../models/model-with-expressions.interface';
import { Accordion, AccordionPanel } from '../accordion/accordion.component';
import { ExpressionList } from '../expression-list/expression-list.component';


export interface IModelListProps {
    modelsWithExpressions: IModelWithExpressions[];
    handleAddModel: () => void
    handleAddExpression: (model: object) => void,
    onSelectExpression: (mode: object, index: number) => void,
    onDeleteExpression: (mode: object, index: number) => void,
    onEditExpression: (mode: object, index: number) => void,
}

export const ModelList: React.FC<IModelListProps> = ({
    modelsWithExpressions,
    handleAddModel,
    handleAddExpression,
    onSelectExpression,
    onDeleteExpression,
    onEditExpression
}) => {

    const panels: AccordionPanel[] = modelsWithExpressions.map(modelWithExpressions => ({
        id: modelWithExpressions.name,
        header: (
            <>
                <span>{modelWithExpressions.name}</span>
                <button className='btn add-btn' onClick={() => handleAddExpression(modelWithExpressions.model)}>
                    <FaPlus /> Add Expression
                </button>
            </>
        ),
        body: <ExpressionList
            expressions={modelWithExpressions.expressions}
            selectedExpressionIndex={modelWithExpressions.selectedExpressionIndex}
            model= {modelWithExpressions.model}
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
                <Accordion panels={panels} />

            </div>
        </>
    );
}