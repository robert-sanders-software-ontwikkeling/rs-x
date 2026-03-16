'use client';

import { useEffect, useMemo, useState } from 'react';

import { InjectionContainer } from '@rs-x/core';
import {
  rsx,
  RsXExpressionParserInjectionTokens,
  RsXExpressionParserModule,
} from '@rs-x/expression-parser';

const MAX_ROWS = 2000;
const MAX_COLUMNS = 20;
const ROW_STEP = 100;
const COL_STEP = 5;

type CellValue = number | null;

type DemoResult = {
  rows: number;
  columns: number;
  bindings: number;
  parseMs: number;
  bindMs: number;
  singleUpdateMs: number;
  bulkUpdateMs: number;
  tablePreview: CellValue[][];
  columnExpressions: string[];
};

let loadModulePromise: Promise<void> | undefined;

function ensureExpressionModuleLoaded(): Promise<void> {
  if (
    InjectionContainer.isBound(
      RsXExpressionParserInjectionTokens.IExpressionParser,
    )
  ) {
    return Promise.resolve();
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
  return Array.from(
    { length: columns + 1 },
    (_, index) => `${runToken}_v${index}`,
  );
}

function createExpressions(fieldNames: string[], columns: number): string[] {
  return Array.from({ length: columns }, (_, index) => {
    return `${fieldNames[index]} + ${fieldNames[index + 1]}`;
  });
}

function makeColumnExpressions(columns: number): string[] {
  return Array.from({ length: columns }, (_, i) => `v${i} + v${i + 1}`);
}

function createRows(
  rowCount: number,
  fieldNames: string[],
): Array<Record<string, number>> {
  return Array.from({ length: rowCount }, (_, rowIndex) => {
    const row: Record<string, number> = {};
    for (let fieldIndex = 0; fieldIndex < fieldNames.length; fieldIndex += 1) {
      row[fieldNames[fieldIndex]] = rowIndex + fieldIndex;
    }
    return row;
  });
}

export function PerformanceDemoClient() {
  const [rows, setRows] = useState(500);
  const [columns, setColumns] = useState(10);
  const [isReady, setIsReady] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DemoResult | null>(null);

  useEffect(() => {
    void ensureExpressionModuleLoaded()
      .then(() => setIsReady(true))
      .catch((exception) => {
        setError(
          exception instanceof Error
            ? exception.message
            : 'Failed to initialize expression module',
        );
      });
  }, []);

  const bindings = useMemo(() => rows * columns, [rows, columns]);

  const safeSetRows = (value: number) => {
    setRows(
      Math.max(
        ROW_STEP,
        Math.min(MAX_ROWS, Math.round(value / ROW_STEP) * ROW_STEP),
      ),
    );
  };
  const safeSetColumns = (value: number) => {
    setColumns(
      Math.max(
        COL_STEP,
        Math.min(MAX_COLUMNS, Math.round(value / COL_STEP) * COL_STEP),
      ),
    );
  };

  const runDemo = async (): Promise<void> => {
    setError(null);
    setIsRunning(true);

    try {
      await ensureExpressionModuleLoaded();

      const safeRows = Math.max(1, Math.min(MAX_ROWS, Math.floor(rows)));
      const safeColumns = Math.max(
        1,
        Math.min(MAX_COLUMNS, Math.floor(columns)),
      );

      const runToken = toRunToken();
      const fieldNames = createFieldNames(safeColumns, runToken);
      const expressionStrings = createExpressions(fieldNames, safeColumns);
      const modelRows = createRows(safeRows, fieldNames);

      const parseStarted = performance.now();
      const binders = expressionStrings.map((expressionString) =>
        rsx<number>(expressionString),
      );
      const parseMs = performance.now() - parseStarted;

      const boundExpressions: Array<{ value?: number; dispose?: () => void }> =
        [];
      const bindStarted = performance.now();
      for (let rowIndex = 0; rowIndex < modelRows.length; rowIndex += 1) {
        const rowModel = modelRows[rowIndex];
        for (
          let columnIndex = 0;
          columnIndex < binders.length;
          columnIndex += 1
        ) {
          boundExpressions.push(
            binders[columnIndex](rowModel) as {
              value?: number;
              dispose?: () => void;
            },
          );
        }
      }
      const bindMs = performance.now() - bindStarted;

      await flushMicrotasks();

      // Capture all rows' bound expression values before disposing
      const tablePreview: CellValue[][] = Array.from(
        { length: safeRows },
        (_, rowIndex) =>
          Array.from({ length: safeColumns }, (_, colIndex) => {
            const expr = boundExpressions[rowIndex * safeColumns + colIndex];
            const v = expr?.value;
            return typeof v === 'number' ? v : null;
          }),
      );

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
        tablePreview,
        columnExpressions: makeColumnExpressions(safeColumns),
      });
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Unknown benchmark error',
      );
    } finally {
      setIsRunning(false);
    }
  };

  const codePreview = useMemo(() => {
    const exprs = makeColumnExpressions(columns);
    const lines = [
      `// ${columns} column expression${columns !== 1 ? 's' : ''} (field names are namespaced per run)`,
      ...exprs.map((e, i) => `col ${i}: ${e}`),
      ``,
      `// Each row model has fields v0..v${columns}`,
      `// Row 0: { v0: 0, v1: 1, ..., v${columns}: ${columns} }`,
      `// Row 1: { v0: 1, v1: 2, ..., v${columns}: ${columns + 1} }`,
    ];
    return lines.join('\n');
  }, [columns]);

  return (
    <div className="docsPerfDemo">
      <div className="docsPerfDemoControls">
        <div className="docsPerfDemoField">
          <span className="docsPerfDemoLabel">
            Rows (max {MAX_ROWS.toLocaleString()}, step {ROW_STEP})
          </span>
          <div className="docsPerfDemoStepper">
            <button
              className="btn btnGhost docsPerfDemoStep"
              type="button"
              disabled={rows <= ROW_STEP}
              onClick={() => safeSetRows(rows - ROW_STEP)}
            >
              −
            </button>
            <span className="docsPerfDemoStepValue">
              {rows.toLocaleString()}
            </span>
            <button
              className="btn btnGhost docsPerfDemoStep"
              type="button"
              disabled={rows >= MAX_ROWS}
              onClick={() => safeSetRows(rows + ROW_STEP)}
            >
              +
            </button>
          </div>
        </div>

        <div className="docsPerfDemoField">
          <span className="docsPerfDemoLabel">
            Columns (max {MAX_COLUMNS}, step {COL_STEP})
          </span>
          <div className="docsPerfDemoStepper">
            <button
              className="btn btnGhost docsPerfDemoStep"
              type="button"
              disabled={columns <= COL_STEP}
              onClick={() => safeSetColumns(columns - COL_STEP)}
            >
              −
            </button>
            <span className="docsPerfDemoStepValue">{columns}</span>
            <button
              className="btn btnGhost docsPerfDemoStep"
              type="button"
              disabled={columns >= MAX_COLUMNS}
              onClick={() => safeSetColumns(columns + COL_STEP)}
            >
              +
            </button>
          </div>
        </div>

        <div className="docsPerfDemoField docsPerfDemoFieldGrow">
          <span className="docsPerfDemoLabel">Active bindings</span>
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

      <div className="docsPerfDemoCode">
        <p className="docsPerfDemoCodeLabel">Expression pattern</p>
        <pre className="docsPerfDemoCodeBlock">{codePreview}</pre>
      </div>

      {error ? <p className="docsPerfDemoError">{error}</p> : null}

      {result ? (
        <div className="docsPerfDemoResults">
          <p className="cardText">
            Scenario:{' '}
            <span className="codeInline">
              {result.rows.toLocaleString()} rows ×{' '}
              {result.columns.toLocaleString()} columns
            </span>{' '}
            →{' '}
            <span className="codeInline">
              {result.bindings.toLocaleString()} bindings
            </span>
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
              <span className="codeInline">
                {toFixed(result.singleUpdateMs)} ms
              </span>
            </li>
            <li>
              bulk update (all rows):{' '}
              <span className="codeInline">
                {toFixed(result.bulkUpdateMs)} ms
              </span>
            </li>
          </ul>

          {result.tablePreview.length > 0 && (
            <div className="docsPerfDemoTableWrap">
              <p className="docsPerfDemoTableCaption">
                {result.rows.toLocaleString()} rows × {result.columns} columns —
                bound expression values (each cell is{' '}
                <span className="codeInline">v[i] + v[i+1]</span>)
              </p>
              <div className="docsPerfDemoTableScroll">
                <table className="docsPerfDemoTable">
                  <thead>
                    <tr>
                      <th className="docsPerfDemoTh docsPerfDemoThRow">row</th>
                      {result.columnExpressions.map((expr, i) => (
                        <th key={i} className="docsPerfDemoTh">
                          col {i}
                          <br />
                          <span className="docsPerfDemoThExpr">{expr}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.tablePreview.map((rowValues, rowIndex) => (
                      <tr key={rowIndex}>
                        <td className="docsPerfDemoTd docsPerfDemoTdRow">
                          {rowIndex}
                        </td>
                        {rowValues.map((value, colIndex) => (
                          <td key={colIndex} className="docsPerfDemoTd">
                            {value !== null ? value : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="cardText">
          Run the benchmark to see live numbers and a table preview in your
          browser.
        </p>
      )}
    </div>
  );
}
