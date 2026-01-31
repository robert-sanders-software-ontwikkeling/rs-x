import { type ShouldWatchIndex } from '../object-property-observer-proxy-pair-manager.type';

export interface IShouldWatchIndexPredicateFactory {
  create(context: unknown, index: unknown): ShouldWatchIndex;
  release(context: unknown, index: unknown): void;
}
