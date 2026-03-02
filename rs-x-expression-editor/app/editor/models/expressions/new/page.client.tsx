'use client';

import type { OnMount } from '@monaco-editor/react';
import { useRouter } from 'next/navigation';
import React from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';

import { ObjectViewer } from '../../../../../src/components/object-viewer/object-viewer.component';
import { TsEditorWithErrorPanel } from '../../../../../src/components/ts-editor-with-error-panel/ts-editor-with-error-panel.component';
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
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).setAddingExpression(modelIndex, false).state;
    });
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

          <TsEditorWithErrorPanel
            header="Add expression"
            namePlaceholder="Expression name"

            errors={currentState.errors}
            save={addExpression}
            cancel={onCancel}
            onMount={handleExpressionMount}
            options={{
              suggestOnTriggerCharacters: true,
              quickSuggestions: true,
              wordBasedSuggestions: 'off',
            }}
          />
        </Panel>
      </Group>
    </div>
  );
};

export default NewExpressionPageClient;
