import { InjectionContainer } from '@rs-x/core';
import {
  ExpressionType,
  IExpressionCache,
  RsXExpressionParserInjectionTokens,
  RsXExpressionParserModule,
  TemplateLiteralExpression,
  unloadRsXExpressionParserModule,
} from '@rs-x/expression-parser';

import { TextContentExpressionParser } from '../../../lib/web-component/binding/text-content-expression-parser';

describe('TextContentExpressionParser', () => {
   let parser: TextContentExpressionParser;

   beforeAll(async () => {
      await InjectionContainer.load(RsXExpressionParserModule);
   });

   afterAll(async () => {
      await unloadRsXExpressionParserModule();
   });

   beforeEach(() => {
      parser = new TextContentExpressionParser(
         InjectionContainer.get<IExpressionCache>(
            RsXExpressionParserInjectionTokens.IExpressionCache
         )
      );
   });

   describe('returns null', () => {
      it('for empty text', () => {
         expect(parser.parse('')).toBeNull();
      });

      it('for null', () => {
         expect(parser.parse(null)).toBeNull();
      });

      it('for whitespace only', () => {
         expect(parser.parse('   ')).toBeNull();
      });

      it('for plain text without bindings', () => {
         expect(parser.parse('just plain text')).toBeNull();
      });

      it('for unclosed binding', () => {
         expect(parser.parse('[[value1')).toBeNull();
      });
   });

   describe('single binding', () => {
      it('returns a TemplateLiteralExpression', () => {
         const result = parser.parse('[[value1]]');
         expect(result).toBeInstanceOf(TemplateLiteralExpression);
      });

      it('trims whitespace inside binding brackets', () => {
         const result = parser.parse('[[ value1 ]]')!;
         expect(result.expressionString).toBe('`${value1}`');
      });

      it('has one child of identifier type', () => {
         const result = parser.parse('[[value1]]')!;
         expect(result.childExpressions).toHaveLength(1);
         expect(result.childExpressions[0].type).toBe(ExpressionType.Identifier);
      });

      it('supports member expressions', () => {
         const result = parser.parse('[[now.year]]')!;
         expect(result.expressionString).toBe('`${now.year}`');
      });
   });

   describe('text prefix + binding', () => {
      it('produces correct expression string', () => {
         const result = parser.parse('hello [[name]]')!;
         expect(result.expressionString).toBe('`hello ${name}`');
      });

      it('has two children: string then identifier', () => {
         const result = parser.parse('hello [[name]]')!;
         expect(result.childExpressions).toHaveLength(2);
         expect(result.childExpressions[0].type).toBe(ExpressionType.String);
         expect(result.childExpressions[1].type).toBe(ExpressionType.Identifier);
      });
   });

   describe('binding + text suffix', () => {
      it('produces correct expression string', () => {
         const result = parser.parse('[[name]] hello')!;
         expect(result.expressionString).toBe('`${name} hello`');
      });

      it('has two children: identifier then string', () => {
         const result = parser.parse('[[name]] hello')!;
         expect(result.childExpressions).toHaveLength(2);
         expect(result.childExpressions[0].type).toBe(ExpressionType.Identifier);
         expect(result.childExpressions[1].type).toBe(ExpressionType.String);
      });
   });

   describe('text prefix + binding + text suffix', () => {
      it('produces correct expression string', () => {
         const result = parser.parse('hi [[value1]] hallo')!;
         expect(result.expressionString).toBe('`hi ${value1} hallo`');
      });

      it('has three children: string, identifier, string', () => {
         const result = parser.parse('hi [[value1]] hallo')!;
         expect(result.childExpressions).toHaveLength(3);
         expect(result.childExpressions[0].type).toBe(ExpressionType.String);
         expect(result.childExpressions[1].type).toBe(ExpressionType.Identifier);
         expect(result.childExpressions[2].type).toBe(ExpressionType.String);
      });
   });

   describe('multiple bindings', () => {
      it('produces correct expression string', () => {
         const result = parser.parse('hi [[value1]] hallo [[value2]]hu')!;
         expect(result.expressionString).toBe('`hi ${value1} hallo ${value2}hu`');
      });

      it('has five children in correct order', () => {
         const result = parser.parse('hi [[value1]] hallo [[value2]]hu')!;
         expect(result.childExpressions).toHaveLength(5);
         expect(result.childExpressions[0].type).toBe(ExpressionType.String);
         expect(result.childExpressions[1].type).toBe(ExpressionType.Identifier);
         expect(result.childExpressions[2].type).toBe(ExpressionType.String);
         expect(result.childExpressions[3].type).toBe(ExpressionType.Identifier);
         expect(result.childExpressions[4].type).toBe(ExpressionType.String);
      });

      it('say hello example from docs', () => {
         const result = parser.parse('Say hello to [[name]] and ask him what year it is today [[now.year]]')!;
         expect(result).toBeInstanceOf(TemplateLiteralExpression);
         expect(result.expressionString).toBe('`Say hello to ${name} and ask him what year it is today ${now.year}`');
         expect(result.childExpressions).toHaveLength(4);
      });
   });
});
