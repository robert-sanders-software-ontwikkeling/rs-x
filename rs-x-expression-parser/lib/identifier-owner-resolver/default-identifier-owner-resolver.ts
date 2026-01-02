import { Injectable, MultiInject } from '@rs-x/core';
import { RsXExpressionParserInjectionTokens } from '../rs-x-expression-parser-injection-tokes';
import { IIdentifierOwnerResolver } from './identifier-owner-resolver.interface';

@Injectable()
export class DefaultIdentifierOwnerResolver
   implements IIdentifierOwnerResolver {
   constructor(
      @MultiInject(RsXExpressionParserInjectionTokens.IIdentifierOwnerResolverList)
      private readonly _identifierOwnerResolvers: readonly IIdentifierOwnerResolver[]
   ) { }
   
   public resolve(key: unknown, context?: unknown): object {
      const resolvers = this._identifierOwnerResolvers
      for (let i = 0; i < resolvers.length; i++) {
         const result = resolvers[i].resolve(context, key);
         if (result) {
            return result;
         }
      }
      return null;
   }
}
