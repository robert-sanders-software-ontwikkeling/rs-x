import type { IGuidFactory } from '@rs-x/core';
import {
  Inject,
  Injectable,
  RsXCoreInjectionTokens,
  SingletonFactory,
  SingletonFactoryWithGuid,
} from '@rs-x/core';

import { IndexWatchRule } from './index-watch-rule';
import type { IIndexWatchRule } from './index-watch-rule.interface';
import type {
  IIndexWatchRuleRegistry,
  ShouldWatchIndexPredicate,
} from './index-watch-rule-registry.type';

interface IShouldWatchIndexPredicateIndex {
  index: unknown;
}

interface IShouldWatchIndexPredicateForIndex extends IShouldWatchIndexPredicateIndex {
  predicate: ShouldWatchIndexPredicate;
}

class IndexWatchRuleManagerForContext extends SingletonFactoryWithGuid<
  IShouldWatchIndexPredicateForIndex,
  IIndexWatchRule
> {
  constructor(
    guidFactoy: IGuidFactory,
    private _context: unknown,
    private readonly releaseContext: () => void,
  ) {
    super(guidFactoy);
  }

  public get context(): unknown {
    return this._context;
  }

  public set context(value: unknown) {
    this._context = value;
    for (const instance of this.instances) {
      instance.context = value;
    }
  }

  protected override getGroupId(
    data: IShouldWatchIndexPredicateForIndex,
  ): unknown {
    return data.index;
  }
  protected override getGroupMemberId(
    data: IShouldWatchIndexPredicateForIndex,
  ): unknown {
    return data.predicate;
  }

  protected createInstance(
    data: IShouldWatchIndexPredicateForIndex,
    id: string,
  ): IIndexWatchRule {
    return new IndexWatchRule(this.context, data.predicate, {
      canDispose: () => this.getReferenceCount(id) === 1,
      release: () => this.release(id),
    });
  }

  protected override onReleased(): void {
    this.releaseContext();
  }
}

class IndexWatchRuleManager extends SingletonFactory<
  unknown,
  unknown,
  IndexWatchRuleManagerForContext
> {
  constructor(private readonly _guidFactory: IGuidFactory) {
    super();
  }

  public getId(contex: unknown): unknown {
    return contex;
  }

  protected createInstance(
    context: unknown,
    id: unknown,
  ): IndexWatchRuleManagerForContext {
    return new IndexWatchRuleManagerForContext(this._guidFactory, context, () =>
      this.release(id),
    );
  }

  protected createId(index: unknown): unknown {
    return index;
  }

  public replaceContext(oldContext: unknown, newContext: unknown): void {
    const instance = this.getFromId(oldContext);
    if (!instance) {
      return;
    }
    instance.context = newContext;
    this.replaceKey(oldContext, newContext);
  }
}

@Injectable()
export class IndexWatchRuleRegistry implements IIndexWatchRuleRegistry {
  private readonly _indexWatchRuleManager: IndexWatchRuleManager;

  constructor(
    @Inject(RsXCoreInjectionTokens.IGuidFactory)
    guidFactory: IGuidFactory,
  ) {
    this._indexWatchRuleManager = new IndexWatchRuleManager(guidFactory);
  }

  public register(
    context: unknown,
    index: unknown,
    predicate: ShouldWatchIndexPredicate,
  ): IIndexWatchRule {
    return this._indexWatchRuleManager
      .create(context)
      .instance.create({ index, predicate }).instance;
  }

  public unregister(
    context: unknown,
    index: unknown,
    predicate: ShouldWatchIndexPredicate,
  ): void {
    const indexWatchRuleManagerForContext =
      this._indexWatchRuleManager.getFromId(context);
    if (!indexWatchRuleManagerForContext) {
      return;
    }

    const id = indexWatchRuleManagerForContext.getId({ index, predicate });
    if (id) {
      this._indexWatchRuleManager.getFromId(context)?.release(id);
    }
  }

  public replaceContext(oldContext: unknown, newContext: unknown): void {
    (this._indexWatchRuleManager, this.replaceContext(oldContext, newContext));
  }

  public get(
    context: unknown,
    index: unknown,
    predicate: ShouldWatchIndexPredicate,
  ): IIndexWatchRule | undefined {
    return this._indexWatchRuleManager
      .getFromId(context)
      ?.getFromData({ index, predicate });
  }
}
