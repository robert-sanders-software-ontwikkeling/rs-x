'use client';

import { useSearchParams } from 'next/navigation';
import React, { createContext, useContext, useEffect, useState } from 'react';

import { Spinner } from '../../src/components/spinner/spinner.component';
import { useExpressionEditorState } from '../../src/hooks/use-expression-editor-state';
import { usePersistExpressionEditorState } from '../../src/hooks/use-persist-expression-editor-state';
import type { IExpressionEditorState } from '../../src/models/expression-editor-state.interface';

type IEditorContext = {
  currentState: IExpressionEditorState;
  setCurrentState: React.Dispatch<React.SetStateAction<IExpressionEditorState>>;
  getModelIndex(): number;
  getExpressionIndex(): number;
};

const EditorContext = createContext<IEditorContext | null>(null);

export function useEditorContext(): IEditorContext {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error('useEditorContext must be used within <EditorProvider />');
  }
  return ctx;
}

export function createQueryString(
  modelIndex: number,
  expressionIndex?: number,
): string {
  const query: Record<string, string> = {};

  if (modelIndex >= 0) {
    query.modelIndex = String(modelIndex);
  }
  if (expressionIndex !== undefined && expressionIndex >= 0) {
    query.expressionIndex = String(expressionIndex);
  }

  return new URLSearchParams(query).toString();
}

export const EditorProvider: React.FC<{ children: React.ReactNode }> = (
  props,
) => {
  return <EditorProviderState>{props.children}</EditorProviderState>;
};

const modelIndexName = 'modelIndex';
const expressionIndexName = 'expressionIndex';

const EditorProviderState: React.FC<{ children: React.ReactNode }> = (
  props,
) => {
  const deserializedState = useExpressionEditorState();
  const searchParams = useSearchParams();

  const [currentState, setCurrentState] =
    useState<IExpressionEditorState | null>(null);

  useEffect(() => {
    if (!deserializedState) {
      return;
    }
    setCurrentState(deserializedState);
  }, [deserializedState]);

  usePersistExpressionEditorState(currentState, 200);

  if (!currentState) {
    return (
      <div className="fullscreen-loader">
        <Spinner size={60} />
      </div>
    );
  }

  const getId = (name: string): number => {
    const value = searchParams.get(name);
    return value ? Number(value) : -1;
  };

  const getModelIndex = (): number => getId(modelIndexName);
  const getExpressionIndex = (): number => getId(expressionIndexName);

  return (
    <EditorContext.Provider
      value={{
        currentState,
        setCurrentState: setCurrentState as React.Dispatch<
          React.SetStateAction<IExpressionEditorState>
        >,
        getModelIndex,
        getExpressionIndex,
      }}
    >
      {props.children}
    </EditorContext.Provider>
  );
};

export default EditorProvider;
