import { DomElement } from '../dom-element/dom-element';
import { IDomWindow } from '../dom-window';
import { IInputElement } from './input-element.interface';

export class InputElement implements IInputElement {
   constructor(
      private readonly _window: IDomWindow,
      private readonly _element: HTMLInputElement
   ) {}

   public get caretPosition(): number | null {
      this.focus();
      return this._element.selectionStart;
   }

   public set caretPosition(value: number) {
      this.focus();
      this.setSelectionRange(value, value);
   }

   public get selectionLength(): number {
      if(this._element.selectionEnd === null  || this._element.selectionStart === null) {
         return 0;
      }

      return Math.abs(
         this._element.selectionEnd - this._element.selectionStart
      );
   }

   public get hasFocus(): boolean {
      return this._element === document.activeElement;
   }

   public get value(): string {
      return this._element.value;
   }

   public set value(value: string) {
      this._element.value = value;
   }

   public setSelectionRange(start: number, end: number): void {
      if (new DomElement(this._window, this._element).isVisible) {
         this._element.focus();
         this._element.setSelectionRange(start, end);
      }
   }

   public focus(): void {
      this._element.focus();
   }

   public blur(): void {
      this._element.blur();
   }
}
