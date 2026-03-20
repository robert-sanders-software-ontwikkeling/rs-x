import { IDomWindow } from '../dom-window';
import { IInputElement } from '../input-element/input-element.interface';
import { ContentEditableCaret } from './content-editable-caret';

export class ContentEditableElement implements IInputElement {
   private _caret: ContentEditableCaret;

   constructor(
      window: IDomWindow,
      private readonly _element: HTMLElement
   ) {
      this._caret = new ContentEditableCaret(window, this._element);
   }

   public get caretPosition(): number {
      return this._caret.position;
   }

   public set caretPosition(value: number) {
      this._caret.position = value;
   }

   public get selectionLength(): number {
      return this._caret.selectionLength;
   }

   public get hasFocus(): boolean {
      return this._caret.hasFocus;
   }

   public get value(): string {
      return this._element.innerHTML;
   }

   public set value(value: string) {
      this._element.innerHTML = value;
   }

   public setSelectionRange(start: number, end: number): void {
      this._caret.setSelectionRange(start, end);
   }

   public focus(): void {
      this._caret.focus();
   }

   public blur(): void {
      this._caret.blur();
   }
}
