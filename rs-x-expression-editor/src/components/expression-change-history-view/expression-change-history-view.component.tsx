// expression-change-history-view.component.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { ExpressionType, IExpression, type IExpressionChangeHistory } from '@rs-x/expression-parser';
import type { IExpressionInfo } from '../../models/model-with-expressions.interface';
import './expression-change-history-view.component.css';
import { useExpressionChangeHistoryTracker } from './hooks/use-expression-change-history-tracker';
import { useReemitSelectionOnHistoryChange } from './hooks/use-reemit-selection-on-history-change';

export interface IExpressionChangeHistoryViewProps {
  modelIndex: number;
  expressionIndex: number;

  expressionInfo: IExpressionInfo | undefined;

  /** persisted history update (oldest -> newest) */
  onHistoryChange: (
    modelIndex: number,
    expressionIndex: number,
    changes: IExpressionChangeHistory[][]
  ) => void;

  /** persisted selection index (0..n-1, oldest -> newest). Use -1 for none. */
  selectedChangeSetIndex: number;

  /**
   * SINGLE event: selection changed.
   * selectedChangeSetIndex = 0..n-1 (oldest -> newest)
   * items = selected batch items (for tree highlighting)
   */
  onSelectionChanged: (
    modelIndex: number,
    expressionIndex: number,
    selectedChangeSetIndex: number,
    items: readonly IExpressionChangeHistory[]
  ) => void;
}

type HistoryBatch = {
  /** persisted index (0 oldest -> newest) */
  persistedIndex: number;
  items: readonly IExpressionChangeHistory[];
};

function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  if (index < 0) {
    return 0;
  }
  if (index >= length) {
    return length - 1;
  }
  return index;
}

function shortValue(value: unknown): string {
  if (value === undefined) {
    return '∅';
  }
  if (value === null) {
    return 'null';
  }

  const valueType = typeof value;

  if (valueType === 'string') {
    const stringValue = value as string;
    const clipped = stringValue.length > 80 ? `${stringValue.slice(0, 80)}…` : stringValue;
    return `'${clipped}'`;
  }

  if (valueType === 'number' || valueType === 'boolean' || valueType === 'bigint') {
    return String(value);
  }

  try {
    const json = JSON.stringify(value);
    if (!json) {
      return String(value);
    }
    return json.length > 80 ? `${json.slice(0, 80)}…` : json;
  } catch {
    return String(value);
  }
}

function exprKey(change: IExpressionChangeHistory): string {
  return `${change.expression.expressionString}::${String(change.expression.type)}`;
}

function pickHeaderChange(args: {
  batchItems: readonly IExpressionChangeHistory[];
  rootExpression: IExpressionInfo['expression'] | undefined;
}): IExpressionChangeHistory | null {
  const { batchItems, rootExpression } = args;

  if (!batchItems.length) {
    return null;
  }

  if (rootExpression) {
    const rootKey = `${rootExpression.expressionString}::${String(rootExpression.type)}`;

    for (let i = batchItems.length - 1; i >= 0; i--) {
      const item = batchItems[i];
      if (exprKey(item) === rootKey) {
        return item;
      }
    }
  }

  return batchItems[batchItems.length - 1] ?? null;
}

function ValueDiff(props: {
  oldValue: unknown;
  newValue: unknown;
  size?: 'header' | 'row';
}): React.ReactElement {
  const { oldValue, newValue, size = 'row' } = props;

  const oldText = shortValue(oldValue);
  const newText = shortValue(newValue);

  const oldIsUnset = oldText === '∅';
  const newIsUnset = newText === '∅';

  return (
    <div className={`valueDiff ${size === 'header' ? 'isHeader' : 'isRow'}`}>
      <span className={`valueDiffOld ${oldIsUnset ? 'isUnset' : ''}`}>{oldText}</span>
      <span className='valueDiffArrow'>→</span>
      <span className={`valueDiffNew ${newIsUnset ? 'isUnset' : ''}`}>{newText}</span>
    </div>
  );
}

/**
 * Walk parent chain. This assumes your IExpression has `parent?: IExpression`.
 * If the property name differs (e.g. `parentExpression`), change it here.
 */
function hasParentType(expression: unknown, typeToFind: string): boolean {
  let current: any = expression;

  // start at the parent of the current node
  current = current?.parent;

  while (current) {
    if (String(current.type) === typeToFind) {
      return true;
    }
    current = current.parent;
  }

  return false;
}

function getExpressionText(expression: IExpression): {expressionString: string,  type: string } {
    let targetExpression: IExpression = expression;
    let type: string = 'derived'
    if(expression.type === ExpressionType.Identifier) {
        type = 'trigger';
        if(expression.parent?.type === ExpressionType.Member) {
            targetExpression = expression.parent;
        }
    } 

    return {expressionString:targetExpression.expressionString, type }
}



/**
 * Rule from you:
 * - If an Identifier has a parent MemberExpression, we do NOT show the MemberExpression step.
 *
 * Implementation:
 * - If the batch contains at least one Identifier with parent MemberExpression,
 *   we drop all MemberExpression steps from the list.
 *
 * Why drop *all* member steps?
 * - In a typical chain, member steps are just ancestors / noise compared to the identifier(s).
 * - If you want to drop only the specific parent member nodes, you need identity linking
 *   between items (same node reference). If your items reference the same expression instances,
 *   I can make it exact; but this version matches your requirement well and stays simple.
 */
function getDisplayStepItems(items: readonly IExpressionChangeHistory[]): readonly IExpressionChangeHistory[] {
  if (items.length <= 1) {
    return items;
  }

  const hasIdentifierUnderMember = items.some((x) => {
    if (x.expression.type !== ExpressionType.Identifier) {
      return false;
    }
    return  x.expression.parent?.type === ExpressionType.Member
  });

  if (!hasIdentifierUnderMember) {
    return items;
  }

  return items.filter((x) => x.expression.type !== ExpressionType.Member);
}

export const ExpressionChangeHistoryView: React.FC<IExpressionChangeHistoryViewProps> = (props) => {
  const {
    modelIndex,
    expressionIndex,
    expressionInfo,
    onHistoryChange,
    selectedChangeSetIndex,
    onSelectionChanged,
  } = props;

  const onHistoryChangeRef = useRef(onHistoryChange);
  const onSelectionChangedRef = useRef(onSelectionChanged);

  useEffect(() => {
    onHistoryChangeRef.current = onHistoryChange;
    onSelectionChangedRef.current = onSelectionChanged;
  }, [onHistoryChange, onSelectionChanged]);

  const expression = expressionInfo?.expression;
  const version = expressionInfo?.version ?? 0;

  const persistedHistory: IExpressionChangeHistory[][] = expressionInfo?.changeHistory ?? [];
  const historyLength = persistedHistory.length;

  const batches = useMemo((): HistoryBatch[] => {
    const out: HistoryBatch[] = [];
    for (let persistedIndex = persistedHistory.length - 1; persistedIndex >= 0; persistedIndex--) {
      out.push({
        persistedIndex,
        items: persistedHistory[persistedIndex] ?? [],
      });
    }
    return out;
  }, [persistedHistory, historyLength, version]);

  const clampedSelectedPersistedIndex =
    historyLength <= 0 || selectedChangeSetIndex < 0 ? -1 : clampIndex(selectedChangeSetIndex, historyLength);

  // Auto-collapse non-selected and expand selected
  const [expandedPersistedIndex, setExpandedPersistedIndex] = useState<number>(() => clampedSelectedPersistedIndex);

  useEffect(() => {
    setExpandedPersistedIndex(() => clampedSelectedPersistedIndex);
  }, [clampedSelectedPersistedIndex]);

  useReemitSelectionOnHistoryChange({
    expressionInfo,
    modelIndex,
    expressionIndex,
    version,
    historyLength,
    clampedSelectedPersistedIndex,
    persistedHistory,
    onSelectionChanged: (m, e, idx, items) => {
      onSelectionChangedRef.current(m, e, idx, items);
    },
  });

  useExpressionChangeHistoryTracker({
    expressionInfo,
    expression,
    version,
    modelIndex,
    expressionIndex,
    onHistoryChange,
    onSelectionChanged,
  });

  const onUserSelectPersistedIndex = (persistedIndex: number, items: readonly IExpressionChangeHistory[]) => {
    onSelectionChanged(modelIndex, expressionIndex, persistedIndex, items);
  };

  if (!expressionInfo) {
    return (
      <div className='changeHistoryRoot'>
        <div className='changeHistoryEmpty'>No expression selected</div>
      </div>
    );
  }

  if (historyLength === 0) {
    return (
      <div className='changeHistoryRoot'>
        <div className='changeHistoryEmpty'>No changes yet</div>
      </div>
    );
  }

  return (
    <div className='changeHistoryRoot'>
      <div className='changeHistoryAccordion'>
        <div className='changeHistoryAccordionScroll'>
          {batches.map((batch) => {
            const isActive = batch.persistedIndex === clampedSelectedPersistedIndex;
            const isExpanded = batch.persistedIndex === expandedPersistedIndex;

            const headerChange = pickHeaderChange({
              batchItems: batch.items,
              rootExpression: expressionInfo.expression,
            });

            const tLabel = `t${batch.persistedIndex}`;
            const headerExpr =
              headerChange?.expression?.expressionString ??
              expressionInfo.expression?.expressionString ??
              '(unknown)';

            const stepsCount = batch.items.length;

            const displayStepItems = getDisplayStepItems(batch.items);

            return (
              <div
                key={batch.persistedIndex}
                className={`changeSet ${isActive ? 'isActive' : ''} ${isExpanded ? 'isExpanded' : ''}`}
              >
                <button
                  type='button'
                  className='changeSetHeader'
                  onClick={() => {
                    onUserSelectPersistedIndex(batch.persistedIndex, batch.items);
                  }}
                  title={headerExpr}
                >
                  <div className='changeSetHeaderLeft'>
                    <span className='changeSetBadge'>{tLabel}</span>

                    <div className='changeSetHeaderMeta'>
                      <div className='changeSetExpr' title={headerExpr}>
                        {headerExpr}
                      </div>
                      <div className='changeSetSteps'>
                        {stepsCount} step{stepsCount === 1 ? '' : 's'}
                      </div>
                    </div>
                  </div>

                  <div className='changeSetHeaderRight'>
                    <ValueDiff
                      size='header'
                      oldValue={headerChange ? headerChange.oldValue : undefined}
                      newValue={headerChange ? headerChange.value : undefined}
                    />
                    <span className={`changeSetChevron ${isExpanded ? 'isOpen' : ''}`}>▾</span>
                  </div>
                </button>

                {isExpanded ? (
                  <div className='changeSetBody'>
                    <div className='changePath'>
                      {displayStepItems.map((changeItem, index) => {

                        
                
                        const {expressionString, type} = getExpressionText(changeItem.expression);

                        // Trigger visual: only first displayed item gets the trigger dot
                        const isTrigger = type !== 'derived';

                        return (
                          <div key={`${batch.persistedIndex}_${index}_${exprKey(changeItem)}`} className='changeStep'>
                            <div className='changeStepRail'>
                              <div className={`changeStepDot ${isTrigger ? 'isTrigger' : ''}`} />
                              {index < displayStepItems.length - 1 ? <div className='changeStepLine' /> : null}
                            </div>

                            <div className='changeStepCard'>
                              <div className='changeStepHeader'>
                                <div className='changeStepHeaderLeft'>
                                  <div className='changeStepExpr' title={expressionString}>
                                    {expressionString}
                                  </div>

                                  <div className='changeStepTag'>{type}</div>
                                </div>

                                <div className='changeStepHeaderRight'>
                                  <ValueDiff size='row' oldValue={changeItem.oldValue} newValue={changeItem.value} />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};