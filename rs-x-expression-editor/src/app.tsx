import type { OnMount } from '@monaco-editor/react';
import { InjectionContainer } from '@rs-x/core';
import React, { useEffect, useMemo, useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { IExpressionManager, RsXExpressionParserInjectionTokens } from '../../rs-x-expression-parser/lib';

import { ModelList } from './components/model-list/model-list.component';
import { Spinner } from './components/spinner/spinner.component';
import { TSEditor } from './components/ts-editor/ts-editor.component';

import { ObjectViewer } from './components/object-viewer/object-viewer.component';
import { useExpressionEditorState } from './hooks/use-expression-editor-state';
import type { IExpressionEditorState } from './models/expression-editor-state.interface';
import { ExpressionEditorStateBuilder } from './services/expression-editor-state-builder';
import { ExpressionEdtitorStateSerializer } from './services/expression-editor-state-serializer';
import { ModelIntellisenseService } from './services/model-intellisense.service';

import './app.css';
import { ModelEditor } from './components/model-editor/model-editor.component';
import { ExpressionTree } from './components/expression-tree-view/expression-tree-view.component';


const emptyModel = '(\n\t{\n\n\t}\n)';

export const App: React.FC = () => {
  const deserializedState = useExpressionEditorState();

  if (!deserializedState) {
    return (
      <div className="fullscreen-loader">
        <Spinner size={60} />
      </div>
    );
  }

  return <AppLoaded initialState={deserializedState} />;
};

type AppLoadedProps = {
  initialState: IExpressionEditorState;
};

const AppLoaded: React.FC<AppLoadedProps> = ({ initialState }) => {
  const [currentState, setCurrentState] = useState<IExpressionEditorState>(initialState);

  const expressionManager = InjectionContainer.get<IExpressionManager>(
    RsXExpressionParserInjectionTokens.IExpressionManager
  );

  useEffect(() => {
    const id = setTimeout(() => {
      ExpressionEdtitorStateSerializer.getInstance()
        .serialize(currentState)
        .catch(console.error);
    }, 200);

    return () => {
      clearTimeout(id);
    };
  }, [currentState]);

  const selectedModel =
    currentState.modelsWithExpressions[currentState.selectedModelIndex as number];

  const selectedExpression = selectedModel?.expressions[selectedModel?.selectedExpressionIndex as number];

  const selectedExpressionIndex =
    selectedModel?.selectedExpressionIndex ?? null;


  const isEditing = currentState.addingModel  || currentState.addingExpression;
  
  const shouldShowRightDetailsPanel = !isEditing && selectedExpressionIndex !== null;



  const handleSelectModel = (modelIndex: number) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).selectModel(modelIndex).state;
    });
  };

  const handleAddModel = () => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).setAddingModel(true).state;
    });
  };

  const handleAddExpression = (modelIndex: number) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev)
        .setAddingExpression(true)
        .selectModel(modelIndex)
        .state;
    });


    ModelIntellisenseService.getInstance().model = currentState.modelsWithExpressions[modelIndex]?.model;
  };

  const getSelectedModelString = (): string | undefined => {
    return selectedModel?.modelString;
  };

  const handleCancel = () => {
    setCurrentState((prev) => {
      const b = new ExpressionEditorStateBuilder(prev);

      if (prev.addingExpression) {
        return b.setAddingExpression(false).state;
      }
      if (prev.addingModel) {
        return b.setAddingModel(false).state;
      }

      return prev;
    });
  };

  const saveModel = (name: string, modelString: string) => {
    try {
      const model = new Function(`return ${modelString}`)();
      setCurrentState((prev) => {
        return new ExpressionEditorStateBuilder(prev)
          .addModel(name, modelString, model)
          .setAddingModel(false)
          .state;
      });
    } catch (e) {
      setCurrentState((prev) => {
        return new ExpressionEditorStateBuilder(prev)
          .setError(e instanceof Error ? e.message : String(e))
          .state;
      });
    }
  };

  const saveExpression = (name: string, expressionString: string) => {
    const trimmed = expressionString?.trim();
    if (!trimmed) {
      return;
    }

    const modelObj = selectedModel?.model;
    if (!modelObj) {
      return;
    }

    try {
      const { instance: expression } = expressionManager
        .create(modelObj)
        .instance.create({ expressionString: trimmed });

      setCurrentState((prev) => {
        return new ExpressionEditorStateBuilder(prev)
          .addExpression(modelObj, name, expression)
          .setAddingExpression(false)
          .state;
      });
    } catch (e) {
      setCurrentState((prev) => {
        return new ExpressionEditorStateBuilder(prev)
          .setError(e instanceof Error ? e.message : String(e))
          .state;
      });
    }
  };

  const handleExpressionMount: OnMount = (_, monacoInstance) => {
    ModelIntellisenseService.getInstance().registerCompletionProvider(monacoInstance);
  };

  const onSelectExpression = (modelIndex: number, index: number) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).selectExpression(modelIndex, index).state;
    });
  };

  const onDeleteExpression = (modelIndex: number, index: number) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).deleteExpression(modelIndex, index).state;
    });
  };

  const onEditExpression = (modelIndex: number, index: number) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).editExpression(modelIndex, index).state;
    });
  };

  const onModelChange = (model: object) => {

  };

  return (
    <div className="app">
      <Group orientation="horizontal" className="panels-container">
        {/* LEFT: model list (only when not adding model/expression) */}
        {!currentState.addingModel && !currentState.addingExpression && (
          <>
            <Panel defaultSize={shouldShowRightDetailsPanel ? 55 : 100} minSize={25} className="panel">
              <ModelList

                selectModelIndex={currentState.selectedModelIndex}
                modelsWithExpressions={currentState.modelsWithExpressions}
                onSelectModel={handleSelectModel}
                onAddModel={handleAddModel}
                onAddExpression={handleAddExpression}
                onSelectExpression={onSelectExpression}
                onEditExpression={onEditExpression}
                onDeleteExpression={onDeleteExpression}
              />
            </Panel>

            {shouldShowRightDetailsPanel && <Separator className="separator" />}

            {/* RIGHT: details panel (ONLY when an expression is selected AND not editing) */}
            {shouldShowRightDetailsPanel && (
              <Panel defaultSize={45} minSize={25} className="panel">
                <Group orientation="vertical" className="panel-stack">
                  <Panel defaultSize={65} minSize={20} className="panel">
                    <div className="panel-header">Model</div>
                    <div className="editor-wrapper">
                      <ModelEditor model={selectedModel.model} onCommit={onModelChange} />
                    </div>
                  </Panel>

                  <Separator className="separator-horizontal" />

                  <Panel defaultSize={35} minSize={15} className="panel">
                    <div className="panel-header">Expression Tree</div>
                    <div className="errors-panel">
                      <ExpressionTree  root={selectedExpression} />
                    </div>
                  </Panel>
                </Group>
              </Panel>
            )}
          </>
        )}

        {/* ADD MODEL FLOW */}
        {currentState.addingModel && (
          <Panel defaultSize={100} className="panel">
            <Group orientation="vertical" className="panel-stack">
              <Panel defaultSize={70} minSize={10} className="panel">
                <TSEditor header="Model Editor" value={emptyModel} save={saveModel} cancel={handleCancel} />
              </Panel>

              <Separator className="separator-horizontal" />

              <Panel defaultSize={30} minSize={10} className="panel">
                <div className="panel-header">Errors</div>
                <div className="errors-panel">
                  <p>{currentState.error}</p>
                </div>
              </Panel>
            </Group>
          </Panel>
        )}

        {/* ADD EXPRESSION FLOW */}
        {currentState.addingExpression && (
          <Panel defaultSize={100} className="panel">
            <Group orientation="horizontal" className="panels-container">
              <Panel defaultSize={30} minSize={15} className="panel">
                <div className="panel-header">Model</div>
                <div className="editor-wrapper">
                  <ObjectViewer modelString={getSelectedModelString()} />
                </div>
              </Panel>

              <Separator className="separator" />

              <Panel defaultSize={70} minSize={30} className="panel">
                <Group orientation="vertical" className="panel-stack">
                  <Panel defaultSize={70} minSize={10} className="panel">
                    <TSEditor
                      header="Expression Editor"
                      options={{
                        suggestOnTriggerCharacters: true,
                        quickSuggestions: true,
                        wordBasedSuggestions: 'off',
                      }}
                      save={saveExpression}
                      cancel={handleCancel}
                      onMount={handleExpressionMount}
                    />
                  </Panel>

                  <Separator className="separator-horizontal" />

                  <Panel defaultSize={30} minSize={10} className="panel">
                    <div className="panel-header">Errors</div>
                    <div className="errors-panel">
                      <p>{currentState.error}</p>
                    </div>
                  </Panel>
                </Group>
              </Panel>
            </Group>
          </Panel>
        )}
      </Group>
    </div>
  );
};