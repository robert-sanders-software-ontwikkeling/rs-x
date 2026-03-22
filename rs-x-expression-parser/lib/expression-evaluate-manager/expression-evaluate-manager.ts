import { Inject, Injectable, KeyedInstanceFactory } from '@rs-x/core';
import {
  type IStateChange,
  type IStateManager,
  RsXStateManagerInjectionTokens,
} from '@rs-x/state-manager';
import { Subscription } from 'rxjs';

import type { IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';
import { RsXExpressionParserInjectionTokens } from '../rs-x-expression-parser-injection-tokes';

import type { IExpressionEvaluateManager } from './expression-evaluate-manager.interface';
import type { IExpressionEvaluateUnit } from './expression-evaluate-unit.interface';
import { ValueChange } from './value-change.enum';

class EvaluateManagerForExpression {
  private readonly _evaluateUnits: IExpressionEvaluateUnit[] = [];
  private readonly _onChangedSubscription: Subscription;
  private _unresolvedCount = 0;
  private _initialized = false;
  private _bootstrapScheduled = false;
  private _reevaluateScheduled = false;

  constructor(
    private readonly _expressionChangeTransactionManager: IExpressionChangeTransactionManager,
    private readonly evaluate: () => void,
    stateManager: IStateManager,
  ) {
    this._onChangedSubscription = stateManager.changed.subscribe(this.onChange);
  }

  public dispose(): void {
    this._onChangedSubscription.unsubscribe();

    this._evaluateUnits.forEach((evaluateUnit) => evaluateUnit.dispose());
    this._unresolvedCount = 0;
    this._initialized = false;
    this._bootstrapScheduled = false;
    this._reevaluateScheduled = false;
  }

  public register(evaluateUnit: IExpressionEvaluateUnit): void {
    this._evaluateUnits.push(evaluateUnit);
  }

  private readonly onChange = (change: IStateChange) => {
    const changed: IExpressionEvaluateUnit[] = [];
    for (let i = 0; i < this._evaluateUnits.length; i++) {
      const status = this._evaluateUnits[i].setValue(
        change.newValue,
        change.context,
        change.index,
      );

      if (
        status === ValueChange.Changed ||
        status === ValueChange.Initialized
      ) {
        changed.push(this._evaluateUnits[i]);
      }
    }

    if (!this._initialized && changed.length === this._evaluateUnits.length) {
      if (this._unresolvedCount === 0) {
        this.scheduleEvaluate();
      }
      return;
    }

    if (this._initialized && changed.length > 0) {
      this.scheduleReevaluate(changed);
    }
  };

  private scheduleReevaluate(changed: IExpressionEvaluateUnit[]): void {
    if (this._reevaluateScheduled) {
      return;
    }

    this._reevaluateScheduled = true;

    queueMicrotask(() => {
      this._reevaluateScheduled = false;

      this._expressionChangeTransactionManager.suspend();

      for (let i = 0; i < changed.length; i++) {
        changed[i].commit();
      }

      this._expressionChangeTransactionManager.continue();
    });
  }

  private scheduleEvaluate(): void {
    if (this._bootstrapScheduled || this._initialized) {
      return;
    }

    this._bootstrapScheduled = true;

    queueMicrotask(() => {
      this._bootstrapScheduled = false;
      if (this._unresolvedCount !== 0 || this._initialized) {
        return;
      }

      this.evaluate();
      this._initialized = true;
    });
  }
}

@Injectable()
export class ExpressionEvaluateManager extends KeyedInstanceFactory<
  () => void,
  () => void,
  EvaluateManagerForExpression
> implements IExpressionEvaluateManager {
  constructor(
    @Inject(RsXStateManagerInjectionTokens.IStateManager)
    private readonly _stateManager: IStateManager,
    @Inject(RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager)
    private readonly _expressionChangeTransactionManager: IExpressionChangeTransactionManager,
  ) {
    super();
  }

  public override getId(evaluate: () => void): () => void {
    return evaluate;
  }

  protected override createInstance(
    evaluate: () => void,
    _id: () => void,
  ): EvaluateManagerForExpression {
    return new EvaluateManagerForExpression(
      this._expressionChangeTransactionManager,
      evaluate,
      this._stateManager,
    );
  }

  protected override createId(evaluate: () => void): () => void {
    return evaluate;
  }

  protected override releaseInstance(
    instance: EvaluateManagerForExpression,
    _id: () => void,
  ): void {
    instance.dispose();
  }
}
