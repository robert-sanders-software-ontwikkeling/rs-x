'use client';

import type { BeforeMount, OnMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import React, { useEffect, useMemo, useState } from 'react';
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
    secondaryActionName?: string;
    secondaryAction?: (value: string, name: string) => void;
    secondaryActionDisabled?: boolean;
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
    secondaryActionName,
    secondaryAction,
    secondaryActionDisabled,
    options,
}) => {
    const [EditorComponent, setEditorComponent] =
        useState<null | React.ComponentType<{
            theme?: string;
            path?: string;
            height?: string | number;
            defaultLanguage?: string;
            value?: string;
            options?: Monaco.editor.IStandaloneEditorConstructionOptions;
            onChange?: (value: string | undefined) => void;
            onMount?: OnMount;
            beforeMount?: BeforeMount;
        }>>(null);
    const [currentName, setCurrentName] = useState(name ?? '');
    const [currentValue, setCurrentValue] = useState(value ?? '');
    const [editorTheme, setEditorTheme] = useState<'vs' | 'vs-dark'>('vs');

    useEffect(() => {
        let isMounted = true;

        void import('@monaco-editor/react').then(({ Editor }) => {
            if (isMounted) {
                setEditorComponent(() => Editor);
            }
        });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (typeof document === 'undefined') {
            return;
        }

        const resolveTheme = () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            setEditorTheme(isDark ? 'vs-dark' : 'vs');
        };

        resolveTheme();

        const observer = new MutationObserver(resolveTheme);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme'],
        });

        return () => {
            observer.disconnect();
        };
    }, []);

    useEffect(() => {
        setCurrentValue(value ?? '');
    }, [value]);

    useEffect(() => {
        setCurrentName(name ?? '');
    }, [name]);

    const isSaveDisabled = !currentValue.trim() || (!hideName && !currentName.trim());
    const mergedOptions = useMemo(() => {
        const baseOptions: Monaco.editor.IStandaloneEditorConstructionOptions = {
            automaticLayout: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: {
                vertical: 'hidden',
                horizontal: 'hidden',
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
                handleMouseWheel: true,
                alwaysConsumeMouseWheel: false,
            },
        };

        return {
            ...baseOptions,
            ...options,
        };
    }, [options]);

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
                        className='btn btnSm tsEditorCompileBtn'
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

                    {secondaryAction && (
                        <button
                            type='button'
                            className='btn btnGhost btnSm'
                            disabled={secondaryActionDisabled}
                            onClick={() => {
                                secondaryAction(currentValue, currentName);
                            }}
                        >
                            <span>{secondaryActionName ?? 'Action'}</span>
                        </button>
                    )}
                </div>
            </div>

            <div className='tsEditorBody'>
                <div className='editor-wrapper'>
                    {EditorComponent ? (
                        <EditorComponent
                            theme={editorTheme}
                            path='file:///src/main.ts'
                            height='100%'
                            defaultLanguage='typescript'
                            value={currentValue}
                            options={mergedOptions}
                            onChange={onValueChange}
                            onMount={onMount}
                            beforeMount={beforeMount}
                        />
                    ) : null}
                </div>
            </div>
        </div>
    );
};
