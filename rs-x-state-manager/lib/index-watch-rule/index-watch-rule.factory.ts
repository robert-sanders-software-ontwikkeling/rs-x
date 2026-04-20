import {
  type IDisposableOwner,
  Injectable,
  KeyedInstanceFactory,
} from '@rs-x/core';

import type { IIndexWatchRuleFactory } from './index-watch-rule.factory.interface';
import type { IIndexWatchRule } from './index-watch-rule.interface';

class IndexWatchRule implements IIndexWatchRule {
  private _isDisposed = false;
  constructor(
    public readonly id: unknown,
    public readonly context: unknown,
    private readonly _owner: IDisposableOwner,
    private readonly _index: unknown,
  ) {}

  public dispose(): void {
    if (this._isDisposed) {
      return;
    }

    if (!this._owner.canDispose || this._owner.canDispose()) {
      this._isDisposed = true;
    }

    this._owner.release();
  }

  public test(index: unknown, target: unknown): boolean {
    return index === this._index && this.context === target;
  }
}

class IndexWatchRuleFactoryForContext extends KeyedInstanceFactory<
  unknown,
  unknown,
  IIndexWatchRule
> {
  constructor(
    private readonly _context: unknown,
    private releaseContext: () => void,
  ) {
    super();
  }

  public override getId(index: unknown): unknown | undefined {
    return this.createId(index);
  }

  protected override createId(index: unknown): unknown {
    return index;
  }

  protected override createInstance(
    index: unknown,
    id: unknown,
  ): IIndexWatchRule {
    return new IndexWatchRule(
      id,
      this._context,
      {
        canDispose: () => this.getReferenceCount(id) === 1,
        release: () => this.release(id),
      },
      index,
    );
  }

  protected override onReleased(): void {
    if (this.isEmpty) {
      this.releaseContext();
    }
  }
}

class IndexWatchRuleManager extends KeyedInstanceFactory<
  unknown,
  unknown,
  IndexWatchRuleFactoryForContext
> {
  constructor() {
    super();
  }

  public override getId(context: unknown): unknown {
    return context;
  }

  protected override createId(context: unknown): unknown {
    return context;
  }

  protected override createInstance(
    context: unknown,
    id: unknown,
  ): IndexWatchRuleFactoryForContext {
    return new IndexWatchRuleFactoryForContext(context, () => this.release(id));
  }
}

@Injectable()
export class IndexWatchRuleFactory implements IIndexWatchRuleFactory {
  private readonly _identifierIndexWatchRuleManager: IndexWatchRuleManager;
  constructor() {
    this._identifierIndexWatchRuleManager = new IndexWatchRuleManager();
  }

  public create(context: unknown, index: unknown): IIndexWatchRule {
    return this._identifierIndexWatchRuleManager
      .createAndGetInstance(context)
      .createAndGetInstance(index);
  }
}
