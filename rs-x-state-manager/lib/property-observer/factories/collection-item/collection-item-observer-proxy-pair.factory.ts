import {
  type IErrorLog,
  type IGuidFactory,
  type IIndexValueAccessor,
  Inject,
  Injectable,
  type IProxyRegistry,
  type IValueMetadata,
  RsXCoreInjectionTokens,
  truePredicate,
} from '@rs-x/core';

import type { IObjectObserverProxyPairManager } from '../../../object-observer/object-observer-proxy-pair-manager.type';
import { RsXStateManagerInjectionTokens } from '../../../rs-x-state-manager-injection-tokens';
import { IndexObserverProxyPairFactory } from '../indexed-value-observer-proxy-pair/indexed-value-observer-proxy-pair.factory';

import type {
  Collection,
  ICollectionItemObserverManager,
} from './collection-item-observer-manager.type';

@Injectable()
export class CollectionItemObserverProxyPairFactory extends IndexObserverProxyPairFactory<
  Collection,
  unknown
> {
  constructor(
    @Inject(RsXStateManagerInjectionTokens.IObjectObserverProxyPairManager)
    objectObserverManager: IObjectObserverProxyPairManager,
    @Inject(RsXStateManagerInjectionTokens.ICollectionItemObserverManager)
    collectionItemObserverManager: ICollectionItemObserverManager,
    @Inject(RsXCoreInjectionTokens.IErrorLog)
    errorLog: IErrorLog,
    @Inject(RsXCoreInjectionTokens.IGuidFactory)
    guidFactory: IGuidFactory,
    @Inject(RsXCoreInjectionTokens.IIndexValueAccessor)
    indexValueAccessor: IIndexValueAccessor,
    @Inject(RsXCoreInjectionTokens.IProxyRegistry)
    proxyRegister: IProxyRegistry,
    @Inject(RsXCoreInjectionTokens.IValueMetadata)
    valueMetadata: IValueMetadata,
  ) {
    super(
      objectObserverManager,
      collectionItemObserverManager,
      errorLog,
      guidFactory,
      indexValueAccessor,
      proxyRegister,
      valueMetadata,
      truePredicate,
    );
  }

  public override applies(object: unknown): boolean {
    return (
      object instanceof Map || object instanceof Array || object instanceof Set
    );
  }
}
