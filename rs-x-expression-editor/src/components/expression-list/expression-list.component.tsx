import React from 'react';
import { IExpression } from '@rs-x/expression-parser';
import { FaEdit, FaTrash } from 'react-icons/fa';
import './expression-list.component.css';

export interface IExpressionListProps {
    modelIndex:number,
    expressions: IExpression[];
    selectedExpressionIndex: number | null;

    onSelect: (modelIndex:number, expressionIndex: number) => void;
    onEdit: (modelIndex:number, expressionIndex: number) => void;
    onDelete: (modelIndex:number, expressionIndex: number) => void;
}

export const ExpressionList: React.FC<IExpressionListProps> = ({
    modelIndex,
    expressions,
    selectedExpressionIndex,
    onSelect,
    onEdit,
    onDelete,
}) => {
    if (!expressions.length) {
        return <i className="expression-empty">No expressions yet</i>;
    }

    return (
        <div className="expression-list">
            {expressions.map((expr, expressionIndex) => {
                const isSelected = selectedExpressionIndex === expressionIndex;

                return (
                    <div
                        key={`${expressionIndex}-${expr.expressionString}`}
                        className={`expression-item ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => onSelect(modelIndex, expressionIndex)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') onSelect(modelIndex, expressionIndex);
                        }}
                    >
                        <div className="expression-code">{expr.expressionString}</div>

                        <div className="expression-actions" onClick={(e) => e.stopPropagation()}>
                            <button
                                className="btn icon-btn edit-btn"
                                title="Edit"
                                onClick={() => onEdit(modelIndex, expressionIndex)}
                            >
                                <FaEdit />
                            </button>

                            <button
                                className="btn icon-btn delete-btn"
                                title="Delete"
                                onClick={() => onDelete(modelIndex,expressionIndex)}
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