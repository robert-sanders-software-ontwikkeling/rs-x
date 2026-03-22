import { Inject, Injectable } from '@rs-x/core';
import {
  type IIndexWatchRule,
  type IStateManager,
  RsXStateManagerInjectionTokens,
} from '@rs-x/state-manager';

import { FunctionExpressionEvaluateUnit } from './function-expression-evaluate-unit';
import type { IExpressionEvaluateUnitFactory } from './expression-evaluate-unit-factory.interface';
import type { IExpressionEvaluateUnit } from './expression-evaluate-unit.interface';
import type { IFunctionExpressionEvaluateUnitOptions } from './function-expression-evaluate-unit-options.interface';
import { IdentifierExpressionEvaluateUnit } from './identifier-expression-evaluate-unit';
import { MemberExpressionEvaluateUnit } from './member-expression-evaluate-unit';

@Injectable()
export class ExpressionEvaluateUnitFactory implements IExpressionEvaluateUnitFactory {
  constructor(
    @Inject(RsXStateManagerInjectionTokens.IStateManager)
    private readonly _stateManager: IStateManager,
  ) {}

  public createIdentifier(
    index: unknown,
    context: unknown,
    commit: (value: unknown) => void,
    indexWatchRule?: IIndexWatchRule,
  ): IExpressionEvaluateUnit {
    return new IdentifierExpressionEvaluateUnit(
      index,
      context,
      this._stateManager,
      commit,
      indexWatchRule,
    );
  }

  public createMember(
    index: unknown,
    segments: IExpressionEvaluateUnit[],
  ): IExpressionEvaluateUnit {
    return new MemberExpressionEvaluateUnit(index, segments);
  }

  public createFunction(
    options: IFunctionExpressionEvaluateUnitOptions,
  ): IExpressionEvaluateUnit {
    return new FunctionExpressionEvaluateUnit(
      options.index,
      options.context,
      options.objectExpressionUnit,
      options.functionExpressionUnit,
      options.argumentsExpressionUnit,
      options.commit,
    );
  }
}
