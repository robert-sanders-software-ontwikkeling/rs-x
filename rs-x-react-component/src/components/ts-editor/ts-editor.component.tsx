import { type BeforeMount, Editor, type OnMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import React, { useState } from 'react';
import { FaCheck, FaTimes } from 'react-icons/fa';

import './ts-editor.component.css';

const beforeMount: BeforeMount = (monaco: typeof Monaco) => {
    const ts = monaco.typescript;

    ts.typescriptDefaults.setEagerModelSync(true);
    ts.typescriptDefaults.setCompilerOptions({
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        baseUrl: 'file:///',
        paths: {
            rxjs: ['node_modules/rxjs/dist/types/index.d.ts'],
            'rxjs/*': ['node_modules/rxjs/dist/types/*'],
            'rxjs/operators': ['node_modules/rxjs/dist/types/operators/index.d.ts'],
            'rxjs/operators/*': ['node_modules/rxjs/dist/types/operators/*'],
        },
    });
};

export function installMonacoPlaceholder(
    editor: Monaco.editor.IStandaloneCodeEditor,
    monaco: typeof Monaco,
    text: string,
) {
    const domNode = document.createElement('div');

    domNode.className = 'monaco-placeholder';
    domNode.textContent = text;

    const widget: Monaco.editor.IContentWidget = {
        getId() {
            return 'rsx-editor-placeholder';
        },

        getDomNode() {
            return domNode;
        },

        getPosition() {
            return {
                position: { lineNumber: 1, column: 1 },
                preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
            };
        },
    };

    const update = () => {
        const value = editor.getValue();
        domNode.style.display = value.trim().length === 0 ? 'block' : 'none';
    };

    editor.addContentWidget(widget);
    update();

    editor.onDidChangeModelContent(update);
}

export interface TSEditorProps {
    saveButtonName?: string;
    header: string;
    name?: string;
    hideName?: boolean;
    hideCancelButton?: boolean;
    namePlaceholder?: string;
    value?: string;
    options?: Monaco.editor.IStandaloneEditorConstructionOptions;
    onMount?: OnMount;
    onChange?: (value: string) => void;
    save: (value: string, name: string) => void;
    cancel?: () => void;
}

export const TSEditor: React.FC<TSEditorProps> = ({
    header,
    name,
    value,
    namePlaceholder,
    hideName,
    saveButtonName,
    onMount,
    onChange,
    save,
    cancel,
    options,
}) => {
    const [currentName, setCurrentName] = useState(name ?? '');
    const [currentValue, setCurrentValue] = useState(value ?? '');

    const isSaveDisabled = !currentValue.trim() || (!hideName && !currentName.trim());

    const onSave = () => {
        if (!currentValue.trim()) {
            return;
        }

        let nextName = '';
        if (!hideName) {
            const fallbackName = currentValue.split('\n')[0]?.trim() ?? '';
            nextName = currentName.trim() || fallbackName;
        }

        save(currentValue,nextName);
    };

    const onValueChange = (next: string | undefined) => {
        const nextValue = next ?? '';
        setCurrentValue(nextValue);
        onChange?.(nextValue);
    };

    return (
        <div className='tsEditorShell'>
            <div className='tsEditorHeader'>
                <div className='tsEditorHeaderLeft'>
                    <div className='tsEditorTitle'>{header}</div>

                    {!hideName && (
                        <div className='tsEditorInputGroup'>
                            <input
                                id='tsEditorName'
                                className='tsEditorInput'
                                type='text'
                                value={currentName}
                                onChange={(e) => {
                                    setCurrentName(e.target.value);
                                }}
                                placeholder={namePlaceholder}
                            />
                        </div>
                    )}
                </div>

                <div className='tsEditorHeaderRight'>
                    <button
                        type='button'
                        className='btn btnPrimary btnSm'
                        disabled={isSaveDisabled}
                        onClick={() => {
                            onSave();
                        }}
                    >
                        <FaCheck />
                        <span>{saveButtonName ?? 'Save'}</span>
                    </button>

                    {cancel && (
                        <button
                            type='button'
                            className='btn btnGhost btnSm'
                            onClick={() => {
                                cancel();
                            }}
                        >
                            <FaTimes />
                            <span>Cancel</span>
                        </button>
                    )}
                </div>
            </div>

            <div className='tsEditorBody'>
                <div className='editor-wrapper'>
                    <Editor
                        theme='vs-dark'
                        path='file:///src/main.ts'
                        height='100%'
                        defaultLanguage='typescript'
                        value={currentValue}
                        options={options}
                        onChange={onValueChange}
                        onMount={onMount}
                        beforeMount={beforeMount}
                    />
                </div>
            </div>
        </div>
    );
};