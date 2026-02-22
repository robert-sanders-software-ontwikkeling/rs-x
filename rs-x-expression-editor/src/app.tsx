import type { OnMount } from '@monaco-editor/react';
import React, { useMemo, useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { IExpressionChangeHistory } from '../../rs-x-expression-parser/lib';

import { ChangeHistoryPanel } from './components/change-history-panel/change-history-panel.component';
import { ConfirmDialog } from './components/confirm-dialog/confirm-dialog.component';
import { ErrorPanel } from './components/error-panel/error-panel';
import { ExpressionTreePanel } from './components/expression-tree-panel/expression-tree-panel';
import { ModelEditor } from './components/model-editor/model-editor.component';
import { ModelList } from './components/model-list/model-list.component';
import { ObjectViewer } from './components/object-viewer/object-viewer.component';
import { Spinner } from './components/spinner/spinner.component';
import { TSEditor } from './components/ts-editor/ts-editor.component';

import { useExpressionEditorState } from './hooks/use-expression-editor-state';
import { usePersistExpressionEditorState } from './hooks/use-persist-expression-editor-state';

import type { IExpressionEditorState } from './models/expression-editor-state.interface';
import { ExpressionEditorStateBuilder } from './services/expression-editor-state-builder';
import { ExpressionEditorBusinessService } from './services/expression-editor-business.service';
import { ModelIntellisenseService } from './services/model-intellisense.service';

import './app.css';

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

  const business = ExpressionEditorBusinessService.getInstance();

  const selectedModelIndex = currentState.selectedModelIndex;

  const selectedModel =
    typeof selectedModelIndex === 'number'
      ? currentState.modelsWithExpressions[selectedModelIndex]
      : undefined;

  const selectedExpressionIndex = selectedModel?.selectedExpressionIndex ?? -1;

  const selectedExpression =
    selectedModel && typeof selectedExpressionIndex === 'number'
      ? selectedModel.expressions[selectedExpressionIndex]
      : undefined;

  const editingExpressionIndex = currentState.editingExpressionIndex;
  const editingExpression = !currentState.addingExpression && editingExpressionIndex >= 0;

  const editingModelIndex = currentState.editingModelIndex;
  const editingModel = !currentState.addingExpression && editingModelIndex >= 0;

  const isAdding = currentState.addingModel || currentState.addingExpression;
  const isEditing = isAdding || editingExpression || editingModel;

  const shouldShowRightDetailsPanel =
    !isEditing &&
    selectedExpressionIndex !== null &&
    currentState.showExpressionTreeView;

  const shouldShowLeftListPanel = !isEditing && !shouldShowRightDetailsPanel;

  const selectedHistoryCount = selectedExpression?.changeHistory?.length ?? 0;
  const canClearSelectedHistory = selectedExpressionIndex !== null && selectedHistoryCount > 0;
  const selectedExpressionString = selectedExpression?.expression?.expressionString ?? '';

  const getError = (): string => {
    const errors: string[] = [];

    if (currentState.error) {
      errors.push(currentState.error);
    }

    if (selectedExpression?.error) {
      errors.push(selectedExpression.error);
    }

    return errors.join('\n');
  };

  const getModelEditorValue = (): string => {
    if (currentState.addingModel) {
      return emptyModel;
    }

    return selectedModel?.editorModelString ?? emptyModel;
  };

  const getModelEditorName = (): string => {
    return selectedModel?.name ?? '';
  };

  const getExpressionEditorValue = (): string => {
    if (currentState.addingExpression) {
      return '';
    }

    if (editingExpressionIndex >= 0 && selectedModel) {
      const idx = selectedModel.selectedExpressionIndex;
      if (idx >= 0) {
        return selectedModel.expressions[idx]?.editorExpressionString ?? '';
      }
    }

    return '';
  };

  const getExpressionEditorEditorName = (): string => {
    if (currentState.addingExpression) {
      return '';
    }

    const idx = selectedModel?.selectedExpressionIndex ?? -1;
    return selectedModel?.expressions[idx]?.name ?? '';
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

  const setShowExpressionTreeView = (show: boolean) => {
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
      const currentSelectedModelIndex = prev.selectedModelIndex as number;

      if (prev.addingExpression) {
        return b.setAddingExpression(currentSelectedModelIndex, false).state;
      }

      if (prev.addingModel) {
        return b.setAddingModel(false).state;
      }

      if (prev.editingExpressionIndex >= 0) {
        return b.setEditingExpressionIndex(currentSelectedModelIndex, -1).state;
      }

      if (prev.editingModelIndex >= 0) {
        return b.setEditingModelIndex(-1).state;
      }

      return prev;
    });
  };

  const addModel = (name: string, modelString: string) => {
    const trimmed = modelString.trim();

    const { model, error } = business.evaluateModel(trimmed);
    if (!model) {
      setCurrentState((prev) => {
        return new ExpressionEditorStateBuilder(prev).setError(error ?? 'Invalid model').state;
      });
      return;
    }

    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev)
        .addModel({ name, editorModelString: trimmed, model })
        .state;
    });
  };

  const updateModel = (modelIndex: number, name: string, modelString: string) => {
    const trimmed = modelString.trim();

    const prevModelInfo = currentState.modelsWithExpressions[modelIndex];
    if (!prevModelInfo) {
      return;
    }

    const { model, error } = business.evaluateModel(trimmed);
    if (!model) {
      setCurrentState((prev) => {
        return new ExpressionEditorStateBuilder(prev).setError(error ?? 'Invalid model').state;
      });
      return;
    }

    // compile expressions ONCE, outside setState
    const expressionStrings = prevModelInfo.expressions.map((e) => e.editorExpressionString);
    const compileResults = business.compileExpressions(model, expressionStrings);

    // dispose old expressions ONCE, outside setState
    for (const exprInfo of prevModelInfo.expressions) {
      business.disposeExpression(exprInfo.expression);
    }

    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev)
        .updateModel({
          modelIndex,
          name,
          editorModelString: trimmed,
          model,
          compileResults,
        })
        .state;
    });
  };

  const saveModel = (name: string, modelString: string) => {
    const currentSelectedModelIndex = currentState.selectedModelIndex as number;

    if (currentSelectedModelIndex === -1) {
      addModel(name, modelString);
    } else {
      updateModel(currentSelectedModelIndex, name, modelString);
    }
  };

  const addExpression = (modelIndex: number, name: string, expressionString: string) => {
    const trimmed = expressionString.trim();
    const modelInfo = currentState.modelsWithExpressions[modelIndex];
    if (!modelInfo) {
      return;
    }

    const compileResult = business.compileExpression(modelInfo.model, trimmed);

    if (!compileResult.expression) {
      setCurrentState((prev) => {
        return new ExpressionEditorStateBuilder(prev).setError(compileResult.error ?? 'Invalid expression').state;
      });
      return;
    }

    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev)
        .addExpression({
          modelIndex,
          name,
          expressionString: trimmed,
          compileResult,
        })
        .state;
    });
  };

  const updateExpression = (modelIndex: number, expressionIndex: number, name: string, expressionString: string) => {
    const trimmed = expressionString.trim();
    const modelInfo = currentState.modelsWithExpressions[modelIndex];
    if (!modelInfo) {
      return;
    }

    const prevExpressionInfo = modelInfo.expressions[expressionIndex];
    if (!prevExpressionInfo) {
      return;
    }

    const compileResult = business.compileExpression(modelInfo.model, trimmed);

    // dispose old expression ONCE
    business.disposeExpression(prevExpressionInfo.expression);

    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev)
        .updateExpression({
          modelIndex,
          expressionIndex,
          name,
          expressionString: trimmed,
          compileResult,
        })
        .state;
    });
  };

  const saveExpression = (name: string, expressionString: string) => {
    const currentSelectedModelIndex = currentState.selectedModelIndex as number;

    if (editingExpressionIndex === -1) {
      addExpression(currentSelectedModelIndex, name, expressionString);
    } else {
      updateExpression(currentSelectedModelIndex, editingExpressionIndex, name, expressionString);
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

  const setExpressionIsDeleting = (modelIndex: number, expressionIndex: number, isDeleting: boolean) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev)
        .setExpressionIsDeleting(modelIndex, expressionIndex, isDeleting)
        .state;
    });
  };

  const onDeleteExpression = (modelIndex: number, expressionIndex: number) => {
    setExpressionIsDeleting(modelIndex, expressionIndex, true);
  };

  const onDeleteExpresionCancel = () => {
    setExpressionIsDeleting(currentState.selectedModelIndex as number, selectedExpressionIndex as number, false);
  };

  const onDeleteExpresionConfirm = () => {
    const modelIndex = currentState.selectedModelIndex as number;
    const exprIndex = selectedExpressionIndex;

    const modelInfo = currentState.modelsWithExpressions[modelIndex];
    const exprInfo = modelInfo?.expressions[exprIndex];

    // dispose ONCE outside setState
    business.disposeExpression(exprInfo?.expression);

    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).deleteExpression(modelIndex, exprIndex).state;
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

  const onDeleteModel = (modelIndex: number) => {
    setModelIsDeleting(modelIndex, true);
  };

  const onDeleteModelCancel = () => {
    setModelIsDeleting(currentState.selectedModelIndex as number, false);
  };

  const onDeleteModelConfirm = () => {
    const modelIndex = currentState.selectedModelIndex as number;
    const modelInfo = currentState.modelsWithExpressions[modelIndex];

    // dispose ONCE outside setState
    for (const exprInfo of modelInfo?.expressions ?? []) {
      business.disposeExpression(exprInfo.expression);
    }

    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).deleteModel(modelIndex).state;
    });
  };

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
    const modelInfo = currentState.modelsWithExpressions[modelIndex];
    if (!modelInfo) {
      return;
    }

    business.applyModelValues(modelInfo.model, model);

    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev)
        .bumpModelVersion(modelIndex)
        .state;
    });
  };

  const onCloseRightPanel = () => {
    setShowExpressionTreeView(false);
  };

  const onHistoryChanged = (modelIndex: number, expressionIndex: number, history: IExpressionChangeHistory[][]) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev)
        .setExpressionHistory({ modelIndex, expressionIndex, history })
        .state;
    });
  };

  const onClearSelectedHistory = () => {
    const modelIndex = currentState.selectedModelIndex as number;
    const exprIndex = selectedModel?.selectedExpressionIndex ?? null;

    if (exprIndex === null || exprIndex === undefined) {
      return;
    }

    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev)
        .setExpressionHistory({ modelIndex, expressionIndex: exprIndex, history: [] })
        .state;
    });
  };

  const onSelectHistoryBatch = (
    modelIndex: number,
    expressionIndex: number,
    selectedChangeSetIndex: number,
    items: IExpressionChangeHistory[]
  ) => {
    const modelInfo = currentState.modelsWithExpressions[modelIndex];
    const exprInfo = modelInfo?.expressions[expressionIndex];

    // ✅ Side effect (business) OUTSIDE setState
    if (exprInfo?.expression) {
      try {
        business.replayChangeHistory({
          expression: exprInfo.expression,
          index: selectedChangeSetIndex,
          changeHistory: exprInfo.changeHistory ?? [],
        });
      } catch {
        // swallow
      }
    }

    // ✅ State update in builder
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev)
        .setSelectedChangeHistoryIndex(modelIndex, expressionIndex, selectedChangeSetIndex, items)
        .state;
    });
  };
  const setTreeZoomPercent = (treeZoomPercent: number) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).setTreeZoomPercent(treeZoomPercent).state;
    });
  };

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
                            {selectedModel && (
                              <ModelEditor
                                key={selectedModel.version}
                                modelIndex={currentState.selectedModelIndex as number}
                                model={selectedModel.model}
                                onCommit={onModelChange}
                              />
                            )}
                          </div>
                        </Panel>

                        <Separator className='separator-horizontal' />

                        <Panel defaultSize={30} minSize={15} className='panel'>
                          {selectedExpression && (
                            <ChangeHistoryPanel
                              canClearSelectedHistory={canClearSelectedHistory}
                              selectedModelIndex={currentState.selectedModelIndex}
                              selectedExpressionIndex={selectedExpressionIndex}
                              selectedExpression={selectedExpression}
                              onHistoryChanged={onHistoryChanged}
                              onSelectionChanged={onSelectHistoryBatch}
                              onClearSelectedHistory={onClearSelectedHistory}
                            />
                          )}
                        </Panel>
                      </Group>
                    </Panel>

                    <Separator className='separator' />

                    <Panel defaultSize={80} minSize={20} className='panel'>
                      {selectedExpression && (
                        <ExpressionTreePanel
                          selectedExpressionString={selectedExpressionString}
                          expressionInfo={selectedExpression}
                          treeZoomPercent={currentState.treeZoomPercent}
                          onTreeZoomPercentChange={setTreeZoomPercent}
                          onClose={onCloseRightPanel}
                          isVisible={shouldShowRightDetailsPanel}
                        />
                      )}
                    </Panel>
                  </Group>
                </Panel>
              </>
            )}
          </>
        )}

        {(currentState.addingModel || editingModel) && (
          <Panel defaultSize={100} className='panel'>
            <Group orientation='vertical' className='panel-stack'>
              <Panel defaultSize={70} minSize={10} className='panel'>
                <TSEditor
                  header={currentState.addingModel ? 'Add Model' : 'Edit model'}
                  namePlaceholder='Model name'
                  name={getModelEditorName()}
                  value={getModelEditorValue()}
                  save={saveModel}
                  cancel={handleCancel}
                />
              </Panel>

              <Separator className='separator-horizontal' />

              <Panel defaultSize={30} minSize={10} className='panel'>
                <ErrorPanel error={getError()} />
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
                      header={currentState.addingExpression ? 'Add expression' : 'Edit expression'}
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
                    <ErrorPanel error={getError()} />
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