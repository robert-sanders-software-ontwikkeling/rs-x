'use client';

import type { OnMount } from '@monaco-editor/react';
import dedent from 'dedent';
import { usePathname } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

import { InjectionContainer } from '@rs-x/core';
import {
  AbstractExpression,
  type IExpression,
  type IExpressionChangeHistory,
  type IExpressionManager,
  RsXExpressionParserInjectionTokens,
} from '@rs-x/expression-parser';

import { ensureExpressionParserBootstrapped } from '../../services/expression-parser-bootstrap';
import { downloadProjectZip } from '../../services/project-export.service';
import { RxjsMonacoTypesLoader } from '../../services/rxjs-monaco-types-loader';
import { ScriptEvaluator } from '../../services/script-evaluator';
import { setupScriptModels } from '../../services/setup-script-models';
import {
  decodeScriptFromUrl,
  decodeScriptParamSyncFallback,
  encodeScriptForUrl,
} from '../../services/url-script-codec';
import { useExpressionChangeHistoryTracker } from '../expression-change-history-view/hooks/use-expression-change-history-tracker';
import { ExpressionTreeViewWithModel } from '../expression-tree-view-with-model/expression-tree-view-with-model.component';
import { useSyncScriptToUrl } from '../hooks';
import {
  NotificationToast,
  type NotificationToastVariant,
} from '../notification-toast';
import { installMonacoPlaceholder } from '../ts-editor/ts-editor.component';
import { TsEditorWithErrorPanel } from '../ts-editor-with-error-panel/ts-editor-with-error-panel.component';

const dataKey = 'data';

type EvalResult =
  | { ok: true; value: IExpression }
  | { ok: false; error: string };

function readInitialScriptFromUrl(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const params = new URLSearchParams(window.location.search);
  const raw = params.get(dataKey);
  if (!raw) {
    return '';
  }

  return decodeScriptParamSyncFallback(raw);
}

async function readInitialScriptFromUrlAsync(): Promise<string> {
  if (typeof window === 'undefined') {
    return '';
  }

  const params = new URLSearchParams(window.location.search);
  const raw = params.get(dataKey);
  if (!raw) {
    return '';
  }

  return decodeScriptFromUrl(raw);
}

async function buildScriptQuery(script: string): Promise<string> {
  const params = new URLSearchParams();
  params.set(dataKey, await encodeScriptForUrl(script));
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

const MIN_EDITOR_LOADING_MS = 320;
const RXJS_TYPES_INSTALL_TIMEOUT_MS = 15000;

const yieldFrame = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      resolve();
    });
  });
};

const withTimeout = async <T,>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutErrorMessage: string,
): Promise<T> => {
  return await new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(timeoutErrorMessage));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
};

const isCanceledError = (error: unknown): boolean => {
  if (error === null || error === undefined) {
    return false;
  }

  const maybeError = error as { name?: unknown; message?: unknown };
  const name =
    typeof maybeError.name === 'string' ? maybeError.name.toLowerCase() : '';
  const message =
    typeof maybeError.message === 'string'
      ? maybeError.message.toLowerCase()
      : String(error).toLowerCase();

  return (
    name.includes('cancel') ||
    name.includes('abort') ||
    message.includes('cancel') ||
    message.includes('abort')
  );
};

export const Playground: React.FC = () => {
  const pathname = usePathname();
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
  const didAutoCompileRef = useRef<boolean>(false);
  const scriptRef = useRef<string>('');
  const expressionRef = useRef<IExpression | undefined>(undefined);

  const disposeExpressionManager = () => {
    try {
      InjectionContainer.get<IExpressionManager>(
        RsXExpressionParserInjectionTokens.IExpressionManager,
      ).dispose();
    } catch {
      // Module may not be bootstrapped yet; no manager to dispose.
    }
  };

  useSyncScriptToUrl({
    script,
    buildQuery: buildScriptQuery,
    enabled: isHydrated,
  });

  useEffect(() => {
    scriptRef.current = script;
  }, [script]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const decodedScript = await readInitialScriptFromUrlAsync();
      if (!cancelled) {
        setScript(decodedScript || readInitialScriptFromUrl());
        setIsHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
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
    let disposeScriptModels: (() => void) | undefined;
    let disposeMonacoPlaceholder: (() => void) | undefined;

    setIsEditorLoading(true);

    void (async () => {
      try {
        // Paint first, then start heavier setup work.
        await yieldFrame();
        await yieldFrame();

        if (cancelled) {
          return;
        }

        const scriptModels = setupScriptModels({
          monaco: editorMount.monaco,
          initialUserCode: scriptRef.current,
        });
        disposeScriptModels = scriptModels.dispose;

        await yieldFrame();
        if (cancelled) {
          return;
        }

        disposeMonacoPlaceholder = installMonacoPlaceholder(
          editorMount.editor,
          editorMount.monaco,
          editorPlaceholder,
        );

        await yieldFrame();
        if (cancelled) {
          return;
        }

        await withTimeout(
          RxjsMonacoTypesLoader.getInstance().install(editorMount.monaco),
          RXJS_TYPES_INSTALL_TIMEOUT_MS,
          'Loading editor types timed out',
        );
      } catch (error) {
        if (cancelled || isCanceledError(error)) {
          return;
        }

        console.error('Failed to initialize playground editor', error);
        setErrors([
          error instanceof Error
            ? error.message
            : 'Failed to initialize playground editor',
        ]);
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
      disposeMonacoPlaceholder?.();
      disposeScriptModels?.();
    };
  }, [editorMount]);

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
    disposeExpression(expressionRef.current);
    expressionRef.current = next;

    setPersistedHistory([]);
    setTreeHighLight([]);
    setExpression(next);
  };

  useEffect(() => {
    expressionRef.current = expression;
  }, [expression]);

  useEffect(() => {
    return () => {
      expressionRef.current = undefined;
      disposeExpressionManager();
    };
  }, []);

  useEffect(() => {
    const onPageHide = () => {
      expressionRef.current = undefined;
      didAutoCompileRef.current = false;
      disposeExpressionManager();
    };

    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

  useEffect(() => {
    if (pathname !== '/playground') {
      expressionRef.current = undefined;
      didAutoCompileRef.current = false;
      disposeExpressionManager();
    }
  }, [pathname]);

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

  // auto compile once per mounted/active playground session
  useEffect(() => {
    if (!isBootstrapReady) {
      return;
    }

    if (script.trim().length === 0) {
      return;
    }

    if (didAutoCompileRef.current) {
      return;
    }
    didAutoCompileRef.current = true;

    compileScript(script);
  }, [isBootstrapReady, script]);

  useEffect(() => {
    if (pathname !== '/playground') {
      return;
    }

    if (!isBootstrapReady) {
      return;
    }

    const currentScript = scriptRef.current;
    if (currentScript.trim().length === 0) {
      return;
    }

    if (expressionRef.current) {
      return;
    }

    didAutoCompileRef.current = true;
    compileScript(currentScript);
  }, [isBootstrapReady, pathname]);

  useEffect(() => {
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isCanceledError(event.reason)) {
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

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
