import { truePredicate } from '@rs-x/core';

import type { IIndexWatchRule } from './index-watch-rule.interface';



export class IndexWatchRule implements IIndexWatchRule {

  constructor(
    public context: unknown,
    private readonly predicate: (
      index: unknown,
      target: unknown,
      context: unknown,
    ) => boolean
  ) {}


  public test(index: unknown, target: unknown): boolean {
    return this.predicate(index, target, this.context);
  }
}


export const watchIndexRecursiveRule = new IndexWatchRule(undefined, truePredicate);