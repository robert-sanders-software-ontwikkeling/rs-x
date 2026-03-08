import {
  type IExpression,
  type IExpressionChangeHistory,
} from '@rs-x/expression-parser';

import { type LayoutResult } from './layout/layout-result.interface';
import { type NodeId } from './layout/node.interface';

export class ExpressionIndex {
  public readonly idByExprRef = new Map<IExpression, NodeId>();
  public readonly idByExprKey = new Map<string, NodeId>();
  public readonly parentById = new Map<NodeId, NodeId | null>();

  public constructor(layout: LayoutResult) {
    for (const n of layout.nodes) {
      this.idByExprRef.set(n.expression, n.id);

      const k = this.exprKey(n.expression);
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

  public exprKey(expression: IExpression): string {
    if (!expression.id) {
      throw new Error(
        'ExpressionIndex: expression.id is not available (expression not initialized)',
      );
    }

    return expression.id;
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

  /**
   * ✅ IMPORTANT:
   * For single-node updates, expr.id is constant, so a key like "id|id|id"
   * never changes and animation effects won't re-run.
   *
   * So include the old->new values in the signature.
   */
  public buildHighlightKey(
    highlightChanges: readonly IExpressionChangeHistory[],
  ): string {
    return highlightChanges
      .map((h) => {
        const id = this.exprKey(h.expression);

        const oldV =
          h.oldValue === undefined ? 'undefined' : String(h.oldValue);
        const newV = h.value === undefined ? 'undefined' : String(h.value);

        return `${id}:${oldV}=>${newV}`;
      })
      .join('|');
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

  /** ✅ public helper for animators: [start, parent, ..., root] */
  public chainToRoot(start: NodeId): NodeId[] {
    return this._buildChainToRoot(start);
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
