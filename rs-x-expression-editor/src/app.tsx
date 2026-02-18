import type { OnMount } from '@monaco-editor/react';
import { InjectionContainer } from '@rs-x/core';
import React, { useEffect, useMemo, useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import {
  IExpressionChangeHistory,
  IExpressionManager,
  RsXExpressionParserInjectionTokens,
} from '../../rs-x-expression-parser/lib';

import { FaTrash } from 'react-icons/fa';

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
import { ExpressionChangeHistoryView } from './components/expression-change-history-view/expression-change-history-view.component';

import { ModelEditor } from './components/model-editor/model-editor.component';
import { ExpressionTree } from './components/expression-tree-view/expression-tree-view.component';

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
  const [treeHighlight, setTreeHighlight] = useState<readonly IExpressionChangeHistory[]>([]);
  const [treeHighlightVersion, setTreeHighlightVersion] = useState<number>(0);

  // ✅ Zoom owned by App; passed down to ExpressionTree
  const zoomPresets = useMemo(() => {
    return [50, 75, 100, 125, 150, 200, 300] as const;
  }, []);
  const [treeZoomPercent, setTreeZoomPercent] = useState<number>(100);

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

  const shouldShowRightDetailsPanel =
    !isEditing && selectedExpressionIndex !== null && isRightPanelOpen;

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

  const onModelChange = (modelIndex: number, model: object) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).setModel(modelIndex, model).state;
    });
  };

  const onCloseRightPanel = () => {
    setIsRightPanelOpen(() => {
      return false;
    });
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
    items: readonly IExpressionChangeHistory[]
  ) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev)
        .setSelectedChangeHistoryIndex(modelIndex, expressionIndex, selectedChangeSetIndex)
        .state;
    });

    setTreeHighlight(() => {
      return [...items];
    });

    setTreeHighlightVersion((v) => {
      return v + 1;
    });
  };

  const selectedHistoryCount = selectedExpression?.changeHistory?.length ?? 0;
  const canClearSelectedHistory = selectedExpressionIndex !== null && selectedHistoryCount > 0;

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
                  {/* ❌ REMOVED: Details header */}

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
                              onClick={() => {
                                onClearSelectedHistory();
                              }}
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
                        <span>Expression Tree</span>

                        <div className='exprTreeHeaderControls'>
                          <label className='exprTreeHeaderZoom'>
                            <span>Zoom</span>
                            <select
                              value={treeZoomPercent}
                              onChange={(e) => {
                                setTreeZoomPercent(() => Number(e.target.value));
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
                            className='btn'
                            onClick={() => {
                              onCloseRightPanel();
                            }}
                            title='Close details'
                          >
                            Close
                          </button>
                        </div>
                      </div>

                      <div className='errors-panel'>
                        <ExpressionTree
                          version={selectedExpression.version}
                          root={selectedExpression.expression}
                          highlightChanges={treeHighlight as IExpressionChangeHistory[]}
                          highlightVersion={treeHighlightVersion}
                          zoomPercent={treeZoomPercent}
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

export default AppLoaded;