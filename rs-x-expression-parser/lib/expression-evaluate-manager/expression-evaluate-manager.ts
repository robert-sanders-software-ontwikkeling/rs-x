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

class EvaluateManagerForExpression
  implements IEvaluateManagerForExpression, IExpressionEvaluateChangeManager
{
  // Fast path: single evaluate unit is the common case — avoids array allocation.
  private _evaluateUnit: IExpressionEvaluateUnit | undefined;
  private _evaluateUnitsExtra: IExpressionEvaluateUnit[] | undefined;
  private _unresolvedCount = 0;
  private _initialized = false;
  private _bootstrapScheduled = false;
  private _reevaluateScheduled = false;
  private _statChangeCycleCount = 0;

  // Fast path: track a single dirty unit without allocating a Set.
  private _dirtyUnit: IExpressionEvaluateUnit | undefined;
  private _changedQueue: Set<IExpressionEvaluateUnit> | undefined;

  /**
   * Built during register(): maps a primary unit to the replica units that share
   * the same (context, index) pair within this expression manager. Used to fan
   * out watch change notifications without each replica registering its own listener.
   */
  private _primaryToReplicas:
    | Map<IExpressionEvaluateUnit, IExpressionEvaluateUnit[]>
    | undefined;

  /**
   * Temporary lookup used only during registration to find the existing primary
   * for a (context, index) pair. Cleared after initialize() to free memory.
   */
  private _contextIndexToPrimary:
    | Map<unknown, Map<unknown, IExpressionEvaluateUnit>>
    | undefined;

  private readonly _onCommitted = () => this.commit(true);

  public isInitialized(): boolean {
    return this._initialized;
  }

  public incrementChangeCycle(): void {
    this._statChangeCycleCount++;
  }

  public decrementChangeCycle(): void {
    this._statChangeCycleCount--;
    this.tryFlushQueue();
  }

  constructor(
    private readonly _expressionChangeTransactionManager: IExpressionChangeTransactionManager,
    private readonly commit: CommitHandler,
  ) {}

  public dispose(): void {
    this._evaluateUnit?.dispose();
    const extra = this._evaluateUnitsExtra;
    if (extra) {
      for (let i = 0; i < extra.length; i++) {
        extra[i].dispose();
      }
    }
    this._evaluateUnit = undefined;
    this._evaluateUnitsExtra = undefined;
    this._initialized = false;
    this._bootstrapScheduled = false;
    this._reevaluateScheduled = false;
    this._primaryToReplicas = undefined;
    this._contextIndexToPrimary = undefined;
  }

  public register(evaluateUnit: IExpressionEvaluateUnit): void {
    if (this._evaluateUnit === undefined) {
      this._evaluateUnit = evaluateUnit;
    } else {
      (this._evaluateUnitsExtra ??= []).push(evaluateUnit);
    }

    // Group units watching the same (context, index) so only the first (primary)
    // registers a watch listener; replicas receive changes via fan-out in markDirty.
    if (
      evaluateUnit.context !== undefined &&
      evaluateUnit.watchAsReplica !== undefined
    ) {
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

    // Fast path: single unit (common case).
    const unit0 = this._evaluateUnit;
    if (unit0 !== undefined) {
      replicaSet?.has(unit0) ? unit0.watchAsReplica!(this) : unit0.watch(this);
    }
    const extra = this._evaluateUnitsExtra;
    if (extra !== undefined) {
      for (let i = 0; i < extra.length; i++) {
        const unit = extra[i];
        replicaSet?.has(unit) ? unit.watchAsReplica!(this) : unit.watch(this);
      }
    }

    this.tryFlushQueue();
  }

  // public markDirty = (evaluateUnit: IExpressionEvaluateUnit): void => {
  //   // Fan out to replicas that share the same (context, index) as this primary unit.
  //   const replicas = this._primaryToReplicas?.get(evaluateUnit)
  //   if (replicas === undefined) {
  //     //If we alread have a dirty unit, we need to move to the queue to track multiple dirty units.
  //     if (this._dirtyUnit || !!this._changedQueue?.size) {
  //       const queue = (this._changedQueue ??= new Set());
  //       if (this._dirtyUnit) {
  //         queue.add(this._dirtyUnit);
  //         this._dirtyUnit = undefined;
  //       }
  //       queue.add(evaluateUnit);

  //     } else {
  //       // Fast path: no replicas — use single-unit dirty tracking.
  //       this._dirtyUnit = evaluateUnit;
  //     }

  //   } else {
  //     const queue = (this._changedQueue ??= new Set());

  //     queue.add(evaluateUnit);
  //     const newValue = evaluateUnit.value;
  //     for (let i = 0; i < replicas.length; i++) {
  //       replicas[i].applyChange!(newValue);
  //       queue.add(replicas[i]);
  //     }
  //   }

  //   this.tryFlushQueue();
  // };

  public markDirty = (evaluateUnit: IExpressionEvaluateUnit): void => {
    const replicas = this._primaryToReplicas?.get(evaluateUnit);

    // Fan out to replicas that share the same (context, index) as this primary unit.
    if (replicas === undefined) {
      if (this._dirtyUnit === undefined && !this._changedQueue?.size) {
        this._dirtyUnit = evaluateUnit;
      } else {
        const queue = this.getOrCreateChangedQueue();
        queue.add(evaluateUnit);
      }
    } else {
      const queue = this.getOrCreateChangedQueue();
      const newValue = evaluateUnit.value;

      queue.add(evaluateUnit);

      for (let i = 0; i < replicas.length; i++) {
        const replica = replicas[i];
        replica.applyChange!(newValue);
        queue.add(replica);
      }
    }

    this.tryFlushQueue();
  };

  private getOrCreateChangedQueue(): Set<IExpressionEvaluateUnit> {
    const queue = (this._changedQueue ??= new Set<IExpressionEvaluateUnit>());

    if (this._dirtyUnit !== undefined) {
      queue.add(this._dirtyUnit);
      this._dirtyUnit = undefined;
    }

    return queue;
  }

  private tryFlushQueue(): void {
    if (this._statChangeCycleCount !== 0) {
      return;
    }

    if (!this._initialized) {
      this.scheduleInitialize();
      return;
    }

    if (this._dirtyUnit !== undefined || (this._changedQueue?.size ?? 0) > 0) {
      this.scheduleReevaluate();
    }
  }

  private scheduleReevaluate(): void {
    if (this._reevaluateScheduled) {
      return;
    }

    this._reevaluateScheduled = true;
    this._expressionChangeTransactionManager.subscribeCommitted(
      this._onCommitted,
    );
    this._expressionChangeTransactionManager.suspend();
    this._expressionChangeTransactionManager.scheduleDirtyFlush(this);
  }

  public flush(): void {
    this._reevaluateScheduled = false;

    // Fast path: single dirty unit (most common case) — no Set needed.
    const dirtyUnit = this._dirtyUnit;
    if (dirtyUnit !== undefined) {
      this._dirtyUnit = undefined;
      if (dirtyUnit.isCommitReady()) {
        dirtyUnit.prepareForBatchEvaluate?.();
        dirtyUnit.commitChange();
      }
      this._expressionChangeTransactionManager.continue();
      return;
    }

    // Replica fan-out path: multiple dirty units.
    const queue = this._changedQueue;
    if (queue === undefined || queue.size === 0) {
      this._expressionChangeTransactionManager.continue();
      return;
    }

    // Phase 1: collect ready units.
    const readyUnits: IExpressionEvaluateUnit[] = [];
    for (const changed of queue.values()) {
      if (!changed.isCommitReady()) {
        continue;
      }
      readyUnits.push(changed);
      changed.prepareForBatchEvaluate?.();
      queue.delete(changed);
    }

    // Phase 2: commit each unit.
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
      this._dirtyUnit = undefined;
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
