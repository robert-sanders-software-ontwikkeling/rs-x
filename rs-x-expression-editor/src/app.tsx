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
import { ExpressionTreePanel } from './components/expression-tree-panel/expression-tree-panel';
import { ChangeHistoryPanel } from './components/change-history-panel/change-history-panel.component';

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

  usePersistExpressionEditorState(currentState, 200);

  const selectedModelIndex = currentState.selectedModelIndex;

  const selectedModel =
    typeof selectedModelIndex === 'number'
      ? currentState.modelsWithExpressions[selectedModelIndex]
      : undefined;

  const selectedExpressionIndex = selectedModel?.selectedExpressionIndex ?? -1;

  const selectedExpression =
    selectedModel &&
      typeof selectedExpressionIndex === 'number'
      ? selectedModel.expressions[selectedExpressionIndex]
      : undefined;

  const editingExpressionIndex = currentState.editingExpressionIndex;

  const editingExpression =
    !currentState.addingExpression && editingExpressionIndex >= 0;

  const isAdding =
    currentState.addingModel || currentState.addingExpression;

  const isEditing =
    isAdding || editingExpression;

  const shouldShowRightDetailsPanel =
    !isEditing &&
    selectedExpressionIndex !== null &&
    currentState.showExpressionTreeView;

  const shouldShowLeftListPanel =
    !isEditing && !shouldShowRightDetailsPanel;

  const selectedHistoryCount = selectedExpression?.changeHistory?.length ?? 0;
  const canClearSelectedHistory = selectedExpressionIndex !== null && selectedHistoryCount > 0;
  const selectedExpressionString = selectedExpression?.expression?.expressionString;

  

  const getError = (): string => {
    const errors: string[] = [];

    if(currentState.error) {
      errors.push(currentState.error)
    }

    if(selectedExpression?.error) {
       errors.push(selectedExpression?.error)
    }

    return errors.join('/n');

  };


  const getModelEditorValue = (): string => {
    if (currentState.addingModel) {
      return emptyModel;
    }


    return selectedModel?.editorModelString ?? emptyModel;
  }


  const getModelEditorName = (): string => {

    return selectedModel?.name ?? '';

  };


  const getExpressionEditorValue = (): string => {
    if (currentState.addingExpression) {
      return '';
    }

    if (editingExpressionIndex >= 0 && selectedModel) {
      const index = selectedModel.selectedExpressionIndex;
      if (index >= 0) {
        return selectedModel.expressions[index]?.editorExpressionString ?? '';
      }


    }
    return '';

  };

  const getExpressionEditorEditorName = (): string => {
    if (currentState.addingExpression) {
      return '';
    }

    const index = selectedModel?.selectedExpressionIndex ?? -1;
    return selectedModel?.expressions[index]?.name ?? '';
  };



  const handleSelectModel = (modelIndex: number) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).selectModel(modelIndex).state;
    });
  };

  const onAddModel = () => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).setAddingModel(true).state;
    });
  };

  const onAddExpression = (modelIndex: number) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev)
        .setAddingExpression(modelIndex, true)
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
        return b.setAddingExpression(currentState.selectedModelIndex as number, false).state;
      }
      if (prev.addingModel) {
        return b.setAddingModel(false).state;
      } else if (editingExpressionIndex >= 0) {
        return b.setEditingExpressionIndex(currentState.selectedModelIndex as number, editingExpressionIndex).state
      }

      return prev;
    });
  };

  const addModel = (name: string, modelString: string) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev)
        .addModel(name, modelString)
        .state;
    });

  };

  const updateModel = (modelIndex: number, name: string, modelString: string) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev)
        .updateModel(modelIndex, name, modelString)
        .state;
    });
  };


  const saveModel = (name: string, modelString: string) => {
    const trimmedModelString = modelString.trim();
    const selectedModelIndex = currentState.selectedModelIndex as number;

    if (selectedModelIndex === -1) {
      addModel(name, trimmedModelString);

    } else {
      updateModel(selectedModelIndex, name, trimmedModelString);
    }
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
    setExpressionIsDeleting(modelIndex, expressionIndex, true);
  };

  const onDeleteExpresionConfirm = () => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev)
        .deleteExpression(currentState.selectedModelIndex as number, selectedExpressionIndex)
        .state;
    });
  }

  const setExpressionIsDeleting = (modelIndex: number, expressionIndex: number, isDeleting: boolean) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev)
        .setExpressionIsDeleting(modelIndex, expressionIndex, isDeleting)
        .state;
    });
  };

  const onEditModel = (modelIndex: number) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).setEditingModelIndex(modelIndex).state;
    });
  };


  const setModelIsDeleting = (modelIndex: number, isDeleting: boolean) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev)
        .setModelIsDeleting(modelIndex, isDeleting)
        .state;
    });
  };

  const onDeleteExpresionCancel = () => {
    setExpressionIsDeleting(currentState.selectedModelIndex as number, selectedExpressionIndex as number, false);
  }

  const onDeleteModelCancel = () => {
    setModelIsDeleting(currentState.selectedModelIndex as number, false);
  }

  const onDeleteModelConfirm = () => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev)
        .deleteModel(currentState.selectedModelIndex as number)
        .state;
    });
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

  const onDeleteModel = (modelIndex: number) => {
    setModelIsDeleting(currentState.selectedModelIndex, true)

  }

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
                  onAddModel={onAddModel}
                  onDeleteModel={onDeleteModel}
                  onEditModel={onEditModel}
                  onAddExpression={onAddExpression}
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
                              key={selectedModel?.version}
                              modelIndex={currentState.selectedModelIndex as number}
                              model={selectedModel!.model}
                              onCommit={onModelChange}
                            />
                          </div>
                        </Panel>

                        <Separator className='separator-horizontal' />

                        <Panel defaultSize={30} minSize={15} className='panel'>
                          <ChangeHistoryPanel
                            canClearSelectedHistory= {canClearSelectedHistory}
                            selectedModelIndex={currentState.selectedModelIndex}
                            selectedExpressionIndex = {selectedExpressionIndex}
                            selectedExpression={selectedExpression}
                            onHistoryChanged={onHistoryChanged}
                            onSelectionChanged={onSelectHistoryBatch}
                            onClearSelectedHistory= {onClearSelectedHistory}
                          />
                        </Panel>
                      </Group>
                    </Panel>

                    <Separator className='separator' />

                    <Panel defaultSize={80} minSize={20} className='panel'>

                      <ExpressionTreePanel
                        selectedExpressionString={selectedExpressionString}
                        treeZoomPercent={currentState.treeZoomPercent}
                        onTreeZoomPercentChange={setTreeZoomPercent}
                        onClose={onCloseRightPanel}
                      />

                      <div className='errors-panel'>
                        <ExpressionTree
                          key={selectedExpression!.version}
                          version={selectedExpression!.version}
                          root={selectedExpression!.expression}
                          highlightChanges={selectedExpression!.treeHighlight}
                          highlightVersion={selectedExpression!.treeHighlightVersion}
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
                <TSEditor
                  header='Model Editor'
                  namePlaceholder='Model name'
                  name={getModelEditorName()}
                  value={getModelEditorValue()}
                  save={saveModel} cancel={handleCancel} />
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
                      namePlaceholder='Expression name'
                      name={getExpressionEditorEditorName()}
                      value={getExpressionEditorValue()}
                      save={saveExpression}
                      cancel={handleCancel}
                      onMount={handleExpressionMount}
                    />
                  </Panel>

                  <Separator className='separator-horizontal' />

                  <Panel defaultSize={30} minSize={10} className='panel'>
                    <div className='panel-header'>Errors</div>
                    <div className='errors-panel'>
                      <p>{getError()}</p>
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

      <ConfirmDialog
        isOpen={!!selectedModel?.isDeleting}
        title='Delete model'
        message={`Are you sure you want to delete the model '${selectedModel?.name}'? This will delete the model and all its expressions. This action cannot be undone.`}
        onCancel={onDeleteModelCancel}
        onConfirm={onDeleteModelConfirm}
      />
    </div>

  );
};

export default AppLoaded;