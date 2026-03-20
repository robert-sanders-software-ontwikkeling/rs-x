import { IDomQueryNode } from './dom-query-node.interface';

export interface IDomQuery {
   getElements(nodes: readonly Node[]): Element[] ;
   getTextNodes(root: Node, predicate?: (text: string) => boolean): Node[];
   getDescendantsExceptTemplateContent(root: Node): Element[];
   getParent(element: Node): Node | null;
   findParent(
      element: IDomQueryNode,
      predicate: (context: unknown) => boolean
   ): Element | null;

   findElement(selector: string): Element | null;
   getChildNodesWithContent(node: Node): Node[];
   isDescendant(ancestor: Node, descendant: Node): boolean;
   isAncestor(ancestor: Node, descendant: Node): boolean;
   hasCustomElementAsAncestor(descendant: Node): boolean;
   isInsideTemplate(node: Node): boolean;
}
