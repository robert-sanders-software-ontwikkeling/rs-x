import { Observable, Subject } from 'rxjs';

import {
  Assertion,
  type IChainPart,
  type IEqualityService,
  type IErrorLog,
  type IGuidFactory,
  type IIndexValueAccessor,
  Inject,
  Injectable,
  type IPropertyChange,
  PENDING,
  RsXCoreInjectionTokens,
  truePredicate,
} from '@rs-x/core';

import type { IIndexWatchRule } from '../index-watch-rule-registry/index-watch-rule.interface';
import type { IObjectPropertyObserverProxyPairManager } from '../object-property-observer-proxy-pair-manager.type';
import { RsXStateManagerInjectionTokens } from '../rs-x-state-manager-injection-tokens';

import { StateChangeSubscriptionManager } from './state-change-subscription-manager/state-change-subsription-manager';
import type { IObjectStateManager } from './object-state-manager.interface';
import type {
  IContextChanged,
  IStateChange,
  IStateManager,
  IStateOptions,
} from './state-manager.interface';

interface ITransferedValue {
  value: unknown;
  context: unknown;
  shouldEmitChange?: (context: unknown, index: unknown) => boolean;
}

type EmittedPair = readonly [unknown, unknown];

interface IChainPartChange extends IChainPart {
  oldValue: unknown;
  value: unknown;
}

@Injectable()
export class StateManager implements IStateManager {
  private readonly _changed = new Subject<IStateChange>();
  private readonly _contextChanged = new Subject<IContextChanged>();
  private readonly _startChangeCycle = new Subject<void>();
  private readonly _endChangeCycle = new Subject<void>();
  private readonly _stateChangeSubscriptionManager: StateChangeSubscriptionManager;
  private readonly _pending = new Map<unknown, unknown>();

  constructor(
    @Inject(
      RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager,
    )
    objectObserverManager: IObjectPropertyObserverProxyPairManager,
    @Inject(RsXStateManagerInjectionTokens.IObjectStateManager)
    private readonly _objectStateManager: IObjectStateManager,
    @Inject(RsXCoreInjectionTokens.IErrorLog)
    errorLog: IErrorLog,
    @Inject(RsXCoreInjectionTokens.IGuidFactory)
    guidFactory: IGuidFactory,
    @Inject(RsXCoreInjectionTokens.IIndexValueAccessor)
    private readonly _indexValueAccessor: IIndexValueAccessor,
    @Inject(RsXCoreInjectionTokens.IEqualityService)
    private readonly _equalityService: IEqualityService,
  ) {
    this._stateChangeSubscriptionManager = new StateChangeSubscriptionManager(
      objectObserverManager,
      errorLog,
      guidFactory,
    );
  }

  public get changed(): Observable<IStateChange> {
    return this._changed;
  }

  public get contextChanged(): Observable<IContextChanged> {
    return this._contextChanged;
  }

  public get startChangeCycle(): Observable<void> {
    return this._startChangeCycle;
  }

  public get endChangeCycle(): Observable<void> {
    return this._endChangeCycle;
  }

  public toString(): string {
    return this._objectStateManager.toString();
  }

  [Symbol.for('nodejs.util.inspect.custom')]() {
    return `${this.constructor.name}`;
  }

  public isWatched(
    context: unknown,
    index: unknown,
    indexWatchRule?: IIndexWatchRule,
  ): boolean {
    const stateChangeSubscriptionsForContextManager =
      this._stateChangeSubscriptionManager.getFromId(context);

    if (!stateChangeSubscriptionsForContextManager) {
      return false;
    }

    const id = stateChangeSubscriptionsForContextManager.getId({
      index: index,
      indexWatchRule,
    });
    return id ? stateChangeSubscriptionsForContextManager.has(id) : false;
  }

  public watchState(
    context: unknown,
    index: unknown,
    options?: IStateOptions,
  ): unknown {
    if (!this.isWatched(context, index, options?.indexWatchRule)) {
      const value = this.getState(context, index);
      this.tryToSubscribeToChange(
        context,
        index,
        options?.ownerId,
        options?.indexWatchRule,
      );
      return value;
    } else {
      return this.increaseStateReferenceCount(
        context,
        index,
        true,
        options?.ownerId,
      );
    }
  }

  public releaseState(
    context: unknown,
    index: unknown,
    indexWatchRule?: IIndexWatchRule,
  ): void {
    if (!this._objectStateManager.getFromId(context)?.has(index)) {
      return;
    }

    this.internalUnregister(context, index, indexWatchRule);
  }

  public clear(): void {
    this._stateChangeSubscriptionManager.dispose();
    this._objectStateManager.dispose();
  }

  public getState<T>(context: unknown, index: unknown): T {
    return this._objectStateManager.getFromId(context)?.getFromId(index)
      ?.value as T;
  }

  public setState<T>(
    context: unknown,
    index: unknown,
    value: T,
    ownerId: unknown,
  ): void {
    this.internalSetState(
      context,
      index,
      value,
      {
        context,
        value: this.getState(context, index),
        shouldEmitChange: truePredicate,
      },
      ownerId,
    );
  }

  private internalSetState(
    context: unknown,
    index: unknown,
    value: unknown,
    transferValue: ITransferedValue,
    ownerId: unknown | undefined,
  ) {
    this.tryRebindingNestedState(value, transferValue.value, ownerId);
    this._objectStateManager.replaceState(
      index,
      context,
      value,
      transferValue.context,
      false,
      ownerId,
    );
    if (
      !transferValue?.shouldEmitChange ||
      transferValue.shouldEmitChange(context, index)
    ) {
      this.emitChange(
        context,
        index,
        value,
        transferValue.value,
        transferValue.context,
      );
    }
  }

  private getOldValue(context: unknown, index: unknown): unknown {
    return this._objectStateManager.getFromId(context)?.getFromId(index)
      ?.valueCopy;
  }

  private unnsubscribeToObserverEvents(
    context: unknown,
    index: unknown,
    indexWatchRule?: IIndexWatchRule | undefined,
  ): void {
    const subscriptionsForKey =
      this._stateChangeSubscriptionManager.getFromId(context);
    const observer = subscriptionsForKey?.getFromData({
      index: index,
      indexWatchRule,
    });
    if (!observer) {
      return;
    }

    observer.dispose();
  }

  private internalUnregister(
    context: unknown,
    index: unknown,
    indexWatchRule?: IIndexWatchRule | undefined,
  ): void {
    if (this.canReleaseState(context, index)) {
      this.unnsubscribeToObserverEvents(context, index, indexWatchRule);
    }
  }

  private emitChange(
    context: unknown,
    index: unknown,
    newValue: unknown,
    oldValue: unknown,
    oldContext?: unknown,
  ): void {
    if (this._equalityService.isEqual(newValue, oldValue)) {
      return;
    }
    this._changed.next({
      oldContext: oldContext ?? context,
      context,
      index: index,
      oldValue,
      newValue,
    });
  }

  private updateState(
    newContext: unknown,
    oldContext: unknown,
    index: unknown,
    newValue: unknown,
    watched: boolean,
    ownerId: unknown,
  ): void {
    this._objectStateManager.replaceState(
      index,
      newContext,
      newValue,
      oldContext,
      watched,
      ownerId,
    );
  }

  private canReleaseState(context: unknown, key: unknown): boolean {
    return (
      this._objectStateManager.getFromId(context)?.release(key)
        .referenceCount === 0
    );
  }

  private increaseStateReferenceCount(
    context: unknown,
    index: unknown,
    watched: boolean,
    ownerId: unknown,
  ): unknown {
    const state = this.getState(context, index);
    this._objectStateManager
      .create(context)
      .instance.create({ value: state, key: index, watched, ownerId });
    return state;
  }

  private tryToSubscribeToChange(
    context: unknown,
    index: unknown,
    ownerId: unknown,
    indexWatchRule?: IIndexWatchRule,
    transferedValue?: ITransferedValue,
  ): void {
    this._stateChangeSubscriptionManager.create(context).instance.create({
      index: index,
      indexWatchRule,
      onChanged: (change) => this.onChange(change, true, ownerId),
      init: (observer) => {
        if (observer.value !== undefined) {
          this.setInitialValue(
            context,
            index,
            observer.value,
            transferedValue,
            true,
            ownerId,
          );
        }
        observer.init();
      },
    });
  }

  private getValue(context: unknown, key: unknown): unknown {
    try {
      return this._indexValueAccessor.getResolvedValue(context, key);
    } catch {
      return this.getState(context, key);
    }
  }

  private getStateChanges(
    oldContext: unknown,
    newContext: unknown,
    parentOwnerId: unknown,
  ): IStateChange[] {
    const oldState = this._objectStateManager.getFromId(oldContext);
    if (!oldState) {
      return [];
    }

    return Array.from(oldState.ids())
      .map((index) => {
        const {
          value: oldValue,
          watched,
          ownerId,
        } = oldState.getFromId(index) ?? {};

        if (ownerId !== parentOwnerId) {
          return [];
        }
        const newValue = this.getValue(newContext, index);

        if (
          oldContext === newContext &&
          this._equalityService.isEqual(oldValue, newValue)
        ) {
          return [];
        }

        if (newValue === PENDING) {
          this._pending.set(newContext, oldValue);
        }
        const stateInfo: IStateChange = {
          oldContext,
          context: newContext,
          index,
          oldValue,
          newValue: newValue,
          watched,
        };
        return newValue === PENDING
          ? [stateInfo]
          : [stateInfo, ...this.getStateChanges(oldValue, newValue, ownerId)];
      })
      .reduce((a, b) => a.concat(b), []);
  }

  private tryRebindingNestedState(
    newValue: unknown,
    oldValue: unknown,
    ownerId: unknown,
  ): void {
    const stateChanges = this.getStateChanges(oldValue, newValue, ownerId);
    if (stateChanges.length === 0) {
      return;
    }

    const emitted: EmittedPair[] = [];

    const shouldEmitChange = (context: unknown, index: unknown): boolean => {
      if (emitted.some(([c, i]) => c === context && i === index)) {
        return false;
      }
      emitted.push([context, index]);
      return true;
    };

    for (const stateChange of stateChanges) {
      Assertion.assert(
        () => stateChange.context !== stateChange.oldContext,
        'Expected old and new context not to be equal',
      );

      this._contextChanged.next({
        context: stateChange.context,
        oldContext: stateChange.oldContext,
        index: stateChange.index,
      });

      if (!stateChange.watched) {
        this.internalUnregister(
          stateChange.oldContext,
          stateChange.index,
          undefined,
        );
        this.internalSetState(
          stateChange.context,
          stateChange.index,
          stateChange.newValue,
          {
            context: stateChange.oldContext,
            value: stateChange.oldValue,
          },
          ownerId,
        );
        continue;
      }

      const instanceGroupInfos =
        this._stateChangeSubscriptionManager.instanceGroupInfoEntriesForContext(
          stateChange.oldContext,
        );

      const rebindingOptions = {
        context: stateChange.oldContext,
        value: stateChange.oldValue,
        shouldEmitChange,
      };

      for (const { groupMemberId } of instanceGroupInfos) {
        const indexWatchRule = groupMemberId as IIndexWatchRule;

        this.internalUnregister(
          stateChange.oldContext,
          stateChange.index,
          indexWatchRule,
        );

        if (indexWatchRule) {
          indexWatchRule.context = stateChange.context;
        }

        this.tryToSubscribeToChange(
          stateChange.context,
          stateChange.index,
          ownerId,
          indexWatchRule,
          rebindingOptions,
        );
      }
    }
  }
  private setInitialValue(
    context: unknown,
    index: unknown,
    initialValue: unknown,
    transferedValue: ITransferedValue | undefined,
    watched: boolean,
    ownerId: unknown,
  ): void {
    this.updateState(
      context,
      transferedValue?.context ?? context,
      index,
      initialValue,
      watched,
      ownerId,
    );
    if (
      !transferedValue?.shouldEmitChange ||
      transferedValue.shouldEmitChange(context, index)
    ) {
      this.emitChange(
        context,
        index,
        initialValue,
        transferedValue?.value,
        transferedValue?.context,
      );
    }
  }

  private getChainChanges(chain: IChainPart[] | undefined): IChainPartChange[] {
    if (!chain) {
      return [];
    }

    const registeredChainParts = chain.filter((chainPart) =>
      this._stateChangeSubscriptionManager.isRegistered(
        chainPart.context,
        chainPart.index,
      ),
    );

    return registeredChainParts.map((chainPart) => ({
      ...chainPart,
      oldValue: this.getOldValue(chainPart.context, chainPart.index),
      value: this.getValue(chainPart.context, chainPart.index),
    }));
  }

  private getCurrentValue(context: unknown, index: unknown): unknown {
    const value = this._pending.get(context);
    if (value !== undefined) {
      this._pending.delete(context);
      return value;
    }

    return this.getState(context, index);
  }

  private getOwnerId(context: unknown, index: unknown): unknown {
    return this._objectStateManager.getFromId(context)?.getFromId(index)
      ?.ownerId;
  }

  private onChange(
    change: IPropertyChange,
    watched: boolean = false,
    ownerId: unknown,
  ): void {
    const chainChanges = this.getChainChanges(change.chain);
    if (chainChanges.length === 0) {
      return;
    }

    this._startChangeCycle.next();

    try {
      const chainLeaf = chainChanges[chainChanges.length - 1];
      const currentValue = this.getCurrentValue(
        chainLeaf.context,
        chainLeaf.index,
      );

      this.tryRebindingNestedState(change.newValue, currentValue, ownerId);
      this.updateState(
        chainLeaf.context,
        chainLeaf.context,
        chainLeaf.index,
        chainLeaf.value,
        watched,
        ownerId,
      );

      chainChanges.forEach((chainChange) =>
        this.emitChange(
          chainChange.context,
          chainChange.index,
          chainChange.value,
          chainChange.oldValue,
        ),
      );
    } finally {
      this._endChangeCycle.next();
    }
  }
}
