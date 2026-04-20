import type { Expression } from 'estree';

import { Inject, Injectable, ParserException } from '@rs-x/core';

import { type AbstractExpression } from './expressions/abstract-expression';
import { type IExpressionParser } from './expressions/expression-parser.interface';
import { ExpressionTreeBuilder } from './expression-tree-builder';
import {
  type IJsExpressionAstParser,
  JsExpressionAstParser,
} from './js-expression-ast-parser';
import { RsXExpressionParserInjectionTokens } from './rs-x-expression-parser-injection-tokes';

@Injectable()
export class JsExpressionParser implements IExpressionParser {
  constructor(
    @Inject(RsXExpressionParserInjectionTokens.IJsExpressionAstParser)
    private readonly _jsExpressionAstParser: IJsExpressionAstParser = new JsExpressionAstParser(),
    @Inject(RsXExpressionParserInjectionTokens.IExpressionTreeBuilder)
    private readonly _expressionTreeBuilder: ExpressionTreeBuilder = new ExpressionTreeBuilder(),
  ) {}

  public parse(expressionString: string): AbstractExpression {
    try {
      const expressionAst = this._jsExpressionAstParser.parse(expressionString);
      return this._expressionTreeBuilder.parseAst(
        expressionAst,
        expressionString,
      );
    } catch (e) {
      if (e instanceof Error) {
        throw new ParserException(expressionString, e.message);
      }

      throw new ParserException(expressionString, String(e));
    }
  }

  public parseAst(
    expressionAst: Expression,
    expressionSource: string,
  ): AbstractExpression {
    return this._expressionTreeBuilder.parseAst(
      expressionAst,
      expressionSource,
    );
  }
}

export { JsEspreeExpressionParser } from './expression-tree-builder';
