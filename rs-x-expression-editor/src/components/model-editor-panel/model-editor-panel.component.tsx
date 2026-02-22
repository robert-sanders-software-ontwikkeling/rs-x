import React from 'react';
import { ModelEditor } from '../model-editor/model-editor.component';


export interface IModelEditorPanel {
    modelVersion: number;
    modelIndex: number;
    model: object;
    onChange: (modelIndex: number, model: object) => void;
}


export const ModelEditorPanel: React.FC<IModelEditorPanel> = ({
    modelVersion,
    modelIndex,
    model,
    onChange
}) => {

    return (
        <>
            <div className='panel-header'>Model</div>
            <div className='editor-wrapper'>
                <ModelEditor
                    key={modelVersion}
                    modelIndex={modelIndex}
                    model={model}
                    onCommit={onChange}
                />
            </div>
        </>

    );
}