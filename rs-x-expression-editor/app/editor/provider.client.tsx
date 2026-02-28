'use client';

import { useSearchParams } from 'next/navigation';
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { InjectionContainer } from '@rs-x/core';
import { RsXExpressionParserModule } from '@rs-x/expression-parser';

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
  let query: Record<string, string> = {};

  if (
    expressionIndex !== undefined &&
    expressionIndex >= 0 &&
    modelIndex >= 0
  ) {
    query = {
      modelIndex: modelIndex.toString(),
      expressionIndex: expressionIndex.toString(),
    };
  } else if (modelIndex >= 0) {
    query = {
      modelIndex: modelIndex.toString(),
    };
  }

  return new URLSearchParams(query).toString();
}

export const EditorProvider: React.FC<{ children: React.ReactNode }> = (
  props,
) => {
  const [isBootstrapped, setIsBootstrapped] = useState<boolean>(false);
  const didBootstrapRef = useRef<boolean>(false);

  useEffect(() => {
    if (didBootstrapRef.current) {
      return;
    }
    didBootstrapRef.current = true;

    const run = async () => {
      await InjectionContainer.load(RsXExpressionParserModule);

      const host = globalThis as unknown as MonacoEnvironmentHost;

      host.MonacoEnvironment = {
        getWorker(_moduleId: string, label: string) {
          if (label === 'typescript' || label === 'javascript') {
            return new Worker(
              new URL(
                'monaco-editor/esm/vs/language/typescript/ts.worker',
                import.meta.url,
              ),
              { type: 'module' },
            );
          }

          return new Worker(
            new URL(
              'monaco-editor/esm/vs/editor/editor.worker',
              import.meta.url,
            ),
            { type: 'module' },
          );
        },
      };

      setIsBootstrapped(true);
    };

    run().catch((e) => {
      console.error('Editor bootstrap failed', e);
    });
  }, []);

  if (!isBootstrapped) {
    return (
      <div className="fullscreen-loader">
        <Spinner size={60} />
      </div>
    );
  }

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

  const getModelId = (): number => {
    return getId(modelIndexName);
  };

  const getExpressionId = (): number => {
    return getId(expressionIndexName);
  };

  return (
    <EditorContext.Provider
      value={{
        currentState,
        setCurrentState: setCurrentState as React.Dispatch<
          React.SetStateAction<IExpressionEditorState>
        >,
        getModelIndex: getModelId,
        getExpressionIndex: getExpressionId,
      }}
    >
      {props.children}
    </EditorContext.Provider>
  );
};

export default EditorProvider;
