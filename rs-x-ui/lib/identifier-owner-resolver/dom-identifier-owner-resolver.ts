import { Inject, Injectable } from '@rs-x/core';
import { RsXUIInjectionTokens } from '../rx-x-ui.injection-tokens';
import { IIdentifierOwnerResolver } from '@rs-x/expression-parser';
import { IDomElementData } from '../dom-element-data/dom-element-data.interface';


@Injectable()
export class DomIdentifierOwnerResolver implements IIdentifierOwnerResolver {
   constructor(
      @Inject(RsXUIInjectionTokens.IDomElementData)
      private readonly _domElementData: IDomElementData
   ) {}

   public resolve(name: string, root: Node): object | null {
      return this._domElementData.resolveContext(root, name) ?? null;
   }
}
