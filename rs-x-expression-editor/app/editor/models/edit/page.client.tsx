'use client';

import type { OnMount } from '@monaco-editor/react';
import { useRouter } from 'next/navigation';
import React from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';

import { ErrorPanel } from '../../../../src/components/error-panel/error-panel';
import { TSEditor } from '../../../../src/components/ts-editor/ts-editor.component';
import { ExpressionEditorBusinessService } from '../../../../src/services/expression-editor-business.service';
import { ExpressionEditorStateBuilder } from '../../../../src/services/expression-editor-state-builder';
import { RxjsMonacoTypesLoader } from '../../../../src/services/rxjs-monaco-types-loader';
import { createQueryString, useEditorContext } from '../../provider.client';

const EditModelPageClient: React.FC = () => {
  const router = useRouter();
  const { currentState, setCurrentState, getModelIndex, getExpressionIndex } =
    useEditorContext();

  const business = ExpressionEditorBusinessService.getInstance();

  const modelIndex = getModelIndex();
  const expressionId = getExpressionIndex();
  const queryString = createQueryString(modelIndex, expressionId);

  const modelInfo = currentState.modelsWithExpressions[modelIndex];

  if (!modelInfo) {
    return <div style={{ padding: 16 }}>Model not found.</div>;
  }

  const handleModelMount: OnMount = async (_editor, monaco) => {
    await RxjsMonacoTypesLoader.getInstance().install(monaco);
  };

  const updateModel = (name: string, modelString: string) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).clearErrors().state;
    });

    const trimmed = modelString.trim();
    const trimmedName = name.trim();

    const error = business.validateModelName(
      trimmedName,
      modelIndex,
      currentState.modelsWithExpressions,
    );

    if (error) {
      setCurrentState((prev) => {
        return new ExpressionEditorStateBuilder(prev).addError(error).state;
      });
    }

    const result = business.evaluateModel(trimmed);
    if (!result.success) {
      setCurrentState((prev) => {
        return new ExpressionEditorStateBuilder(prev).addError(
          result.error ?? 'Invalid model',
        ).state;
      });
      return;
    }

    if (error) {
      return;
    }

    const expressionStrings = modelInfo.expressions.map(
      (e) => e.editorExpressionString,
    );

    const compileResults = business.compileExpressions(
      result.model,
      expressionStrings,
    );

    for (const exprInfo of modelInfo.expressions) {
      business.disposeExpression(exprInfo.expression);
    }

    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).updateModel({
        modelId: modelIndex,
        name: trimmedName,
        editorModelString: trimmed,
        model: result.model,
        compileResults,
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
        <Panel defaultSize={100} className="panel">
          <Group orientation="vertical" className="panel-stack">
            <Panel defaultSize={70} minSize={10} className="panel">
              <TSEditor
                header="Edit model"
                namePlaceholder="Model name"
                name={modelInfo.name}
                value={modelInfo.editorModelString}
                save={updateModel}
                cancel={onCancel}
                onMount={handleModelMount}
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

export default EditModelPageClient;
