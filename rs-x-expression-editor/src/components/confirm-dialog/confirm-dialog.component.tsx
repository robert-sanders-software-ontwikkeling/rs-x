import React, { useMemo } from 'react';
import { FaTimes, FaTrash } from 'react-icons/fa';

import './confirm-dialog.component.css';
import { useModalOverlay } from './hooks/use-modal-overlay';

export interface IConfirmDialogProps {
    isOpen: boolean;

    title?: string;
    message?: string;

    confirmText?: string;
    cancelText?: string;

    /** for destructive actions (red confirm button) */
    intent?: 'danger' | 'primary';

    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmDialog: React.FC<IConfirmDialogProps> = (props) => {
    const {
        isOpen,
        title = 'Confirm',
        message = 'Are you sure?',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        intent = 'danger',
        onConfirm,
        onCancel,
    } = props;

    const confirmClassName =
        intent === 'danger'
            ? 'confirmDialogBtn confirmDialogBtnDanger'
            : 'confirmDialogBtn confirmDialogBtnPrimary';

    useModalOverlay({
        isOpen,
        onCancel,
        onConfirm,
    });


    if (!isOpen) {
        return null;
    }

    return (
        <div
            className='confirmDialogOverlay'
            role='dialog'
            aria-modal='true'
            aria-label={title}
            onMouseDown={() => { onCancel(); }}
        >
            <div
                className='confirmDialog'
                onMouseDown={(e) => { e.stopPropagation(); }}
            >
                <div className='confirmDialogHeader'>
                    <div className='confirmDialogTitle'>{title}</div>

                    <button
                        type='button'
                        className='confirmDialogIconBtn'
                        onClick={() => { onCancel(); }}
                        aria-label='Close'
                        title='Close'
                    >
                        <FaTimes />
                    </button>
                </div>

                <div className='confirmDialogBody'>
                    <div className='confirmDialogMessage'>{message}</div>
                </div>

                <div className='confirmDialogFooter'>
                    <button
                        type='button'
                        className='confirmDialogBtn confirmDialogBtnCancel'
                        onClick={() => { onCancel(); }}
                    >
                        {cancelText}
                    </button>

                    <button
                        type='button'
                        className={confirmClassName}
                        onClick={() => { onConfirm(); }}
                    >
                        {intent === 'danger' ? <FaTrash /> : null}
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};