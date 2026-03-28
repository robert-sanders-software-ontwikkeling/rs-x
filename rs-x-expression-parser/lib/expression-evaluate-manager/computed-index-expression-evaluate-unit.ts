import type { IIndexWatchRule, IWatchFactory } from '@rs-x/state-manager';

import { emptyFunction } from '../../../rs-x-core/lib';

import {
  type IExpressionEvaluateChangeManager,
  type IExpressionEvaluateUnit,
} from './expression-evaluate-unit.interface';
import { IdentifierExpressionEvaluateUnit } from './identifier-expression-evaluate-unit';

export class ComputedIndexExpressionEvaluateUnit implements IExpressionEvaluateUnit {
  public readonly count = 1;
  private _value: unknown;
  private _context: unknown;
  private _indexValue: unknown;
  private _isDipsosed = false;
  private _indexEvaluateUnit: IdentifierExpressionEvaluateUnit | undefined;
  private _changeManager!: IExpressionEvaluateChangeManager;
  private readonly _indexChangeManager: IExpressionEvaluateChangeManager;
  private _forceDirtyCommit = false;

  constructor(
    private readonly _watchFactory: IWatchFactory,
    private readonly _ownerId: unknown,
    private readonly _watchRule: IIndexWatchRule | undefined,
    private readonly _commit: (forceDirty?: boolean) => void,
  ) {
    this._indexChangeManager = {
      isInitialized: () => this._changeManager.isInitialized(),
      incrementChangeCycle: () => this._changeManager.incrementChangeCycle(),
      decrementChangeCycle: () => this._changeManager.decrementChangeCycle(),
      markDirty: () => {
        this._forceDirtyCommit =
          this._indexEvaluateUnit?.consumeForceDirtyCommit() ?? false;
        this._value = this._indexEvaluateUnit?.value;
        this._changeManager.markDirty(this);
      },
    };
  }

  public get value(): unknown {
    return this._value;
  }

  public get context(): unknown {
    return this._context;
  }

  public set context(value: unknown) {
    if (this._context === value) {
      return;
    }
    const previousValue = this._value;
    if (this._context !== undefined && this._indexValue !== undefined) {
      this.releaseState();
    }
    this._context = value;
    this._value = undefined;
    if (
      this._context !== undefined &&
      this._indexValue !== undefined &&
      this._changeManager
    ) {
      this.watch(this._changeManager);
      if (this._value !== undefined && !Object.is(previousValue, this._value)) {
        this._changeManager.markDirty(this);
      }
    }
  }

  public get index(): unknown {
    return this._indexValue;
  }

  public setIndex(indexValue: unknown): void {
    if (this._indexValue === indexValue) {
      return;
    }

    const previousValue = this._value;
    if (this._context !== undefined && this._indexValue !== undefined) {
      this.releaseState();
    }
    this._value = undefined;
    this._indexValue = indexValue;
    if (
      this._context !== undefined &&
      this._indexValue !== undefined &&
      this._changeManager
    ) {
      this.watch(this._changeManager);
      if (this._value !== undefined && !Object.is(previousValue, this._value)) {
        this._changeManager.markDirty(this);
      }
    }
  }

  public watch(changeManager: IExpressionEvaluateChangeManager): void {
    if (this._indexEvaluateUnit) {
      return;
    }
    this._changeManager = changeManager;
    if (this._context !== undefined && this._indexValue !== undefined) {
      this._indexEvaluateUnit = new IdentifierExpressionEvaluateUnit(
        this._indexValue,
        this.context,
        this._watchFactory,
        this._watchRule,
        emptyFunction,
        this._ownerId,
      );
      this._indexEvaluateUnit.watch(this._indexChangeManager);
      this._value = this._indexEvaluateUnit.value;
    }
  }

  public dispose(): void {
    if (this._isDipsosed) {
      return;
    }
    this._isDipsosed = true;
    this.releaseState();
  }

  public isCommitReady(): boolean {
    return true;
  }

  public commitChange(): void {
    if (this._value === undefined) {
      return;
    }
    const forceDirty = this._forceDirtyCommit;
    this._forceDirtyCommit = false;
    if (forceDirty) {
      this._commit(true);
      return;
    }
    this._commit();
  }

  private releaseState(): void {
    if (this._indexEvaluateUnit) {
      this._indexEvaluateUnit.dispose();
      this._indexEvaluateUnit = undefined;
    }
  }
}
