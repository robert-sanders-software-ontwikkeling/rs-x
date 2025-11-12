import { Inject, Injectable } from '@rs-x-core';
import { RsXExpressionParserInjectionTokens } from '../rs-x-expression-parser-injection-tokes';
import { IIdentifierOwnerResolver } from './identifier-owner-resolver.interface';

@Injectable()
export class DefaultIdentifierOwnerResolver
   implements IIdentifierOwnerResolver
{
   constructor(
      @Inject(RsXExpressionParserInjectionTokens.PropertyOwnerResolver)
      private readonly _propertyOwnerResolver: IIdentifierOwnerResolver,
      @Inject(RsXExpressionParserInjectionTokens.ArrayIndexOwnerResolver)
      private readonly _arrayIndexOwnerResolver: IIdentifierOwnerResolver,
      @Inject(RsXExpressionParserInjectionTokens.MapKeyOwnerResolver)
      private readonly _mapKeyOwnerResolver: IIdentifierOwnerResolver
   ) {}
   public resolve(key: unknown, context?: unknown): object {
      return (
         this._propertyOwnerResolver.resolve(key, context) ||
         this._arrayIndexOwnerResolver.resolve(key, context) ||
         this._mapKeyOwnerResolver.resolve(key, context)
      );
   }
}
