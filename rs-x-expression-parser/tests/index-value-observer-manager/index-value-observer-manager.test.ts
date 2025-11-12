import { InjectionContainer, truePredicate } from '@rs-x-core';
import { IIndexValueObserverManager } from '../../lib/index-value-observer-manager/index-value-manager-observer.type';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';
import {
   RsXExpressionParserModule,
   unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';

describe('IdentifierValueManager tests', () => {
   let identifierValueManager: IIndexValueObserverManager;

   beforeAll(async () => {
      await InjectionContainer.load(RsXExpressionParserModule);
      identifierValueManager = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IIndexValueObserverManager
      );
   });

   afterAll(async () => {
      await unloadRsXExpressionParserModule;
   });

   it('will create different instance for recursive an non-recursive index observer', () => {
      const context = {
         array: [1],
      };
      const identifierValue1 = identifierValueManager
         .create({
            context,
            index: 'array',
         })
         .instance.create({ index: 'array', mustProxify: truePredicate });

      const identifierValue2 = identifierValueManager
         .create({
            context,
            index: 'array',
         })
         .instance.create({ index: 'array' });

      expect(identifierValue1).not.toBe(identifierValue2);
   });
});
