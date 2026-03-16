'use client';

import { useEffect, useMemo, useState } from 'react';

import { InjectionContainer } from '@rs-x/core';
import { rsx, RsXExpressionParserInjectionTokens, RsXExpressionParserModule } from '@rs-x/expression-parser';

type DemoResult = {
  rows: number;
  columns: number;
  bindings: number;
  parseMs: number;
  bindMs: number;
  singleUpdateMs: number;
  bulkUpdateMs: number;
};

let loadModulePromise: Promise<void> | undefined;

function ensureExpressionModuleLoaded(): Promise<void> {

  if(InjectionContainer.isBound(RsXExpressionParserInjectionTokens.IExpressionParser)) {
    return Promise.resolve()
  }
  if (!loadModulePromise) {
    loadModulePromise = InjectionContainer.load(RsXExpressionParserModule);
  }
  return loadModulePromise;
}

function toFixed(value: number, digits: number = 3): string {
  return value.toFixed(digits);
}

async function flushMicrotasks(rounds: number = 3): Promise<void> {
  for (let i = 0; i < rounds; i += 1) {
    await Promise.resolve();
  }
}

function toRunToken(): string {
  return `r${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function createFieldNames(columns: number, runToken: string): string[] {
  return Array.from({ length: columns + 1 }, (_, index) => `${runToken}_v${index}`);
}

function createExpressions(fieldNames: string[], columns: number): string[] {
  return Array.from({ length: columns }, (_, index) => {
    return `${fieldNames[index]} + ${fieldNames[index + 1]}`;
  });
}

function createRows(rowCount: number, fieldNames: string[]): Array<Record<string, number>> {
  return Array.from({ length: rowCount }, (_, rowIndex) => {
    const row: Record<string, number> = {};
    for (let fieldIndex = 0; fieldIndex < fieldNames.length; fieldIndex += 1) {
      row[fieldNames[fieldIndex]] = rowIndex + fieldIndex;
    }
    return row;
  });
}

export function PerformanceDemoClient() {
  const [rows, setRows] = useState(1000);
  const [columns, setColumns] = useState(10);
  const [isReady, setIsReady] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DemoResult | null>(null);

  useEffect(() => {
    void ensureExpressionModuleLoaded()
      .then(() => {
        setIsReady(true);
      })
      .catch((exception) => {
        setError(
          exception instanceof Error
            ? exception.message
            : 'Failed to initialize expression module',
        );
      });
  }, []);

  const bindings = useMemo(() => rows * columns, [rows, columns]);

  const runDemo = async (): Promise<void> => {
    setError(null);
    setIsRunning(true);

    try {
      await ensureExpressionModuleLoaded();

      const safeRows = Math.max(1, Math.floor(rows));
      const safeColumns = Math.max(1, Math.floor(columns));

      const runToken = toRunToken();
      const fieldNames = createFieldNames(safeColumns, runToken);
      const expressionStrings = createExpressions(fieldNames, safeColumns);
      const modelRows = createRows(safeRows, fieldNames);

      const parseStarted = performance.now();
      const binders = expressionStrings.map((expressionString) => rsx<number>(expressionString));
      const parseMs = performance.now() - parseStarted;

      const boundExpressions: Array<{ dispose?: () => void }> = [];
      const bindStarted = performance.now();
      for (let rowIndex = 0; rowIndex < modelRows.length; rowIndex += 1) {
        const rowModel = modelRows[rowIndex];
        for (let columnIndex = 0; columnIndex < binders.length; columnIndex += 1) {
          boundExpressions.push(binders[columnIndex](rowModel) as { dispose?: () => void });
        }
      }
      const bindMs = performance.now() - bindStarted;

      await flushMicrotasks();

      const updatedField = fieldNames[0];
      const singleRow = modelRows[Math.floor(modelRows.length / 2)];
      const singleUpdateStarted = performance.now();
      singleRow[updatedField] += 1;
      await flushMicrotasks();
      const singleUpdateMs = performance.now() - singleUpdateStarted;

      const bulkUpdateStarted = performance.now();
      for (let rowIndex = 0; rowIndex < modelRows.length; rowIndex += 1) {
        modelRows[rowIndex][updatedField] += 1;
      }
      await flushMicrotasks();
      const bulkUpdateMs = performance.now() - bulkUpdateStarted;

      for (let index = 0; index < boundExpressions.length; index += 1) {
        boundExpressions[index].dispose?.();
      }

      setResult({
        rows: safeRows,
        columns: safeColumns,
        bindings: safeRows * safeColumns,
        parseMs,
        bindMs,
        singleUpdateMs,
        bulkUpdateMs,
      });
    } catch (exception) {
      setError(
        exception instanceof Error ? exception.message : 'Unknown benchmark error',
      );
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="docsPerfDemo">
      <div className="docsPerfDemoControls">
        <label className="docsPerfDemoField">
          <span className="docsPerfDemoLabel">Rows (x)</span>
          <input
            className="docsPerfDemoInput"
            type="number"
            min={1}
            step={1}
            value={rows}
            onChange={(event) => {
              setRows(Number(event.target.value));
            }}
          />
        </label>
        <label className="docsPerfDemoField">
          <span className="docsPerfDemoLabel">Columns (y)</span>
          <input
            className="docsPerfDemoInput"
            type="number"
            min={1}
            step={1}
            value={columns}
            onChange={(event) => {
              setColumns(Number(event.target.value));
            }}
          />
        </label>
        <div className="docsPerfDemoField docsPerfDemoFieldGrow">
          <span className="docsPerfDemoLabel">Estimated active bindings</span>
          <p className="docsPerfDemoBindings">{bindings.toLocaleString()}</p>
        </div>
        <div className="docsPerfDemoActions">
          <button
            className="btn btnPrimary"
            type="button"
            disabled={!isReady || isRunning}
            onClick={() => {
              void runDemo();
            }}
          >
            {isRunning ? 'Running…' : 'Run live benchmark'}
          </button>
        </div>
      </div>

      {error ? (
        <p className="docsPerfDemoError">{error}</p>
      ) : null}

      {result ? (
        <div className="docsPerfDemoResults">
          <p className="cardText">
            Scenario:{' '}
            <span className="codeInline">
              {result.rows.toLocaleString()} rows × {result.columns.toLocaleString()} columns
            </span>{' '}
            →{' '}
            <span className="codeInline">{result.bindings.toLocaleString()} bindings</span>
          </p>
          <ul className="docsPerfDemoResultList">
            <li>
              parse ({result.columns.toLocaleString()} unique expressions):{' '}
              <span className="codeInline">{toFixed(result.parseMs)} ms</span>
            </li>
            <li>
              initial bind ({result.bindings.toLocaleString()} bindings):{' '}
              <span className="codeInline">{toFixed(result.bindMs)} ms</span>
            </li>
            <li>
              single-row update:{' '}
              <span className="codeInline">{toFixed(result.singleUpdateMs)} ms</span>
            </li>
            <li>
              bulk update (all rows):{' '}
              <span className="codeInline">{toFixed(result.bulkUpdateMs)} ms</span>
            </li>
          </ul>
        </div>
      ) : (
        <p className="cardText">
          Run the benchmark to see live numbers in your browser.
        </p>
      )}
    </div>
  );
}
