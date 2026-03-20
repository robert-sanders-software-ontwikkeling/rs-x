export interface IInputElement {
   caretPosition: number | null;
   selectionLength: number;
   hasFocus: boolean;
   value: string;
   setSelectionRange(start: number, end: number): void;
   focus(): void;
   blur(): void;
}
