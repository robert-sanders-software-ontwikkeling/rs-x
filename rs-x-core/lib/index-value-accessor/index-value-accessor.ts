import { Injectable, MultiInject } from '../dependency-injection';
import { NoAccessorFoundExeception } from '../exceptions/no-accessor-found-exception';
import { RsXCoreInjectionTokens } from '../rs-x-core.injection-tokens';

import type { IIndexValueAccessor } from './index-value-accessor.interface';

@Injectable()
export class IndexValueAccessor implements IIndexValueAccessor {
  public readonly priority = 0;
  private readonly _accessors: readonly IIndexValueAccessor[];
  private _lastContext: unknown;
  private _lastIndex: unknown;
  private _lastAccessor: IIndexValueAccessor<unknown, unknown> | undefined;

  constructor(
    @MultiInject(RsXCoreInjectionTokens.IIndexValueAccessorList)
    accessors: readonly IIndexValueAccessor[],
  ) {
    this._accessors = [...accessors].sort((a, b) => b.priority - a.priority);
  }

  public getIndexes(
    context: unknown,
    index: unknown,
  ): IterableIterator<unknown> {
    return this.getIndexAccessor(context, index).getIndexes(context, index);
  }

  public hasValue(context: unknown, index: unknown): boolean {
    return this.getIndexAccessor(context, index).hasValue(context, index);
  }

  public getResolvedValue(context: unknown, index: unknown): unknown {
    return this.getIndexAccessor(context, index).getResolvedValue(
      context,
      index,
    );
  }

  public getValue(context: unknown, index: unknown): unknown {
    return this.getIndexAccessor(context, index).getValue(context, index);
  }

  public setValue(context: unknown, index: unknown, value: unknown): void {
    this.getIndexAccessor(context, index).setValue(context, index, value);
  }

  public applies(context: unknown, index: unknown): boolean {
    return this.findIndexAccessor(context, index) !== undefined;
  }

  private getIndexAccessor(
    context: unknown,
    index: unknown,
  ): IIndexValueAccessor<unknown, unknown> {
    const accessor = this.findIndexAccessor(context, index);

    if (!accessor) {
      throw new NoAccessorFoundExeception(context, index);
    }

    return accessor;
  }

  private findIndexAccessor(
    context: unknown,
    index: unknown,
  ): IIndexValueAccessor<unknown, unknown> | undefined {
    const lastAccessor = this._lastAccessor;
    if (
      lastAccessor &&
      this._lastContext === context &&
      this._lastIndex === index &&
      lastAccessor.applies(context, index)
    ) {
      return lastAccessor;
    }

    const accessors = this._accessors;
    for (let i = 0; i < accessors.length; i++) {
      const accessor = accessors[i];
      if (accessor.applies(context, index)) {
        this._lastContext = context;
        this._lastIndex = index;
        this._lastAccessor = accessor;
        return accessor;
      }
    }
    return undefined;
  }
}
