import React, { useEffect, useMemo, useRef, useState } from 'react';

import { IExpression } from '@rs-x/expression-parser';
import './expression-tree-view.component.css';

export interface IExpressionTreeProps {
  version: number;
  root: IExpression;

  nodeWidth?: number;
  nodeHeight?: number;
  horizontalGap?: number;
  verticalGap?: number;

  formatExpression?: (expr: IExpression) => string;

  formatValue?: (value: unknown) => string;
  valueMaxDepth?: number;
  valueMaxChars?: number;

  /** NEW: expressions to highlight (bubble up) */
  highlightExpressions?: readonly IExpression[];
  /** NEW: increments to restart animation even if same expressions are selected */
  highlightVersion?: number;

  className?: string;
  style?: React.CSSProperties;
}

type NodeId = string;

interface TNode {
  id: NodeId;
  expr: IExpression;
  children: TNode[];
  parent?: TNode;

  depth: number;

  x: number;
  y: number;
  prelim: number;
  mod: number;
  change: number;
  shift: number;
  ancestor: TNode;
  thread?: TNode;
  number: number; // 1..n
}

interface LayoutNode {
  id: NodeId;
  expr: IExpression;
  depth: number;
  x: number;
  y: number;
}

interface LayoutEdge {
  from: NodeId;
  to: NodeId;
}

interface LayoutResult {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  maxX: number;
  maxDepth: number;
}

const DEFAULTS = {
  nodeWidth: 260,
  nodeHeight: 160,
  horizontalGap: 32,
  verticalGap: 56,
  valueMaxDepth: 6,
  valueMaxChars: 4000,
} as const;

function defaultFormatExpression(expr: IExpression): string {
  const expressionString = (expr as unknown as { expressionString?: string }).expressionString;
  if (expressionString && expressionString.trim().length > 0) {
    return expressionString;
  }
  return String(expr.type);
}

function defaultFormatValue(value: unknown, maxDepth: number, maxChars: number): string {
  const seen = new WeakSet<object>();

  function toJson(v: unknown, depth: number): unknown {
    if (depth > maxDepth) {
      return '[MaxDepth]';
    }
    if (v === null || v === undefined) {
      return null;
    }

    const t = typeof v;
    if (t === 'string' || t === 'number' || t === 'boolean') {
      return v;
    }
    if (t === 'bigint') {
      return v.toString();
    }
    if (t === 'symbol') {
      return v.toString();
    }
    if (t === 'function') {
      return `[Function ${(v as Function).name || 'anonymous'}]`;
    }
    if (t === 'undefined') {
      return '[undefined]';
    }

    if (v instanceof Date) {
      return v.toISOString();
    }
    if (v instanceof Error) {
      return { name: v.name, message: v.message, stack: v.stack };
    }

    if (Array.isArray(v)) {
      return v.map((x) => {
        return toJson(x, depth + 1);
      });
    }

    if (t === 'object') {
      const obj = v as Record<string, unknown>;
      if (seen.has(obj)) {
        return '[Circular]';
      }
      seen.add(obj);

      const out: Record<string, unknown> = {};
      const keys = Object.keys(obj).sort((a, b) => {
        return a.localeCompare(b);
      });
      for (const k of keys) {
        out[k] = toJson(obj[k], depth + 1);
      }
      return out;
    }

    return String(v);
  }

  let text = '';
  try {
    text = JSON.stringify(toJson(value, 0), null, 2) ?? 'null';
  } catch {
    text = String(value);
  }

  if (text.length > maxChars) {
    text = text.slice(0, maxChars) + '\n… [truncated]';
  }
  return text;
}

/* ------------------------------------------------
   Reingold–Tilford tidy tree (Buchheim variant)
   ------------------------------------------------ */

function buildTNodeTree(rootExpr: IExpression): { root: TNode; nodes: TNode[] } {
  let seq = 0;
  const nodes: TNode[] = [];
  const mkId = () => {
    return `n${++seq}`;
  };

  function build(expr: IExpression, depth: number, parent?: TNode, number = 1): TNode {
    const node: TNode = {
      id: mkId(),
      expr,
      parent,
      children: [],
      depth,
      x: 0,
      y: depth,
      prelim: 0,
      mod: 0,
      change: 0,
      shift: 0,
      ancestor: undefined as any,
      number,
    };

    node.ancestor = node;
    nodes.push(node);

    const kids = expr.childExpressions ?? [];
    node.children = kids.map((c, i) => {
      return build(c, depth + 1, node, i + 1);
    });
    return node;
  }

  const root = build(rootExpr, 0, undefined, 1);
  return { root, nodes };
}

function leftSibling(v: TNode): TNode | undefined {
  if (!v.parent) {
    return undefined;
  }
  if (v.number > 1) {
    return v.parent.children[v.number - 2];
  }
  return undefined;
}

function leftMostSibling(v: TNode): TNode | undefined {
  if (!v.parent) {
    return undefined;
  }
  if (v.parent.children.length) {
    return v.parent.children[0];
  }
  return undefined;
}

function nextLeft(v: TNode): TNode | undefined {
  if (v.children.length) {
    return v.children[0];
  }
  return v.thread;
}

function nextRight(v: TNode): TNode | undefined {
  if (v.children.length) {
    return v.children[v.children.length - 1];
  }
  return v.thread;
}

function moveSubtree(wl: TNode, wr: TNode, shift: number) {
  const subtrees = wr.number - wl.number;
  if (subtrees <= 0) {
    return;
  }

  wr.change -= shift / subtrees;
  wr.shift += shift;
  wl.change += shift / subtrees;

  wr.prelim += shift;
  wr.mod += shift;
}

function ancestorNode(vil: TNode, v: TNode, defaultAncestor: TNode): TNode {
  if (vil.ancestor.parent === v.parent) {
    return vil.ancestor;
  }
  return defaultAncestor;
}

function executeShifts(v: TNode) {
  let shift = 0;
  let change = 0;

  for (let i = v.children.length - 1; i >= 0; i--) {
    const w = v.children[i];
    w.prelim += shift;
    w.mod += shift;
    change += w.change;
    shift += w.shift + change;
  }
}

function apportion(v: TNode, defaultAncestor: TNode, distance: number): TNode {
  const w = leftSibling(v);
  if (!w) {
    return defaultAncestor;
  }

  let vir: TNode = v;
  let vor: TNode = v;
  let vil: TNode = w;
  let vol: TNode = leftMostSibling(v)!;

  let sir = vir.mod;
  let sor = vor.mod;
  let sil = vil.mod;
  let sol = vol.mod;

  while (nextRight(vil) && nextLeft(vir)) {
    vil = nextRight(vil)!;
    vir = nextLeft(vir)!;
    vol = nextLeft(vol)!;
    vor = nextRight(vor)!;

    vor.ancestor = v;

    const shift = (vil.prelim + sil) - (vir.prelim + sir) + distance;
    if (shift > 0) {
      const a = ancestorNode(vil, v, defaultAncestor);
      moveSubtree(a, v, shift);
      sir += shift;
      sor += shift;
    }

    sil += vil.mod;
    sir += vir.mod;
    sol += vol.mod;
    sor += vor.mod;
  }

  if (nextRight(vil) && !nextRight(vor)) {
    vor.thread = nextRight(vil);
    vor.mod += sil - sor;
  } else if (nextLeft(vir) && !nextLeft(vol)) {
    vol.thread = nextLeft(vir);
    vol.mod += sir - sol;
  }

  return defaultAncestor;
}

function firstWalk(v: TNode, distance: number) {
  if (!v.children.length) {
    const w = leftSibling(v);
    if (w) {
      v.prelim = w.prelim + distance;
    } else {
      v.prelim = 0;
    }
    return;
  }

  let defaultAncestor = v.children[0];

  for (const w of v.children) {
    firstWalk(w, distance);
    defaultAncestor = apportion(w, defaultAncestor, distance);
  }

  executeShifts(v);

  const left = v.children[0];
  const right = v.children[v.children.length - 1];
  const mid = (left.prelim + right.prelim) / 2;

  const w = leftSibling(v);
  if (w) {
    v.prelim = w.prelim + distance;
    v.mod = v.prelim - mid;
  } else {
    v.prelim = mid;
  }
}

function secondWalk(v: TNode, m: number, minX: { value: number }) {
  v.x = v.prelim + m;
  v.y = v.depth;

  if (v.x < minX.value) {
    minX.value = v.x;
  }

  for (const w of v.children) {
    secondWalk(w, m + v.mod, minX);
  }
}

function tidyLayout(root: TNode, distance: number): { maxX: number; maxDepth: number } {
  firstWalk(root, distance);

  const minX = { value: Number.POSITIVE_INFINITY };
  secondWalk(root, 0, minX);

  const shift = -minX.value;

  let maxX = 0;
  let maxDepth = 0;

  (function shiftAll(n: TNode) {
    n.x += shift;

    if (n.x > maxX) {
      maxX = n.x;
    }
    if (n.depth > maxDepth) {
      maxDepth = n.depth;
    }

    for (const c of n.children) {
      shiftAll(c);
    }
  })(root);

  return { maxX, maxDepth };
}

function computeLayout(rootExpr: IExpression): LayoutResult {
  const { root, nodes } = buildTNodeTree(rootExpr);

  const distance = 1;
  const stats = tidyLayout(root, distance);

  const layoutNodes: LayoutNode[] = nodes.map((n) => {
    return {
      id: n.id,
      expr: n.expr,
      depth: n.depth,
      x: n.x,
      y: n.y,
    };
  });

  const edges: LayoutEdge[] = [];
  for (const n of nodes) {
    for (const c of n.children) {
      edges.push({ from: n.id, to: c.id });
    }
  }

  return { nodes: layoutNodes, edges, maxX: stats.maxX, maxDepth: stats.maxDepth };
}

/* ------------------------------------------------
   React helpers
   ------------------------------------------------ */

function useResizeObserverSize<T extends HTMLElement>(): [React.RefObject<T | null>, { width: number; height: number }] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const cr = entry.contentRect;
      setSize({ width: cr.width, height: cr.height });
    });

    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, []);

  return [ref, size];
}

function buildBubbleUpStages(root: IExpression, seeds: readonly IExpression[]): readonly IExpression[][] {
  if (!seeds.length) {
    return [];
  }

  const byExpr = new Map<IExpression, IExpression | null>();

  const stack: IExpression[] = [root];
  byExpr.set(root, null);

  while (stack.length) {
    const cur = stack.pop()!;
    const kids = cur.childExpressions ?? [];
    for (const k of kids) {
      if (!byExpr.has(k)) {
        byExpr.set(k, cur);
        stack.push(k);
      }
    }
  }

  const stageMap = new Map<IExpression, number>();
  const queue: Array<{ expr: IExpression; stage: number }> = [];

  for (const s of seeds) {
    if (byExpr.has(s)) {
      queue.push({ expr: s, stage: 0 });
    }
  }

  let maxStage = 0;

  while (queue.length) {
    const { expr, stage } = queue.shift()!;
    const prev = stageMap.get(expr);
    if (prev !== undefined && prev >= stage) {
      continue;
    }

    stageMap.set(expr, stage);
    if (stage > maxStage) {
      maxStage = stage;
    }

    const parent = byExpr.get(expr);
    if (parent) {
      queue.push({ expr: parent, stage: stage + 1 });
    }
  }

  const stages: IExpression[][] = [];
  for (let i = 0; i <= maxStage; i++) {
    stages.push([]);
  }

  for (const [expr, stage] of stageMap.entries()) {
    stages[stage].push(expr);
  }

  return stages;
}

export const ExpressionTree: React.FC<IExpressionTreeProps> = (props) => {
  const {
    version,
    root,
    nodeWidth = DEFAULTS.nodeWidth,
    nodeHeight = DEFAULTS.nodeHeight,
    horizontalGap = DEFAULTS.horizontalGap,
    verticalGap = DEFAULTS.verticalGap,
    valueMaxDepth = DEFAULTS.valueMaxDepth,
    valueMaxChars = DEFAULTS.valueMaxChars,
    formatExpression = defaultFormatExpression,
    formatValue,
    highlightExpressions = [],
    highlightVersion = 0,
    className,
    style,
  } = props;

  const [hostRef, hostSize] = useResizeObserverSize<HTMLDivElement>();

  const layout = useMemo(() => {
    return computeLayout(root);
  }, [root, version]);

  const unitX = nodeWidth + horizontalGap;
  const unitY = nodeHeight + verticalGap;

  const treeW = (layout.maxX + 1) * unitX + horizontalGap;
  const treeH = (layout.maxDepth + 1) * unitY + verticalGap;

  const panelW = hostSize.width || 0;
  const panelH = hostSize.height || 0;

  const canvasW = Math.max(treeW, panelW);
  const canvasH = Math.max(treeH, panelH);

  const originX = Math.max(0, (canvasW - treeW) / 2);
  const originY = Math.max(0, (canvasH - treeH) / 2);

  const valueFormatter =
    formatValue ??
    ((v: unknown) => {
      return defaultFormatValue(v, valueMaxDepth, valueMaxChars);
    });

  const nodePos = useMemo(() => {
    const map = new Map<NodeId, { left: number; top: number; cx: number; topY: number; bottomY: number }>();

    for (const n of layout.nodes) {
      const left = originX + n.x * unitX + horizontalGap;
      const top = originY + n.y * unitY + verticalGap;

      map.set(n.id, {
        left,
        top,
        cx: left + nodeWidth / 2,
        topY: top,
        bottomY: top + nodeHeight,
      });
    }

    return map;
  }, [layout.nodes, originX, originY, unitX, unitY, horizontalGap, verticalGap, nodeWidth, nodeHeight]);

  const highlightSet = useMemo(() => {
    return new Set<IExpression>(highlightExpressions);
  }, [highlightExpressions, highlightVersion]);

  const bubbleStages = useMemo(() => {
    return buildBubbleUpStages(root, highlightExpressions);
  }, [root, highlightExpressions, highlightVersion]);

  const [activeStageIndex, setActiveStageIndex] = useState<number>(() => {
    return -1;
  });

  const runIdRef = useRef<number>(0);

  useEffect(() => {
    runIdRef.current += 1;
    const runId = runIdRef.current;

    if (!bubbleStages.length) {
      setActiveStageIndex(() => {
        return -1;
      });
      return;
    }

    setActiveStageIndex(() => {
      return 0;
    });

    const timers: number[] = [];
    const stepMs = 260;

    for (let i = 1; i < bubbleStages.length; i++) {
      const t = window.setTimeout(() => {
        if (runIdRef.current !== runId) {
          return;
        }
        setActiveStageIndex(() => {
          return i;
        });
      }, i * stepMs);
      timers.push(t);
    }

    const end = window.setTimeout(() => {
      if (runIdRef.current !== runId) {
        return;
      }
      setActiveStageIndex(() => {
        return -1;
      });
    }, (bubbleStages.length + 2) * stepMs);
    timers.push(end);

    return () => {
      for (const t of timers) {
        window.clearTimeout(t);
      }
    };
  }, [bubbleStages, highlightVersion]);

  const stageSet = useMemo(() => {
    if (activeStageIndex < 0) {
      return new Set<IExpression>();
    }
    const stage = bubbleStages[activeStageIndex] ?? [];
    return new Set<IExpression>(stage);
  }, [bubbleStages, activeStageIndex]);

  return (
    <div ref={hostRef} className={`exprTreeRoot ${className ?? ''}`} style={style}>
      <div className='exprTreeCanvas' style={{ width: canvasW, height: canvasH }}>
        <svg className='exprTreeLines' width={canvasW} height={canvasH} viewBox={`0 0 ${canvasW} ${canvasH}`}>
          {layout.edges.map((e) => {
            const p = nodePos.get(e.from);
            const c = nodePos.get(e.to);

            if (!p || !c) {
              return null;
            }

            const x1 = p.cx;
            const y1 = p.bottomY;
            const x2 = c.cx;
            const y2 = c.topY;
            const midY = (y1 + y2) / 2;

            const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
            return <path key={`${e.from}->${e.to}`} d={d} className='exprTreePath' />;
          })}
        </svg>

        {layout.nodes.map((n) => {
          const pos = nodePos.get(n.id);
          if (!pos) {
            return null;
          }

          const expressionText = (n.expr as unknown as { expressionString?: string }).expressionString ?? formatExpression(n.expr);
          const typeText = String(n.expr.type);
          const valueText = valueFormatter(n.expr.value);

          const isChanged = highlightSet.has(n.expr);
          const isAnimatingNow = stageSet.has(n.expr);

          const cls = [
            'exprNode',
            isChanged ? 'isChanged' : '',
            isAnimatingNow ? 'isStageActive' : '',
          ]
            .filter((x) => {
              return x.length > 0;
            })
            .join(' ');

          return (
            <div
              key={n.id}
              className={cls}
              style={{
                width: nodeWidth,
                height: nodeHeight,
                left: pos.left,
                top: pos.top,
              }}
            >
              <div className='exprNodeHeader'>
                <div className='exprNodeDot' />
                <div className='exprNodeHeaderText'>
                  <div className='exprNodeTitleRow'>
                    <div className='exprNodeTitle' title={expressionText}>
                      {expressionText}
                    </div>
                    <div className='exprNodeType' title={typeText}>
                      {typeText}
                    </div>
                  </div>
                </div>
              </div>

              <div className='exprNodeBody'>
                {valueText ? <pre className='exprNodePre'>{valueText}</pre> : <div className='exprNodeMuted'>no value</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};