import { InjectionContainer } from '@rs-x/core';
import { ExpressionChangeTransactionManager } from '../lib/expresion-change-transaction-manager';
import { ExpressionFactory } from '../lib/expression-factory/expression-factory';
import { ExpressionManager } from '../lib/expression-factory/expression-manager';
import { ArrayIndexOwnerResolver } from '../lib/index-value-observer-manager/array-index-owner-resolver';
import { DefaultIdentifierOwnerResolver } from '../lib/index-value-observer-manager/default-identifier-owner-resolver';
import { IndexValueObserverManager } from '../lib/index-value-observer-manager/index-value-observer-manager';
import { MapKeyOwnerResolver } from '../lib/index-value-observer-manager/map-key-owner-resolver';
import { PropertyOwnerResolver } from '../lib/index-value-observer-manager/property-owner-resolver';
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


   

   it('can get instance of IIdentifierValueManager', () => {
      const actual = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IIndexValueObserverManager
      );
      expect(actual).toBeInstanceOf(IndexValueObserverManager);
   });

   it('IIdentifierValueManager instance is a singleton', () => {
      const a1 = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IIndexValueObserverManager
      );
      const a2 = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IIndexValueObserverManager
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
});
