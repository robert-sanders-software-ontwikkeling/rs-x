import type { Expression, Program } from 'estree';
import { parseScript } from 'meriyah';

import { Injectable, ParserException } from '@rs-x/core';

export interface IJsExpressionAstParser {
  parse(expressionString: string): Expression;
}

@Injectable()
export class JsExpressionAstParser implements IJsExpressionAstParser {
  private static readonly _parseOptions = {
    next: true,
    ranges: true,
  } as const;

  public parse(expressionString: string): Expression {
    const program = parseScript(
      expressionString,
      JsExpressionAstParser._parseOptions,
    ) as unknown as Program;

    if (program.body.length === 0) {
      throw new ParserException(expressionString, 'Empty expression', 0);
    }

    if (program.body.length > 1) {
      throw new ParserException(
        expressionString,
        'Multiple expression are not supported',
        0,
      );
    }

    const statement = program.body[0];
    if (statement.type !== 'ExpressionStatement') {
      throw new ParserException(
        expressionString,
        `Unsupported expression type ${statement.type}`,
        0,
      );
    }

    return statement.expression;
  }
}
