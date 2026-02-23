import { type BeforeMount, Editor, type OnMount } from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import React, { useState } from 'react';
import { FaCheck, FaTimes } from 'react-icons/fa';

import './ts-editor.component.css';

const beforeMount: BeforeMount = (monaco) => {
  const ts = monaco.languages.typescript;
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

export interface TSEditorProps {
  onMount?: OnMount;
  valueChange?: (value: string | undefined) => void;
  save: (name: string, value: string) => void;
  cancel: () => void;
  header: string;
  name?: string;
  namePlaceholder;
  value?: string;
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
}

export const TSEditor: React.FC<TSEditorProps> = ({
  header,
  name,
  value,
  namePlaceholder,

  onMount,
  valueChange,
  save,
  cancel,
  options,
}) => {
  const [currentName, setCurrentName] = useState(name ?? '');
  const [currentValue, setCurrentValue] = useState<string>(value ?? '');

  // ✅ Name is optional now; only editor content disables Save
  const isSaveDisabled = !currentValue.trim() || !currentName.trim();

  const onSave = () => {
    if (!currentValue.trim()) {
      return;
    }

    // ✅ If name is empty, use the first line of the editor as default name
    const fallbackName = currentValue.split('\n')[0]?.trim() ?? '';
    const finalName = currentName.trim() || fallbackName;

    save(finalName, currentValue);
  };

  const onValueChange = (next: string | undefined) => {
    const nextValue = next ?? '';
    setCurrentValue(nextValue);
    valueChange?.(next);
  };

  return (
    <>
      <div className="tsEditorHeader panel-header">
        <div className="tsEditorHeaderLeft">
          <div className="tsEditorTitle">{header}</div>

          <div className="tsEditorInputGroup">
            <input
              id="tsEditorName"
              className="tsEditorInput"
              type="text"
              value={currentName}
              onChange={(e) => {
                setCurrentName(e.target.value);
              }}
              placeholder={namePlaceholder}
            />
          </div>
        </div>

        <div className="tsEditorHeaderRight">
          <button
            type="button"
            className="btn btn--save"
            disabled={isSaveDisabled}
            onClick={() => {
              onSave();
            }}
          >
            <FaCheck /> Save
          </button>

          <button
            type="button"
            className="btn btn--cancel"
            onClick={() => {
              cancel();
            }}
          >
            <FaTimes /> Cancel
          </button>
        </div>
      </div>

      <div className="editor-wrapper">
        <Editor
          theme="vs-dark"
          path="file:///src/main.ts"
          height="100%"
          defaultLanguage="typescript"
          value={currentValue}
          options={options}
          onChange={onValueChange}
          onMount={onMount}
          beforeMount={beforeMount}
        />
      </div>
    </>
  );
};
