'use client';

import type { OnMount } from '@monaco-editor/react';
import dedent from 'dedent';
import React, { useEffect, useRef, useState } from 'react';

import {
  AbstractExpression,
  type IExpression,
  type IExpressionChangeHistory,
} from '@rs-x/expression-parser';

import { ensureExpressionParserBootstrapped } from '../../services/expression-parser-bootstrap';
import { downloadProjectZip } from '../../services/project-export.service';
import { ScriptEvaluator } from '../../services/script-evaluator';
import { useExpressionChangeHistoryTracker } from '../expression-change-history-view/hooks/use-expression-change-history-tracker';
import { RxjsMonacoTypesLoader } from '../../services/rxjs-monaco-types-loader';
import { setupScriptModels } from '../../services/setup-script-models';
import { installMonacoPlaceholder } from '../ts-editor/ts-editor.component';
import { ExpressionTreeViewWithModel } from '../expression-tree-view-with-model/expression-tree-view-with-model.component';
import { NotificationToast, type NotificationToastVariant } from '../notification-toast';
import { TsEditorWithErrorPanel } from '../ts-editor-with-error-panel/ts-editor-with-error-panel.component';
import { useSyncScriptToUrl } from '../hooks';


const dataKey = 'data';

type EvalResult =
  | { ok: true; value: IExpression }
  | { ok: false; error: string };

function readInitialScriptFromUrl(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const params = new URLSearchParams(window.location.search);
  return params.get(dataKey) ?? '';
}

function buildScriptQuery(script: string): string {
  const params = new URLSearchParams();
  params.set(dataKey, script);
  return params.toString();
}

function evaluateScript(scriptBody: string): EvalResult {
  const body = scriptBody.trim();
  if (!body) {
    return { ok: false, error: 'Empty script' };
  }

  try {
    const result =
      ScriptEvaluator.getInstance().evaluateScript<IExpression>(body);

    if (!result.success) {
      return {
        ok: false,
        error: result.error ?? 'Failed to evaluate script',
      };
    }

    if (!(result.returnValue instanceof AbstractExpression)) {
      return {
        ok: false,
        error: dedent`
          Script must return an rs-x expression

          Example:

          const $ = api.rxjs;
          const rsx = api.rsx;
          cont model = {
            a: 10, 
            b: $.of(20)
          };
          return rsx('a + b')(model);
        `,
      };
    }

    return { ok: true, value: result.returnValue };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to evaluate script',
    };
  }
}

const editorPlaceholder = dedent`
  // You should return a rs-x expression
  // For example:

  const $ = api.rxjs;
  const rsx = api.rsx;
  cont model = {
    a: 10, 
    b: $.of(20)
  };
  return rsx('a + b')(model);
`;

const USER_MODEL_URI = 'inmemory://rsx/demo.user.js';
const MIN_EDITOR_LOADING_MS = 320;

const yieldFrame = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      resolve();
    });
  });
};

export const Playground: React.FC = () => {
  const [script, setScript] = useState<string>('');

  const [expression, setExpression] = useState<IExpression | undefined>(
    undefined,
  );

  // persisted change history for this demo expression
  const [persistedHistory, setPersistedHistory] = useState<
    IExpressionChangeHistory[][]
  >([]);

  // latest selection (for “selected” styling)
  const [treeHighligh, setTreeHighLight] = useState<IExpressionChangeHistory[]>(
    [],
  );

  const [treeZoomPercent, setTreeZoomPercent] = useState<number>(100);
  const [errors, setErrors] = useState<string[]>([]);
  const [isBootstrapReady, setIsBootstrapReady] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [isEditorLoading, setIsEditorLoading] = useState<boolean>(true);
  const [notice, setNotice] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: NotificationToastVariant;
  }>({
    open: false,
    title: '',
    message: '',
    variant: 'info',
  });
  const [editorMount, setEditorMount] = useState<{
    editor: Parameters<OnMount>[0];
    monaco: Parameters<OnMount>[1];
  } | null>(null);
  const didInitEditorRef = useRef<boolean>(false);

  useSyncScriptToUrl({
    script,
    buildQuery: buildScriptQuery,
    enabled: isHydrated,
  });

  useEffect(() => {
    setScript(readInitialScriptFromUrl());
    setIsHydrated(true);
  }, []);

  useExpressionChangeHistoryTracker({
    changeHistory: persistedHistory,
    expression: expression ?? null,
    version: 0,
    modelIndex: 0,
    expressionIndex: 0,

    onHistoryChange: (_modelIndex, _expressionIndex, nextHistory) => {
      setPersistedHistory(nextHistory);
    },

    onSelectionChanged: (
      _modelIndex,
      _expressionIndex,
      _newestPersistedIndex,
      stack,
      _replay,
    ) => {
      // latest selection for “selected” styling (stable reference is fine)
      setTreeHighLight(stack);
    },
  });

  useEffect(() => {
    let cancelled = false;

    ensureExpressionParserBootstrapped()
      .then(() => {
        if (!cancelled) {
          setIsBootstrapReady(true);
        }
      })
      .catch((error) => {
        console.error('Failed to bootstrap expression parser module', error);
        if (!cancelled) {
          setErrors([
            error instanceof Error
              ? error.message
              : 'Failed to initialize expression parser module',
          ]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleMount: OnMount = (editor, monaco) => {
    setEditorMount({ editor, monaco });
  };

  useEffect(() => {
    if (!editorMount || didInitEditorRef.current) {
      return;
    }
    didInitEditorRef.current = true;

    let cancelled = false;
    const loadingStart = Date.now();

    setIsEditorLoading(true);

    void (async () => {
      try {
        // Paint first, then start heavier setup work.
        await yieldFrame();
        await yieldFrame();

        if (cancelled) {
          return;
        }

        setupScriptModels({
          monaco: editorMount.monaco,
          initialUserCode: script,
        });

        await yieldFrame();
        if (cancelled) {
          return;
        }

        const userModel = editorMount.monaco.editor.getModel(
          editorMount.monaco.Uri.parse(USER_MODEL_URI),
        );
        if (userModel) {
          editorMount.editor.setModel(userModel);
        }

        installMonacoPlaceholder(
          editorMount.editor,
          editorMount.monaco,
          editorPlaceholder,
        );

        await yieldFrame();
        if (cancelled) {
          return;
        }

        await RxjsMonacoTypesLoader.getInstance().install(editorMount.monaco);
      } finally {
        if (cancelled) {
          return;
        }

        const elapsed = Date.now() - loadingStart;
        const remaining = Math.max(0, MIN_EDITOR_LOADING_MS - elapsed);
        window.setTimeout(() => {
          if (!cancelled) {
            setIsEditorLoading(false);
          }
        }, remaining);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editorMount, script]);

  const disposeExpression = (expr: IExpression | undefined) => {
    if (!expr) {
      return;
    }

    const anyExpr = expr as unknown as { dispose?: () => void };
    if (typeof anyExpr.dispose === 'function') {
      anyExpr.dispose();
    }
  };

  const setNewExpression = (next: IExpression | undefined) => {
    disposeExpression(expression);

    setPersistedHistory([]);
    setTreeHighLight([]);
    setExpression(next);
  };

  const showNotice = (
    title: string,
    message: string,
    variant: NotificationToastVariant,
  ) => {
    setNotice({
      open: true,
      title,
      message,
      variant,
    });
  };

  const compileScriptInternal = async (
    nextScript: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    setScript(nextScript);

    try {
      await ensureExpressionParserBootstrapped();
      setIsBootstrapReady(true);

      const result = evaluateScript(nextScript);
      if (result.ok) {
        setErrors([]);
        setNewExpression(result.value);
        return { ok: true };
      }

      setErrors([result.error]);
      setNewExpression(undefined);
      return { ok: false, error: result.error };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to initialize expression parser module';
      setErrors([message]);
      setNewExpression(undefined);
      return { ok: false, error: message };
    }
  };

  const compileScript = (nextScript: string) => {
    void compileScriptInternal(nextScript);
  };

  // auto compile once
  const didAutoCompileRef = useRef<boolean>(false);
  useEffect(() => {
    if (!isBootstrapReady) {
      return;
    }

    if (didAutoCompileRef.current) {
      return;
    }
    didAutoCompileRef.current = true;

    if (script.trim().length === 0) {
      return;
    }

    compileScript(script);
  }, [isBootstrapReady, script]);

  const onSelectHistoryBatch = (
    _modelIndex: number,
    _expressionIndex: number,
    _selectedIndex: number,
    items: IExpressionChangeHistory[],
  ) => {
    setTreeHighLight(items);
  };

  const modelEditor = (
    <TsEditorWithErrorPanel
      saveButtonName="Compile"
      header="Script"
      hideName={true}
      script={script}
      errors={errors}
      save={compileScript}
      onMount={handleMount}
      onChange={setScript}
      isEditorLoading={isEditorLoading}
      secondaryActionName="Create project"
      secondaryAction={(value) => {
        void (async () => {
          const compileResult = await compileScriptInternal(value);
          if (!compileResult.ok) {
            showNotice('Project export failed', compileResult.error, 'error');
            return;
          }

          downloadProjectZip(value);
          showNotice(
            'Project created',
            'Downloaded rs-x-playground-project.zip',
            'success',
          );
        })();
      }}
      secondaryActionDisabled={!script.trim()}
    />
  );

  return (
    <div className="app">
      <ExpressionTreeViewWithModel
        hideTrackChange={true}
        hideHeader={true}
        expression={expression}
        treeHighlight={treeHighligh}
        treeZoomPercent={treeZoomPercent}
        setTreeZoomPercent={setTreeZoomPercent}
        onSelectHistoryBatch={onSelectHistoryBatch}
        modelEditor={modelEditor}
      />
      <NotificationToast
        open={notice.open}
        title={notice.title}
        message={notice.message}
        variant={notice.variant}
        durationMs={3200}
        onClose={() => {
          setNotice((prev) => {
            return { ...prev, open: false };
          });
        }}
      />
    </div>
  );
};
