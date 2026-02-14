import type { OnMount } from '@monaco-editor/react';
import { InjectionContainer } from '@rs-x/core';
import React, { useEffect, useState } from 'react';
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
    }, 300);

    return () => clearTimeout(id);
  }, [currentState]);

  const handleAddModel = () =>
    setCurrentState(prev =>
      new ExpressionEditorStateBuilder(prev)
        .setAddingModel(true)
        .state
    );

  const handleAddExpression = (model: object) => {
    setCurrentState(prev =>
      new ExpressionEditorStateBuilder(prev)
        .setAddingExpression(true)
        .selectModel(model, true)
        .state
    );

    ModelIntellisenseService.getInstance().model = model;
  };

  function getSelectedModelString(): string | undefined {
    return currentState.modelsWithExpressions.find(modelWithExpressions => modelWithExpressions.selected)?.modelString;
  }

  const handleCancel = () => {
    setCurrentState(prev => {
      const b = new ExpressionEditorStateBuilder(prev);

      if (prev.addingExpression) return b.setAddingExpression(false).state;
      if (prev.addingModel) return b.setAddingModel(false).state;

      return prev;
    });
  };

  const saveModel = (name: string, modelString: string) => {
    try {
      const model = new Function(`return ${modelString}`)();
      setCurrentState(prev =>
        new ExpressionEditorStateBuilder(prev)
          .addModel(name, modelString, model)
          .setAddingModel(false)
          .state
      );
    } catch (e) {
      setCurrentState(prev =>
        new ExpressionEditorStateBuilder(prev)
          .setError(e instanceof Error ? e.message : String(e))
          .state
      );
    }
  };

  const saveExpression = (name: string, expressionString: string) => {
    const trimmed = expressionString?.trim();
    if (!trimmed) return;

    const selectedModel = currentState.modelsWithExpressions.find(m => m.selected)?.model;
    if (!selectedModel) return;

    try {
      const { instance: expression } = expressionManager
        .create(selectedModel)
        .instance.create({ expressionString: trimmed });

      setCurrentState(prev =>
        new ExpressionEditorStateBuilder(prev)
          .addExpression(selectedModel, name, expression)
          .setAddingExpression(false)
          .state
      );
    } catch (e) {
      setCurrentState(prev =>
        new ExpressionEditorStateBuilder(prev)
          .setError(e instanceof Error ? e.message : String(e))
          .state
      );
    }
  };

  const handleExpressionMount: OnMount = (_, monacoInstance) => {
    ModelIntellisenseService.getInstance().registerCompletionProvider(monacoInstance);
  };

  const onSelectExpression = (mode: object, selectedExpressionIndex: number) => {
    setCurrentState(prev =>
      new ExpressionEditorStateBuilder(prev)
        .selectExpression(mode, selectedExpressionIndex)
        .state
    );
  };

  const onDeleteExpression = (mode: object, selectedExpressionIndex: number) => {
    setCurrentState(prev =>
      new ExpressionEditorStateBuilder(prev)
        .deleteExpression(mode, selectedExpressionIndex)
        .state
    );
  };

  const onEditExpression = (mode: object, selectedExpressionIndex: number) => {
    setCurrentState(prev =>
      new ExpressionEditorStateBuilder(prev)
        .editExpression(mode, selectedExpressionIndex)
        .state
    );
  };

  return (
    <div className="app">
      <Group orientation="horizontal" className="panels-container">
        {!currentState.addingModel && !currentState.addingExpression && (
          <Panel defaultSize={25} className="panel">
            <ModelList
              modelsWithExpressions={currentState.modelsWithExpressions}
              handleAddModel={handleAddModel}
              handleAddExpression={handleAddExpression}
              onSelectExpression={onSelectExpression}
              onEditExpression={onDeleteExpression}
              onDeleteExpression={onEditExpression}
            />
          </Panel>
        )}

        {currentState.addingModel && (
          <Panel defaultSize={60} className="panel">
            <Group orientation="vertical" className="panel-stack">
              <Panel defaultSize={70} minSize={10} className="panel">
                <TSEditor
                  header="Model Editor"
                  value={emptyModel}
                  save={saveModel}
                  cancel={handleCancel}
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
        )}

        {currentState.addingExpression && (
          <Panel defaultSize={60} className="panel">
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