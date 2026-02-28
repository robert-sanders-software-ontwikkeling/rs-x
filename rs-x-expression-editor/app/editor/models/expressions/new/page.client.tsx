'use client';

import type { OnMount } from '@monaco-editor/react';
import { useRouter } from 'next/navigation';
import React from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';

import { ErrorPanel } from '../../../../../src/components/error-panel/error-panel';
import { ObjectViewer } from '../../../../../src/components/object-viewer/object-viewer.component';
import { TSEditor } from '../../../../../src/components/ts-editor/ts-editor.component';
import { ExpressionEditorBusinessService } from '../../../../../src/services/expression-editor-business.service';
import { ExpressionEditorStateBuilder } from '../../../../../src/services/expression-editor-state-builder';
import { ModelIntellisenseService } from '../../../../../src/services/model-intellisense.service';
import { createQueryString, useEditorContext } from '../../../provider.client';

const NewExpressionPageClient: React.FC = () => {
  const router = useRouter();
  const { currentState, setCurrentState, getModelIndex, getExpressionIndex } =
    useEditorContext();

  const business = ExpressionEditorBusinessService.getInstance();

  const modelIndex = getModelIndex();

  const modelInfo = currentState.modelsWithExpressions[modelIndex];

  if (!modelInfo) {
    return <div style={{ padding: 16 }}>Model not found.</div>;
  }

  const handleExpressionMount: OnMount = (_, monacoInstance) => {
    ModelIntellisenseService.getInstance().register(monacoInstance);
  };

  const addExpression = (name: string, expressionString: string) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).clearErrors().state;
    });

    const trimmed = expressionString.trim();
    const trimmedName = name.trim();

    const error =
      ExpressionEditorBusinessService.getInstance().validateExpressionlName(
        trimmedName,
        modelIndex,
        -1,
        currentState.modelsWithExpressions,
      );

    if (error) {
      setCurrentState((prev) => {
        return new ExpressionEditorStateBuilder(prev).addError(error).state;
      });
    }

    const compileResult = business.compileExpression(modelInfo.model, trimmed);

    if (compileResult.error) {
      setCurrentState((prev) => {
        return new ExpressionEditorStateBuilder(prev).addError(
          compileResult.error ?? 'Invalid expression',
        ).state;
      });
      return;
    }

    if (error) {
      return;
    }

    const newState = new ExpressionEditorStateBuilder(
      currentState,
    ).addExpression({
      modelIndex: modelIndex,
      name: trimmedName,
      expressionString: trimmed,
      compileResult,
    }).state;

    setCurrentState(newState);

    const selectedModel =
      newState.modelsWithExpressions[newState.selectedModelIndex];

    router.replace(
      `/editor?${createQueryString(newState.selectedModelIndex, selectedModel.selectedExpressionIndex)}`,
    );
  };

  const onCancel = () => {
    const expressionIndex = getExpressionIndex();
    router.replace(`/editor?${createQueryString(modelIndex, expressionIndex)}`);
  };

  return (
    <div className="app">
      <Group orientation="horizontal" className="panels-container">
        <Panel defaultSize={30} minSize={15} className="panel">
          <div className="panel-header">Model</div>
          <div className="editor-wrapper">
            <ObjectViewer modelString={modelInfo.editorModelString} />
          </div>
        </Panel>

        <Separator className="separator" />

        <Panel defaultSize={70} minSize={30} className="panel">
          <Group orientation="vertical" className="panel-stack">
            <Panel defaultSize={70} minSize={10} className="panel">
              <TSEditor
                header="Add expression"
                options={{
                  suggestOnTriggerCharacters: true,
                  quickSuggestions: true,
                  wordBasedSuggestions: 'off',
                }}
                namePlaceholder="Expression name"
                name=""
                value=""
                save={addExpression}
                cancel={onCancel}
                onMount={handleExpressionMount}
              />
            </Panel>

            <Separator className="separator-horizontal" />

            <Panel defaultSize={30} minSize={10} className="panel">
              <ErrorPanel errors={currentState.errors} />
            </Panel>
          </Group>
        </Panel>
      </Group>
    </div>
  );
};

export default NewExpressionPageClient;
