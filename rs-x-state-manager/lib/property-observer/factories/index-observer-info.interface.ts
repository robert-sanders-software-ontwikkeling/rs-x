import { IDisposableOwner } from '../../disposable-owner.interface';
import { MustProxify } from '../../object-property-observer-proxy-pair-manager.type';

export interface IIndexObserverIdInfo<TIndex> {
   index: TIndex;
   mustProxify?: MustProxify;
}
export interface IIndexObserverInfo<TIndex>
   extends IIndexObserverIdInfo<TIndex> {
   owner?: IDisposableOwner;
   initialValue?: unknown;
}
