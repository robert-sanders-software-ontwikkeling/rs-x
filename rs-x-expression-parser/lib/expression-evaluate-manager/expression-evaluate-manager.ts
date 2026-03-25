import { Subscription } from 'rxjs';

import { Inject, Injectable, KeyedInstanceFactory } from '@rs-x/core';
import {
  IContextChanged,
  type IStateChange,
  type IStateManager,
  RsXStateManagerInjectionTokens,
} from '@rs-x/state-manager';

import type { IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';
import { RsXExpressionParserInjectionTokens } from '../rs-x-expression-parser-injection-tokes';

import type {
  CommitHandler,
  IEvaluateManagerForExpression,
  IExpressionEvaluateManager,
} from './expression-evaluate-manager.interface';
import type { IExpressionEvaluateUnit } from './expression-evaluate-unit.interface';

class EvaluateManagerForExpression implements IEvaluateManagerForExpression {
  private readonly _evaluateUnits: IExpressionEvaluateUnit[] = [];
  private readonly _changedSubscription: Subscription;
  private readonly _contextChangedSubscription: Subscription;
  private readonly _startChangeCycleSubscription: Subscription;
  private readonly _endChangeCycleSubscription: Subscription;
  private _unresolvedCount = 0;
  private _initialized = false;
  private _bootstrapScheduled = false;
  private _reevaluateScheduled = false;
  private _statChangeCycleCount = 0;
  private _evaluateUnitsCount!: number;

  private _changedQueue = new Set<IExpressionEvaluateUnit>();

  constructor(
    private readonly _expressionChangeTransactionManager: IExpressionChangeTransactionManager,
    private readonly commit: CommitHandler,
    stateManager: IStateManager,
  ) {
    this._changedSubscription = stateManager.changed.subscribe(this.onChange);
    this._contextChangedSubscription = stateManager.contextChanged.subscribe(
      this.onContextChanged,
    );
    this._startChangeCycleSubscription =
      stateManager.startChangeCycle.subscribe(this.onStartChangeCycle);
    this._endChangeCycleSubscription = stateManager.endChangeCycle.subscribe(
      this.onEndChangeCycle,
    );
  }

  public dispose(): void {
    this._changedSubscription.unsubscribe();
    this._contextChangedSubscription.unsubscribe();
    this._startChangeCycleSubscription.unsubscribe();
    this._endChangeCycleSubscription.unsubscribe();

    this._evaluateUnits.forEach((evaluateUnit) => evaluateUnit.dispose());
    this._initialized = false;
    this._bootstrapScheduled = false;
    this._reevaluateScheduled = false;
  }

  public register(evaluateUnit: IExpressionEvaluateUnit): void {
    this._evaluateUnits.push(evaluateUnit);
  }

  public initialize(): void {
    if (this._initialized) {
      return;
    }

    const evaluateUnits = this._evaluateUnits;
    for (let i = 0; i < evaluateUnits.length; i++) {
      const evaluateUnit = evaluateUnits[i];
      const value = evaluateUnit.watch();

      if (value !== undefined) {
        this.addChange({
          context: evaluateUnit.context,
          oldContext: evaluateUnit.context,
          index: evaluateUnit.index,
          newValue: value,
          oldValue: undefined,
        });
      } else if (evaluateUnit.value !== undefined) {
        this._changedQueue.add(evaluateUnit);
      }
    }

    this.flushQueue();
  }

  private get evaluateUnitsCount(): number {
    if (this._evaluateUnitsCount === undefined) {
      this._evaluateUnitsCount = this._evaluateUnits.length;
    }
    return this._evaluateUnitsCount;
  }

  private onContextChanged = (contextChanged: IContextChanged) => {
    const evaluateUnits = this._evaluateUnits;
    for (let i = 0; i < evaluateUnits.length; i++) {
      evaluateUnits[i].setContext(
        contextChanged.context,
        contextChanged.oldContext,
        contextChanged.index,
      );
    }
  };

  private onStartChangeCycle = () => {
    this._statChangeCycleCount++;
  };

  private onEndChangeCycle = () => {
    this._statChangeCycleCount--;
    this.flushQueue();
  };

  private processChange(change: IStateChange): void {
    for (let i = 0; i < this._evaluateUnits.length; i++) {
      const evaluateUnit = this._evaluateUnits[i];

      const result = evaluateUnit.setValue(
        change.newValue,
        change.context,
        change.index,
        this._initialized,
      );
      if (result === null) {
        continue;
      }

      this._changedQueue.add(result);
    }
  }

  private addChange(change: IStateChange): void {
    this.processChange(change);
    this.flushQueue();
  }

  private flushQueue(): void {
    if (this._statChangeCycleCount !== 0) {
      return;
    }

    if (!this._initialized) {
      this.scheduleInitialize();
      return;
    }

    if (this._initialized && this._changedQueue.size > 0) {
      this.scheduleReevaluate();
    }
  }

  private readonly onChange = (change: IStateChange) => {
    this.addChange(change);
  };

  private scheduleReevaluate(): void {
    if (this._reevaluateScheduled) {
      return;
    }

    this._reevaluateScheduled = true;
    this._expressionChangeTransactionManager.subscribeCommitted(() =>
      this.commit(true),
    );
    this._expressionChangeTransactionManager.suspend();

    queueMicrotask(() => {
      this._reevaluateScheduled = false;

      for (const changed of this._changedQueue.values()) {
        if (!changed.isCommitReady()) {
          continue;
        }

        changed.commitChange();
        this._changedQueue.delete(changed);
      }
      this._expressionChangeTransactionManager.continue();
    });
  }

  private scheduleInitialize(): void {
    if (this._bootstrapScheduled || this._initialized) {
      return;
    }

    this._bootstrapScheduled = true;

    this._changedQueue.clear();
    queueMicrotask(() => {
      this._bootstrapScheduled = false;
      if (this._unresolvedCount !== 0 || this._initialized) {
        return;
      }

      this.commit(false);
      this._initialized = true;
    });
  }
}

@Injectable()
export class ExpressionEvaluateManager
  extends KeyedInstanceFactory<
    CommitHandler,
    CommitHandler,
    IEvaluateManagerForExpression
  >
  implements IExpressionEvaluateManager
{
  constructor(
    @Inject(RsXStateManagerInjectionTokens.IStateManager)
    private readonly _stateManager: IStateManager,
    @Inject(
      RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager,
    )
    private readonly _expressionChangeTransactionManager: IExpressionChangeTransactionManager,
  ) {
    super();
  }

  public override getId(commit: CommitHandler): CommitHandler {
    return commit;
  }

  protected override createInstance(
    commit: CommitHandler,
    _: CommitHandler,
  ): IEvaluateManagerForExpression {
    return new EvaluateManagerForExpression(
      this._expressionChangeTransactionManager,
      commit,
      this._stateManager,
    );
  }

  protected override createId(commit: CommitHandler): CommitHandler {
    return commit;
  }

  protected override releaseInstance(
    instance: IEvaluateManagerForExpression,
    _: CommitHandler,
  ): void {
    instance.dispose();
  }
}
