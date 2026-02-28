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

  const updateExpression = (name: string, expressionString: string) => {
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
          <Group orientation="vertical" className="panel-stack">
            <Panel defaultSize={70} minSize={10} className="panel">
              <TSEditor
                header="Edit expression"
                options={{
                  suggestOnTriggerCharacters: true,
                  quickSuggestions: true,
                  wordBasedSuggestions: 'off',
                }}
                namePlaceholder="Expression name"
                name={exprInfo.name ?? ''}
                value={exprInfo.editorExpressionString ?? ''}
                save={updateExpression}
                cancel={onCancel}
                onMount={handleExpressionMount}
              />
            </Panel>

            <Separator className="separator-horizontal" />

            <Panel defaultSize={30} minSize={10} className="panel">
              <ErrorPanel errors={getErrors()} />
            </Panel>
          </Group>
        </Panel>
      </Group>
    </div>
  );
};

export default EditExpressionPageClient;
