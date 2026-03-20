import { Assertion } from '@rs-x/core';
import { DomElement } from '../dom-element/dom-element';
import { IDomWindow } from '../dom-window';

export class ContentEditableCaret {
   constructor(
      private readonly _window: IDomWindow,
      private readonly _element: HTMLElement
   ) {}

   public get position(): number {
      if (!this.hasFocus) {
         return 0;
      }

      const selection = this._window.getSelection();
      if (!selection || selection.rangeCount === 0) {
         return 0;
      }

      const range = selection.getRangeAt(0);
      const childNodes = this._element.childNodes;
      let charCount = 0;

      for (let i = 0; i < childNodes.length; i++) {
         const node = childNodes[i];
         if (node.nodeType === 1 || node.nodeType === 3) {
            const nodeRange = document.createRange();
            nodeRange.selectNode(node);
            if (nodeRange.compareBoundaryPoints(Range.END_TO_END, range) < 0) {
               if (this.isContent(node)) {
                  if (this.isInlineWhithspace(node)) {
                     charCount++;
                  } else {
                     const text =
                        node.nodeType === 1
                           ? (node as HTMLElement).innerText
                           : node.nodeValue;
                     // charCount += text.trim().length;
                     charCount += text?.length ?? 0;
                  }
                  if (this.isNextBlock(node)) {
                     charCount++;
                  }
               }
            } else {
               charCount += range.endOffset;
               break;
            }
         }
      }

      return charCount;
   }

   public set position(value: number) {
      this.setSelectionRange(value, value);
   }

   public get selectionLength(): number {
      if (this.hasFocus) {
         return this._window.getSelection()?.toString().length ?? 0;
      } else {
         return 0;
      }
   }

   public get hasFocus(): boolean {
      return this._element === document.activeElement;
   }

   public focus(): void {
      this._element.focus();
   }

   public blur(): void {
      this._element.blur();
   }

   public setSelectionRange(start: number, end: number): void {
      if (!new DomElement(this._window, this._element).isVisible) {
         return;
      }

      if (start > end) {
         throw new Error(
            `ContentEditableCaret.setSelectionRange: 'end' must be greater or equal to 'start'`
         );
      }

      if (!this.hasFocus) {
         this.focus();
      }

      const selection = this._window.getSelection();
      Assertion.assertNotNullOrUndefined(selection, 'selection')
      selection.removeAllRanges();

      const childNodes = this._element.childNodes;
      let range: Range | null = null
      if (childNodes.length === 0) {
         range = document.createRange();
         range.setStart(this._element, start);
         range.setEnd(this._element, end);
         selection.addRange(range);
      } else {
         let charCount = 0;
         for (let i = 0; i < childNodes.length; i++) {
            let node = childNodes[i];
            if (node.nodeType === 1 || node.nodeType === 3) {
               if (this.isContent(node)) {
                  let length = 1;
                  if (!this.isInlineWhithspace(node)) {
                     const text =
                        node.nodeType === 1
                           ? (node as HTMLElement).innerText
                           : node.nodeValue;
                     // length = text.trim().length;
                     length = text?.length ?? 0;
                  }

                  const containsStart =
                     start >= charCount && start <= charCount + length;
                  const containsEnd =
                     end >= charCount && end <= charCount + length;

                  if (containsStart || containsEnd) {
                     if (range === null) {
                        range = document.createRange();
                     }
                     if (node.nodeType === 1 && node.childNodes.length !== 0) {
                        node = node.childNodes[0];
                     }

                     if (containsStart && containsEnd) {
                        range.setStart(node, start - charCount);
                        range.setEnd(node, end - charCount);
                        break;
                     } else if (containsStart) {
                        range.setStart(node, start - charCount);
                     } else {
                        range.setEnd(node, end - charCount);
                        break;
                     }
                  }
                  charCount += length;
                  if (this.isNextBlock(node)) {
                     charCount++;
                  }
               }
            }
         }
         if (range !== null) {
            selection.addRange(range);
         }
      }
   }

   private isContent(node: Node): boolean {
      if (
         (node.nodeType === 3 && !/^\s+$/.test(node.nodeValue ?? '')) ||
         (node.nodeType === 1 && !/^\s+$/.test((node as HTMLElement).innerText))
      ) {
         return true;
      } else if (node.previousSibling === null || node.nextSibling === null) {
         return false;
      } else {
         return (
            !this.isBlock(node.nextSibling) && this.isContent(node.nextSibling)
         );
      }
   }

   private isBlock(node: Node): boolean {
      let isBlock = false;
      if (node.nodeType === 1) {
         if (node instanceof Element) {
            isBlock =
               this._window
                  .getComputedStyle(node)
                  .getPropertyValue('display') === 'block';
         }
      }
      return isBlock;
   }

   private isInlineWhithspace(node: Node): boolean {
      return (
         node.nodeType === 3 &&
         node.previousSibling !== null &&
         node.nextSibling !== null &&
         /^\s+$/.test(node.nodeValue ?? '') &&
         !this.isBlock(node.previousSibling) &&
         !this.isBlock(node.nextSibling)
      );
   }

   private isNextBlock(node: Node): boolean {
      if (node.nextSibling === null) {
         return false;
      } else if (node.nextSibling.nodeType === 3) {
         return (
            /^\s+$/.test(node.nextSibling.nodeValue ?? '') &&
            this.isNextBlock(node.nextSibling)
         );
      } else {
         return (
            this.isBlock(node.nextSibling) &&
            !/^\s+$/.test((node.nextSibling as HTMLElement).innerText)
         );
      }
   }
}
