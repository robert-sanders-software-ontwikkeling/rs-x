import React from 'react';


export interface IErrorPanel {
    error: string
}

export const ErrorPanel: React.FC<IErrorPanel> = ({ error }) => {
    return (

        <>
            <div className='panel-header'>Errors</div>
            <div className='panel-body'>
                <p>{error}</p>
            </div>
        </>
    );
}