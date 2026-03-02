'use client';

import type { OnMount } from '@monaco-editor/react';
import { useRouter } from 'next/navigation';
import React from 'react';

import { TsEditorWithErrorPanel } from '../../../../src/components/ts-editor-with-error-panel/ts-editor-with-error-panel.component';
import { ExpressionEditorBusinessService } from '../../../../src/services/expression-editor-business.service';
import { ExpressionEditorStateBuilder } from '../../../../src/services/expression-editor-state-builder';
import { RxjsMonacoTypesLoader } from '../../../../src/services/rxjs-monaco-types-loader';
import { createQueryString, useEditorContext } from '../../provider.client';

const emptyModel = '(\n\t{\n\n\t}\n)';

const NewModelPageClient: React.FC = () => {
  const router = useRouter();
  const { currentState, setCurrentState } = useEditorContext();

  const business = ExpressionEditorBusinessService.getInstance();

  const handleModelMount: OnMount = async (_editor, monaco) => {
    await RxjsMonacoTypesLoader.getInstance().install(monaco);
  };

  const addModel = (modelString: string, name: string) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).clearErrors().state;
    });
    const trimmed = modelString.trim();
    const trimmedName = name.trim();

    const error = business.validateModelName(
      trimmedName,
      -1,
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

    const newState = new ExpressionEditorStateBuilder(currentState).addModel({
      name: trimmedName,
      editorModelString: trimmed,
      model: result.returnValue,
    }).state;

    setCurrentState(newState);

    router.replace(`/editor?${createQueryString(newState.selectedModelIndex)}`);
  };

  const onCancel = () => {
    const modelIndex = currentState.selectedModelIndex;
    const expressionIndex =
      currentState.modelsWithExpressions[modelIndex]?.selectedExpressionIndex ??
      -1;

    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).setAddingModel(false).state;
    });
    router.replace(`editor?${createQueryString(modelIndex, expressionIndex)}`);
  };

  return (
    <div className="app">
      <TsEditorWithErrorPanel
        header="Add model"
        namePlaceholder="Model name"
        errors={currentState.errors}
        script={emptyModel}
        save={addModel}
        cancel={onCancel}
        onMount={handleModelMount}
      />
    </div>
  );
};

export default NewModelPageClient;
