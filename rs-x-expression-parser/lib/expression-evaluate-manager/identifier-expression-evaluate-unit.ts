import { Type } from '@rs-x/core';
import type { IIndexWatchRule, IStateManager } from '@rs-x/state-manager';
import { IndexWatchRule } from '@rs-x/state-manager';

import type {
  IExpressionEvaluateUnit,
  IWatchRegistrationKey,
} from './expression-evaluate-unit.interface';

export class IdentifierExpressionEvaluateUnit implements IExpressionEvaluateUnit {
  public readonly count = 1;
  private _value: unknown;
  private _context: unknown;
  private _watch = false;
  private _isDipsosed = false;
  private _indexwatchRule: IIndexWatchRule | undefined;

  constructor(
    public readonly index: unknown,
    context: unknown,
    private readonly _stateManager: IStateManager,
    private readonly _commit: (value: unknown) => void,
    private readonly _ownerId: unknown,
    private readonly _defaultIndexWatchRule?: IIndexWatchRule,
  ) {
    this.context = context;
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

    if (this._watch) {
      const oldContext = this._context;
      const hadContext = !Type.isNullOrUndefined(oldContext);
      const hasContext = !Type.isNullOrUndefined(value);
      this._context = value;

      if (hadContext && !hasContext) {
        this.releaseState(oldContext);
      }

      if (!hadContext && hasContext) {
        this.watch();
        this.syncValueFromState();
      }

      if (hadContext && hasContext) {
        this.releaseState(oldContext);
        this.watch();
        this.syncValueFromState();
      }
    } else {
      this._context = value;
    }
  }

  public dispose(): void {
    if (this._isDipsosed) {
      return;
    }
    this._isDipsosed = true;
    this.releaseState();
  }

  public watch(indexWatchRule?: IIndexWatchRule): unknown {
    this._watch = true;
    if (!this.context) {
      return undefined;
    }

    if (Type.isReadonlyProperty(this._context, this.index)) {
      this._value = this._stateManager.getState(this._context, this.index);
      return this._value;
    } else {
      this._indexwatchRule = indexWatchRule ?? this._defaultIndexWatchRule;
      if (indexWatchRule && this._defaultIndexWatchRule) {
        this._indexwatchRule = new IndexWatchRule(
          this._context,
          (index, target) => {
            return !!(
              indexWatchRule.test(index, target) ||
              this._defaultIndexWatchRule?.test(index, target)
            );
          },
        );
      }

      this._stateManager.watchState(this._context, this.index, {
        indexWatchRule: this._indexwatchRule,
        ownerId: this._ownerId,
      });

      this.syncValueFromState();
      return this._value;
    }
  }

  public clear(): void {
    this._value = undefined;
  }

  public setContext(
    context: unknown,
    oldContext: unknown,
    index: unknown,
  ): void {
    if (oldContext === this.context || this.index === index) {
      this.context = context;
    }
  }

  public isCommitReady(): boolean {
    return true;
  }

  public getWatchRegistrationKey(): IWatchRegistrationKey | undefined {
    if (Type.isNullOrUndefined(this._context)) {
      return undefined;
    }

    return {
      context: this._context,
      index: this.index,
    };
  }

  public setValue(
    value: unknown,
    context: unknown,
    index: unknown,
  ): IExpressionEvaluateUnit | null {
    if (context !== this.context || this.index !== index) {
      return null;
    }

    this.context = context;
    this._value = value;

    return this;
  }

  public commitChange(): void {
    if (this._value === undefined) {
      return;
    }

    this._commit(this._value);
  }

  private releaseState(context: unknown = this.context): void {
    this._stateManager.releaseState(context, this.index, this._indexwatchRule);
  }

  private syncValueFromState(): void {
    if (Type.isNullOrUndefined(this._context)) {
      this._value = undefined;
      return;
    }

    try {
      this._value = this._stateManager.getState(this._context, this.index);
    } catch {
      this._value = undefined;
    }
  }
}
