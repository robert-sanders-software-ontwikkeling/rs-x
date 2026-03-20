import {
   calculatedKey,
   ContainerModule,
   htmlTageNames,
   HtmlTagName,
   InjectionContainer,
   inputKey,
   supportsShadowDom,
} from '@rs-x/core';
import { DecoratorValidatorConfigurationMock } from '@rs-x/core/testing';
import { RsXCoreUIModule } from '../../lib/rs-x-core-ui.module';
import { RsXUIInjectionTokens } from '../../lib/rx-x-core-ui.injection-tokens';
import { Bootstrapper } from '../../lib/web-component/bootstrapper';
import { IComponentMetadata } from '../../lib/web-component/decorators/component/component-metadata.interface';
import { IDirectiveMetadata } from '../../lib/web-component/decorators/directive/directive-metadata.interface';
import {
   DirectiveControllerFactoryToken,
   DirectiveElementConstructor,
   IComponentRegistry,
   WebComponentElementConstructor,
} from '../../lib/web-component/interfaces';
import { RegisteredComponents } from '../../lib/web-component/registered-components';
import { outputKey } from '../../lib/web-component/decorators/output/output.decorator.key';
import { viewchildKey } from '../../lib/web-component/decorators/view-child/view-child.decorator.key';

describe('Bootstrapper', () => {
   let decoratorValidatorConfiguration: DecoratorValidatorConfigurationMock;
   let registeredComponents: RegisteredComponents;
   let directiveMetadata: IDirectiveMetadata;
   let componentMetadata: IComponentMetadata;
   let componentRegistry: IComponentRegistry;
   let bootstrapper: Bootstrapper;
   let directiveType: DirectiveElementConstructor;
   let componentType: WebComponentElementConstructor;

   beforeEach(() => {
      decoratorValidatorConfiguration =
         new DecoratorValidatorConfigurationMock();
      registeredComponents = new RegisteredComponents();

      directiveType = {} as DirectiveElementConstructor;
      directiveMetadata = {
         prefix: 'my-dir',
         appliesTo: [HtmlTagName.Div],
         attachShadow: true,
         controllerFactoryToken:
            {} as unknown as DirectiveControllerFactoryToken,
      };

      registeredComponents.registerDirective(directiveType, directiveMetadata);

      componentType = {} as unknown as WebComponentElementConstructor;
      componentMetadata = {
         selector: 'my-comp',
         template: '<p></p>',
         styles: [],
         attachShadow: false,
         controllerFactoryToken: Symbol('my-component'),
         dependencies: [],
      };

      registeredComponents.registerWebComponent(
         componentType,
         componentMetadata
      );

      componentRegistry = {
         registerWebComponent: jest.fn(),
         registerDirective: jest.fn(),
      } as unknown as IComponentRegistry;

      bootstrapper = new Bootstrapper(
         componentRegistry,
         registeredComponents,
         decoratorValidatorConfiguration
      );
   });

   it('calling bootstrap will configure decorators', () => {
      bootstrapper.bootstrap();

      expect(decoratorValidatorConfiguration.configure).toHaveBeenCalledTimes(
         1
      );
   });

   it('calling bootstrap will load passed in modules', async () => {
      const loadSpy = jest
         .spyOn(InjectionContainer, 'load')
         .mockImplementation(() => null);

      const getSpy = jest
         .spyOn(InjectionContainer, 'load')
         .mockImplementation(() => null);

      const customModules: ContainerModule[] = [
         {},
         {},
      ] as unknown as ContainerModule[];
      await bootstrapper.bootstrap({ modules: customModules });

      expect(loadSpy).toHaveBeenCalledTimes(1);
      expect(loadSpy).toHaveBeenNthCalledWith(
         1,
         customModules[0],
         customModules[1]
      );
      loadSpy.mockRestore();
      getSpy.mockRestore();
   });

   it('calling bootstrap for the second time does do nothing', async () => {
      const registerWebComponentsAndDirectivesSpy = jest.spyOn(
         bootstrapper,
         'registerWebComponentsAndDirectives'
      );
      await bootstrapper.bootstrap();
      await bootstrapper.bootstrap();
      expect(registerWebComponentsAndDirectivesSpy).toHaveBeenCalledTimes(1);
   });

   it('calling Bootstrapper.bootstrap will load WebCoreUIModule and call bootstrap on bootstrapper', async () => {
      const bootStrapperMock = {
         bootstrap: jest.fn(),
      };

      const modules: any = [{}];
      const loadSpy = jest
         .spyOn(InjectionContainer, 'load')
         .mockImplementation(() => null);
      const getSpy = jest
         .spyOn(InjectionContainer, 'get')
         .mockImplementation(() => bootStrapperMock);
      const bootstrapSpy = jest.spyOn(bootStrapperMock, 'bootstrap');

      await Bootstrapper.bootstrap(modules);

      expect(loadSpy).toHaveBeenCalledTimes(1);
      expect(loadSpy).toHaveBeenNthCalledWith(1, RsXCoreUIModule);

      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenNthCalledWith(
         1,
         RsXUIInjectionTokens.IBootstrapper
      );

      expect(bootstrapSpy).toHaveBeenCalledTimes(1);
      expect(bootstrapSpy).toHaveBeenNthCalledWith(1, modules);

      loadSpy.mockRestore();
      getSpy.mockRestore();
   });

   it('calling bootstrap will call registerWebComponentsAnDirectives', async () => {
      const getSpy = jest
         .spyOn(InjectionContainer, 'get')
         .mockImplementation(() => bootstrapper);
      const registerWebComponentsAndDirectivesSpy = jest.spyOn(
         bootstrapper,
         'registerWebComponentsAndDirectives'
      );

      await Bootstrapper.bootstrap();

      expect(registerWebComponentsAndDirectivesSpy).toHaveBeenCalledTimes(1);

      getSpy.mockRestore();
   });

   it('calling Bootstrapper.registerWebComponentsAnDirectives will  call bootstrap registerWebComponentsAnDirectives', async () => {
      const getSpy = jest
         .spyOn(InjectionContainer, 'get')
         .mockImplementation(() => bootstrapper);
      const registerWebComponentsAndDirectivesSpy = jest.spyOn(
         bootstrapper,
         'registerWebComponentsAndDirectives'
      );

      await Bootstrapper.registerWebComponents();

      expect(registerWebComponentsAndDirectivesSpy).toHaveBeenCalledTimes(1);

      getSpy.mockRestore();
   });

   it('calling registerWebComponentsAndDirectives will register directive connectors for the specified tags', async () => {
      const loadSpy = jest
         .spyOn(InjectionContainer, 'load')
         .mockImplementation(() => null);
      const registerDirectiveSpy = jest.spyOn(
         componentRegistry,
         'registerDirective'
      );

      await bootstrapper.bootstrap({ modules: [] });

      expect(registerDirectiveSpy).toHaveBeenCalledTimes(1);
      expect(registerDirectiveSpy).toHaveBeenNthCalledWith(
         1,
         directiveMetadata.prefix,
         HtmlTagName.Div,
         false,
         true,
         componentType,
         directiveMetadata.controllerFactoryToken
      );
      loadSpy.mockRestore();
   });

   it('calling registerWebComponentsAndDirectives will register directive connectors for all tags when appliesTo is not set', () => {
      const registerDirectiveSpy = jest
         .spyOn(componentRegistry, 'registerDirective')
         .mockImplementation(() => null);

      directiveMetadata.appliesTo = undefined;
      bootstrapper.registerWebComponents();

      expect(registerDirectiveSpy).toHaveBeenCalledTimes(htmlTageNames.length);

      htmlTageNames.forEach((htmlTageName, i) => {
         expect(registerDirectiveSpy).toHaveBeenNthCalledWith(
            i + 1,
            directiveMetadata.prefix,
            htmlTageName,
            true,
            directiveMetadata.attachShadow && !!supportsShadowDom[htmlTageName],
            directiveType,
            directiveMetadata.controllerFactoryToken
         );
      });
   });

   it(
      'calling registerWebComponentsAndDirectives wil register component connector ' +
         'with shadow dom set to true if attachShadow is not set',
      () => {
         const registerWebComponentSpy = jest
            .spyOn(componentRegistry, 'registerWebComponent')
            .mockImplementation(() => null);

         componentMetadata.attachShadow = undefined;

         bootstrapper.registerWebComponents();

         expect(registerWebComponentSpy).toHaveBeenCalledTimes(1);
         expect(registerWebComponentSpy).toHaveBeenNthCalledWith(
            1,
            componentMetadata.selector,
            componentMetadata.template,
            componentMetadata.styles,
            true,
            componentType,
            componentMetadata.controllerFactoryToken
         );
      }
   );

   it('calling registerWebComponentsAndDirectives wil register component connector', () => {
      const registerWebComponentSpy = jest
         .spyOn(componentRegistry, 'registerWebComponent')
         .mockImplementation(() => null);

      bootstrapper.registerWebComponents();

      expect(registerWebComponentSpy).toHaveBeenCalledTimes(1);
      expect(registerWebComponentSpy).toHaveBeenNthCalledWith(
         1,
         componentMetadata.selector,
         componentMetadata.template,
         componentMetadata.styles,
         false,
         componentType,
         componentMetadata.controllerFactoryToken
      );
   });

   it('registerWebComponentsAndDirectives wil register component only once', () => {
      const registerWebComponentSpy = jest
         .spyOn(componentRegistry, 'registerWebComponent')
         .mockImplementation(() => null);
      bootstrapper.registerWebComponents();
      bootstrapper.registerWebComponents();
      expect(registerWebComponentSpy).toHaveBeenCalledTimes(1);
   });

   it('registerWebComponentsAndDirectives wil register directives only once', () => {
      const registerDirectiveSpy = jest
         .spyOn(componentRegistry, 'registerDirective')
         .mockImplementation(() => null);
      bootstrapper.registerWebComponents();
      bootstrapper.registerWebComponents();
      expect(registerDirectiveSpy).toHaveBeenCalledTimes(1);
   });

   it('bootstrap wil use default decorator validator configuration if no custom decorator validator configuration has been defined', async () => {
      await bootstrapper.bootstrap();

      expect(decoratorValidatorConfiguration.configure).toHaveBeenCalledTimes(
         1
      );
      expect(decoratorValidatorConfiguration.configure).toHaveBeenCalledWith([
         {
            decoratorKey: inputKey,
            name: 'an input',
            forbiddenDecoratorKeys: [outputKey, calculatedKey, viewchildKey],
         },

         {
            decoratorKey: outputKey,
            name: 'an output',
            forbiddenDecoratorKeys: [inputKey, calculatedKey, viewchildKey],
         },

         {
            decoratorKey: viewchildKey,
            name: 'a view child',
            forbiddenDecoratorKeys: [inputKey, outputKey, calculatedKey],
         },
         {
            decoratorKey: calculatedKey,
            name: 'a calculated property',
            forbiddenDecoratorKeys: [inputKey, outputKey, viewchildKey],
         },
      ]);
   });

   it('bootstrap will use custom decorator validator configuration if defined', async () => {
      await bootstrapper.bootstrap({
         decoratorValidationConfig: [
            {
               decoratorKey: inputKey,
               name: 'an input',
               forbiddenDecoratorKeys: [outputKey, calculatedKey, viewchildKey],
            },
         ],
      });

      expect(decoratorValidatorConfiguration.configure).toHaveBeenCalledTimes(
         1
      );
      expect(decoratorValidatorConfiguration.configure).toHaveBeenCalledWith([
         {
            decoratorKey: inputKey,
            name: 'an input',
            forbiddenDecoratorKeys: [outputKey, calculatedKey, viewchildKey],
         },
      ]);
   });
});
