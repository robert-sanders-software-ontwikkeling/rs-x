import React from 'react';
import { ZoomDropdown } from '../zoom-dropdown/zoom-dropdown.component';
import { FaTimes } from 'react-icons/fa';


export interface IExpressionTreePanelProps {
    selectedExpressionString: string;
    treeZoomPercent: number,
    onTreeZoomPercentChange: (value: number) => void
    onClose: () => void
}

export const ExpressionTreePanel: React.FC<IExpressionTreePanelProps> = ({
    selectedExpressionString,
    treeZoomPercent,
    onTreeZoomPercentChange,
    onClose

}) => {

    return (
        <div className='panel-header panel-header-row'>
            <div className='exprTreeHeaderTitle'>
                <span>Expression Tree</span>

                <span className='exprTreeHeaderExpr' title={selectedExpressionString}>
                    {selectedExpressionString}
                </span>
            </div>

            <div className='exprTreeHeaderControls'>
                <ZoomDropdown
                    value={treeZoomPercent}
                    onChange={onTreeZoomPercentChange}
                />

                <button
                    type='button'
                    className='icon-btn'
                    onClick={onClose}
                    title='Close'
                >
                    <FaTimes />
                </button>
            </div>
        </div>

    )
}