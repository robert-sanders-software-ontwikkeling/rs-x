import cloneDeepWith from 'lodash.clonedeepwith';

import { Inject, Injectable } from '../dependency-injection';
import type { IProxyRegistry } from '../proxy-registry/proxy-registry.interface';
import { RsXCoreInjectionTokens } from '../rs-x-core.injection-tokens';

import type { IDeepClone } from './deep-clone.interface';
import type { IDeepCloneExcept } from './deep-clone-except.interface';

@Injectable()
export class LodashDeepClone implements IDeepClone {
  public readonly priority = 1;

  constructor(
    @Inject(RsXCoreInjectionTokens.DefaultDeepCloneExcept)
    private readonly _deepCloneExcept: IDeepCloneExcept,
    @Inject(RsXCoreInjectionTokens.IProxyRegistry)
    private readonly _proxyRegistry: IProxyRegistry,
  ) {}

  public clone(source: unknown): unknown {
    return cloneDeepWith(
      this._proxyRegistry.getProxyTarget(source) ?? source,
      this.cloneExceptPredicate,
    );
  }

  private cloneExceptPredicate = (value: unknown): unknown => {
    return this._deepCloneExcept.except(value);
  };
}
