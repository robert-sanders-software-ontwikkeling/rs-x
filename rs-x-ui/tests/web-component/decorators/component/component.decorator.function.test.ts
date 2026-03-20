import { Component } from '../../../../lib/web-component/decorators/component/component.decorator.function';
import { RegisteredComponents } from '../../../../lib/web-component/registered-components';
import { WebComponentController } from '../../../../lib/web-component/web-component-controller';
import { WebComponentElement } from '../../../../lib/web-component/web-component-element';

describe('Component decorator', () => {
   it('Component decorator will register component ', () => {
      const registerWebComponentSpy = jest.spyOn(
         RegisteredComponents.instance,
         'registerWebComponent'
      );

      try {
         const componentInfo = {
            selector: 'my-component2',
            template: 'my-template2',
            styles: [],
            dependencies: [],
            controllerFactoryToken: WebComponentController,
         };
         @Component(componentInfo)
         class MyComponent extends WebComponentElement {}

         expect(registerWebComponentSpy).toHaveBeenCalledTimes(1);
         expect(registerWebComponentSpy).toHaveBeenNthCalledWith(
            1,
            MyComponent,
            componentInfo
         );
      } finally {
         registerWebComponentSpy.mockRestore();
      }
   });
});
