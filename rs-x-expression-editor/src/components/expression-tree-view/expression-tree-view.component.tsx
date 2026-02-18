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

  // ✅ NEW: controlled zoom from parent (App header dropdown)
  zoomPercent?: number;
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

/* ===========================
   OO: Value formatting
=========================== */

class ValueFormatter {
  public constructor(
    private readonly _maxDepth: number,
    private readonly _maxChars: number
  ) {}

  public format(value: unknown): string {
    const seen = new WeakSet<object>();

    const toJson = (v: unknown, depth: number): unknown => {
      if (depth > this._maxDepth) {
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
    };

    let text = '';

    try {
      text = JSON.stringify(toJson(value, 0), null, 2) ?? 'null';
    } catch {
      text = String(value);
    }

    if (text.length > this._maxChars) {
      text = text.slice(0, this._maxChars) + '\n… [truncated]';
    }

    return text;
  }
}

/* ===========================
   OO: Tree layout engine
=========================== */

class TreeLayoutEngine {
  private _seq = 0;

  public computeLayout(rootExpr: IExpression): LayoutResult {
    const { root, nodes } = this._buildTNodeTree(rootExpr);

    const distance = 1;
    const stats = this._tidyLayout(root, distance);

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

  private _mkId(): NodeId {
    this._seq++;
    return `n${this._seq}`;
  }

  private _buildTNodeTree(rootExpr: IExpression): { root: TNode; nodes: TNode[] } {
    this._seq = 0;

    const nodes: TNode[] = [];

    const build = (expr: IExpression, depth: number, parent?: TNode, number = 1): TNode => {
      const node: TNode = {
        id: this._mkId(),
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
    };

    const root = build(rootExpr, 0, undefined, 1);
    return { root, nodes };
  }

  private _leftSibling(v: TNode): TNode | undefined {
    if (!v.parent) {
      return undefined;
    }
    if (v.number > 1) {
      return v.parent.children[v.number - 2];
    }
    return undefined;
  }

  private _leftMostSibling(v: TNode): TNode | undefined {
    if (!v.parent) {
      return undefined;
    }
    if (v.parent.children.length) {
      return v.parent.children[0];
    }
    return undefined;
  }

  private _nextLeft(v: TNode): TNode | undefined {
    if (v.children.length) {
      return v.children[0];
    }
    return v.thread;
  }

  private _nextRight(v: TNode): TNode | undefined {
    if (v.children.length) {
      return v.children[v.children.length - 1];
    }
    return v.thread;
  }

  private _moveSubtree(wl: TNode, wr: TNode, shift: number): void {
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

  private _ancestorNode(vil: TNode, v: TNode, defaultAncestor: TNode): TNode {
    if (vil.ancestor.parent === v.parent) {
      return vil.ancestor;
    }
    return defaultAncestor;
  }

  private _executeShifts(v: TNode): void {
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

  private _apportion(v: TNode, defaultAncestor: TNode, distance: number): TNode {
    const w = this._leftSibling(v);
    if (!w) {
      return defaultAncestor;
    }

    let vir: TNode = v;
    let vor: TNode = v;
    let vil: TNode = w;
    let vol: TNode = this._leftMostSibling(v)!;

    let sir = vir.mod;
    let sor = vor.mod;
    let sil = vil.mod;
    let sol = vol.mod;

    while (this._nextRight(vil) && this._nextLeft(vir)) {
      vil = this._nextRight(vil)!;
      vir = this._nextLeft(vir)!;
      vol = this._nextLeft(vol)!;
      vor = this._nextRight(vor)!;

      vor.ancestor = v;

      const shift = (vil.prelim + sil) - (vir.prelim + sir) + distance;
      if (shift > 0) {
        const a = this._ancestorNode(vil, v, defaultAncestor);
        this._moveSubtree(a, v, shift);
        sir += shift;
        sor += shift;
      }

      sil += vil.mod;
      sir += vir.mod;
      sol += vol.mod;
      sor += vor.mod;
    }

    if (this._nextRight(vil) && !this._nextRight(vor)) {
      vor.thread = this._nextRight(vil);
      vor.mod += sil - sor;
    } else if (this._nextLeft(vir) && !this._nextLeft(vol)) {
      vol.thread = this._nextLeft(vir);
      vol.mod += sir - sol;
    }

    return defaultAncestor;
  }

  private _firstWalk(v: TNode, distance: number): void {
    if (!v.children.length) {
      const w = this._leftSibling(v);
      if (w) {
        v.prelim = w.prelim + distance;
      } else {
        v.prelim = 0;
      }
      return;
    }

    let defaultAncestor = v.children[0];

    for (const w of v.children) {
      this._firstWalk(w, distance);
      defaultAncestor = this._apportion(w, defaultAncestor, distance);
    }

    this._executeShifts(v);

    const left = v.children[0];
    const right = v.children[v.children.length - 1];
    const mid = (left.prelim + right.prelim) / 2;

    const w = this._leftSibling(v);
    if (w) {
      v.prelim = w.prelim + distance;
      v.mod = v.prelim - mid;
    } else {
      v.prelim = mid;
    }
  }

  private _secondWalk(v: TNode, m: number, minX: { value: number }): void {
    v.x = v.prelim + m;
    v.y = v.depth;

    if (v.x < minX.value) {
      minX.value = v.x;
    }

    for (const w of v.children) {
      this._secondWalk(w, m + v.mod, minX);
    }
  }

  private _tidyLayout(root: TNode, distance: number): { maxX: number; maxDepth: number } {
    this._firstWalk(root, distance);

    const minX = { value: Number.POSITIVE_INFINITY };
    this._secondWalk(root, 0, minX);

    const shift = -minX.value;

    let maxX = 0;
    let maxDepth = 0;

    const shiftAll = (n: TNode): void => {
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
    };

    shiftAll(root);

    return { maxX, maxDepth };
  }
}

/* ===========================
   OO: Expression index
=========================== */

class ExpressionIndex {
  public readonly idByExprRef = new Map<IExpression, NodeId>();
  public readonly idByExprKey = new Map<string, NodeId>();
  public readonly parentById = new Map<NodeId, NodeId | null>();

  public constructor(layout: LayoutResult) {
    for (const n of layout.nodes) {
      this.idByExprRef.set(n.expr, n.id);

      const k = this.exprKey(n.expr);
      if (k && !this.idByExprKey.has(k)) {
        this.idByExprKey.set(k, n.id);
      }
    }

    for (const e of layout.edges) {
      this.parentById.set(e.to, e.from);
      if (!this.parentById.has(e.from)) {
        this.parentById.set(e.from, null);
      }
    }
  }

  public edgeKey(from: NodeId, to: NodeId): string {
    return `${from}->${to}`;
  }

  public exprKey(expr: IExpression): string {
    return `${expr.expressionString}::${String(expr.type)}`;
  }

  public resolveNodeId(expr: IExpression): NodeId | null {
    const byRef = this.idByExprRef.get(expr);
    if (byRef) {
      return byRef;
    }

    const byKey = this.idByExprKey.get(this.exprKey(expr));
    if (byKey) {
      return byKey;
    }

    return null;
  }

  public buildHighlightKey(highlightChanges: readonly IExpressionChangeHistory[]): string {
    return highlightChanges.map((h) => this.exprKey(h.expression)).join('|');
  }

  private _buildChainToRoot(start: NodeId): NodeId[] {
    const chain: NodeId[] = [];
    let cur: NodeId | null = start;

    while (cur) {
      chain.push(cur);
      cur = this.parentById.get(cur) ?? null;
    }

    return chain;
  }

  public pathNodesBetween(a: NodeId, b: NodeId): NodeId[] {
    if (a === b) {
      return [a];
    }

    const chainA = this._buildChainToRoot(a);
    const chainB = this._buildChainToRoot(b);

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
      return [a, b];
    }

    const idxA = posA.get(lca) as number;

    const up = chainA.slice(0, idxA + 1);
    const down = chainB.slice(0, idxB).reverse();

    return [...up, ...down];
  }
}

/* ===========================
   OO: Highlight animator
=========================== */

class HighlightAnimator {
  public computeSelection(args: {
    highlightChanges: readonly IExpressionChangeHistory[];
    index: ExpressionIndex;
  }): {
    selectedNodeIds: Set<NodeId>;
    selectedEdgeKeys: Set<string>;
    nodePathSequence: NodeId[];
  } {
    const { highlightChanges, index } = args;

    const stepIds: NodeId[] = [];

    for (const h of highlightChanges) {
      const id = index.resolveNodeId(h.expression);
      if (id) {
        stepIds.push(id);
      }
    }

    if (stepIds.length === 0) {
      return {
        selectedNodeIds: new Set<NodeId>(),
        selectedEdgeKeys: new Set<string>(),
        nodePathSequence: [],
      };
    }

    const selectedNodes = new Set<NodeId>();
    const selectedEdges = new Set<string>();

    for (const id of stepIds) {
      selectedNodes.add(id);
    }

    const nodePathSequence: NodeId[] = [];

    for (let i = 0; i < stepIds.length - 1; i++) {
      const a = stepIds[i];
      const b = stepIds[i + 1];

      const segment = index.pathNodesBetween(a, b);
      if (segment.length) {
        if (nodePathSequence.length === 0) {
          nodePathSequence.push(...segment);
        } else {
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

      const p = index.parentById.get(from) ?? null;
      if (p === to) {
        selectedEdges.add(index.edgeKey(to, from));
      } else {
        const p2 = index.parentById.get(to) ?? null;
        if (p2 === from) {
          selectedEdges.add(index.edgeKey(from, to));
        }
      }
    }

    return {
      selectedNodeIds: selectedNodes,
      selectedEdgeKeys: selectedEdges,
      nodePathSequence,
    };
  }

  public scheduleAnimation(args: {
    nodePathSequence: NodeId[];
    selectedEdges: Set<string>;
    edgeKey: (a: NodeId, b: NodeId) => string;
    setActiveNodeId: React.Dispatch<React.SetStateAction<NodeId | null>>;
    setActiveEdgeKey: React.Dispatch<React.SetStateAction<string | null>>;
    timersRef: React.MutableRefObject<number[]>;
    clearTimers: () => void;
  }): void {
    const {
      nodePathSequence,
      selectedEdges,
      edgeKey,
      setActiveNodeId,
      setActiveEdgeKey,
      timersRef,
      clearTimers,
    } = args;

    clearTimers();

    if (nodePathSequence.length === 0) {
      setActiveEdgeKey(() => null);
      setActiveNodeId(() => null);
      return;
    }

    const nodeMs = 520;
    const edgeMs = 260;

    setActiveNodeId(() => nodePathSequence[0] ?? null);
    setActiveEdgeKey(() => null);

    let t = 0;

    for (let i = 0; i < nodePathSequence.length - 1; i++) {
      const a = nodePathSequence[i];
      const b = nodePathSequence[i + 1];

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
  }
}

/* ===========================
   OO: ResizeObserver + hook
=========================== */

class ResizeObserverController<T extends HTMLElement> {
  private _ro: ResizeObserver | null = null;

  public attach(el: T, onSize: (size: { width: number; height: number }) => void): void {
    this.detach();

    this._ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const cr = entry.contentRect;
      onSize({ width: cr.width, height: cr.height });
    });

    this._ro.observe(el);
  }

  public detach(): void {
    if (!this._ro) {
      return;
    }

    this._ro.disconnect();
    this._ro = null;
  }
}

function useResizeObserverSize<T extends HTMLElement>(): [
  React.RefObject<T | null>,
  { width: number; height: number }
] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const controllerRef = useRef<ResizeObserverController<T> | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new ResizeObserverController<T>();
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }

    controllerRef.current!.attach(el, (s) => {
      setSize(() => s);
    });

    return () => {
      controllerRef.current!.detach();
    };
  }, []);

  return [ref, size];
}

/* ===========================
   React component (zoom + centered)
=========================== */

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
    zoomPercent = 100, // ✅ controlled from parent
  } = props;

  const [hostRef, hostSize] = useResizeObserverSize<HTMLDivElement>();

  const layoutEngine = useMemo(() => {
    return new TreeLayoutEngine();
  }, []);

  const layout = useMemo(() => {
    void version;
    return layoutEngine.computeLayout(root);
  }, [layoutEngine, root, version]);

  const index = useMemo(() => {
    return new ExpressionIndex(layout);
  }, [layout]);

  const animator = useMemo(() => {
    return new HighlightAnimator();
  }, []);

  const zoomScale = useMemo(() => {
    return zoomPercent / 100;
  }, [zoomPercent]);

  const unitX = nodeWidth + horizontalGap;
  const unitY = nodeHeight + verticalGap;

  const treeW = (layout.maxX + 1) * unitX + horizontalGap;
  const treeH = (layout.maxDepth + 1) * unitY + verticalGap;

  const panelW = hostSize.width || 0;
  const panelH = hostSize.height || 0;

  // ✅ CENTERING FIX:
  const availableUnscaledW = zoomScale > 0 ? panelW / zoomScale : panelW;
  const availableUnscaledH = zoomScale > 0 ? panelH / zoomScale : panelH;

  const originX = Math.max(0, (availableUnscaledW - treeW) / 2);
  const originY = Math.max(0, (availableUnscaledH - treeH) / 2);

  const paddedW = treeW + originX * 2;
  const paddedH = treeH + originY * 2;

  const scaledW = Math.ceil(paddedW * zoomScale);
  const scaledH = Math.ceil(paddedH * zoomScale);

  const valueFormatterFn = useMemo(() => {
    if (formatValue) {
      return formatValue;
    }

    const vf = new ValueFormatter(valueMaxDepth, valueMaxChars);
    return (v: unknown) => {
      return vf.format(v);
    };
  }, [formatValue, valueMaxDepth, valueMaxChars]);

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
  }, [
    layout.nodes,
    originX,
    originY,
    unitX,
    unitY,
    horizontalGap,
    verticalGap,
    nodeWidth,
    nodeHeight,
  ]);

  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<NodeId>>(() => new Set<NodeId>());
  const [selectedEdgeKeys, setSelectedEdgeKeys] = useState<Set<string>>(() => new Set<string>());
  const [activeNodeId, setActiveNodeId] = useState<NodeId | null>(null);
  const [activeEdgeKey, setActiveEdgeKey] = useState<string | null>(null);

  const timersRef = useRef<number[]>([]);

  const clearTimers = (): void => {
    for (const t of timersRef.current) {
      window.clearTimeout(t);
    }
    timersRef.current = [];
  };

  const highlightKey = useMemo(() => {
    return index.buildHighlightKey(highlightChanges);
  }, [index, highlightChanges]);

  useEffect(() => {
    clearTimers();

    if (!highlightChanges || highlightChanges.length === 0) {
      setSelectedNodeIds(() => new Set<NodeId>());
      setSelectedEdgeKeys(() => new Set<string>());
      setActiveNodeId(() => null);
      setActiveEdgeKey(() => null);
      return;
    }

    const selection = animator.computeSelection({
      highlightChanges,
      index,
    });

    if (selection.nodePathSequence.length === 0) {
      setSelectedNodeIds(() => new Set<NodeId>());
      setSelectedEdgeKeys(() => new Set<string>());
      setActiveNodeId(() => null);
      setActiveEdgeKey(() => null);
      return;
    }

    setSelectedNodeIds(() => selection.selectedNodeIds);
    setSelectedEdgeKeys(() => selection.selectedEdgeKeys);

    animator.scheduleAnimation({
      nodePathSequence: selection.nodePathSequence,
      selectedEdges: selection.selectedEdgeKeys,
      edgeKey: (a, b) => index.edgeKey(a, b),
      setActiveNodeId,
      setActiveEdgeKey,
      timersRef,
      clearTimers,
    });

    return () => {
      clearTimers();
    };
  }, [highlightVersion, highlightKey, index, animator]);

  return (
    <div ref={hostRef} className={`exprTreeRoot ${className ?? ''}`} style={style}>
      {/* ✅ REMOVED: internal zoom toolbar (now owned by App header) */}

      <div className='exprTreeViewport'>
        <div className='exprTreeSpacer' style={{ width: scaledW, height: scaledH }}>
          <div
            className='exprTreeZoomLayer'
            style={{
              width: paddedW,
              height: paddedH,
              transform: `scale(${zoomScale})`,
              transformOrigin: 'top left',
            }}
          >
            <div className='exprTreeCanvas' style={{ width: paddedW, height: paddedH }}>
              <svg
                className='exprTreeLines'
                width={paddedW}
                height={paddedH}
                viewBox={`0 0 ${paddedW} ${paddedH}`}
              >
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

                  const k = index.edgeKey(e.from, e.to);
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
                const valueText = valueFormatterFn(n.expr.value);

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
                      {valueText ? (
                        <pre className='exprNodePre'>{valueText}</pre>
                      ) : (
                        <div className='exprNodeMuted'>no value</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};