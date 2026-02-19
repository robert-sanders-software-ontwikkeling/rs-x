import { Editor, type OnMount } from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import React, { useState } from 'react';
import { FaCheck, FaTimes } from 'react-icons/fa';

import './ts-editor.component.css';

export interface TSEditorProps {
  onMount?: OnMount;
  valueChange?: (value: string | undefined) => void;
  save: (name: string, value: string) => void;
  cancel: () => void;
  header: string;
  name?: string;
  value?: string;
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
}

export const TSEditor: React.FC<TSEditorProps> = ({
  header,
  name,
  value,
  onMount,
  valueChange,
  save,
  cancel,
  options,
}) => {
  const [currentName, setCurrentName] = useState(name ?? '');
  const [currentValue, setCurrentValue] = useState<string>(value ?? '');

  // ✅ Name is optional now; only editor content disables Save
  const isSaveDisabled = !currentValue.trim();

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
      <div className='tsEditorHeader panel-header'>
        <div className='tsEditorHeaderLeft'>
          <div className='tsEditorTitle'>{header}</div>

          <div className='tsEditorInputGroup'>
            <label className='tsEditorLabel' htmlFor='tsEditorName'>
              Name
            </label>
            <input
              id='tsEditorName'
              className='tsEditorInput'
              type='text'
              value={currentName}
              onChange={(e) => { setCurrentName(e.target.value); }}
              // ✅ Placeholder mirrors Monaco value (only meaningful when input is empty)
              placeholder={currentValue.trim() || 'Enter name'}
            />
          </div>
        </div>

        <div className='tsEditorHeaderRight'>
          <button
            type='button'
            className='tsEditorBtn tsEditorBtnSave me-commit'
            disabled={isSaveDisabled}
            onClick={() => { onSave(); }}
          >
            <FaCheck /> Save
          </button>

          <button
            type='button'
            className='tsEditorBtn tsEditorBtnCancel me-cancel'
            onClick={() => { cancel(); }}
          >
            <FaTimes /> Cancel
          </button>
        </div>
      </div>

      <div className='editor-wrapper'>
        <Editor
          theme='vs-dark'
          height='100%'
          defaultLanguage='typescript'
          value={currentValue}
          options={options}
          onChange={onValueChange}
          onMount={onMount}
        />
      </div>
    </>
  );
};