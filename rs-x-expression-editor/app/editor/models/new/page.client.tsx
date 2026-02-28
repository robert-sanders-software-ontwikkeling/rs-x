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

const emptyModel = '(\n\t{\n\n\t}\n)';

const NewModelPageClient: React.FC = () => {
  const router = useRouter();
  const { currentState, setCurrentState } = useEditorContext();

  const business = ExpressionEditorBusinessService.getInstance();

  const handleModelMount: OnMount = async (_editor, monaco) => {
    await RxjsMonacoTypesLoader.getInstance().install(monaco);
  };

  const addModel = (name: string, modelString: string) => {
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
      model: result.model,
    }).state;

    setCurrentState(newState);

    router.replace(`/editor?${createQueryString(newState.selectedModelIndex)}`);
  };

  const onCancel = () => {
    const modelIndex = currentState.selectedModelIndex;
    const expressionIndex =
      currentState.modelsWithExpressions[modelIndex]?.selectedExpressionIndex ??
      -1;
    router.replace(`editor?${createQueryString(modelIndex, expressionIndex)}`);
  };

  return (
    <div className="app">
      <Group orientation="horizontal" className="panels-container">
        <Panel defaultSize={100} className="panel">
          <Group orientation="vertical" className="panel-stack">
            <Panel defaultSize={70} minSize={10} className="panel">
              <TSEditor
                header="Add Model"
                namePlaceholder="Model name"
                name=""
                value={emptyModel}
                save={addModel}
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

export default NewModelPageClient;
