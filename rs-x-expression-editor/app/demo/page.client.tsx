'use client';

import type { OnMount } from '@monaco-editor/react';
import dedent from 'dedent';
import React, { useEffect, useRef, useState } from 'react';

import type {
  IExpression,
  IExpressionChangeHistory,
} from '@rs-x/expression-parser';

import { useExpressionChangeHistoryTracker } from '../../src/components/expression-change-history-view/hooks/use-expression-change-history-tracker';
import { ExpressionTreeViewWithModel } from '../../src/components/expression-tree-view-with-model/expression-tree-view-with-model.component';
import { TsEditorWithErrorPanel } from '../../src/components/ts-editor-with-error-panel/ts-editor-with-error-panel.component';
import { RxjsMonacoTypesLoader } from '../../src/services/rxjs-monaco-types-loader';
import { ScriptEvaluator } from '../../src/services/script-evaluator';
import { setupScriptModels } from '../../src/services/setup-script-models';

import { useSyncScriptToUrl } from './hooks/use-sync-script-to-url';

const dataKey = 'data';

export type ExpressionWithData<
  TModel extends object = object,
  TReturn = unknown,
> = {
  model: TModel;
  expression: IExpression<TReturn>;
};

type EvalResult =
  | { ok: true; value: ExpressionWithData }
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

function isExpressionWithData(value: unknown): value is ExpressionWithData {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const v = value as { model?: unknown; expression?: unknown };

  if (!v.model || typeof v.model !== 'object') {
    return false;
  }

  if (!v.expression || typeof v.expression !== 'object') {
    return false;
  }

  return true;
}

function evaluateScript(scriptBody: string): EvalResult {
  const body = scriptBody.trim();
  if (!body) {
    return { ok: false, error: 'Empty script' };
  }

  try {
    const result =
      ScriptEvaluator.getInstance().evaluateScript<ExpressionWithData>(body);

    if (!result.success) {
      return {
        ok: false,
        error: result.error ?? 'Failed to evaluate script',
      };
    }

    if (!isExpressionWithData(result.returnValue)) {
      return {
        ok: false,
        error: dedent`
          Script must return: { model: object, expression: IExpression }.

          Example:

          return {
            model: ({ a: 1 }),
            expression: api.rsx('a + 1')(({ a: 1 })),
          };
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

const USER_MODEL_URI = 'inmemory://rsx/demo.user.js';

const DemoPageClient: React.FC = () => {
  // ✅ read once from URL
  const [script, setScript] = useState<string>(() => {
    return readInitialScriptFromUrl();
  });

  const [expression, setExpression] = useState<IExpression | undefined>(
    undefined,
  );

  // persisted change history for this demo expression
  const [persistedHistory, setPersistedHistory] = useState<
    IExpressionChangeHistory[][]
  >([]);

  // highlight (selected stack)
  const [treeHighligh, setTreeHighLight] = useState<IExpressionChangeHistory[]>(
    [],
  );

  const [treeHighlightVersion, setTreeHighlightVersion] = useState<number>(0);

  const [treeZoomPercent, setTreeZoomPercent] = useState<number>(75);
  const [errors, setErrors] = useState<string[]>([]);

  // keep URL in sync with script (no re-read)
  useSyncScriptToUrl({
    script,
    buildQuery: buildScriptQuery,
  });

  // Track changes on the currently compiled expression and keep highlight in sync
  useExpressionChangeHistoryTracker({
    changeHistory: persistedHistory,
    expression: expression ?? null,

    // only `expression` should drive lifecycle; version is ignored by your hook anyway
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
      setTreeHighlightVersion(treeHighlightVersion + 1);
      setTreeHighLight([...stack]);
    },
  });

  const handleMount: OnMount = async (editor, monaco) => {
    await RxjsMonacoTypesLoader.getInstance().install(monaco);

    setupScriptModels({
      monaco,
      initialUserCode: script,
    });

    const userModel = monaco.editor.getModel(monaco.Uri.parse(USER_MODEL_URI));
    if (userModel) {
      editor.setModel(userModel);
    }
  };

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
    // dispose old expression instance
    disposeExpression(expression);

    // reset history/highlight for the new compiled expression instance
    setPersistedHistory([]);
    setTreeHighLight([]);

    setExpression(next);
  };

  const compileScript = (nextScript: string) => {
    const result = evaluateScript(nextScript);

    setScript(nextScript);

    if (result.ok) {
      setErrors([]);
      setNewExpression(result.value.expression);
      return;
    }

    setErrors([result.error]);
    setNewExpression(undefined);
  };

  // ✅ AUTO-COMPILE the initial script once (so page loads “working”)
  const didAutoCompileRef = useRef<boolean>(false);
  useEffect(() => {
    if (didAutoCompileRef.current) {
      return;
    }
    didAutoCompileRef.current = true;

    if (script.trim().length === 0) {
      return;
    }
    // compile initial URL script once
    compileScript(script);
  }, []);

  const onSelectHistoryBatch = (
    _modelIndex: number,
    _expressionIndex: number,
    _selectedIndex: number,
    items: IExpressionChangeHistory[],
  ) => {
    // manual selection highlight (still works)
    setTreeHighLight(items);
  };

  const modelEditor = (
    <TsEditorWithErrorPanel
      saveButtonName="Compile"
      header="Edit script"
      hideName={true}
      script={script}
      errors={errors}
      save={compileScript}
      onMount={handleMount}
      onChange={setScript}
    />
  );

  return (
    <div className="app">
      <ExpressionTreeViewWithModel
        hideTrackChange={true}
        treeHighlightVersion={treeHighlightVersion}
        hideHeader={true}
        expression={expression}
        treeHighlight={treeHighligh}
        treeZoomPercent={treeZoomPercent}
        setTreeZoomPercent={setTreeZoomPercent}
        onSelectHistoryBatch={onSelectHistoryBatch}
        modelEditor={modelEditor}
      />
    </div>
  );
};

export default DemoPageClient;
