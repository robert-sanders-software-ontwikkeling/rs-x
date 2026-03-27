import type { IIndexWatchRule } from './index-watch-rule.interface';

export class IndexWatchRule implements IIndexWatchRule {
  constructor(
    public readonly id: string,
    public context: unknown,
    private readonly predicate: (
      index: unknown,
      target: unknown,
      context: unknown,
    ) => boolean,
  ) {}

  public dispose(): void {}

  public test(index: unknown, target: unknown): boolean {
    return this.predicate(index, target, this.context);
  }
}
