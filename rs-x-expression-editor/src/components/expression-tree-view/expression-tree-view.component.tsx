import React, { useEffect, useMemo, useRef, useState } from 'react';

import type { IExpression, IExpressionChangeHistory } from '@rs-x/expression-parser';
import './expression-tree-view.component.css';

const animationSpeed = 350;

export interface IExpressionTreeProps {
  version: number;
  root: IExpression;

  nodeWidth?: number;
  nodeHeight?: number;
  horizontalGap?: number;
  verticalGap?: number;

  formatValue?: (value: unknown) => string;
  valueMaxDepth?: number;
  valueMaxChars?: number;

  className?: string;
  style?: React.CSSProperties;

  highlightChanges?: readonly IExpressionChangeHistory[];
  highlightVersion?: number;
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
  number: number;
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

    if (v instanceof Date) {
      return v.toISOString();
    }
    if (v instanceof Error) {
      return { name: v.name, message: v.message, stack: v.stack };
    }

    if (Array.isArray(v)) {
      return v.map((x) => toJson(x, depth + 1));
    }

    if (t === 'object') {
      const obj = v as Record<string, unknown>;
      if (seen.has(obj)) {
        return '[Circular]';
      }
      seen.add(obj);

      const out: Record<string, unknown> = {};
      const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
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

/* ---------------------------
   Tree layout
--------------------------- */

function buildTNodeTree(rootExpr: IExpression): { root: TNode; nodes: TNode[] } {
  let seq = 0;
  const nodes: TNode[] = [];
  const mkId = () => `n${++seq}`;

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
    node.children = kids.map((c, i) => build(c, depth + 1, node, i + 1));
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

  const layoutNodes: LayoutNode[] = nodes.map((n) => ({
    id: n.id,
    expr: n.expr,
    depth: n.depth,
    x: n.x,
    y: n.y,
  }));

  const edges: LayoutEdge[] = [];
  for (const n of nodes) {
    for (const c of n.children) {
      edges.push({ from: n.id, to: c.id });
    }
  }

  return { nodes: layoutNodes, edges, maxX: stats.maxX, maxDepth: stats.maxDepth };
}

/* ---------------------------
   React helpers
--------------------------- */

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

function edgeKey(from: NodeId, to: NodeId): string {
  return `${from}->${to}`;
}



function getExprKey(expr: IExpression): string {
  // stronger than expressionString alone
  const s = expr.expressionString;
  return `${s}::${String(expr.type)}`;
}

function buildChainToRoot(start: NodeId, parentById: Map<NodeId, NodeId | null>): NodeId[] {
  const chain: NodeId[] = [];
  let cur: NodeId | null = start;
  while (cur) {
    chain.push(cur);
    cur = parentById.get(cur) ?? null;
  }
  return chain;
}

/** Path nodes from a -> ... -> b (inclusive), via LCA */
function pathNodesBetween(a: NodeId, b: NodeId, parentById: Map<NodeId, NodeId | null>): NodeId[] {
  if (a === b) {
    return [a];
  }

  const chainA = buildChainToRoot(a, parentById);
  const chainB = buildChainToRoot(b, parentById);

  const posA = new Map<NodeId, number>();
  for (let i = 0; i < chainA.length; i++) {
    posA.set(chainA[i], i);
  }

  let lca: NodeId | null = null;
  let idxB = 0;
  for (; idxB < chainB.length; idxB++) {
    const node = chainB[idxB];
    if (posA.has(node)) {
      lca = node;
      break;
    }
  }

  if (!lca) {
    // disconnected (should not happen)
    return [a, b];
  }

  const idxA = posA.get(lca) as number;

  // a -> ... -> lca
  const up = chainA.slice(0, idxA + 1);

  // lca -> ... -> b (reverse of chainB[0..idxB])
  const down = chainB.slice(0, idxB).reverse();

  return [...up, ...down];
}

export const ExpressionTree: React.FC<IExpressionTreeProps> = (props) => {
  const {
    root,
    version,
    nodeWidth = DEFAULTS.nodeWidth,
    nodeHeight = DEFAULTS.nodeHeight,
    horizontalGap = DEFAULTS.horizontalGap,
    verticalGap = DEFAULTS.verticalGap,
    valueMaxDepth = DEFAULTS.valueMaxDepth,
    valueMaxChars = DEFAULTS.valueMaxChars,
    formatValue,
    className,
    style,
    highlightChanges = [],
    highlightVersion = 0,
  } = props;

  const [hostRef, hostSize] = useResizeObserverSize<HTMLDivElement>();

  const layout = useMemo(() => {
    // include version so if you ever want to rebuild layout on version bump, you can.
    // (Structure usually same; this is safe and cheap enough.)
    void version;
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

  const maps = useMemo(() => {
    const idByExprRef = new Map<IExpression, NodeId>();
    const idByExprKey = new Map<string, NodeId>();
    const parentById = new Map<NodeId, NodeId | null>();

    for (const n of layout.nodes) {
      idByExprRef.set(n.expr, n.id);

      const k = getExprKey(n.expr);
      if (k && !idByExprKey.has(k)) {
        idByExprKey.set(k, n.id);
      }
    }

    for (const e of layout.edges) {
      parentById.set(e.to, e.from);
      if (!parentById.has(e.from)) {
        parentById.set(e.from, null);
      }
    }

    return { idByExprRef, idByExprKey, parentById };
  }, [layout.nodes, layout.edges]);

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

  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<NodeId>>(() => new Set<NodeId>());
  const [selectedEdgeKeys, setSelectedEdgeKeys] = useState<Set<string>>(() => new Set<string>());
  const [activeNodeId, setActiveNodeId] = useState<NodeId | null>(null);
  const [activeEdgeKey, setActiveEdgeKey] = useState<string | null>(null);

  const timersRef = useRef<number[]>([]);

  const clearTimers = () => {
    for (const t of timersRef.current) {
      window.clearTimeout(t);
    }
    timersRef.current = [];
  };

  const resolveNodeId = (expr: IExpression): NodeId | null => {
    const byRef = maps.idByExprRef.get(expr);
    if (byRef) {
      return byRef;
    }

    const k = getExprKey(expr);
    const byKey = maps.idByExprKey.get(k);
    if (byKey) {
      return byKey;
    }

    return null;
  };

  const highlightKey = useMemo(() => {
    // stable key so effect runs when selection content changes, even if version not bumped
    return (highlightChanges ?? []).map((h) => getExprKey(h.expression)).join('|');
  }, [highlightChanges]);

  useEffect(() => {
    clearTimers();

    if (!highlightChanges || highlightChanges.length === 0) {
      setSelectedNodeIds(() => new Set<NodeId>());
      setSelectedEdgeKeys(() => new Set<string>());
      setActiveNodeId(() => null);
      setActiveEdgeKey(() => null);
      return;
    }

    const stepIds: NodeId[] = [];
    for (const h of highlightChanges) {
      const id = resolveNodeId(h.expression);
      if (id) {
        stepIds.push(id);
      }
    }

    if (stepIds.length === 0) {
      setSelectedNodeIds(() => new Set<NodeId>());
      setSelectedEdgeKeys(() => new Set<string>());
      setActiveNodeId(() => null);
      setActiveEdgeKey(() => null);
      return;
    }

    const selectedNodes = new Set<NodeId>();
    const selectedEdges = new Set<string>();

    for (const id of stepIds) {
      selectedNodes.add(id);
    }

    // Build the full node path between each consecutive step via LCA.
    // Then highlight every edge on that path.
    const nodePathSequence: NodeId[] = [];

    for (let i = 0; i < stepIds.length - 1; i++) {
      const a = stepIds[i];
      const b = stepIds[i + 1];

      const segment = pathNodesBetween(a, b, maps.parentById);
      if (segment.length) {
        if (nodePathSequence.length === 0) {
          nodePathSequence.push(...segment);
        } else {
          // avoid duplicate join node
          nodePathSequence.push(...segment.slice(1));
        }
      }
    }

    if (nodePathSequence.length === 0) {
      nodePathSequence.push(stepIds[0]);
    }

    for (let i = 0; i < nodePathSequence.length - 1; i++) {
      const from = nodePathSequence[i + 1];
      const to = nodePathSequence[i];
      // parent -> child edge is (to -> from) if to is parent of from
      // so compute both directions and add whichever exists
      const p = maps.parentById.get(from) ?? null;
      if (p === to) {
        selectedEdges.add(edgeKey(to, from));
      } else {
        const p2 = maps.parentById.get(to) ?? null;
        if (p2 === from) {
          selectedEdges.add(edgeKey(from, to));
        }
      }
    }

    setSelectedNodeIds(() => selectedNodes);
    setSelectedEdgeKeys(() => selectedEdges);

    // Animate across the *nodePathSequence* so bubbling is obvious.
    const nodeMs = 520;
    const edgeMs = 260;

    setActiveNodeId(() => nodePathSequence[0] ?? null);
    setActiveEdgeKey(() => null);

    let t = 0;

    for (let i = 0; i < nodePathSequence.length - 1; i++) {
      const a = nodePathSequence[i];
      const b = nodePathSequence[i + 1];

      // find the edge between a and b (either direction)
      const k1 = edgeKey(a, b);
      const k2 = edgeKey(b, a);
      const activeK = selectedEdges.has(k1) ? k1 : selectedEdges.has(k2) ? k2 : null;

      t += edgeMs;
      timersRef.current.push(
        window.setTimeout(() => {
          setActiveEdgeKey(() => activeK);
          setActiveNodeId(() => a);
        }, t)
      );

      t += nodeMs;
      timersRef.current.push(
        window.setTimeout(() => {
          setActiveEdgeKey(() => null);
          setActiveNodeId(() => b);
        }, t)
      );
    }

    t += animationSpeed;
    timersRef.current.push(
      window.setTimeout(() => {
        setActiveEdgeKey(() => null);
        setActiveNodeId(() => null);
      }, t)
    );

    return () => {
      clearTimers();
    };
  }, [highlightVersion, highlightKey, maps]);

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

            const k = edgeKey(e.from, e.to);
            const isSelected = selectedEdgeKeys.has(k);
            const isActive = activeEdgeKey === k;

            return (
              <path
                key={k}
                d={d}
                className={`exprTreePath ${isSelected ? 'isSelected' : ''} ${isActive ? 'isActive' : ''}`}
              />
            );
          })}
        </svg>

        {layout.nodes.map((n) => {
          const pos = nodePos.get(n.id);
          if (!pos) {
            return null;
          }

          const expressionText = n.expr.expressionString;
          const typeText = String(n.expr.type);
          const valueText = valueFormatter(n.expr.value);

          const isSelected = selectedNodeIds.has(n.id);
          const isActive = activeNodeId === n.id;

          return (
            <div
              key={n.id}
              className={`exprNode ${isSelected ? 'isSelected' : ''} ${isActive ? 'isActive' : ''}`}
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