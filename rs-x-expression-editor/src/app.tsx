import React, { useRef, useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import Editor from '@monaco-editor/react';
import type { OnMount } from '@monaco-editor/react';
import { FaPlus, FaCheck, FaTimes } from 'react-icons/fa';
import type * as monaco from 'monaco-editor';

import './app.css';
import { ModelIntellisenseService } from './services/intellisense.service';


export const App: React.FC = () => {
  const expressionEditorRef = useRef<monaco.editor.IStandaloneCodeEditor>(null);
  const modelEditorRef = useRef<monaco.editor.IStandaloneCodeEditor>(null);

  const [addingExpression, setAddingExpression] = useState(false);
  const [modelValue, setModelValue] = useState<string>(''); // <-- empty by default

  const intellisenseService = new ModelIntellisenseService();



  const handleModelChange = (value: string | undefined) =>
    value &&
    (() => {
      try {
        const model = new Function(`return ${value}`)(); // evaluate JS safely (expression only)
        intellisenseService.model = model;
        setModelValue(value);
      } catch {
        // ignore parse errors
      }
    })();

  // Button handlers
  const handleAddExpression = () => setAddingExpression(true);
  const handleCancel = () => setAddingExpression(false);
  const handleSave = () => {
    alert('Expression saved!');
    setAddingExpression(false);
  };

  // Register expression editor intellisense
  const handleExpressionMount: OnMount = (editor, monacoInstance) => {
    expressionEditorRef.current = editor;
    intellisenseService.registerCompletionProvider(monacoInstance);
  };

  const handleModelMount: OnMount = (editor) => (modelEditorRef.current = editor);

  return (
    <div className='app'>
      <Group orientation='horizontal' className='panels-container'>
        {/* Columns 1 & 2 */}
        {!addingExpression && (
          <>
            <Panel defaultSize={25} className='panel'>
              <div className='panel-header'>
                Expression List
                <button className='btn add-btn' onClick={handleAddExpression}>
                  <FaPlus /> Add
                </button>
              </div>
              <div className='editor-wrapper'>
                <p>List of expressions...</p>
              </div>
            </Panel>

            <Separator className='separator' />

            <Panel defaultSize={15} className='panel'>
              <div className='panel-header'>Expression Tree</div>
              <div className='editor-wrapper'>
                <p>Tree of selected expression...</p>
              </div>
            </Panel>

            <Separator className='separator' />
          </>
        )}

        {/* Column 3: Right stacked panels */}
        {addingExpression && (
          <Panel defaultSize={60} className='panel'>
            <div className='top-bar'>
              <button className='btn save-btn' onClick={handleSave}>
                <FaCheck /> Save
              </button>
              <button className='btn cancel-btn' onClick={handleCancel}>
                <FaTimes /> Cancel
              </button>
            </div>

            <Group orientation='vertical' className='panel-stack'>
              <Panel defaultSize={30} minSize={10} className='panel'>
                <div className='panel-header'>Model Editor</div>
                <div className='editor-wrapper'>
                  <Editor
                    height='100%'
                    defaultLanguage='typescript'
                    value={modelValue}
                    theme='vs-dark'
                    onChange={handleModelChange}
                    onMount={handleModelMount}
                  />
                </div>
              </Panel>

              <Separator className='separator-horizontal' />

              <Panel defaultSize={40} minSize={10} className='panel'>
                <div className='panel-header'>Expression Editor</div>
                <div className='editor-wrapper'>
                  <Editor
                    height='100%'
                    defaultLanguage='typescript'
                    theme='vs-dark'
                    options={{
                      suggestOnTriggerCharacters: true,
                      quickSuggestions: true,
                      wordBasedSuggestions: "off",
                    }}
                    onMount={handleExpressionMount}
                  />
                </div>
              </Panel>

              <Separator className='separator-horizontal' />

              <Panel defaultSize={30} minSize={10} className='panel'>
                <div className='panel-header'>Errors</div>
                <div className='errors-panel'>
                  <p>No errors</p>
                </div>
              </Panel>
            </Group>
          </Panel>
        )}
      </Group>
    </div>
  );
};