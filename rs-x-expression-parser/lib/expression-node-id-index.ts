import type { IExpression } from '@rs-x/expression-parser';

export type ExpressionNodeId = string;

export class ExpressionNodeIdIndex {
  private readonly _idToNode = new Map<ExpressionNodeId, IExpression>();
  private readonly _nodeToId = new WeakMap<IExpression, ExpressionNodeId>();

  private constructor() {}

  public static build(root: IExpression): ExpressionNodeIdIndex {
    const index = new ExpressionNodeIdIndex();
    index.buildInternal(root);
    return index;
  }

  public getId(node: IExpression): ExpressionNodeId {
    const id = this._nodeToId.get(node);
    if (!id) {
      throw new Error('Node is not part of this index (build from the same root).');
    }
    return id;
  }

  public getNode(id: ExpressionNodeId): IExpression {
    const node = this._idToNode.get(id);
    if (!node) {
      throw new Error(`Could not find expression node for id: '${id}'`);
    }
    return node;
  }

  private buildInternal(root: IExpression): void {
    const stack: Array<{ node: IExpression; id: ExpressionNodeId }> = [ { node: root, id: 'r' } ];

    while (stack.length) {
      const { node, id } = stack.pop()!;

      this._idToNode.set(id, node);
      this._nodeToId.set(node, id);

      const children = node.childExpressions ?? [];
      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i];
        if (child) {
          stack.push({ node: child, id: `${id}/${i}` });
        }
      }
    }
  }
}