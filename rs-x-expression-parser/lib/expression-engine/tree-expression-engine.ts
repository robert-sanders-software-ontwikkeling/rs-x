import { Inject, Injectable } from '@rs-x/core';

import type { IExpressionParser } from '../expressions/expression-parser.interface';
import { RsXExpressionParserInjectionTokens } from '../rs-x-expression-parser-injection-tokes';

import type { ITreeExpressionEngine } from './expression-engine.interface';

@Injectable()
export class TreeExpressionEngine implements ITreeExpressionEngine {
  constructor(
    @Inject(RsXExpressionParserInjectionTokens.IExpressionParser)
    private readonly _expressionParser: IExpressionParser,
  ) {}

  public create(expressionString: string) {
    return this._expressionParser.parse(expressionString);
  }
}
