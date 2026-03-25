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
import type {
  IExpressionEvaluateUnit,
  IWatchRegistrationKey,
} from './expression-evaluate-unit.interface';

class EvaluateManagerForExpression implements IEvaluateManagerForExpression {
  // Sentinel used when a unit does not provide a dedicated watch-rule key.
  // This still allows deduplication by (context,index) without allocating
  // extra wrapper keys per unit.
  private static readonly _defaultWatchRuleKey = Symbol(
    'default-watch-rule-key',
  );
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

    // Performance optimization:
    // During bootstrap, many units in the same expression graph can target the
    // exact same (context,index) source. Re-running watch() for each one causes
    // repeated state-manager registrations and creates O(n) churn.
    //
    // We cache the first watcher per registration key and let subsequent units
    // reuse that already-watched value via setValue(...), avoiding duplicate
    // watchState() calls while preserving per-unit ownership/disposal semantics.
    let watchRegistrations:
      | Map<unknown, Map<unknown, Map<unknown, IExpressionEvaluateUnit>>>
      | undefined;

    const evaluateUnits = this._evaluateUnits;
    for (let i = 0; i < evaluateUnits.length; i++) {
      const evaluateUnit = evaluateUnits[i];

      const watchRegistrationKey = evaluateUnit.getWatchRegistrationKey?.();
      if (watchRegistrationKey && watchRegistrations) {
        const existingWatchRegistration = this.getWatchRegistration(
          watchRegistrations,
          watchRegistrationKey,
        );
        if (existingWatchRegistration) {
          if (existingWatchRegistration.value !== undefined) {
            evaluateUnit.setValue(
              existingWatchRegistration.value,
              watchRegistrationKey.context,
              watchRegistrationKey.index,
              false,
            );
          }
          continue;
        }
      }

      const value = evaluateUnit.watch();
      if (watchRegistrationKey) {
        watchRegistrations ??= new Map<
          unknown,
          Map<unknown, Map<unknown, IExpressionEvaluateUnit>>
        >();
        this.setWatchRegistration(
          watchRegistrations,
          watchRegistrationKey,
          evaluateUnit,
        );
      }

      if (value === undefined && evaluateUnit.value !== undefined) {
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

  // Lookup path for bootstrap watch dedupe.
  // Structure: context -> index -> watchRule -> unit
  // This keeps lookups O(1) while avoiding string key serialization.
  private getWatchRegistration(
    registrations: Map<
      unknown,
      Map<unknown, Map<unknown, IExpressionEvaluateUnit>>
    >,
    key: IWatchRegistrationKey,
  ): IExpressionEvaluateUnit | undefined {
    const indexRegistrations = registrations.get(key.context);
    const ruleRegistrations = indexRegistrations?.get(key.index);
    if (!ruleRegistrations) {
      return undefined;
    }
    return (
      ruleRegistrations.get(key.watchRule) ??
      ruleRegistrations.get(EvaluateManagerForExpression._defaultWatchRuleKey)
    );
  }

  // Stores the first unit that performs watch() for a given registration key.
  // Later equivalent units can reuse its observed value without re-registering.
  private setWatchRegistration(
    registrations: Map<
      unknown,
      Map<unknown, Map<unknown, IExpressionEvaluateUnit>>
    >,
    key: IWatchRegistrationKey,
    evaluateUnit: IExpressionEvaluateUnit,
  ): void {
    let indexRegistrations = registrations.get(key.context);
    if (!indexRegistrations) {
      indexRegistrations = new Map<
        unknown,
        Map<unknown, IExpressionEvaluateUnit>
      >();
      registrations.set(key.context, indexRegistrations);
    }

    let ruleRegistrations = indexRegistrations.get(key.index);
    if (!ruleRegistrations) {
      ruleRegistrations = new Map<unknown, IExpressionEvaluateUnit>();
      indexRegistrations.set(key.index, ruleRegistrations);
    }

    const ruleKey =
      key.watchRule ?? EvaluateManagerForExpression._defaultWatchRuleKey;
    if (!ruleRegistrations.has(ruleKey)) {
      ruleRegistrations.set(ruleKey, evaluateUnit);
    }
  }

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
