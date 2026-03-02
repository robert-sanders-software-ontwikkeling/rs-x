'use client';

import type { OnMount } from '@monaco-editor/react';
import { useRouter } from 'next/navigation';
import React from 'react';

import { TsEditorWithErrorPanel } from '../../../../src/components/ts-editor-with-error-panel/ts-editor-with-error-panel.component';
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

  const updateModel = (modelString: string, name: string) => {
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
      result.returnValue,
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
        model: result.returnValue,
        compileResults,
      }).state;
    });

    router.replace(`/editor?${queryString}`);
  };

  const onCancel = () => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).setEditingModelIndex(-1)
        .state;
    });
    router.replace(`/editor?${queryString}`);
  };

  return (
    <div className="app">
      <TsEditorWithErrorPanel
        header="Edit model"
        namePlaceholder="Model name"
        script={modelInfo.editorModelString}
        errors={currentState.errors}
        save={updateModel}
        cancel={onCancel}
        onMount={handleModelMount}
      />
    </div>
  );
};

export default EditModelPageClient;
