import {
  type IGuidFactory,
  Inject,
  Injectable,
  RsXCoreInjectionTokens,
} from '@rs-x/core';
import type { IExpressionTree } from '../expressions/expression-parser.interface';

@Injectable()
export class ExpressionIdProvider {
  private readonly _rootIdByRoot = new WeakMap<IExpressionTree, string>();

  constructor(
    @Inject(RsXCoreInjectionTokens.IGuidFactory)
    private readonly _idFactory: IGuidFactory,
  ) {}

  public getId(node: IExpressionTree): string {
    const root = this.getRoot(node);
    const rootId = this.getOrCreateRootId(root);

    // Build path from root using indices
    const parts: string[] = [];
    let current: IExpressionTree | undefined = node;

    while (current) {
      const parent = current.parent;
      if (!parent) {
        break;
      }

      const siblings = parent.childExpressions ?? [];
      const index = siblings.indexOf(current);

      if (index < 0) {
        throw new Error(
          `ExpressionIdProvider: node '${current.expressionString}' not found in parent.childExpressions of '${parent.expressionString}'`,
        );
      }

      parts.push(String(index));
      current = parent;
    }

    // rootId + path (rootId alone for root node)
    return parts.length > 0 ? `${rootId}/${parts.reverse().join('/')}` : rootId;
  }

  private getRoot(node: IExpressionTree): IExpressionTree {
    let current: IExpressionTree = node;
    while (current.parent) {
      current = current.parent;
    }
    return current;
  }

  private getOrCreateRootId(root: IExpressionTree): string {
    const existing = this._rootIdByRoot.get(root);
    if (existing) {
      return existing;
    }
    const created = this._idFactory.create();
    this._rootIdByRoot.set(root, created);
    return created;
  }
}
