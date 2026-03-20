export class InvalidHtmlException extends Error {
   constructor(html, error: string) {
      super(`Invalid HTML ${html}. ${error}`);
   }
}
