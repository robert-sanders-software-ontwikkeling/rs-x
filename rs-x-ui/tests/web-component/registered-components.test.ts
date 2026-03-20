import { HtmlTagName, Type } from '@rs-x/core';
import { IComponentMetadata } from '../../lib/web-component/decorators/component/component-metadata.interface';
import { IDirectiveMetadata } from '../../lib/web-component/decorators/directive/directive-metadata.interface';
import {
   DirectiveElementConstructor,
   WebComponentElementConstructor,
} from '../../lib/web-component/interfaces';
import { RegisteredComponents } from '../../lib/web-component/registered-components';

describe('registered components', () => {
   let registeredComponents: RegisteredComponents;

   beforeEach(() => {
      registeredComponents = new RegisteredComponents();
   });

   it('get directives returns intially empty array', () => {
      expect(registeredComponents.directives).toEqual([]);
   });

   it('get components returns intially empty array', () => {
      expect(registeredComponents.components).toEqual([]);
   });

   it('registerDirective will register directive', () => {
      const directiveType = Type.cast<DirectiveElementConstructor>({});
      const directiveInfo: IDirectiveMetadata = {
         prefix: 'my-dir',
         appliesTo: [HtmlTagName.Div],
         controllerFactoryToken: Symbol('my-dir'),
         attachShadow: true,
      };
      registeredComponents.registerDirective(directiveType, directiveInfo);

      expect(registeredComponents.directives).toEqual([
         [directiveType, directiveInfo],
      ]);
   });

   it('registerWebComponent will register component', () => {
      const webComponentType = Type.cast<WebComponentElementConstructor>({});
      const componentInfo: IComponentMetadata = {
         selector: 'my-comp',
         template: '<p></p>',
         styles: [],
         attachShadow: true,
         controllerFactoryToken: Symbol('my-component'),
         dependencies: [],
      };

      registeredComponents.registerWebComponent(
         webComponentType,
         componentInfo
      );

      expect(registeredComponents.components).toEqual([
         [webComponentType, componentInfo],
      ]);
   });

   it('getDirectiveInfo returns the component info for the give component type', () => {
      const directiveType = Type.cast<DirectiveElementConstructor>({});
      const directiveInfo: IDirectiveMetadata = {
         prefix: 'my-dir',
         appliesTo: [HtmlTagName.Div],
         controllerFactoryToken: Symbol('my-dir'),
         attachShadow: true,
      };
      registeredComponents.registerDirective(directiveType, directiveInfo);

      const actual = registeredComponents.getDirectiveInfo(directiveType);
      expect(actual).toEqual(directiveInfo);
   });

   it('getComponentInfo returns the component info for the give component type', () => {
      const webComponentType = Type.cast<WebComponentElementConstructor>({});
      const componentInfo: IComponentMetadata = {
         selector: 'my-comp',
         template: '<p></p>',
         styles: [],
         attachShadow: true,
         controllerFactoryToken: Symbol('my-component'),
         dependencies: [],
      };

      registeredComponents.registerWebComponent(
         webComponentType,
         componentInfo
      );

      const actual = registeredComponents.getComponentInfo(webComponentType);
      expect(actual).toEqual(componentInfo);
   });
});
