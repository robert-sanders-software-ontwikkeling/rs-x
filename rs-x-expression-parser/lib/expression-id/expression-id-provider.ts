import type { IExpression } from '@rs-x/expression-parser';
import { Inject, Injectable, RsXCoreInjectionTokens, type IGuidFactory } from '@rs-x/core';

@Injectable()
export class ExpressionIdProvider {
  private readonly _rootIdByRoot = new WeakMap<IExpression, string>();

  constructor(
    @Inject(RsXCoreInjectionTokens.IGuidFactory)
    private readonly _idFactory: IGuidFactory) {

  }


  public getId(node: IExpression): string {
    const root = this.getRoot(node);
    const rootId = this.getOrCreateRootId(root);

    // Build path from root using indices
    const parts: string[] = [];
    let current: IExpression | undefined = node;

    while (current) {
      const parent = current.parent;
      if (!parent) {
        break;
      }

      const siblings = parent.childExpressions ?? [];
      const index = siblings.indexOf(current);

      if (index < 0) {
        throw new Error(
          `ExpressionIdProvider: node '${current.expressionString}' not found in parent.childExpressions of '${parent.expressionString}'`
        );
      }

      parts.push(String(index));
      current = parent;
    }

    // rootId + path (rootId alone for root node)
    return parts.length > 0 ? `${rootId}/${parts.reverse().join('/')}` : rootId;
  }

  private getRoot(node: IExpression): IExpression {
    let current: IExpression = node;
    while (current.parent) {
      current = current.parent;
    }
    return current;
  }

  private getOrCreateRootId(root: IExpression): string {
    const existing = this._rootIdByRoot.get(root);
    if (existing) {
      return existing;
    }
    const created = this._idFactory.create();
    this._rootIdByRoot.set(root, created);
    return created;
  }
}