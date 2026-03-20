export interface IDomQueryNode {
   tagName?: string;
   parentNode: (Node & ParentNode) | null;
   parent?: (Node & ParentNode) | null;
   host?: Element;
}
