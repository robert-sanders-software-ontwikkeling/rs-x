import { Editor, OnMount } from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import React, { useState } from 'react';
import { FaCheck, FaTimes } from 'react-icons/fa';

export interface TSEditorProps {
    onMount?: OnMount;
    valueChange?: (value: string | undefined) => void;
    save: (name: string, value: string) => void
    cancel: () => void,
    header: string;
    name?: string,
    value?: string;
    options?: monaco.editor.IStandaloneEditorConstructionOptions
}

export const TSEditor: React.FC<TSEditorProps> = ({ header, name, value, onMount, valueChange, save, cancel, options }) => {
    const [currentName, setCurrentName] = useState(name ?? '');
    const [currenValue, setCurrentValue] = useState<string | undefined>(value ?? '');
    const isSaveDisabled = !currentName?.trim() || !currenValue?.trim();

    const onSave = () => {
        if (currentName && currenValue) {
            try {
                save(currentName, currenValue);
            } catch (e) {
                console.log(e);
            }
        }
    };

    const onValueChange = (value: string | undefined) => {
        setCurrentValue(value);
        valueChange?.(value)
    };

    const onCancel = () => {
        cancel();
    };

    return (
        <>
            <div className='top-bar'>
                <div className="input-group">
                    <label htmlFor="name">Name:</label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setCurrentName(e.target.value)}
                        required
                        placeholder="Enter name"
                    />
                </div>
                <button className='btn save-btn' disabled={isSaveDisabled} onClick={onSave}>
                    <FaCheck /> Save
                </button>
                <button className='btn cancel-btn' onClick={onCancel}>
                    <FaTimes /> Cancel
                </button>
            </div>
            <div className='panel-header'>{header}</div>

            <div className='editor-wrapper'>
                <Editor
                    theme='vs-dark'
                    height='100%'
                    defaultLanguage='typescript'
                    value={value}
                    options={options}
                    onChange={onValueChange}
                    onMount={onMount}
                />
            </div>
        </>
    );
}