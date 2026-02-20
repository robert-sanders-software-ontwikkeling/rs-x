import type { OnMount } from '@monaco-editor/react';
import React, { useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import {
  IExpressionChangeHistory
} from '../../rs-x-expression-parser/lib';

import { FaTimes, FaTrash } from 'react-icons/fa';


import { ModelList } from './components/model-list/model-list.component';
import { Spinner } from './components/spinner/spinner.component';
import { TSEditor } from './components/ts-editor/ts-editor.component';

import { ObjectViewer } from './components/object-viewer/object-viewer.component';
import { useExpressionEditorState } from './hooks/use-expression-editor-state';
import type { IExpressionEditorState } from './models/expression-editor-state.interface';
import { ExpressionEditorStateBuilder } from './services/expression-editor-state-builder';
import { ModelIntellisenseService } from './services/model-intellisense.service';

import './app.css';
import { ExpressionChangeHistoryView } from './components/expression-change-history-view/expression-change-history-view.component';

import { ConfirmDialog } from './components/confirm-dialog/confirm-dialog.component';
import { ExpressionTree } from './components/expression-tree-view/expression-tree-view.component';
import { ModelEditor } from './components/model-editor/model-editor.component';
import { usePersistExpressionEditorState } from './hooks/use-persist-expression-editor-state';

const emptyModel = '(\n\t{\n\n\t}\n)';
const zoomPresets = [50, 75, 100, 125, 150, 200, 250, 300];

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

  usePersistExpressionEditorState(currentState, 200);


  const selectedModel =
    currentState.modelsWithExpressions[currentState.selectedModelIndex as number];

  const selectedExpression =
    selectedModel?.expressions[selectedModel?.selectedExpressionIndex as number];

  const selectedExpressionIndex =
    selectedModel?.selectedExpressionIndex ?? null;

  const editingExpressionIndex = selectedModel?.editingExpressionIndex ?? -1;

  const editingExpression = editingExpressionIndex >= 0;

  const isEditing =
    currentState.addingModel ||
    currentState.addingExpression ||
    editingExpression;


  const shouldShowRightDetailsPanel =
    !isEditing && selectedExpressionIndex !== null && currentState.showExpressionTreeView;

  const shouldShowLeftListPanel = !isEditing && !shouldShowRightDetailsPanel;

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

  const setShowExpressionTreeView = (show) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).setShowExpressionTreeView(show).state;
    });
  };


  const getSelectedModelString = (): string | undefined => {
    return selectedModel?.editorModelString;
  };

  const handleCancel = () => {
    setCurrentState((prev) => {
      const b = new ExpressionEditorStateBuilder(prev);

      if (prev.addingExpression) {
        return b.setAddingExpression(false).state;
      }
      if (prev.addingModel) {
        return b.setAddingModel(false).state;
      } else if (editingExpressionIndex >= 0) {
        return b.setEditingExpressionIndex(currentState.selectedModelIndex as number, editingExpressionIndex).state
      }

      return prev;
    });
  };

  const saveModel = (name: string, modelString: string) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev)
        .addModel(name, modelString)
        .state;
    });
  };

  const addExpression = (modelIndex: number, name: string, expressionString: string) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev)
        .addExpression(modelIndex, name, expressionString)
        .state;
    });

  }

  const updateExpression = (modelIndex: number, expressionIndex, name: string, expressionString: string) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev)
        .updateExpression(modelIndex, expressionIndex, name, expressionString)
        .state;
    });
  }

  const saveExpression = (name: string, expressionString: string) => {
    const trimmedExpressionString = expressionString.trim();
    const selectedModelIndex = currentState.selectedModelIndex as number;

    if (editingExpressionIndex === -1) {
      addExpression(selectedModelIndex, name, trimmedExpressionString);
    } else {
      updateExpression(selectedModelIndex, editingExpressionIndex, name, trimmedExpressionString);
    }
  };

  const handleExpressionMount: OnMount = (_, monacoInstance) => {
    ModelIntellisenseService.getInstance().registerCompletionProvider(monacoInstance);
  };

  const onSelectExpression = (modelIndex: number, index: number) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).selectExpression(modelIndex, index).state;
    });

    setShowExpressionTreeView(true);
  };

  const onDeleteExpression = (modelIndex: number, expressionIndex: number) => {
    setsetExpressionIsDeleting(modelIndex, expressionIndex, true);
  };

  const onDeleteExpresionConfirm = () => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev)
        .deleteExpression(currentState.selectedModelIndex as number, selectedExpressionIndex)
        .state;
    });
  }

  const setsetExpressionIsDeleting = (modelIndex: number, expressionIndex: number, isDeleting: boolean) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev)
        .setExpressionIsDeleting(modelIndex, expressionIndex, isDeleting)
        .state;
    });
  };

  const onDeleteExpresionCancel = () => {
    setsetExpressionIsDeleting(currentState.selectedModelIndex as number, selectedExpressionIndex as number, false);
  }

  const onViewExpression = (modelIndex: number, index: number) => {
    onSelectExpression(modelIndex, index);
    setShowExpressionTreeView(true);
  };

  const onEditExpression = (modelIndex: number, index: number) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).setEditingExpressionIndex(modelIndex, index).state;
    });
  };

  const onModelChange = (modelIndex: number, model: object) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).setModel(modelIndex, model).state;
    });
  };

  const onCloseRightPanel = () => {
    setShowExpressionTreeView(false);
  };

  const onHistoryChanged = (
    modelIndex: number,
    expressionIndex: number,
    history: IExpressionChangeHistory[][]
  ) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).setExpressionHistory(modelIndex, expressionIndex, history).state;
    });
  };

  const onClearSelectedHistory = () => {
    const modelIndex = currentState.selectedModelIndex as number;
    const exprIndex = selectedModel?.selectedExpressionIndex ?? null;

    if (exprIndex === null || exprIndex === undefined) {
      return;
    }

    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).setExpressionHistory(modelIndex, exprIndex, []).state;
    });
  };

  const onSelectHistoryBatch = (
    modelIndex: number,
    expressionIndex: number,
    selectedChangeSetIndex: number,
    items: IExpressionChangeHistory[]
  ) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev)
        .setSelectedChangeHistoryIndex(modelIndex, expressionIndex, selectedChangeSetIndex)
        .setTreeHighlight(modelIndex, expressionIndex, items)
        .state;
    });

  };

  const setTreeZoomPercent = (treeZoomPercent: number) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev)
        .setTreeZoomPercent(treeZoomPercent)
        .state;
    });
  };

  const selectedHistoryCount = selectedExpression?.changeHistory?.length ?? 0;
  const canClearSelectedHistory = selectedExpressionIndex !== null && selectedHistoryCount > 0;
  const selectedExpressionString = selectedExpression?.expression?.expressionString;

  return (
    <div className='app'>
      <Group orientation='horizontal' className='panels-container'>
        {!currentState.addingModel && !currentState.addingExpression && (
          <>
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

            {shouldShowRightDetailsPanel && (
              <>
                <Separator className='separator' />
                <Panel defaultSize={100} minSize={25} className='panel'>
                  <Group orientation='horizontal' className='panels-container'>
                    <Panel defaultSize={20} minSize={10} className='panel'>
                      <Group orientation='vertical' className='panel-stack'>
                        <Panel defaultSize={70} minSize={20} className='panel'>
                          <div className='panel-header'>Model</div>
                          <div className='editor-wrapper'>
                            <ModelEditor
                              modelIndex={currentState.selectedModelIndex as number}
                              model={selectedModel.model}
                              onCommit={onModelChange}
                            />
                          </div>
                        </Panel>

                        <Separator className='separator-horizontal' />

                        <Panel defaultSize={30} minSize={15} className='panel'>
                          <div className='panel-header panel-header-row'>
                            <span>Change History</span>
                            <button
                              type='button'
                              className='panel-header-icon-button'
                              disabled={!canClearSelectedHistory}
                              onClick={onClearSelectedHistory}
                              title='Clear full history for this expression'
                            >
                              <FaTrash />
                            </button>
                          </div>

                          <div className='panel-content'>
                            <div className='scroll-host'>
                              <ExpressionChangeHistoryView
                                modelIndex={currentState.selectedModelIndex as number}
                                expressionIndex={selectedModel?.selectedExpressionIndex as number}
                                expressionInfo={selectedExpression}
                                selectedChangeSetIndex={selectedExpression.selecteChangeHistoryIndex}
                                onHistoryChange={onHistoryChanged}
                                onSelectionChanged={onSelectHistoryBatch}
                              />
                            </div>
                          </div>
                        </Panel>
                      </Group>
                    </Panel>

                    <Separator className='separator' />

                    <Panel defaultSize={80} minSize={20} className='panel'>
                      <div className='panel-header panel-header-row'>
                        <div className='exprTreeHeaderTitle'>
                          <span>Expression Tree</span>

                          <span className='exprTreeHeaderExpr' title={selectedExpressionString}>
                            {selectedExpressionString}
                          </span>
                        </div>

                        <div className='exprTreeHeaderControls'>
                          <label className='exprTreeHeaderZoom'>
                            <span>Zoom</span>
                            <select
                              value={currentState.treeZoomPercent}
                              onChange={(e) => {
                                setTreeZoomPercent(Number(e.target.value));
                              }}
                            >
                              {zoomPresets.map((z) => {
                                return (
                                  <option key={z} value={z}>
                                    {z}%
                                  </option>
                                );
                              })}
                            </select>
                          </label>
                          <button
                            type='button'
                            className='icon-btn'
                            onClick={onCloseRightPanel}
                            title='Close'
                          >
                            <FaTimes />
                          </button>
                        </div>
                      </div>

                      <div className='errors-panel'>
                        <ExpressionTree
                          version={selectedExpression.version}
                          root={selectedExpression.expression}
                          highlightChanges={selectedExpression.treeHighlight}
                          highlightVersion={selectedExpression?.treeHighlightVersion}
                          zoomPercent={currentState.treeZoomPercent}
                        />
                      </div>
                    </Panel>
                  </Group>
                </Panel>
              </>
            )}
          </>
        )}

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

        {(currentState.addingExpression || editingExpression) && (
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
                      name={selectedExpression?.name ?? ''}
                      value={selectedExpression?.editorExpressionString ?? ''}
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


      <ConfirmDialog
        isOpen={!!selectedExpression?.isDeleting}
        title='Delete expression'
        message={`Are you sure you want to delete  expression '${selectedExpression?.name}'. This cannot be undone.`}
        onCancel={onDeleteExpresionCancel}
        onConfirm={onDeleteExpresionConfirm}
      />
    </div>



  );
};

export default AppLoaded;