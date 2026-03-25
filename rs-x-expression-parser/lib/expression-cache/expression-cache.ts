import { Inject, Injectable, KeyedInstanceFactory } from '@rs-x/core';

import type {
  IExpression,
  IExpressionParser,
} from '../expressions/expression-parser.interface';
import { RsXExpressionParserInjectionTokens } from '../rs-x-expression-parser-injection-tokes';

import type { IExpressionCache } from './expression-cache.type';

@Injectable()
export class ExpressionCache
  extends KeyedInstanceFactory<string, string, IExpression>
  implements IExpressionCache
{
  private readonly _precompiledExpressions = new Map<string, IExpression>();

  constructor(
    @Inject(RsXExpressionParserInjectionTokens.IExpressionParser)
    private readonly _expressionParser: IExpressionParser,
  ) {
    super();
  }

  public registerExpressionTree(
    expressionString: string,
    expressionTree: IExpression,
  ): void {
    this._precompiledExpressions.set(expressionString, expressionTree);
  }

  public override getId(expressionString: string): string | undefined {
    return expressionString;
  }

  protected override createId(expressionString: string): string {
    return expressionString;
  }

  override create(data: string): {
    referenceCount: number;
    instance: IExpression<unknown, unknown>;
    id: string;
  } {
    const result = super.create(data);
    result.instance = result.instance.clone();
    return result;
  }

  protected override createInstance(
    expressionString: string,
  ): IExpression<unknown, unknown> {
    const precompiledExpression =
      this._precompiledExpressions.get(expressionString);
    if (precompiledExpression) {
      return precompiledExpression;
    }

    return this._expressionParser.parse(expressionString);
  }
}
