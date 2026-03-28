import {
  IDisposableOwner,
  Inject,
  Injectable,
  KeyedInstanceFactory,
  RsXCoreInjectionTokens,
} from '@rs-x/core';
import type { IIndexValueAccessor, IValueMetadata } from '@rs-x/core';
import type { IIndexWatchRule } from '@rs-x/state-manager';

import type {
  IIdentifierWatchRuleData,
  IIdentifierWatchRuleFactory,
} from './identifier-watch-rule.factory.interface';

class IdentifierIndexWatchRule implements IIndexWatchRule {
  private _needProxy: boolean | undefined;
  private _needProxyContext: unknown;
  private _isDisposed = false;

  constructor(
    public readonly id: string,
    public context: unknown,
    private readonly _owner: IDisposableOwner,
    private readonly _index: unknown,
    private readonly _isLeaf: boolean,
    private readonly _isMemberExpressionSegment: boolean,
    private readonly _indexValueAccessor: IIndexValueAccessor,
    private readonly _valueMetadata: IValueMetadata,
    private readonly _indexWatchRule?: IIndexWatchRule,
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
    if (index !== this._index || this.context !== target) {
      return !!this._indexWatchRule?.test(index, target);
    }

    if (!this._isLeaf && this._isMemberExpressionSegment) {
      return this.needProxy();
    }

    if (this._isLeaf) {
      return this.needProxy() || !!this._indexWatchRule?.test(index, target);
    }

    return false;
  }

  private needProxy(): boolean {
    if (
      this._needProxy !== undefined &&
      this._needProxyContext === this.context
    ) {
      return this._needProxy;
    }

    const value = this._indexValueAccessor.getValue(this.context, this._index);
    if (value === null || value === undefined) {
      this._needProxy = false;
      this._needProxyContext = this.context;
      return false;
    }

    this._needProxy = this._valueMetadata.needsProxy(value);
    this._needProxyContext = this.context;
    return this._needProxy;
  }
}

class IdentifierIndexWatchRuleFactoryForContext extends KeyedInstanceFactory<
  string,
  IIdentifierWatchRuleData,
  IIndexWatchRule
> {
  constructor(
    private readonly _context: unknown,
    private readonly _indexValueAccessor: IIndexValueAccessor,
    private readonly _valueMetadata: IValueMetadata,
    private releaseContext: () => void,
  ) {
    super();
  }

  public override getId(data: IIdentifierWatchRuleData): string | undefined {
    return this.createId(data);
  }

  protected override createId(data: IIdentifierWatchRuleData): string {
    return `${data.index}|${data.indexWatchRule?.id}|${data.isLeaf}|${data.isMemberExpressionSegment}`;
  }

  protected override createInstance(
    data: IIdentifierWatchRuleData,
    id: string,
  ): IIndexWatchRule {
    return new IdentifierIndexWatchRule(
      id,
      this._context,
      {
        canDispose: () => this.getReferenceCount(id) === 1,
        release: () => this.release(id),
      },
      data.index,
      data.isLeaf,
      data.isMemberExpressionSegment,
      this._indexValueAccessor,
      this._valueMetadata,
      data.indexWatchRule,
    );
  }

  protected override onReleased(): void {
    if (this.isEmpty) {
      this.releaseContext();
    }
  }
}

class IdentifierIndexWatchRuleManager extends KeyedInstanceFactory<
  unknown,
  unknown,
  IdentifierIndexWatchRuleFactoryForContext
> {
  constructor(
    private readonly _indexValueAccessor: IIndexValueAccessor,
    private readonly _valueMetadata: IValueMetadata,
  ) {
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
  ): IdentifierIndexWatchRuleFactoryForContext {
    return new IdentifierIndexWatchRuleFactoryForContext(
      context,
      this._indexValueAccessor,
      this._valueMetadata,
      () => this.release(id),
    );
  }
}

@Injectable()
export class IdentifierWatchRuleFactory implements IIdentifierWatchRuleFactory {
  private readonly _identifierIndexWatchRuleManager: IdentifierIndexWatchRuleManager;
  constructor(
    @Inject(RsXCoreInjectionTokens.IIndexValueAccessor)
    indexValueAccessor: IIndexValueAccessor,
    @Inject(RsXCoreInjectionTokens.IValueMetadata)
    valueMetadata: IValueMetadata,
  ) {
    this._identifierIndexWatchRuleManager = new IdentifierIndexWatchRuleManager(
      indexValueAccessor,
      valueMetadata,
    );
  }

  public create(
    context: unknown,
    data: IIdentifierWatchRuleData,
  ): IIndexWatchRule {
    return this._identifierIndexWatchRuleManager
      .create(context)
      .instance.create(data).instance;
  }
}
