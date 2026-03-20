import { HtmlTagName } from '@rs-x/core';
import { Directive } from '../../../lib/web-component/structural-directives/directive-decorator/directive.decorator.function';
import { IStructuralDirective } from '../../../lib/web-component/structural-directives/repeater/repeater.directive.interface';
import { StructuralDirectiveRegistry } from '../../../lib/web-component/structural-directives/structural-directive-registry';

describe('Directive decorator', () => {
   it('Directive decorator will register directive', () => {
      const registerDirectiveSpy = jest.spyOn(
         StructuralDirectiveRegistry.instance,
         'registerDirective'
      );
      try {
         const directiveInfo = {
            name: 'dir2',
            appliesTo: [HtmlTagName.Div, HtmlTagName.Span],
            factortyToken: Symbol('test'),
         };
         @Directive(directiveInfo)
         class MyDirective implements IStructuralDirective {
            public attach(): Promise<void> {
               throw new Error('Method not implemented.');
            }
            public detach(): void {
               throw new Error('Method not implemented.');
            }
         }

         expect(registerDirectiveSpy).toHaveBeenCalledTimes(1);
         expect(registerDirectiveSpy).toHaveBeenCalledWith(directiveInfo);
      } finally {
         registerDirectiveSpy.mockRestore();
      }
   });
});
