import { Injectable, truePredicate } from '@rs-x/core';
import { HtmlTagName, isHtmlTagName } from '../html-elements/html-tag-name';
import { IDomQuery } from './dom-query.interface';
import { IDomQueryNode } from './dom-query-node.interface';

@Injectable()
export class DomQuery implements IDomQuery {
   public getTextNodes(
      root: Node,
      predicate?: (text: string) => boolean
   ): Node[] {
      if (root.nodeType === Node.TEXT_NODE) {
         return [root];
      }

      const nodeFilter = createNodeFilter(predicate ?? truePredicate);
      const treeWalker = document.createTreeWalker(
         root,
         NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
         nodeFilter
      );
      const textNodes: Node[] = [];
      while (treeWalker.nextNode()) {
         textNodes.push(treeWalker.currentNode);
      }
      return textNodes;
   }

   public getElements(nodes: readonly Node[]): Element[] {
      return nodes.filter((n) => n.nodeType === Node.ELEMENT_NODE) as Element[];
   }

   public isRootCustomElement(node: Node): boolean {
      if (!(node instanceof HTMLElement)) {
         return false;
      }

      const tagName = node.tagName.toLowerCase();

      // Make sure it's a registered custom element
      if (!customElements.get(tagName)) {
         return false;
      }

      let current: Node | null =
         node.parentNode ||
         (node.getRootNode() instanceof ShadowRoot
            ? (node.getRootNode() as ShadowRoot).host
            : null);

      while (current) {
         if (
            current instanceof HTMLElement &&
            customElements.get(current.tagName.toLowerCase())
         ) {
            // Found an ancestor custom element => not root
            return false;
         }

         current =
            current.parentNode ||
            (current instanceof ShadowRoot ? current.host : null);
      }

      return true;
   }

   public isInsideTemplate(node: Node): boolean {
      while (node && node.parentNode) {
         node = node.parentNode;
         if (node instanceof HTMLTemplateElement) {
            return true;
         }
         if (node instanceof ShadowRoot) {
            // optional: stop at shadow DOM boundary
            return false;
         }
      }
      return false;
   }

   public hasCustomElementAsAncestor(descendant: Node): boolean {
      if (!descendant?.parentElement) {
         return false;
      }
      if (!isHtmlTagName(descendant?.parentElement.tagName)) {
         return true;
      }

      return this.hasCustomElementAsAncestor(descendant?.parentElement);
   }

   public getDescendantsExceptTemplateContent(root: Node): Element[] {
      const elements: Element[] = [];
      const excludedAncestors = new Set<Node>();
      const treeWalker = document.createTreeWalker(
         root,
         NodeFilter.SHOW_ELEMENT,
         {
            acceptNode(node) {
               if (excludedAncestors.has(node.parentNode!)) {
                  // Skip nodes inside already excluded ancestor
                  excludedAncestors.add(node);
                  return NodeFilter.FILTER_REJECT;
               }

               const element = node as Element;
               const isCustomElement = !isHtmlTagName(element.tagName);
               const isTemplate = element.tagName === 'TEMPLATE';

               if (isCustomElement || isTemplate) {
                  excludedAncestors.add(node);
                  return NodeFilter.FILTER_ACCEPT;
               }

               return NodeFilter.FILTER_ACCEPT;
            },
         }
      );
      let currentNode = treeWalker.nextNode() as Element;
      while (currentNode) {
         elements.push(currentNode as Element);
         currentNode = treeWalker.nextNode() as Element;
      }
      return elements;
   }

   public getParent(element: Node): Node | null {
      if (element instanceof ShadowRoot) {
         return element.host;
      }

      if (element.parentNode instanceof Element) {
         return element.parentNode;
      }

      return element.parentNode ? this.getParent(element.parentNode) : null;
   }

   public findParent(
      element: IDomQueryNode,
      predicate: (context: unknown) => boolean
   ): Element | null {
      let parent;
      if (element instanceof ShadowRoot) {
         parent = element.host;
      } else {
         parent = element?.parentNode;
      }
      if (!parent) {
         return null;
      } else if (predicate(parent)) {
         return parent;
      } else {
         return this.findParent(parent, predicate);
      }
   }

   public findElement(selector: string): Element | null {
      return document.querySelector(selector);
   }

   public getChildNodesWithContent(parent: Node): Node[] {
      const childNodes =
         parent instanceof HTMLTemplateElement
            ? parent.content.childNodes
            : parent.childNodes;
      return Array.from(childNodes).filter(
         (node) =>

            node.nodeType === Node.ELEMENT_NODE ||
            (node.nodeType === Node.TEXT_NODE &&
               node.textContent && node.textContent.trim().length > 0)
      );
   }

   public isDescendant(descendant: Node, ancestor: Node): boolean {
      return !!(
         ancestor.compareDocumentPosition(descendant) &
         Node.DOCUMENT_POSITION_CONTAINED_BY
      );
   }

   public isAncestor(ancestor: Node, descendant: Node): boolean {
      return !!(
         descendant.compareDocumentPosition(ancestor) &
         Node.DOCUMENT_POSITION_CONTAINS
      );
   }
}

function createNodeFilter(predicate: (text: string) => boolean): NodeFilter {
   if (predicate) {
      return {
         acceptNode: (node: Node): number => {
            if (
               node.nodeType === Node.TEXT_NODE &&
               predicate(node.textContent ?? '')
            ) {
               return NodeFilter.FILTER_ACCEPT;
            }
            if (node.nodeName.toLowerCase() === HtmlTagName.Template) {
               return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_SKIP;
         },
      };
   }

   return {
      acceptNode: (node: Node): number => {
         if (node.nodeType === Node.TEXT_NODE) {
            return NodeFilter.FILTER_ACCEPT;
         }

         if (node.nodeName.toLowerCase() === HtmlTagName.Template) {
            return NodeFilter.FILTER_REJECT;
         }

         return NodeFilter.FILTER_SKIP;
      },
   };
}
