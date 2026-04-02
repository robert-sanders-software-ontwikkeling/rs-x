import { type IExpressionTree } from '@rs-x/expression-parser';

export type NodeId = string;

export interface TNode {
  id: NodeId;
  expr: IExpressionTree;
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
