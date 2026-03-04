'use client';

import type { OnMount } from '@monaco-editor/react';
import dedent from 'dedent';
import React, { useEffect, useRef, useState } from 'react';

import { AbstractExpression, type IExpression, type IExpressionChangeHistory } from '@rs-x/expression-parser';

import { useExpressionChangeHistoryTracker } from '../../src/components/expression-change-history-view/hooks/use-expression-change-history-tracker';
import { ExpressionTreeViewWithModel } from '../../src/components/expression-tree-view-with-model/expression-tree-view-with-model.component';
import { TsEditorWithErrorPanel } from '../../src/components/ts-editor-with-error-panel/ts-editor-with-error-panel.component';
import { RxjsMonacoTypesLoader } from '../../src/services/rxjs-monaco-types-loader';
import { ScriptEvaluator } from '../../src/services/script-evaluator';
import { setupScriptModels } from '../../src/services/setup-script-models';

import { useSyncScriptToUrl } from './hooks/use-sync-script-to-url';
import { installMonacoPlaceholder } from '../../src/components/ts-editor/ts-editor.component';

const dataKey = 'data';



type EvalResult = { ok: true; value:  IExpression } | { ok: false; error: string };

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
    const result = ScriptEvaluator.getInstance().evaluateScript<IExpression>(body);

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
`

const USER_MODEL_URI = 'inmemory://rsx/demo.user.js';

const DemoPageClient: React.FC = () => {
  const [script, setScript] = useState<string>(() => {
    return readInitialScriptFromUrl();
  });

  const [expression, setExpression] = useState<IExpression | undefined>(undefined);

  // persisted change history for this demo expression
  const [persistedHistory, setPersistedHistory] = useState<IExpressionChangeHistory[][]>([]);

  // latest selection (for “selected” styling)
  const [treeHighligh, setTreeHighLight] = useState<IExpressionChangeHistory[]>([]);


  const [treeZoomPercent, setTreeZoomPercent] = useState<number>(50);
  const [errors, setErrors] = useState<string[]>([]);

  useSyncScriptToUrl({
    script,
    buildQuery: buildScriptQuery,
  });

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

     installMonacoPlaceholder(editor, monaco, editorPlaceholder);
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
    disposeExpression(expression);

    setPersistedHistory([]);
    setTreeHighLight([]);
    setExpression(next);
  };

  const compileScript = (nextScript: string) => {
    const result = evaluateScript(nextScript);

    setScript(nextScript);

    if (result.ok) {
      setErrors([]);
      setNewExpression(result.value);
      return;
    }

    setErrors([result.error]);
    setNewExpression(undefined);
  };

  // auto compile once
  const didAutoCompileRef = useRef<boolean>(false);
  useEffect(() => {
    if (didAutoCompileRef.current) {
      return;
    }
    didAutoCompileRef.current = true;

    if (script.trim().length === 0) {
      return;
    }

    compileScript(script);
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