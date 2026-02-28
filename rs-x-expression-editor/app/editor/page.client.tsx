'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { ConfirmDialog } from '../../src/components/confirm-dialog/confirm-dialog.component';
import { ModelList } from '../../src/components/model-list/model-list.component';
import { ExpressionEditorBusinessService } from '../../src/services/expression-editor-business.service';
import { ExpressionEditorStateBuilder } from '../../src/services/expression-editor-state-builder';

import { createQueryString, useEditorContext } from './provider.client';

const EditorListPageClient: React.FC = () => {
  const router = useRouter();
  const { currentState, setCurrentState, getModelIndex, getExpressionIndex } =
    useEditorContext();

  const queryModelIndex = getModelIndex();
  const modelIndex =
    queryModelIndex === -1 ? currentState.selectedModelIndex : queryModelIndex;

  const queryExpressionId = getExpressionIndex();
  const expressionId =
    queryExpressionId === -1
      ? currentState?.modelsWithExpressions[modelIndex]?.selectedExpressionIndex
      : queryExpressionId;

  const business = ExpressionEditorBusinessService.getInstance();

  const selectedModel =
    currentState.modelsWithExpressions[currentState.selectedModelIndex];
  const selectedExpression =
    selectedModel?.expressions[selectedModel?.selectedExpressionIndex];

  const onSelectModel = (modelIndex: number) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).selectModel(modelIndex)
        .state;
    });
    router.push(`/editor?${createQueryString(modelIndex)}`);
  };

  const onAddModel = () => {
    router.push('/editor/models/new');
  };

  const onEditModel = (modelIndex: number) => {
    router.push(`/editor/models/edit?${createQueryString(modelIndex)}`);
  };

  const onAddExpression = (modelIndex: number) => {
    router.push(
      `/editor/models/expressions/new?${createQueryString(modelIndex)}`,
    );
  };

  const onSelectExpression = (modelIndex: number, expressionIndex: number) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).selectExpression(
        modelIndex,
        expressionIndex,
      ).state;
    });

    router.push(
      `/editor/models/expressions/view?${createQueryString(modelIndex, expressionIndex)}`,
    );
  };

  const onEditExpression = (modelIndex: number, expressionIndex: number) => {
    router.push(
      `/editor/models/expressions/edit?${createQueryString(modelIndex, expressionIndex)}`,
    );
  };

  const setModelIsDeleting = (modelIndex: number) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).setModelIsDeleting(
        modelIndex,
      ).state;
    });
  };

  const onDeleteModel = (modelIndex: number) => {
    setModelIsDeleting(modelIndex);
  };

  const onDeleteModelCancel = () => {
    setModelIsDeleting(-1);
  };

  const onDeleteModelConfirm = () => {
    const modelIndex = currentState.selectedModelIndex;
    const modelInfo = currentState.modelsWithExpressions[modelIndex];

    for (const exprInfo of modelInfo?.expressions ?? []) {
      business.disposeExpression(exprInfo.expression);
    }

    const prevSelectedIndex = currentState.selectedModelIndex;

    const nextState = new ExpressionEditorStateBuilder(
      currentState,
    ).deleteModel(modelIndex).state;

    setCurrentState(nextState);

    if (nextState.selectedModelIndex == 1) {
      router.replace('/editor');
    } else if (nextState.selectedModelIndex !== prevSelectedIndex) {
      router.replace(
        `/editor?${createQueryString(nextState.selectedModelIndex)}`,
      );
    }
  };

  const onDeleteExpression = (modelIndex: number, expressionIndex: number) => {
    setExpressionIsDeleting(modelIndex, expressionIndex);
  };

  const onDeleteExpressionConfirm = () => {
    const prevSelectedExpressionIndex =
      currentState.modelsWithExpressions[modelIndex].selectedExpressionIndex;
    const newState = new ExpressionEditorStateBuilder(
      currentState,
    ).deleteExpression(modelIndex, currentState.deletingExpressionIndex).state;

    setCurrentState(newState);

    const newSelectedExpressionIndex =
      newState.modelsWithExpressions[modelIndex].selectedExpressionIndex;

    if (newSelectedExpressionIndex == -1) {
      router.replace(`/editor?${createQueryString(modelIndex)}`);
    } else if (newSelectedExpressionIndex !== prevSelectedExpressionIndex) {
      router.replace(
        `/editor?${createQueryString(modelIndex, newSelectedExpressionIndex)}`,
      );
    }
  };

  const onDeleteExpressionCancel = () => {
    setExpressionIsDeleting(modelIndex, -1);
  };

  const setExpressionIsDeleting = (
    modelIndex: number,
    expressionIndex: number,
  ) => {
    setCurrentState((prev) => {
      return new ExpressionEditorStateBuilder(prev).setExpressionIsDeleting(
        modelIndex,
        expressionIndex,
      ).state;
    });
  };

  return (
    <div className="app">
      <div className="panels-container">
        <div className="panel full-width">
          <ModelList
            selectedModelIndex={modelIndex}
            selectedExpressionIndex={expressionId}
            modelsWithExpressions={currentState.modelsWithExpressions}
            onSelectModel={onSelectModel}
            onAddModel={onAddModel}
            onDeleteModel={onDeleteModel}
            onEditModel={onEditModel}
            onAddExpression={onAddExpression}
            onSelectExpression={onSelectExpression}
            onEditExpression={onEditExpression}
            onDeleteExpression={onDeleteExpression}
          />
        </div>
      </div>
      {selectedModel && (
        <ConfirmDialog
          isOpen={currentState.deletingModelIndex >= 0}
          title="Delete model"
          message={`Are you sure you want to delete the model '${selectedModel.name}'? This will delete the model and all its expressions. This action cannot be undone.`}
          onCancel={onDeleteModelCancel}
          onConfirm={onDeleteModelConfirm}
        />
      )}
      {selectedExpression && (
        <ConfirmDialog
          isOpen={currentState.deletingExpressionIndex >= 0}
          title="Delete expression"
          message={`Are you sure you want to delete expression '${selectedExpression.name}'. This cannot be undone.`}
          onCancel={onDeleteExpressionCancel}
          onConfirm={onDeleteExpressionConfirm}
        />
      )}
    </div>
  );
};

export default EditorListPageClient;
