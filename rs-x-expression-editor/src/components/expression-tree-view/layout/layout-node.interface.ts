import { IExpression } from '@rs-x/expression-parser';
import { NodeId } from './node.interface';

export interface LayoutNode {
  id: NodeId;
  expr: IExpression;
  depth: number;
  x: number;
  y: number;
}