import { type IDisposableOwner, Inject, Injectable } from '@rs-x/core';
import { type IProxyTarget } from '@rs-x/state-manager';
import { AbstractExpression } from '../expressions/abstract-expression';
import { RsXExpressionParserInjectionTokens } from '../rs-x-expression-parser-injection-tokes';
import type { IExpressionObserverProxyPairFactory } from './expression-observer-proxy-pair.factory.type';
import type { IExpressionObserverProxyPair } from './expression-observer-proxy-pair.type';
import type { IExpressionObserverFactory } from './expression-proxy.factory.type';

@Injectable()
export class ExpressionObserverProxyPairFactory
   implements IExpressionObserverProxyPairFactory {

   public readonly priority = 100;

   constructor(
      @Inject(RsXExpressionParserInjectionTokens.IExpressionObserverFactory)
      private readonly _expressionObserverFactory: IExpressionObserverFactory
   ) {
   }

   public create(
      owner: IDisposableOwner,
      proxyTarget: IProxyTarget<AbstractExpression>
   ): IExpressionObserverProxyPair {
      return {
         observer: this._expressionObserverFactory.create({
            owner,
            expression: proxyTarget.target
         }).instance
      };
   }

   public applies(object: unknown): boolean {
      return object instanceof AbstractExpression;
   }
}
