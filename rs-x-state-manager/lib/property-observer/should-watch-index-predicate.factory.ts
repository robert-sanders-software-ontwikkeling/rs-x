import { Injectable, SingletonFactory } from '@rs-x/core';

import type { ShouldWatchIndex } from '../object-property-observer-proxy-pair-manager.type';

import type { IShouldWatchIndexPredicateFactory } from './should-watch-index-predicate.factory.type';

class ShouldWatchIndexPredicateForContextManager
   extends SingletonFactory<unknown, unknown, ShouldWatchIndex> {
   constructor(private readonly _context: unknown, private readonly releaseContext: () => void) {
      super();
   }

   public getId(indexOnContext: unknown): unknown {
      return indexOnContext;
   }

   protected createInstance(indexOnContext: unknown): ShouldWatchIndex {
      return (index, indexTarget) => index === indexOnContext && indexTarget === this._context;
   }

   protected createId(indexOnContext: unknown): unknown {
      return indexOnContext;
   }

   protected override onReleased(): void {
      this.releaseContext();
   }
}


class ShouldWatchIndexPredicateManager
   extends SingletonFactory<unknown, unknown, ShouldWatchIndexPredicateForContextManager> {
   constructor() {
      super();
   }

   public getId(contex: unknown): unknown {
      return contex;
   }

   protected createInstance(context: unknown, id: unknown): ShouldWatchIndexPredicateForContextManager {
      return new ShouldWatchIndexPredicateForContextManager(context, () => this.release(id));
   }

   protected createId(index: unknown): unknown {
      return index;
   }
}


@Injectable()
export class ShouldWatchIndexPredicateFactory implements IShouldWatchIndexPredicateFactory {
   private readonly _manager = new ShouldWatchIndexPredicateManager();

   public create(context: unknown, index: unknown): ShouldWatchIndex {
      return this._manager.create(context).instance.create(index).instance;

   }

   public release(context: unknown, index: unknown): void {
      this._manager.getFromId(context)?.release(index);
   }
}