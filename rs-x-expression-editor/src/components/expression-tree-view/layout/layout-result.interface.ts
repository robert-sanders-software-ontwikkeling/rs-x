import { type LayoutEdge } from './layout-edge.interface';
import { type LayoutNode } from './layout-node.interface';

export interface LayoutResult {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  maxX: number;
  maxDepth: number;
}
