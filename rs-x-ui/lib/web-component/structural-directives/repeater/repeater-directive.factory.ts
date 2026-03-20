import {
   Inject,
   Injectable,
} from '@rs-x/core';

import { IBindingManagerFactory } from '../../binding/binding-manager.factory.type';
import { IEventManagerFactory } from '../../event-manager/event-manager.factory.type';

import { IExpression, IExpressionFactory, RsXExpressionParserInjectionTokens } from '@rs-x/expression-parser';
import { DomItemElementSynchronizer } from '../../../dom-item-element-synchronisizer/dom-item-element-synchronisizer';
import { RsXUIInjectionTokens } from '../../../rx-x-ui.injection-tokens';
import { ITemplatedElementFactories } from '../../../template/templated-element.factories.type';
import { IStructuralDirectiveFactory } from './repeater-directive.factory.interface';
import { RepeaterDirective } from './repeater.directive';
import { IStructuralDirective } from './repeater.directive.interface';

const repeaterExpressionRegexp = /^\s*(\w+)\s+in\s+(.+)$/;

@Injectable()
export class RepeaterDirectiveFactory implements IStructuralDirectiveFactory {
   constructor(
      @Inject(RsXExpressionParserInjectionTokens.IExpressionFactory)
      private readonly _expressionFactory: IExpressionFactory,
      @Inject(RsXUIInjectionTokens.IBindingManagerFactory)
      private readonly _bindingManagerFactory: IBindingManagerFactory,
      @Inject(RsXUIInjectionTokens.IEventManagerFactory)
      private readonly _eventManagerFactory: IEventManagerFactory,
      @Inject(RsXUIInjectionTokens.ITemplatedElementFactories)
      private readonly _templatedElementFactories: ITemplatedElementFactories,
   ) {}

   public create(
      template: HTMLTemplateElement,
      expression: string
   ): IStructuralDirective {
      const [, alias, itemsExpressionString] = expression.match(
         repeaterExpressionRegexp
      )!;
      const itemsExpression = this._expressionFactory.create(
         template,
         itemsExpressionString
      ) as IExpression<unknown[]>
      const domItemElementSynchronizer = new DomItemElementSynchronizer(
         alias,
         template,
         this._templatedElementFactories
      );

      return new RepeaterDirective(
         template,
         itemsExpression,
         domItemElementSynchronizer,
         this._bindingManagerFactory,
         this._eventManagerFactory
      );
   }
}
