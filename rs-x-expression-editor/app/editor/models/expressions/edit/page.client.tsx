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

const EditExpressionPageClient: React.FC = () => {
  const router = useRouter();
  const {
    currentState,
    setCurrentState,
    getModelIndex: getModelId,
    getExpressionIndex: getExpressionId,
  } = useEditorContext();

  const business = ExpressionEditorBusinessService.getInstance();

  const modelIndex = getModelId();
  const expressionIndex = getExpressionId();
  const queryString = createQueryString(modelIndex, expressionIndex);

  const modelInfo = currentState.modelsWithExpressions[modelIndex];
  const exprInfo = modelInfo?.expressions[expressionIndex];

  if (!modelInfo || !exprInfo) {
    return <div style={{ padding: 16 }}>Expression not found.</div>;
  }

  const getErrors = (): string[] => {
    const errors: string[] = [...currentState.errors];

    if (exprInfo.error) {
      errors.push(exprInfo.error);
    }

    return errors;
  };

  const handleExpressionMount: OnMount = (_, monacoInstance) => {
    ModelIntellisenseService.getInstance().register(monacoInstance);
  };

  const updateExpression = (expressionString: string, name: string) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).clearErrors().state;
    });

    const trimmed = expressionString.trim();

    const trimmedName = name.trim();
    const error =
      ExpressionEditorBusinessService.getInstance().validateExpressionlName(
        trimmedName,
        modelIndex,
        expressionIndex,
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
          compileResult.error as string,
        ).state;
      });
      return;
    }

    if (error) {
      return;
    }

    // dispose old expression ONCE
    business.disposeExpression(exprInfo.expression);

    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).updateExpression({
        modelIndex: modelIndex,
        expressionIndex: expressionIndex,
        name: trimmedName,
        expressionString: trimmed,
        compileResult,
      }).state;
    });

    router.replace(`/editor?${queryString}`);
  };

  const onCancel = () => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).setEditingExpressionIndex(modelIndex, -1).state;
    });
    router.replace(`/editor?${queryString}`);
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
            header="Edit expression"
            namePlaceholder="Expression name"
            name={exprInfo.name}
            errors={getErrors()}
            script={exprInfo.editorExpressionString}
            options={{
              suggestOnTriggerCharacters: true,
              quickSuggestions: true,
              wordBasedSuggestions: 'off',
            }}
            save={updateExpression}
            cancel={onCancel}
            onMount={handleExpressionMount}
          />
        </Panel>
      </Group>
    </div>
  );
};

export default EditExpressionPageClient;
