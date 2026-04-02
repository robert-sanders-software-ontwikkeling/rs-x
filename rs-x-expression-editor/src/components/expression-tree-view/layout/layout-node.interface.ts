import { type IExpressionTree } from '@rs-x/expression-parser';

import { type NodeId } from './node.interface';

export interface LayoutNode {
  id: NodeId;
  expression: IExpressionTree;
  depth: number;
  x: number;
  y: number;
}
