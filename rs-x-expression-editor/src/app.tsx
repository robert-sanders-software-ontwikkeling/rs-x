import React, { useRef, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import Editor from "@monaco-editor/react";
import { FaPlus, FaCheck, FaTimes } from "react-icons/fa";
import "./app.css";

export const App: React.FC = () => {
  const expressionEditorRef = useRef<any>(null);
  const modelEditorRef = useRef<any>(null);

  const [addingExpression, setAddingExpression] = useState(false);

  const handleAddExpression = () => setAddingExpression(true);
  const handleCancel = () => setAddingExpression(false);
  const handleSave = () => {
    alert("Expression saved!");
    setAddingExpression(false);
  };

  return (
    <div className="app">
      <Group orientation="horizontal" className="panels-container">
        {/* Columns 1 & 2 */}
        {!addingExpression && (
          <>
            <Panel defaultSize={25} className="panel">
              <div className="panel-header">
                Expression List
                <button className="btn add-btn" onClick={handleAddExpression}>
                  <FaPlus /> Add
                </button>
              </div>
              <div className="editor-wrapper">
                <p>List of expressions...</p>
              </div>
            </Panel>

            <Separator className="separator" />

            <Panel defaultSize={15} className="panel">
              <div className="panel-header">Expression Tree</div>
              <div className="editor-wrapper">
                <p>Tree of selected expression...</p>
              </div>
            </Panel>

            <Separator className="separator" />
          </>
        )}

        {/* Column 3: Right stacked panels */}
        {addingExpression && (
          <Panel defaultSize={60} className="panel">
            <div className="top-bar">
               <button className="btn save-btn" onClick={handleSave}>
                <FaCheck /> Save
              </button>
              <button className="btn cancel-btn" onClick={handleCancel}>
                <FaTimes /> Cancel
              </button>
            </div>

            <Group orientation="vertical" className="panel-stack">
              <Panel defaultSize={30} className="panel">
                <div className="panel-header">Model Editor</div>
                <div className="editor-wrapper">
                  <Editor
                    height="100%"
                    defaultLanguage="javascript"
                    defaultValue="// Define your model here"
                    theme="vs-dark"
                    onMount={(editor) => (modelEditorRef.current = editor)}
                  />
                </div>
              </Panel>

              <Separator className="separator-horizontal" />

              <Panel defaultSize={40} className="panel">
                <div className="panel-header">Expression Editor</div>
                <div className="editor-wrapper">
                  <Editor
                    height="100%"
                    defaultLanguage="javascript"
                    defaultValue="// Write your expression here"
                    theme="vs-dark"
                    onMount={(editor) => (expressionEditorRef.current = editor)}
                  />
                </div>
              </Panel>

              <Separator className="separator-horizontal" />

              <Panel defaultSize={30} className="panel">
                <div className="panel-header">Errors</div>
                <div className="errors-panel">
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