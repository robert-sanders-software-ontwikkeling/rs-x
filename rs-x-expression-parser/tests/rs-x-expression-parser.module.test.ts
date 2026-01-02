import { InjectionContainer } from '@rs-x/core';
import { ExpressionChangeTransactionManager } from '../lib/expresion-change-transaction-manager';
import { ExpressionFactory } from '../lib/expression-factory/expression-factory';
import { ExpressionManager } from '../lib/expression-factory/expression-manager';
import { ArrayIndexOwnerResolver } from '../lib/identifier-owner-resolver/array-index-owner-resolver';
import { DefaultIdentifierOwnerResolver } from '../lib/identifier-owner-resolver/default-identifier-owner-resolver';
import { MapKeyOwnerResolver } from '../lib/identifier-owner-resolver/map-key-owner-resolver';
import { PropertyOwnerResolver } from '../lib/identifier-owner-resolver/property-owner-resolver';
import { JsEspreeExpressionParser } from '../lib/js-espree-expression-parser';
import { RsXExpressionParserInjectionTokens } from '../lib/rs-x-expression-parser-injection-tokes';
import {
   RsXExpressionParserModule,
   unloadRsXExpressionParserModule,
} from '../lib/rs-x-expression-parser.module';

describe('RsXExpressionParserModule tests', () => {
   beforeAll(async () => {
      await InjectionContainer.load(RsXExpressionParserModule);
   });

   afterAll(async () => {
      await unloadRsXExpressionParserModule;
   });

   it('can get instance of IExpressionManager', () => {
      const actual = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IExpressionManager
      );
      expect(actual).toBeInstanceOf(ExpressionManager);
   });

   it('IExpressionManager instance is a singleton', () => {
      const a1 = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IExpressionManager
      );
      const a2 = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IExpressionManager
      );
      expect(a1).toBe(a2);
   });

   it('can get instance of IExpressionFactory', () => {
      const actual = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IExpressionFactory
      );
      expect(actual).toBeInstanceOf(ExpressionFactory);
   });

   it('IExpressionFactory instance is a singleton', () => {
      const a1 = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IExpressionFactory
      );
      const a2 = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IExpressionFactory
      );
      expect(a1).toBe(a2);
   });

   it('can get instance of IExpressionChangeTransactionManager', () => {
      const actual = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager
      );
      expect(actual).toBeInstanceOf(ExpressionChangeTransactionManager);
   });

   it('IExpressionChangeTransactionManager instance is a singleton', () => {
      const a1 = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager
      );
      const a2 = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager
      );
      expect(a1).toBe(a2);
   });

   it('can get instance of IExpressionParser', () => {
      const actual = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IExpressionParser
      );
      expect(actual).toBeInstanceOf(JsEspreeExpressionParser);
   });

   it('IExpressionParser instance is a singleton', () => {
      const a1 = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IExpressionParser
      );
      const a2 = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IExpressionParser
      );
      expect(a1).toBe(a2);
   });

   it('can get instance of PropertyOwnerResolver', () => {
      const actual = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.PropertyOwnerResolver
      );
      expect(actual).toBeInstanceOf(PropertyOwnerResolver);
   });

   it('PropertyOwnerResolver instance is a singleton', () => {
      const a1 = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.PropertyOwnerResolver
      );
      const a2 = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.PropertyOwnerResolver
      );
      expect(a1).toBe(a2);
   });

   it('can get instance of ArrayIndexOwnerResolver', () => {
      const actual = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.ArrayIndexOwnerResolver
      );
      expect(actual).toBeInstanceOf(ArrayIndexOwnerResolver);
   });

   it('ArrayIndexOwnerResolver instance is a singleton', () => {
      const a1 = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.ArrayIndexOwnerResolver
      );
      const a2 = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.ArrayIndexOwnerResolver
      );
      expect(a1).toBe(a2);
   });

   it('can get instance of MapKeyOwnerResolver', () => {
      const actual = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.MapKeyOwnerResolver
      );
      expect(actual).toBeInstanceOf(MapKeyOwnerResolver);
   });

   it('MapKeyOwnerResolver instance is a singleton', () => {
      const a1 = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.MapKeyOwnerResolver
      );
      const a2 = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.MapKeyOwnerResolver
      );
      expect(a1).toBe(a2);
   });

   it('can get instance of IdentifierOwnerResolver', () => {
      const actual = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IdentifierOwnerResolver
      );
      expect(actual).toBeInstanceOf(DefaultIdentifierOwnerResolver);
   });

   it('IdentifierOwnerResolver instance is a singleton', () => {
      const a1 = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IdentifierOwnerResolver
      );
      const a2 = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IdentifierOwnerResolver
      );
      expect(a1).toBe(a2);
   });


   it('can get an instance of IIdentifierOwnerResolverList', () => {
      const actual = InjectionContainer.getAll(
         RsXExpressionParserInjectionTokens.IIdentifierOwnerResolverList
      );

      expect(actual.length).toEqual(3);

      expect(actual[0]).toBeInstanceOf(PropertyOwnerResolver);
      expect(actual[1]).toBeInstanceOf(ArrayIndexOwnerResolver);
      expect(actual[2]).toBeInstanceOf(MapKeyOwnerResolver);
   });

   it('IIdentifierOwnerResolverList instance is a singelton', () => {
      const a1 = InjectionContainer.getAll(
         RsXExpressionParserInjectionTokens.IIdentifierOwnerResolverList
      );
      const a2 = InjectionContainer.getAll(
         RsXExpressionParserInjectionTokens.IIdentifierOwnerResolverList
      );
      expect(a1[0]).toBe(a2[0]);
      expect(a1[1]).toBe(a2[1]);
      expect(a1[2]).toBe(a2[2]);
   });
});
