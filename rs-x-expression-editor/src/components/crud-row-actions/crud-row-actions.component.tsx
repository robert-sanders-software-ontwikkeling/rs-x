import React from 'react';
import { FaEdit, FaTrash } from 'react-icons/fa';

export interface ICrudRowActionsProps {
    onEdit: () => void;
    onDelete: () => void;

    prepend?: React.ReactNode;

    append?: React.ReactNode;

    className?: string;

    editTitle?: string;
    deleteTitle?: string;

    isEditDisabled?: boolean;
    isDeleteDisabled?: boolean;
}

export function CrudRowActions(props: ICrudRowActionsProps): React.ReactElement {
    const {
        onEdit,
        onDelete,
        prepend,
        append,
        className,
        editTitle,
        deleteTitle,
        isEditDisabled,
        isDeleteDisabled,
    } = props;

    return (
        <div
            className={className ?? 'icon-bar'}
            role='group'
            aria-label='Actions'
            onClick={(e) => {
                e.stopPropagation();
            }}
            onMouseDown={(e) => {
                e.stopPropagation();
            }}
            onKeyDown={(e) => {
                e.stopPropagation();
            }}
        >
            {prepend}

            <button
                type='button'
                className='icon-btn edit-btn'
                title={editTitle ?? 'Edit'}
                aria-label={editTitle ?? 'Edit'}
                disabled={isEditDisabled === true}
                onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                }}
            >
                <FaEdit />
            </button>

            <button
                type='button'
                className='icon-btn delete-btn'
                title={deleteTitle ?? 'Delete'}
                aria-label={deleteTitle ?? 'Delete'}
                disabled={isDeleteDisabled === true}
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
            >
                <FaTrash />
            </button>

            {append}
        </div>
    );
}