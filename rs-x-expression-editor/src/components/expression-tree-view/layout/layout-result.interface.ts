import { LayoutEdge } from './layout-edge.interface';
import { LayoutNode } from './layout-node.interface';

export interface LayoutResult {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  maxX: number;
  maxDepth: number;
}