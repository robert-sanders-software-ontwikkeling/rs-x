import { Inject, Injectable, SingletonFactory } from '@rs-x/core';

import type { IExpressionCache } from '../expression-cache';
import type { IExpressionServices } from '../expression-services/expression-services.interface';
import type { IExpression } from '../expressions/expression-parser.interface';
import { RsXExpressionParserInjectionTokens } from '../rs-x-expression-parser-injection-tokes';

import type {
  IExpressionData,
  IExpressionForContextManager,
  IExpressionIdData,
  IExpressionManager,
} from './expression-manager.type';

class ExpressionForContextManager
  extends SingletonFactory<
    string,
    IExpressionData,
    IExpression,
    IExpressionIdData
  >
  implements IExpressionForContextManager
{
  constructor(
    private readonly _expressionCache: IExpressionCache,
    private readonly _services: IExpressionServices,
    private readonly _context: object,
    private readonly releaseContext: () => void,
  ) {
    super();
  }

  public override getId(expressionIdData: IExpressionIdData): string {
    return expressionIdData.expressionString;
  }

  protected override createId(expressionIdData: IExpressionIdData): string {
    // Ideally, we would normalize the expression string here to avoid duplicates caused by whitespace differences.
    // However, this is a complex task that requires parsing the expression, which is not feasible in this context.
    // Normalization would also need to be fast; otherwise, it defeats the purpose of caching.

    return expressionIdData.expressionString;
  }

  override create(expressionData: IExpressionData): {
    referenceCount: number;
    instance: IExpression<unknown, unknown>;
    id: string;
  } {
    const result = super.create(expressionData);

    result.instance.bind({
      rootContext: this._context,
      services: this._services,
      owner: {
        release: () => {
          this.release(result.id);
          this._expressionCache.release(result.id);
        },
        canDispose: () => this.getReferenceCount(result.id) === 1,
      },
      leafIndexWatchRule: expressionData.leafIndexWatchRule,
    });
    this._services.transactionManager.commit();

    return result;
  }

  protected override onReleased(): void {
    this.releaseContext();
  }

  protected override createInstance(
    expressionData: IExpressionData,
  ): IExpression {
    return this._expressionCache.create(expressionData.expressionString)
      .instance;
  }
}

@Injectable()
export class ExpressionManager
  extends SingletonFactory<object, object, IExpressionForContextManager>
  implements IExpressionManager
{
  public override getId(context: object): object {
    return this.createId(context);
  }
  protected override createId(context: object): object {
    return context;
  }
  constructor(
    @Inject(RsXExpressionParserInjectionTokens.IExpressionCache)
    private readonly _expressionCache: IExpressionCache,
    @Inject(RsXExpressionParserInjectionTokens.IExpressionServices)
    private readonly _services: IExpressionServices,
  ) {
    super();
  }

  protected createInstance(
    context: object,
    id: object,
  ): IExpressionForContextManager {
    return new ExpressionForContextManager(
      this._expressionCache,
      this._services,
      context,
      () => this.release(id),
    );
  }
}
