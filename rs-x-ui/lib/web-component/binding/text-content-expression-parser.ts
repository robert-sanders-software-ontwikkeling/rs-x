import { Inject, Injectable } from '@rs-x/core';
import {
  AbstractExpression,
  ExpressionType,
  IExpression,
  IExpressionCache,
  RsXExpressionParserInjectionTokens,
  TemplateLiteralExpression,
} from '@rs-x/expression-parser';

import { ITextContentExpressionParser } from './interfaces';

@Injectable()
export class TextContentExpressionParser implements ITextContentExpressionParser {
   constructor(
      @Inject(RsXExpressionParserInjectionTokens.IExpressionCache)
      private readonly _expressionCache: IExpressionCache
   ) {}

   public parse(textContent: string | null): IExpression | null {
      const trimmed = (textContent ?? '').trim();
      if (!trimmed.length) {
         return null;
      }

      const segments: AbstractExpression[] = [];
      let startIndex = 0;
      let foundBinding = false;

      while (true) {
         const { start, end } = this.findBinding(startIndex, trimmed);

         if (start === -1 || end === -1) {
            if (foundBinding && startIndex < trimmed.length) {
               const trailing = trimmed.substring(startIndex).replace(/'/g, "\\'");
               segments.push(this.parseExpression(`'${trailing}'`));
            }
            break;
         }

         foundBinding = true;

         if (startIndex < start) {
            segments.push(this.parseExpression(`'${trimmed.substring(startIndex, start).replace(/'/g, "\\'")}'`));
         }

         const expressionString = trimmed.substring(start + 2, end).trim();
         segments.push(this.parseExpression(expressionString));

         startIndex = end + 2;
      }

      if (!foundBinding) {
         return null;
      }

      const templateString = this.buildTemplateString(segments);
      return new TemplateLiteralExpression(templateString, segments);
   }

   private parseExpression(expressionString: string): AbstractExpression {
      return this._expressionCache.create(expressionString).instance as unknown as AbstractExpression;
   }

   private buildTemplateString(segments: AbstractExpression[]): string {
      const inner = segments
         .map((s) =>
            s.type === ExpressionType.String
               ? s.expressionString
               : `\${${s.expressionString}}`,
         )
         .join('');
      return `\`${inner}\``;
   }

   private findBinding(
      startIndex: number,
      text: string
   ): { start: number; end: number } {
      const start = this.findDouble(startIndex, text, '[');
      const end = start !== -1 ? this.findDouble(start + 2, text, ']') : -1;
      return { start, end };
   }

   private findDouble(fromIndex: number, text: string, char: string): number {
      for (let i = fromIndex; i < text.length - 1; i++) {
         if (text[i] === char && text[i + 1] === char) {
            return i;
         }
      }
      return -1;
   }
}
