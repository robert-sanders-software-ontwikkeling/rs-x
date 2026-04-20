import type { IExpressionTree } from './expressions/expression-parser.interface';

export type ExpressionNodeId = string;

export class ExpressionNodeIdIndex {
  private readonly _idToNode = new Map<ExpressionNodeId, IExpressionTree>();
  private readonly _nodeToId = new WeakMap<IExpressionTree, ExpressionNodeId>();

  private constructor() {}

  public static build(root: IExpressionTree): ExpressionNodeIdIndex {
    const index = new ExpressionNodeIdIndex();
    index.buildInternal(root);
    return index;
  }

  public getId(node: IExpressionTree): ExpressionNodeId {
    const id = this._nodeToId.get(node);
    if (!id) {
      throw new Error(
        'Node is not part of this index (build from the same root).',
      );
    }
    return id;
  }

  public getNode(id: ExpressionNodeId): IExpressionTree {
    const node = this._idToNode.get(id);
    if (!node) {
      throw new Error(`Could not find expression node for id: '${id}'`);
    }
    return node;
  }

  private buildInternal(root: IExpressionTree): void {
    const stack: Array<{ node: IExpressionTree; id: ExpressionNodeId }> = [
      { node: root, id: 'r' },
    ];

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
