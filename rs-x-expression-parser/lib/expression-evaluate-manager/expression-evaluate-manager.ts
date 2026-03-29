import { Inject, Injectable, KeyedInstanceFactory } from '@rs-x/core';

import type { IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';
import { RsXExpressionParserInjectionTokens } from '../rs-x-expression-parser-injection-tokes';

import type {
  CommitHandler,
  IEvaluateManagerForExpression,
  IExpressionEvaluateManager,
} from './expression-evaluate-manager.interface';
import type {
  IExpressionEvaluateChangeManager,
  IExpressionEvaluateUnit,
} from './expression-evaluate-unit.interface';

class EvaluateManagerForExpression implements IEvaluateManagerForExpression {
  private readonly _evaluateUnits: IExpressionEvaluateUnit[] = [];
  private _unresolvedCount = 0;
  private _initialized = false;
  private _bootstrapScheduled = false;
  private _reevaluateScheduled = false;
  private _statChangeCycleCount = 0;

  private readonly _changeManager: IExpressionEvaluateChangeManager;

  private _changedQueue = new Set<IExpressionEvaluateUnit>();

  /**
   * Built during register(): maps a primary unit to the replica units that share
   * the same (context, index) pair within this expression manager. Used to fan
   * out watch change notifications without each replica registering its own listener.
   */
  private _primaryToReplicas: Map<IExpressionEvaluateUnit, IExpressionEvaluateUnit[]> | undefined;

  /**
   * Temporary lookup used only during registration to find the existing primary
   * for a (context, index) pair. Cleared after initialize() to free memory.
   */
  private _contextIndexToPrimary: Map<unknown, Map<unknown, IExpressionEvaluateUnit>> | undefined;

  private readonly _onCommitted = () => this.commit(true);

  constructor(
    private readonly _expressionChangeTransactionManager: IExpressionChangeTransactionManager,
    private readonly commit: CommitHandler,
  ) {
    this._changeManager = {
      isInitialized: () => this._initialized,
      incrementChangeCycle: () => this._statChangeCycleCount++,
      decrementChangeCycle: () => {
        this._statChangeCycleCount--;
        this.tryFlushQueue();
      },
      markDirty: this.markDirty,
    };
    // this._changedSubscription = stateManager.changed.subscribe(this.onChange);
    // this._contextChangedSubscription = stateManager.contextChanged.subscribe(
    //   this.onContextChanged,
    // );
    // this._startChangeCycleSubscription =
    //   stateManager.startChangeCycle.subscribe(this.onStartChangeCycle);
    // this._endChangeCycleSubscription = stateManager.endChangeCycle.subscribe(
    //   this.onEndChangeCycle,
    // );
  }

  public dispose(): void {
    this._evaluateUnits.forEach((evaluateUnit) => evaluateUnit.dispose());
    this._initialized = false;
    this._bootstrapScheduled = false;
    this._reevaluateScheduled = false;
    this._primaryToReplicas = undefined;
    this._contextIndexToPrimary = undefined;
  }

  public register(evaluateUnit: IExpressionEvaluateUnit): void {
    this._evaluateUnits.push(evaluateUnit);

    // Group units watching the same (context, index) so only the first (primary)
    // registers a watch listener; replicas receive changes via fan-out in markDirty.
    if (evaluateUnit.context !== undefined && evaluateUnit.watchAsReplica !== undefined) {
      const groups = (this._contextIndexToPrimary ??= new Map());
      let indexMap = groups.get(evaluateUnit.context);
      if (indexMap === undefined) {
        indexMap = new Map();
        groups.set(evaluateUnit.context, indexMap);
      }
      const existing = indexMap.get(evaluateUnit.index);
      if (existing === undefined) {
        indexMap.set(evaluateUnit.index, evaluateUnit); // this unit is the primary
      } else {
        // This unit is a replica — record it under its primary.
        const map = (this._primaryToReplicas ??= new Map());
        let replicas = map.get(existing);
        if (replicas === undefined) {
          replicas = [];
          map.set(existing, replicas);
        }
        replicas.push(evaluateUnit);
      }
    }
  }

  public initialize(): void {
    if (this._initialized) {
      return;
    }

    // Build a replica set for O(1) lookup, then drop the registration map.
    let replicaSet: Set<IExpressionEvaluateUnit> | undefined;
    if (this._primaryToReplicas !== undefined) {
      replicaSet = new Set();
      for (const replicas of this._primaryToReplicas.values()) {
        for (const r of replicas) {
          replicaSet.add(r);
        }
      }
    }
    this._contextIndexToPrimary = undefined;

    const evaluateUnits = this._evaluateUnits;
    for (let i = 0; i < evaluateUnits.length; i++) {
      const unit = evaluateUnits[i];
      if (replicaSet?.has(unit)) {
        unit.watchAsReplica!(this._changeManager);
      } else {
        unit.watch(this._changeManager);
      }
    }

    this.tryFlushQueue();
  }

  // private get evaluateUnitsCount(): number {
  //   if (this._evaluateUnitsCount === undefined) {
  //     this._evaluateUnitsCount = this._evaluateUnits.length;
  //   }
  //   return this._evaluateUnitsCount;
  // }

  // private onContextChanged = (contextChanged: IContextChanged) => {
  //   const evaluateUnits = this._evaluateUnits;
  //   for (let i = 0; i < evaluateUnits.length; i++) {
  //     evaluateUnits[i].setContext(
  //       contextChanged.context,
  //       contextChanged.oldContext,
  //       contextChanged.index,
  //     );
  //   }
  // };

  // private onStartChangeCycle = () => {
  //   this._statChangeCycleCount++;
  // };

  // private onEndChangeCycle = () => {
  //   this._statChangeCycleCount--;
  //   this.flushQueue();
  // };

  // private processChange(change: IStateChange): void {
  //   for (let i = 0; i < this._evaluateUnits.length; i++) {
  //     const evaluateUnit = this._evaluateUnits[i];

  //     const result = evaluateUnit.setValue(
  //       change.newValue,
  //       change.context,
  //       change.index,
  //       this._initialized,
  //     );
  //     if (result === null) {
  //       continue;
  //     }

  //     this._changedQueue.add(result);
  //   }
  // }

  private markDirty = (evaluateUnit: IExpressionEvaluateUnit) => {
    this._changedQueue.add(evaluateUnit);

    // Fan out to replicas that share the same (context, index) as this primary unit.
    const replicas = this._primaryToReplicas?.get(evaluateUnit);
    if (replicas !== undefined) {
      const newValue = evaluateUnit.value;
      for (let i = 0; i < replicas.length; i++) {
        replicas[i].applyChange!(newValue);
        this._changedQueue.add(replicas[i]);
      }
    }

    this.tryFlushQueue();
  };

  // private addChange(change: IStateChange): void {
  //   this.processChange(change);
  //   this.tryFlushQueue();
  // }

  private tryFlushQueue(): void {
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

  private scheduleReevaluate(): void {
    if (this._reevaluateScheduled) {
      return;
    }

    this._reevaluateScheduled = true;
    this._expressionChangeTransactionManager.subscribeCommitted(this._onCommitted);
    this._expressionChangeTransactionManager.suspend();
    this._expressionChangeTransactionManager.scheduleDirtyFlush(this);
  }

  public flush(): void {
    this._reevaluateScheduled = false;

    // Fast path: single dirty unit (most common case) — skip array allocation.
    if (this._changedQueue.size === 1) {
      const unit = this._changedQueue.values().next().value!;
      if (unit.isCommitReady()) {
        this._changedQueue.clear();
        unit.prepareForBatchEvaluate?.();
        unit.commitChange();
      }
      this._expressionChangeTransactionManager.continue();
      return;
    }

    // Phase 1: collect ready units and register ancestor pending counts so that
    // shared ancestor nodes wait for all dirty children before re-evaluating.
    const readyUnits: IExpressionEvaluateUnit[] = [];
    for (const changed of this._changedQueue.values()) {
      if (!changed.isCommitReady()) {
        continue;
      }
      readyUnits.push(changed);
      changed.prepareForBatchEvaluate?.();
      this._changedQueue.delete(changed);
    }

    // Phase 2: commit each unit — ancestors now evaluate only once all dirty
    // children have propagated their new values.
    for (let i = 0; i < readyUnits.length; i++) {
      readyUnits[i].commitChange();
    }

    this._expressionChangeTransactionManager.continue();
  }

  private scheduleInitialize(): void {
    if (this._bootstrapScheduled || this._initialized) {
      return;
    }

    this._bootstrapScheduled = true;
    queueMicrotask(() => {
      this._bootstrapScheduled = false;
      if (this._unresolvedCount !== 0 || this._initialized) {
        return;
      }

      this.commit(false);
      this._initialized = true;
      this.tryFlushQueue();
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
