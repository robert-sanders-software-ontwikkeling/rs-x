import React from 'react';
import { IExpression } from '@rs-x/expression-parser';
import { FaEdit, FaTrash } from 'react-icons/fa';
import './expression-list.component.css';

export interface IExpressionListProps {
    model: object,
    expressions: IExpression[];
    selectedExpressionIndex: number | null;

    onSelect: (model:object, index: number) => void;
    onEdit: (model:object, index: number) => void;
    onDelete: (model:object, index: number) => void;
}

export const ExpressionList: React.FC<IExpressionListProps> = ({
    model,
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
            {expressions.map((expr, index) => {
                const isSelected = selectedExpressionIndex === index;

                return (
                    <div
                        key={`${index}-${expr.expressionString}`}
                        className={`expression-item ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => onSelect(model, index)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') onSelect(model, index);
                        }}
                    >
                        <div className="expression-code">{expr.expressionString}</div>

                        <div className="expression-actions" onClick={(e) => e.stopPropagation()}>
                            <button
                                className="btn icon-btn edit-btn"
                                title="Edit"
                                onClick={() => {
                                    onSelect(model, index);  // ✅ edit selects too
                                    onEdit(model, index);
                                }}
                            >
                                <FaEdit />
                            </button>

                            <button
                                className="btn icon-btn delete-btn"
                                title="Delete"
                                onClick={() => onDelete(model,index)}
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