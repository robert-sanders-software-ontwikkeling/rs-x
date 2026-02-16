import type { OnMount } from '@monaco-editor/react';
import { InjectionContainer } from '@rs-x/core';
import React, { useEffect, useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { IExpressionChangeHistory, IExpressionManager, RsXExpressionParserInjectionTokens } from '../../rs-x-expression-parser/lib';

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
import { ExpressionChangeHistoryView } from './components/expression-change-history-view/expression-change-history-view.component';

const emptyModel = '(\n\t{\n\n\t}\n)';

export const App: React.FC = () => {
  const deserializedState = useExpressionEditorState();

  if (!deserializedState) {
    return (
      <div className='fullscreen-loader'>
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

  // ✅ Right panel visibility toggle (details)
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(() => {
    const selectedModel = initialState.modelsWithExpressions[initialState.selectedModelIndex as number];
    const selectedExpressionIndex = selectedModel?.selectedExpressionIndex ?? null;
    return selectedExpressionIndex !== null;
  });

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

  const selectedExpression =
    selectedModel?.expressions[selectedModel?.selectedExpressionIndex as number];

  const selectedExpressionIndex =
    selectedModel?.selectedExpressionIndex ?? null;

  const isEditing =
    currentState.addingModel || currentState.addingExpression;

  // ✅ When selecting an expression, auto-open right panel (unless editing)
  useEffect(() => {
    if (isEditing) {
      return;
    }
    if (selectedExpressionIndex !== null) {
      setIsRightPanelOpen(() => {
        return true;
      });
    }
  }, [selectedExpressionIndex, isEditing]);

  // ✅ Show right panel only when selected expression AND open AND not editing
  const shouldShowRightDetailsPanel =
    !isEditing && selectedExpressionIndex !== null && isRightPanelOpen;

  // ✅ Hide left list ONLY when right panel is visible (selected + open) and not editing
  const shouldShowLeftListPanel =
    currentState.addingModel ||
    currentState.addingExpression ||
    !shouldShowRightDetailsPanel;

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

    ModelIntellisenseService.getInstance().model =
      currentState.modelsWithExpressions[modelIndex]?.model;
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
          .addExpression(currentState.selectedModelIndex as number, name, expression)
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

    setIsRightPanelOpen(() => {
      return true;
    });
  };

  const onViewExpression = (modelIndex: number, index: number) => {
    onSelectExpression(modelIndex, index);
    setIsRightPanelOpen(() => {
      return true;
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

  const onModelChange = (modelIndex: number, model: object,) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).setModel(modelIndex, model).state;
    });
  };

  const onCloseRightPanel = () => {
    setIsRightPanelOpen(() => {
      return false;
    });
  };

  const onHistoryChanged = (modelIndex: number, expressionIndex: number, history: IExpressionChangeHistory[][]) => {

    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).setExpressionHistory(modelIndex, expressionIndex, history).state;
    });
  }

  return (
    <div className='app'>
      <Group orientation='horizontal' className='panels-container'>
        {/* VIEW MODE */}
        {!currentState.addingModel && !currentState.addingExpression && (
          <>
            {/* LEFT LIST: always visible when right panel is hidden */}
            {shouldShowLeftListPanel && (
              <Panel defaultSize={100} minSize={25} className='panel'>
                <ModelList
                  selectModelIndex={currentState.selectedModelIndex}
                  modelsWithExpressions={currentState.modelsWithExpressions}
                  onSelectModel={handleSelectModel}
                  onAddModel={handleAddModel}
                  onAddExpression={handleAddExpression}
                  onSelectExpression={onSelectExpression}
                  onEditExpression={onEditExpression}
                  onDeleteExpression={onDeleteExpression}
                  onViewExpression={onViewExpression}
                />
              </Panel>
            )}

            {/* RIGHT DETAILS: only render when open */}
            {shouldShowRightDetailsPanel && (
              <>
                <Separator className='separator' />
                <Panel defaultSize={100} minSize={25} className='panel'>
                  <div className='panel-header panel-header-row'>
                    <span>Details</span>
                    <button
                      type='button'
                      className='panel-header-button'
                      onClick={() => {
                        onCloseRightPanel();
                      }}
                      title='Close details'
                    >
                      Close
                    </button>
                  </div>

                  <Group orientation='horizontal' className='panels-container'>
                    {/* LEFT SIDE: Model (top) + Change History (bottom) */}
                    <Panel defaultSize={20} minSize={10} className='panel'>
                      <Group orientation='vertical' className='panel-stack'>
                        <Panel defaultSize={70} minSize={20} className='panel'>
                          <div className='panel-header'>Model</div>
                          <div className='editor-wrapper'>
                            <ModelEditor modelIndex={currentState.selectedModelIndex as number} model={selectedModel.model} onCommit={onModelChange} />
                          </div>
                        </Panel>

                        <Separator className='separator-horizontal' />

                        <Panel defaultSize={30} minSize={15} className='panel'>
                          <div className='panel-header'>Change History</div>
                          <div className='errors-panel'>
                            <ExpressionChangeHistoryView 
                              modelIndex={currentState.selectedModelIndex as number} 
                              expressionIndex={selectedModel?.selectedExpressionIndex as number}
                              expressionInfo={selectedExpression} change={onHistoryChanged } />
                          </div>
                        </Panel>
                      </Group>
                    </Panel>

                    <Separator className='separator' />

                    {/* RIGHT SIDE: Expression tree */}
                    <Panel defaultSize={80} minSize={20} className='panel'>
                      <div className='panel-header'>Expression Tree</div>
                      <div className='errors-panel'>
                        <ExpressionTree version={selectedExpression.version} root={selectedExpression.expression} />
                      </div>
                    </Panel>
                  </Group>
                </Panel>
              </>
            )}
          </>
        )}

        {/* ADD MODEL FLOW */}
        {currentState.addingModel && (
          <Panel defaultSize={100} className='panel'>
            <Group orientation='vertical' className='panel-stack'>
              <Panel defaultSize={70} minSize={10} className='panel'>
                <TSEditor header='Model Editor' value={emptyModel} save={saveModel} cancel={handleCancel} />
              </Panel>

              <Separator className='separator-horizontal' />

              <Panel defaultSize={30} minSize={10} className='panel'>
                <div className='panel-header'>Errors</div>
                <div className='errors-panel'>
                  <p>{currentState.error}</p>
                </div>
              </Panel>
            </Group>
          </Panel>
        )}

        {/* ADD EXPRESSION FLOW */}
        {currentState.addingExpression && (
          <Panel defaultSize={100} className='panel'>
            <Group orientation='horizontal' className='panels-container'>
              <Panel defaultSize={30} minSize={15} className='panel'>
                <div className='panel-header'>Model</div>
                <div className='editor-wrapper'>
                  <ObjectViewer modelString={getSelectedModelString()} />
                </div>
              </Panel>

              <Separator className='separator' />

              <Panel defaultSize={70} minSize={30} className='panel'>
                <Group orientation='vertical' className='panel-stack'>
                  <Panel defaultSize={70} minSize={10} className='panel'>
                    <TSEditor
                      header='Expression Editor'
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

                  <Separator className='separator-horizontal' />

                  <Panel defaultSize={30} minSize={10} className='panel'>
                    <div className='panel-header'>Errors</div>
                    <div className='errors-panel'>
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