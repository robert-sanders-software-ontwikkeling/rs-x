import { IExpression } from '@rs-x/expression-parser';
import { LayoutEdge } from './layout-edge.interface';
import { NodeId, TNode } from './node.interface';
import { LayoutNode } from './layout-node.interface';
import { LayoutResult } from './layout-result.interface';

export class TreeLayoutEngine {
    private _seq = 0;

    public computeLayout(expresssion: IExpression): LayoutResult {

        if(!expresssion) {
             return { nodes: [], edges: [], maxX: -1, maxDepth: 0 };
        }
        const { root, nodes } = this.buildTNodeTree(expresssion);

        const distance = 1;
        const stats = this.tidyLayout(root, distance);

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

    private makeId(): NodeId {
        this._seq++;
        return `n${this._seq}`;
    }

    private buildTNodeTree(rootExpr: IExpression): { root: TNode; nodes: TNode[] } {
        this._seq = 0;

        const nodes: TNode[] = [];

        const build = (expresssion: IExpression, depth: number, parent?: TNode, number = 1): TNode => {
            const node: TNode = {
                id: this.makeId(),
                expr: expresssion,
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

            const kids = expresssion.childExpressions ?? [];
            node.children = kids.map((c, i) => build(c, depth + 1, node, i + 1));

            return node;
        };

        const root = build(rootExpr, 0, undefined, 1);
        return { root, nodes };
    }

    private leftSibling(v: TNode): TNode | undefined {
        if (!v.parent) {
            return undefined;
        }
        if (v.number > 1) {
            return v.parent.children[v.number - 2];
        }
        return undefined;
    }

    private leftMostSibling(v: TNode): TNode | undefined {
        if (!v.parent) {
            return undefined;
        }
        if (v.parent.children.length) {
            return v.parent.children[0];
        }
        return undefined;
    }

    private nextLeft(v: TNode): TNode | undefined {
        if (v.children.length) {
            return v.children[0];
        }
        return v.thread;
    }

    private nextRight(v: TNode): TNode | undefined {
        if (v.children.length) {
            return v.children[v.children.length - 1];
        }
        return v.thread;
    }

    private moveSubtree(wl: TNode, wr: TNode, shift: number): void {
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

    private ancestorNode(vil: TNode, v: TNode, defaultAncestor: TNode): TNode {
        if (vil.ancestor.parent === v.parent) {
            return vil.ancestor;
        }
        return defaultAncestor;
    }

    private executeShifts(v: TNode): void {
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

    private apportion(v: TNode, defaultAncestor: TNode, distance: number): TNode {
        const w = this.leftSibling(v);
        if (!w) {
            return defaultAncestor;
        }

        let vir: TNode = v;
        let vor: TNode = v;
        let vil: TNode = w;
        let vol: TNode = this.leftMostSibling(v)!;

        let sir = vir.mod;
        let sor = vor.mod;
        let sil = vil.mod;
        let sol = vol.mod;

        while (this.nextRight(vil) && this.nextLeft(vir)) {
            vil = this.nextRight(vil)!;
            vir = this.nextLeft(vir)!;
            vol = this.nextLeft(vol)!;
            vor = this.nextRight(vor)!;

            vor.ancestor = v;

            const shift = (vil.prelim + sil) - (vir.prelim + sir) + distance;
            if (shift > 0) {
                const a = this.ancestorNode(vil, v, defaultAncestor);
                this.moveSubtree(a, v, shift);
                sir += shift;
                sor += shift;
            }

            sil += vil.mod;
            sir += vir.mod;
            sol += vol.mod;
            sor += vor.mod;
        }

        if (this.nextRight(vil) && !this.nextRight(vor)) {
            vor.thread = this.nextRight(vil);
            vor.mod += sil - sor;
        } else if (this.nextLeft(vir) && !this.nextLeft(vol)) {
            vol.thread = this.nextLeft(vir);
            vol.mod += sir - sol;
        }

        return defaultAncestor;
    }

    private firstWalk(v: TNode, distance: number): void {
        if (!v.children.length) {
            const w = this.leftSibling(v);
            if (w) {
                v.prelim = w.prelim + distance;
            } else {
                v.prelim = 0;
            }
            return;
        }

        let defaultAncestor = v.children[0];

        for (const w of v.children) {
            this.firstWalk(w, distance);
            defaultAncestor = this.apportion(w, defaultAncestor, distance);
        }

        this.executeShifts(v);

        const left = v.children[0];
        const right = v.children[v.children.length - 1];
        const mid = (left.prelim + right.prelim) / 2;

        const w = this.leftSibling(v);
        if (w) {
            v.prelim = w.prelim + distance;
            v.mod = v.prelim - mid;
        } else {
            v.prelim = mid;
        }
    }

    private secondWalk(v: TNode, m: number, minX: { value: number }): void {
        v.x = v.prelim + m;
        v.y = v.depth;

        if (v.x < minX.value) {
            minX.value = v.x;
        }

        for (const w of v.children) {
            this.secondWalk(w, m + v.mod, minX);
        }
    }

    private tidyLayout(root: TNode, distance: number): { maxX: number; maxDepth: number } {
        this.firstWalk(root, distance);

        const minX = { value: Number.POSITIVE_INFINITY };
        this.secondWalk(root, 0, minX);

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