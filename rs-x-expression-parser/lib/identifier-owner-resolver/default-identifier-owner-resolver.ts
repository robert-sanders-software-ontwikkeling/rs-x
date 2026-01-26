import { Injectable, MultiInject } from '@rs-x/core';
import { RsXExpressionParserInjectionTokens } from '../rs-x-expression-parser-injection-tokes';
import type { IIdentifierOwnerResolver } from './identifier-owner-resolver.interface';

@Injectable()
export class DefaultIdentifierOwnerResolver
   implements IIdentifierOwnerResolver {
   constructor(
      @MultiInject(RsXExpressionParserInjectionTokens.IIdentifierOwnerResolverList)
      private readonly _identifierOwnerResolvers: readonly IIdentifierOwnerResolver[]
   ) { }

   public resolve(index: unknown, context?: unknown): object | null {
      const resolvers = this._identifierOwnerResolvers
      for (let i = 0; i < resolvers.length; i++) {
         const result = resolvers[i].resolve(context, index);
         if (result) {
            return result;
         }
      }
      return null;
   }
}
