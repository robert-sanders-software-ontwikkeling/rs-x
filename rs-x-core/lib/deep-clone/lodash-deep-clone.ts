import cloneDeepWith from 'lodash.clonedeepwith';

import { Inject, Injectable } from '../dependency-injection';
import { RsXCoreInjectionTokens } from '../rs-x-core.injection-tokens';

import type { IDeepClone } from './deep-clone.interface';
import type { IDeepCloneExcept } from './deep-clone-except.interface';

@Injectable()
export class LodashDeepClone implements IDeepClone {
  public readonly priority = 1;

  constructor(
    @Inject(RsXCoreInjectionTokens.DefaultDeepCloneExcept)
    private readonly _deepCloneExcept: IDeepCloneExcept,
  ) {}

  public clone(source: unknown): unknown {
    return cloneDeepWith(source, this.cloneExceptPredicate);
  }

  private cloneExceptPredicate = (value: unknown): unknown => {
    return this._deepCloneExcept.except(value);
  };
}
