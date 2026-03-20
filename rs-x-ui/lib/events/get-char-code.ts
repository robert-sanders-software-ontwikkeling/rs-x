import { KeyCode } from './key-code.enum';

const keyCodeShiftMapping = {
   [KeyCode.GraveAccent]: '~',
   [KeyCode.One]: '!',
   [KeyCode.Two]: '@',
   [KeyCode.Three]: '#',
   [KeyCode.Four]: '$',
   [KeyCode.Five]: '%',
   [KeyCode.Six]: '^',
   [KeyCode.Seven]: '&',
   [KeyCode.Eight]: '*',
   [KeyCode.Nine]: '(',
   [KeyCode.Zero]: ')',
   [KeyCode.Minus]: '_',
   [KeyCode.EqualSign]: '+',
   [KeyCode.OpenBrace]: '{',
   [KeyCode.CloseBrace]: '}',
   [KeyCode.SemiColon]: ':',
   [KeyCode.SingleQuote]: '"',
   [KeyCode.BackwardSlash]: '|',
   [KeyCode.Comma]: '<',
   [KeyCode.Period]: '>',
   [KeyCode.ForwardSlash]: '?',
};
export function getCharCode(e: KeyboardEvent): string {
   let code = e.which;
   // Ignore Shift Key events & arrows
   const ignoredCodes = {
      16: true,
      37: true,
      38: true,
      39: true,
      40: true,
      20: true,
      17: true,
      18: true,
      91: true,
   };
   if (ignoredCodes[code] === true) {
      return null;
   }

   if (e.shiftKey) {
      return keyCodeShiftMapping[code] ?? String.fromCharCode(code);
   }
   const exceptions = {
      186: 59, // ;
      187: 61, // =
      188: 44, // ,
      189: 45, // -
      190: 46, // .
      191: 47, // /
      192: 96, // `
      219: 91, // [
      220: 92, // \
      221: 93, // ]
      222: 39, // '
   };
   if (exceptions[code] !== undefined) {
      code = exceptions[code];
   }
   return String.fromCharCode(code);
}
