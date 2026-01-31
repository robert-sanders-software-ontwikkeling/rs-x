import { type IObserverProxyPair } from '../../object-property-observer-proxy-pair-manager.type';
import { type IObjectObserverProxyPairFactory } from '../object-observer-proxy-pair.factory.interface';

export type IDateOserverProxyPair = IObserverProxyPair<Date>;
export type IDateObserverProxyPairFactory =
  IObjectObserverProxyPairFactory<Date>;
